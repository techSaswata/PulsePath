/**
 * BUILD 1 — Conversational intake + adaptive questioning.
 *
 * Two LLM-backed steps, both structured:
 *  - `extractProfile`: fold a new patient message into the structured profile
 *    (the data model under the conversation), merging with what we already know.
 *  - `nextStep`: decide whether we have enough to assess, or ask the single most
 *    clinically useful clarifying question next (with an explicit rationale,
 *    which drives the "narrows to the most relevant question" success metric).
 *
 * A deterministic guardrail check runs FIRST on every turn: if a patient says
 * something that trips an emergency rule, we stop asking questions and go
 * straight to assessment — safety beats thoroughness.
 */

import { z } from "zod";
import { structured } from "@/lib/llm/client";
import {
  ClarifyingQuestion,
  SymptomProfile,
  TimelineEvent,
  emptyProfile,
} from "@/lib/types";
import { renderProfileText } from "@/lib/triage/profileText";
import { runGuardrails } from "@/lib/guardrails/engine";

// --- profile extraction schema ---------------------------------------------

const ExtractedProfile = z.object({
  // NOTE: every field is `.nullable()` (not `.optional()`). Strict structured
  // output on OpenAI-compatible providers requires all properties present;
  // unknown values come back as `null`, which our `?? prior` merge handles.
  primaryComplaint: z.string().nullable(),
  onset: z.string().nullable(),
  durationHours: z.number().nullable(),
  severity: z.enum(["mild", "moderate", "severe"]).nullable(),
  severityScore: z.number().min(0).max(10).nullable(),
  bodyRegions: z
    .array(
      z.enum([
        "head", "face", "neck", "chest", "abdomen", "back", "pelvis",
        "left-arm", "right-arm", "left-leg", "right-leg", "general",
      ])
    )
    .nullable(),
  associatedSymptomsPresent: z.array(z.string()).nullable(),
  associatedSymptomsDenied: z.array(z.string()).nullable(),
  aggravatingFactors: z.array(z.string()).nullable(),
  relievingFactors: z.array(z.string()).nullable(),
  newTimelineEvents: z
    .array(z.object({ at: z.string(), label: z.string(), detail: z.string().nullable() }))
    .nullable(),
  age: z.number().nullable(),
  sex: z.enum(["male", "female", "other", "unknown"]).nullable(),
  pregnant: z.boolean().nullable(),
  conditions: z.array(z.string()).nullable(),
  medications: z.array(z.string()).nullable(),
  allergies: z.array(z.string()).nullable(),
});

type TExtractedProfile = z.infer<typeof ExtractedProfile>;

/**
 * Combined intake schema: extraction + the adaptive next-step decision in ONE
 * LLM call. Previously these were two sequential calls per chat turn — merging
 * them roughly halves per-message latency.
 */
const IntakeTurn = ExtractedProfile.extend({
  readyToAssess: z
    .boolean()
    .describe("True if there is enough information to produce a safe urgency assessment now"),
  nextQuestion: z.string().nullable().describe("The single most clinically useful next question, or null if ready"),
  questionRationale: z.string().nullable().describe("Why THIS question most efficiently narrows the urgency assessment"),
  questionOptions: z.array(z.string()).nullable().describe("Optional quick-reply chips, or null"),
  targetsTier: z
    .enum(["EMERGENCY", "AANDE", "GP_URGENT", "GP_ROUTINE", "SELF_CARE"])
    .nullable()
    .describe("Which urgency hypothesis the question is trying to confirm or exclude"),
  assistantMessage: z.string().describe("A warm, plain-language message to show the patient this turn"),
});

const pos = (v: number | null | undefined): number | undefined =>
  typeof v === "number" && v > 0 ? v : undefined;

/** Merge an extracted delta into the prior profile. Pure; shared by both paths. */
function mergeExtraction(
  prior: SymptomProfile,
  ext: TExtractedProfile,
  patientMessage: string
): SymptomProfile {
  return {
    ...prior,
    primaryComplaint: ext.primaryComplaint?.trim() || prior.primaryComplaint,
    onset: ext.onset ?? prior.onset,
    durationHours: pos(ext.durationHours) ?? prior.durationHours,
    severity: ext.severity ?? prior.severity,
    severityScore: pos(ext.severityScore) ?? prior.severityScore,
    age: pos(ext.age) ?? prior.age,
    sex: ext.sex ?? prior.sex,
    pregnant: ext.pregnant ?? prior.pregnant,
    bodyRegions: uniq([...prior.bodyRegions, ...(ext.bodyRegions ?? [])]),
    aggravatingFactors: uniq([...(prior.aggravatingFactors ?? []), ...(ext.aggravatingFactors ?? [])]),
    relievingFactors: uniq([...(prior.relievingFactors ?? []), ...(ext.relievingFactors ?? [])]),
    conditions: uniq([...(prior.conditions ?? []), ...(ext.conditions ?? [])]),
    medications: uniq([...(prior.medications ?? []), ...(ext.medications ?? [])]),
    allergies: uniq([...(prior.allergies ?? []), ...(ext.allergies ?? [])]),
    freeText: [...prior.freeText, patientMessage],
    associatedSymptoms: mergeSymptoms(
      prior.associatedSymptoms,
      ext.associatedSymptomsPresent ?? [],
      ext.associatedSymptomsDenied ?? []
    ),
    timeline: mergeTimeline(prior.timeline, ext.newTimelineEvents ?? []),
  };
}

/**
 * Extraction only (no next-step). Used by the monitoring re-assessment path,
 * where we just fold a follow-up reply into the profile before re-assessing.
 */
export async function extractProfile(
  prior: SymptomProfile,
  patientMessage: string
): Promise<SymptomProfile> {
  const llm = structured(ExtractedProfile, "extract_profile", { temperature: 0 });
  const ext = await llm.invoke([
    {
      role: "system",
      content:
        "You are a clinical intake extractor. From the patient's latest message, extract ONLY the structured fields you can confidently infer. Do not invent values. Use 'denied' lists for symptoms the patient explicitly says they do NOT have. Resolve relative times (e.g. '3 days ago') into the 'at' field as best you can.",
    },
    {
      role: "user",
      content: `KNOWN SO FAR:\n${renderProfileText(prior)}\n\nPATIENT'S LATEST MESSAGE:\n"${patientMessage}"`,
    },
  ]);
  return mergeExtraction(prior, ext, patientMessage);
}

// --- combined intake turn ---------------------------------------------------

export interface TurnResult {
  /** Profile after folding in the new message. */
  profile: SymptomProfile;
  readyToAssess: boolean;
  assistantMessage: string;
  question?: ClarifyingQuestion;
  /** Set when a guardrail fired during intake — forces immediate assessment. */
  guardrailTripped: boolean;
}

/**
 * One chat turn: extract structured data AND decide the next step in a SINGLE
 * LLM call (previously two sequential calls — this ~halves per-message latency).
 * Guardrails run deterministically (no LLM) and short-circuit to assessment on
 * an emergency, so dangerous cases never wait on the model.
 */
export async function processTurn(
  prior: SymptomProfile,
  patientMessage: string,
  turnCount: number
): Promise<TurnResult> {
  const llm = structured(IntakeTurn, "intake_turn", { temperature: 0.1 });
  const out = await llm.invoke([
    {
      role: "system",
      content:
        "You are a careful triage nurse conducting intake. Do TWO things in one step: " +
        "(1) Extract ONLY the structured clinical fields you can confidently infer from the patient's latest message — do not invent values; use the denied lists for symptoms explicitly absent; resolve relative times into the timeline. " +
        "(2) Decide whether you can now safely assess, or ask the SINGLE most clinically valuable next question — prefer questions that discriminate between urgency tiers (red-flag screens) over low-yield detail; after ~4-6 good questions you usually have enough. " +
        "Always include a short, warm assistantMessage. Never give a diagnosis.",
    },
    {
      role: "user",
      content: `KNOWN SO FAR:\n${renderProfileText(prior)}\n\nQuestions asked so far: ${turnCount}.\n\nPATIENT'S LATEST MESSAGE:\n"${patientMessage}"`,
    },
  ]);

  const profile = mergeExtraction(prior, out, patientMessage);

  // SAFETY FIRST: a hard rule overrides the model's pacing — stop and assess.
  const gr = runGuardrails(profile);
  if (gr.forcedTier === "EMERGENCY") {
    return {
      profile,
      readyToAssess: true,
      guardrailTripped: true,
      assistantMessage:
        "Based on what you've told me, this may be a medical emergency. I'm preparing your assessment now — please read the guidance carefully.",
    };
  }

  const ready = out.readyToAssess || turnCount >= 7; // force closure if dragging
  return {
    profile,
    readyToAssess: ready,
    guardrailTripped: false,
    assistantMessage: out.assistantMessage,
    question:
      ready || !out.nextQuestion
        ? undefined
        : {
            id: `q${turnCount + 1}`,
            question: out.nextQuestion,
            rationale: out.questionRationale ?? "",
            options: out.questionOptions ?? undefined,
            targetsTier: out.targetsTier ?? undefined,
          },
  };
}

// --- merge helpers ----------------------------------------------------------

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function mergeSymptoms(
  prior: SymptomProfile["associatedSymptoms"],
  present: string[],
  denied: string[]
): SymptomProfile["associatedSymptoms"] {
  const map = new Map(prior.map((s) => [s.name.toLowerCase(), { ...s }]));
  for (const name of present) map.set(name.toLowerCase(), { name, present: true });
  for (const name of denied) {
    // A present finding should not be overwritten by a denial in the same turn.
    if (!present.some((p) => p.toLowerCase() === name.toLowerCase())) {
      map.set(name.toLowerCase(), { name, present: false });
    }
  }
  return Array.from(map.values());
}

function mergeTimeline(
  prior: TimelineEvent[],
  added: { at: string; label: string; detail?: string | null }[]
): TimelineEvent[] {
  const key = (e: { at: string; label: string }) => `${e.at}|${e.label}`.toLowerCase();
  const seen = new Set(prior.map(key));
  const out = [...prior];
  for (const e of added) {
    if (!seen.has(key(e))) {
      seen.add(key(e));
      out.push({ at: e.at, label: e.label, detail: e.detail ?? undefined });
    }
  }
  return out;
}

export { emptyProfile };
