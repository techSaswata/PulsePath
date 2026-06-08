/**
 * BUILD 2 — Multi-Agent Medical Reasoning graph (LangGraph.js).
 *
 * Five specialist agents collaborate and DEBATE before a final output:
 *   1. Symptom Agent      — structures the presentation, finds missing info.
 *   2. Risk Agent         — stratifies urgency from risk factors & red flags.
 *   3. Differential Agent — ranks plausible diagnoses + their worst-case tier.
 *   4. Safety Agent       — adversarial check: challenges the others, surfaces
 *                           "cannot-miss" diagnoses, can only push MORE urgent.
 *   5. Final Decision     — reconciles the debate into a tier + confidence +
 *                           top-5 reasons + care pathway (Build 7 explainability).
 *
 * Debate mechanism: if the Safety Agent disagrees with the Risk Agent and we
 * haven't exceeded the debate cap, we loop back to the Risk Agent with the
 * safety challenges injected — agents literally argue until they converge or
 * the round cap is hit, then the Final Decision Agent rules.
 *
 * The LLM is OpenAI-compatible (custom base URL/model/key from env).
 * Hard guardrails are applied OUTSIDE this graph (see lib/triage/assess.ts) so
 * the AI can never downgrade a guardrail-forced emergency.
 */

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { structured } from "@/lib/llm/client";
import {
  DifferentialAgentOut,
  FinalDecisionOut,
  RiskAgentOut,
  SafetyAgentOut,
  SymptomAgentOut,
  TDifferentialAgentOut,
  TFinalDecisionOut,
  TRiskAgentOut,
  TSafetyAgentOut,
  TSymptomAgentOut,
} from "@/lib/graph/schemas";
import {
  AgentContribution,
  GuidelineCitation,
  SimilarCase,
  SymptomProfile,
  mostUrgent,
} from "@/lib/types";

const MAX_DEBATE_ROUNDS = 2;

// ---------------------------------------------------------------------------
// Graph state
// ---------------------------------------------------------------------------

const ReasoningState = Annotation.Root({
  profileText: Annotation<string>,
  guidelineContext: Annotation<string>,
  similarContext: Annotation<string>,

  symptom: Annotation<TSymptomAgentOut | null>({ reducer: (_l, r) => r, default: () => null }),
  risk: Annotation<TRiskAgentOut | null>({ reducer: (_l, r) => r, default: () => null }),
  differential: Annotation<TDifferentialAgentOut | null>({ reducer: (_l, r) => r, default: () => null }),
  safety: Annotation<TSafetyAgentOut | null>({ reducer: (_l, r) => r, default: () => null }),
  final: Annotation<TFinalDecisionOut | null>({ reducer: (_l, r) => r, default: () => null }),

  // Accumulating debate transcript (Build 2 + shown in UI).
  debate: Annotation<AgentContribution[]>({
    reducer: (l, r) => l.concat(r),
    default: () => [],
  }),
  round: Annotation<number>({ reducer: (_l, r) => r, default: () => 0 }),
});

type RState = typeof ReasoningState.State;

// ---------------------------------------------------------------------------
// Shared system framing
// ---------------------------------------------------------------------------

const SAFETY_FRAMING = `You are part of a clinical triage decision-support system. You are NOT giving a diagnosis.
You assess URGENCY (which level of care, how soon). Always err toward caution: when uncertain between two tiers, choose the more urgent one. Never reassure a patient out of seeking care for a potentially serious symptom.
Urgency tiers (most to least urgent): EMERGENCY (call 999/112/911 now), AANDE (A&E/ER today), GP_URGENT (urgent GP today), GP_ROUTINE (GP within a week), SELF_CARE (home care + monitoring).`;

function caseBlock(s: RState): string {
  return [
    `PATIENT PRESENTATION:\n${s.profileText}`,
    s.guidelineContext ? `\nRELEVANT CLINICAL GUIDELINES (evidence to ground your reasoning):\n${s.guidelineContext}` : "",
    s.similarContext ? `\nSIMILAR PRIOR CASES (for reference only):\n${s.similarContext}` : "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Nodes (agents)
// ---------------------------------------------------------------------------

async function symptomNode(s: RState): Promise<Partial<RState>> {
  const llm = structured(SymptomAgentOut, "symptom_analysis", { temperature: 0.1 });
  const out = await llm.invoke([
    { role: "system", content: `${SAFETY_FRAMING}\nYou are the SYMPTOM AGENT. Structure the presentation: refine the complaint, extract key clinical features, list pertinent negatives, and flag clinically important missing information.` },
    { role: "user", content: caseBlock(s) },
  ]);
  return {
    symptom: out,
    debate: [{ agent: "symptom", summary: out.refinedComplaint, reasoning: out.reasoning }],
  };
}

async function riskNode(s: RState): Promise<Partial<RState>> {
  const llm = structured(RiskAgentOut, "risk_assessment", { temperature: 0.1 });
  const challenge =
    s.safety && !s.safety.agreesWithRisk
      ? `\n\nThe SAFETY AGENT challenged your previous assessment. Reconsider in light of these objections and revise if appropriate:\n- ${s.safety.challenges.join("\n- ")}\nThe safety agent proposed: ${s.safety.proposedTier}.`
      : "";
  const out = await llm.invoke([
    { role: "system", content: `${SAFETY_FRAMING}\nYou are the RISK AGENT. Stratify urgency. Identify risk factors (age, pregnancy, comorbidities), red flags, and propose a tier. Be cautious.` },
    { role: "user", content: `${caseBlock(s)}${s.symptom ? `\n\nSYMPTOM AGENT FINDINGS:\nKey features: ${s.symptom.keyFeatures.join(", ")}\nPertinent negatives: ${s.symptom.pertinentNegatives.join(", ")}` : ""}${challenge}` },
  ]);
  return {
    risk: out,
    debate: [{ agent: "risk", summary: `Proposed ${out.proposedTier}`, reasoning: out.reasoning, proposedTier: out.proposedTier }],
  };
}

async function differentialNode(s: RState): Promise<Partial<RState>> {
  const llm = structured(DifferentialAgentOut, "differential_diagnosis", { temperature: 0.2 });
  const out = await llm.invoke([
    { role: "system", content: `${SAFETY_FRAMING}\nYou are the DIFFERENTIAL DIAGNOSIS AGENT. Produce a ranked differential. For each, give likelihood, supporting features, and the worst-case urgency tier IF that diagnosis were true. Include dangerous diagnoses even if less likely.` },
    { role: "user", content: `${caseBlock(s)}${s.symptom ? `\n\nKey features: ${s.symptom.keyFeatures.join(", ")}` : ""}${s.risk ? `\nRisk agent red flags: ${s.risk.redFlags.join(", ")}` : ""}` },
  ]);
  return {
    differential: out,
    debate: [{ agent: "differential", summary: out.differentials.map((d: { condition: string }) => d.condition).slice(0, 4).join(", "), reasoning: out.reasoning }],
  };
}

async function safetyNode(s: RState): Promise<Partial<RState>> {
  const llm = structured(SafetyAgentOut, "safety_review", { temperature: 0.1 });
  const worstDifferentialTier =
    s.differential?.differentials.reduce<typeof s.differential.differentials[number]["worstCaseTier"] | null>(
      (acc, d) => (acc ? mostUrgent(acc, d.worstCaseTier) : d.worstCaseTier),
      null
    ) ?? null;
  const out = await llm.invoke([
    { role: "system", content: `${SAFETY_FRAMING}\nYou are the SAFETY AGENT — the adversarial check. Your job is to challenge the other agents and make sure no dangerous possibility is dismissed. List "cannot-miss" diagnoses. If the risk tier is too lenient given the differentials, push for a MORE urgent tier. You may never recommend LESS urgency than the worst plausible diagnosis warrants.` },
    { role: "user", content: `${caseBlock(s)}\n\nRISK AGENT proposed: ${s.risk?.proposedTier} (${s.risk?.reasoning})\nDIFFERENTIALS: ${s.differential?.differentials.map((d) => `${d.condition} [${d.likelihood}, worst-case ${d.worstCaseTier}]`).join("; ")}\nMost urgent worst-case among differentials: ${worstDifferentialTier ?? "n/a"}.` },
  ]);
  return {
    safety: out,
    round: s.round + 1,
    debate: [{ agent: "safety", summary: out.agreesWithRisk ? `Agrees (${out.proposedTier})` : `Challenges → ${out.proposedTier}`, reasoning: out.reasoning, proposedTier: out.proposedTier }],
  };
}

async function finalNode(s: RState): Promise<Partial<RState>> {
  const llm = structured(FinalDecisionOut, "final_decision", { temperature: 0.1 });
  const out = await llm.invoke([
    { role: "system", content: `${SAFETY_FRAMING}\nYou are the FINAL DECISION AGENT. Reconcile the debate into a single tier. Your tier must be at least as urgent as the most urgent well-justified position raised (especially the Safety Agent's). Give a calibrated confidence (0-100), the ranked top reasons (max 5), uncertainty drivers, and a concrete care pathway. Confidence should be lower when agents disagreed or critical info is missing.` },
    { role: "user", content: `${caseBlock(s)}\n\nDEBATE SUMMARY:\nRisk agent: ${s.risk?.proposedTier} — ${s.risk?.reasoning}\nDifferentials: ${s.differential?.differentials.map((d) => `${d.condition} (${d.likelihood}, worst ${d.worstCaseTier})`).join("; ")}\nSafety agent: ${s.safety?.proposedTier} — agrees=${s.safety?.agreesWithRisk}; challenges: ${s.safety?.challenges.join("; ")}; cannot-miss: ${s.safety?.cannotMissDiagnoses.join(", ")}\nDebate rounds held: ${s.round}.` },
  ]);
  return {
    final: out,
    debate: [{ agent: "final", summary: `Final ${out.tier} @ ${out.confidence}%`, reasoning: out.patientMessage, proposedTier: out.tier }],
  };
}

// ---------------------------------------------------------------------------
// Debate routing: loop Risk↔Safety until convergence or round cap.
// ---------------------------------------------------------------------------

function routeAfterSafety(s: RState): "riskAgent" | "finalAgent" {
  const disagree = s.safety ? !s.safety.agreesWithRisk : false;
  if (disagree && s.round < MAX_DEBATE_ROUNDS) return "riskAgent";
  return "finalAgent";
}

// ---------------------------------------------------------------------------
// Build & compile
// ---------------------------------------------------------------------------

// Risk and Differential are independent of each other, so they fan out from
// Symptom and run CONCURRENTLY; the graph joins on Safety once both finish.
// This shortens the critical path (and total latency) vs a fully sequential
// chain. Safety can still loop back to Risk on disagreement (bounded debate).
const graph = new StateGraph(ReasoningState)
  .addNode("symptomAgent", symptomNode)
  .addNode("riskAgent", riskNode)
  .addNode("differentialAgent", differentialNode)
  .addNode("safetyAgent", safetyNode)
  .addNode("finalAgent", finalNode)
  .addEdge(START, "symptomAgent")
  .addEdge("symptomAgent", "riskAgent")
  .addEdge("symptomAgent", "differentialAgent")
  .addEdge("riskAgent", "safetyAgent")
  .addEdge("differentialAgent", "safetyAgent")
  .addConditionalEdges("safetyAgent", routeAfterSafety, ["riskAgent", "finalAgent"])
  .addEdge("finalAgent", END)
  .compile();

export interface ReasoningInput {
  profile: SymptomProfile;
  profileText: string;
  citations: GuidelineCitation[];
  similarCases: SimilarCase[];
}

export interface ReasoningOutput {
  symptom: TSymptomAgentOut;
  risk: TRiskAgentOut;
  differential: TDifferentialAgentOut;
  safety: TSafetyAgentOut;
  final: TFinalDecisionOut;
  debate: AgentContribution[];
  rounds: number;
}

export async function runReasoning(input: ReasoningInput): Promise<ReasoningOutput> {
  const guidelineContext = input.citations
    .map((c, i) => `[${i + 1}] (${c.source}) ${c.title}: ${c.snippet}`)
    .join("\n");
  const similarContext = input.similarCases
    .map((c, i) => `[${i + 1}] "${c.presentingComplaint}" → ${c.finalTier}${c.outcome ? ` (outcome: ${c.outcome})` : ""}`)
    .join("\n");

  const result = await graph.invoke({
    profileText: input.profileText,
    guidelineContext,
    similarContext,
  });

  if (!result.final || !result.symptom || !result.risk || !result.differential || !result.safety) {
    throw new Error("[reasoning] graph did not produce a complete result");
  }
  return {
    symptom: result.symptom,
    risk: result.risk,
    differential: result.differential,
    safety: result.safety,
    final: result.final,
    debate: result.debate,
    rounds: result.round,
  };
}
