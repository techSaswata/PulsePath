/**
 * BUILD 1 (urgency + summary) + BUILD 7 (confidence/explainability) +
 * BUILD 3 enforcement (guardrails are applied here and CANNOT be downgraded).
 *
 * This is the single orchestrator that produces a complete TriageAssessment:
 *   1. Retrieve guideline evidence (Build 8) and similar cases (Build 9).
 *   2. Run the multi-agent debate (Build 2) to get the AI-proposed tier.
 *   3. Run hard guardrails (Build 3) and take mostUrgent(ai, guardrail).
 *   4. Assemble explainability, care pathway, and the provider summary.
 */

import {
  CarePathway,
  Differential,
  Explainability,
  PatientSummary,
  SymptomProfile,
  TriageAssessment,
  URGENCY_META,
  UrgencyTier,
  mostUrgent,
} from "@/lib/types";
import { runGuardrails } from "@/lib/guardrails/engine";
import { runReasoning } from "@/lib/graph/reasoningGraph";
import { retrieveContext } from "@/lib/rag/retrieve";
import { renderProfileText } from "@/lib/triage/profileText";

export async function assess(profile: SymptomProfile): Promise<TriageAssessment> {
  const profileText = renderProfileText(profile);

  // 1. Evidence + similar cases. One shared embedding, both searches in
  //    parallel; degrades gracefully (keyword guidelines / [] cases) on failure.
  const { citations, similarCases } = await retrieveContext(profile, 5, 3);

  // 2. Multi-agent reasoning (Build 2).
  const reasoning = await runReasoning({ profile, profileText, citations, similarCases });
  const aiProposedTier = reasoning.final.tier;

  // 3. Hard guardrails (Build 3) — can only RAISE urgency, never lower it.
  const guardrails = runGuardrails(profile);
  let finalTier: UrgencyTier = aiProposedTier;
  let guardrailOverride = false;
  if (guardrails.forcedTier) {
    finalTier = mostUrgent(aiProposedTier, guardrails.forcedTier);
    guardrailOverride = finalTier !== aiProposedTier;
  }

  // 4. Explainability (Build 7). Guardrail hits are prepended as top reasons,
  //    and confidence is forced high when a deterministic rule fires.
  const guardrailReasons = guardrails.hits.map(
    (h) => `${h.condition.replace(/_/g, " ")}: ${h.rationale}`
  );
  const topReasons = dedupe([...guardrailReasons, ...reasoning.final.topReasons]).slice(0, 5);
  const explainability: Explainability = {
    confidence: guardrails.hits.length
      ? Math.max(reasoning.final.confidence, 96) // deterministic rule => high confidence
      : reasoning.final.confidence,
    topReasons,
    uncertaintyDrivers: reasoning.final.uncertaintyDrivers,
  };

  // Merge guardrail red flags / actions into the care pathway.
  const carePathway: CarePathway = {
    whatToDo: dedupe([
      ...guardrails.hits.map((h) => h.patientAction),
      ...reasoning.final.carePathway.whatToDo,
    ]),
    whatToTellProvider: reasoning.final.carePathway.whatToTellProvider,
    redFlags: dedupe([
      ...guardrails.hits.flatMap((h) => h.matchedSignals),
      ...reasoning.final.carePathway.redFlags,
      ...reasoning.risk.redFlags,
    ]),
  };

  const differentials: Differential[] = reasoning.differential.differentials.map((d) => ({
    condition: d.condition,
    likelihood: d.likelihood,
    supportingFeatures: d.supportingFeatures,
    worstCaseTier: d.worstCaseTier,
  }));

  const summary: PatientSummary = buildSummary(profile, finalTier, explainability, carePathway);

  return {
    tier: finalTier,
    aiProposedTier,
    guardrailOverride,
    guardrailHits: guardrails.hits,
    explainability,
    differentials,
    carePathway,
    debate: reasoning.debate,
    citations,
    similarCases,
    summary,
  };
}

function buildSummary(
  profile: SymptomProfile,
  tier: UrgencyTier,
  explainability: Explainability,
  carePathway: CarePathway
): PatientSummary {
  return {
    presentingComplaint: profile.primaryComplaint,
    symptomTimeline: profile.timeline,
    associatedSymptoms: profile.associatedSymptoms,
    history: {
      age: profile.age,
      sex: profile.sex,
      pregnant: profile.pregnant,
      conditions: profile.conditions,
      medications: profile.medications,
      allergies: profile.allergies,
    },
    aiUrgencyAssessment: {
      tier,
      confidence: explainability.confidence,
      keyReasons: explainability.topReasons,
      redFlags: carePathway.redFlags,
    },
  };
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = x.trim().toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(x.trim());
    }
  }
  return out;
}

/** Convenience for callers that just want the human label. */
export function tierLabel(t: UrgencyTier): string {
  return URGENCY_META[t].label;
}
