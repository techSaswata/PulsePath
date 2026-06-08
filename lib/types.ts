/**
 * PulsePath shared domain model.
 * This is the structured data model that sits *underneath* the conversational UI.
 * Every conversational turn maps onto this typed structure.
 */

// ---------------------------------------------------------------------------
// Urgency tiers (Build 3 + Build 1)
// ---------------------------------------------------------------------------

/** The five care-level tiers, ordered most → least urgent. */
export type UrgencyTier =
  | "EMERGENCY" //   Call emergency services now (999 / 112 / 911)
  | "AANDE" //       Go to A&E / ER today
  | "GP_URGENT" //   GP urgent appointment (today / same-day)
  | "GP_ROUTINE" //  GP routine appointment (within a week)
  | "SELF_CARE"; //  Self-care with monitoring

export const URGENCY_ORDER: UrgencyTier[] = [
  "EMERGENCY",
  "AANDE",
  "GP_URGENT",
  "GP_ROUTINE",
  "SELF_CARE",
];

/** Lower index = more urgent. Used to take the max-urgency across signals. */
export function urgencyRank(t: UrgencyTier): number {
  return URGENCY_ORDER.indexOf(t);
}

/** Returns the more urgent of two tiers (used to enforce "guardrails never downgrade"). */
export function mostUrgent(a: UrgencyTier, b: UrgencyTier): UrgencyTier {
  return urgencyRank(a) <= urgencyRank(b) ? a : b;
}

export const URGENCY_META: Record<
  UrgencyTier,
  { label: string; short: string; color: string; action: string }
> = {
  EMERGENCY: {
    label: "Call emergency services now",
    short: "Emergency",
    color: "#dc2626",
    action: "Call 999 / 112 / 911 immediately, or get to the nearest emergency department.",
  },
  AANDE: {
    label: "Go to A&E / ER today",
    short: "A&E today",
    color: "#ea580c",
    action: "Attend your nearest A&E / emergency department today. Do not wait.",
  },
  GP_URGENT: {
    label: "Urgent GP appointment",
    short: "GP urgent",
    color: "#d97706",
    action: "Book a same-day / urgent GP appointment, or call NHS 111 for guidance.",
  },
  GP_ROUTINE: {
    label: "Routine GP appointment",
    short: "GP routine",
    color: "#0891b2",
    action: "Book a routine GP appointment within the next week.",
  },
  SELF_CARE: {
    label: "Self-care with monitoring",
    short: "Self-care",
    color: "#16a34a",
    action: "Manage at home with self-care. Monitor your symptoms and re-check if they change.",
  },
};

// ---------------------------------------------------------------------------
// Symptom model (Build 1 intake, Build 5 body location, Build 6 timeline)
// ---------------------------------------------------------------------------

export type Severity = "mild" | "moderate" | "severe";

/** Body regions clickable on the body diagram (Build 5). */
export type BodyRegion =
  | "head"
  | "face"
  | "neck"
  | "chest"
  | "abdomen"
  | "back"
  | "pelvis"
  | "left-arm"
  | "right-arm"
  | "left-leg"
  | "right-leg"
  | "general";

export interface AssociatedSymptom {
  name: string;
  present: boolean; // true = patient reports it, false = explicitly denied (pertinent negative)
}

/** A single point on the medical timeline (Build 6). */
export interface TimelineEvent {
  /** ISO timestamp or relative descriptor resolved to ISO when possible. */
  at: string;
  /** Human label e.g. "Symptom started", "Worsened", "Fever began". */
  label: string;
  detail?: string;
  /** Optional severity at this point, to render a progression curve. */
  severity?: Severity;
}

/** The full structured profile assembled during intake. */
export interface SymptomProfile {
  primaryComplaint: string;
  onset?: string; // when it started, free text resolved where possible
  durationHours?: number; // normalized duration
  severity?: Severity;
  severityScore?: number; // 0–10 pain/severity scale if collected
  bodyRegions: BodyRegion[]; // from body diagram or extracted from text
  associatedSymptoms: AssociatedSymptom[];
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  timeline: TimelineEvent[];
  // Relevant history
  age?: number;
  sex?: "male" | "female" | "other" | "unknown";
  pregnant?: boolean;
  conditions?: string[]; // chronic conditions
  medications?: string[];
  allergies?: string[];
  /** Raw free-text the patient provided, for the LLM agents to read verbatim. */
  freeText: string[];
}

export function emptyProfile(): SymptomProfile {
  return {
    primaryComplaint: "",
    bodyRegions: [],
    associatedSymptoms: [],
    timeline: [],
    freeText: [],
  };
}

// ---------------------------------------------------------------------------
// Guardrails (Build 3)
// ---------------------------------------------------------------------------

export type GuardrailCondition =
  | "STROKE"
  | "HEART_ATTACK"
  | "SEPSIS"
  | "MENINGITIS"
  | "ANAPHYLAXIS"
  | "SEVERE_BLEEDING"
  | "SUICIDE_RISK";

export interface GuardrailHit {
  condition: GuardrailCondition;
  /** The tier this guardrail forces (almost always EMERGENCY). */
  forcedTier: UrgencyTier;
  /** Human-readable matched rule, e.g. "FAST positive: facial droop + arm weakness". */
  rationale: string;
  /** The specific patient signals that triggered it (for explainability). */
  matchedSignals: string[];
  /** Patient-facing instruction. */
  patientAction: string;
}

// ---------------------------------------------------------------------------
// Multi-agent reasoning output (Build 2 + Build 7)
// ---------------------------------------------------------------------------

export interface Differential {
  condition: string;
  likelihood: "low" | "moderate" | "high";
  supportingFeatures: string[];
  /** Worst-case urgency if this diagnosis is true. */
  worstCaseTier: UrgencyTier;
}

export interface AgentContribution {
  agent: "symptom" | "risk" | "differential" | "safety" | "final";
  summary: string;
  /** Free-form reasoning shown in the debate transcript. */
  reasoning: string;
  /** Each agent's independent tier vote, where applicable. */
  proposedTier?: UrgencyTier;
}

/** Build 7: confidence + explainability payload. */
export interface Explainability {
  confidence: number; // 0–100
  topReasons: string[]; // ranked top-5 reasons for the decision
  /** What additional info would most change the assessment. */
  uncertaintyDrivers: string[];
}

// ---------------------------------------------------------------------------
// Care pathway guidance (Build 1 / Core feature)
// ---------------------------------------------------------------------------

export interface CarePathway {
  whatToDo: string[];
  whatToTellProvider: string[];
  redFlags: string[]; // symptoms that should trigger escalation
}

// ---------------------------------------------------------------------------
// Final assessment (the complete triage output)
// ---------------------------------------------------------------------------

export interface SimilarCase {
  id: string;
  presentingComplaint: string;
  finalTier: UrgencyTier;
  outcome?: string;
  similarity: number; // 0–1 cosine
}

export interface GuidelineCitation {
  source: "NHS" | "WHO" | "CDC" | "NICE" | "OTHER";
  title: string;
  snippet: string;
  url?: string;
  score: number;
}

export interface TriageAssessment {
  /** The final urgency, after guardrails are applied (never downgraded by AI). */
  tier: UrgencyTier;
  /** What the AI proposed before guardrails (for transparency). */
  aiProposedTier: UrgencyTier;
  /** Whether a hard guardrail overrode/raised the AI tier. */
  guardrailOverride: boolean;
  guardrailHits: GuardrailHit[];
  explainability: Explainability;
  differentials: Differential[];
  carePathway: CarePathway;
  debate: AgentContribution[];
  citations: GuidelineCitation[];
  similarCases: SimilarCase[];
  /** Provider-facing structured summary (Build 1 + Build 10). */
  summary: PatientSummary;
}

export interface PatientSummary {
  presentingComplaint: string;
  symptomTimeline: TimelineEvent[];
  associatedSymptoms: AssociatedSymptom[];
  history: {
    age?: number;
    sex?: string;
    pregnant?: boolean;
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
  };
  aiUrgencyAssessment: {
    tier: UrgencyTier;
    confidence: number;
    keyReasons: string[];
    redFlags: string[];
  };
}

// ---------------------------------------------------------------------------
// Conversation (Build 1 intake)
// ---------------------------------------------------------------------------

export type ChatRole = "patient" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  at?: string;
}

/** A clarifying question the assistant decides to ask next (Build 1 adaptive). */
export interface ClarifyingQuestion {
  id: string;
  question: string;
  /** Why this question is being asked — drives the "most clinically relevant" metric. */
  rationale: string;
  /** Optional quick-reply chips. */
  options?: string[];
  /** Which urgency hypothesis this question is trying to confirm/exclude. */
  targetsTier?: UrgencyTier;
}

/** Whole triage session state passed between turns. */
export interface TriageSession {
  id: string;
  profile: SymptomProfile;
  transcript: ChatMessage[];
  /** True once the assistant believes it has enough to finalize. */
  readyToAssess: boolean;
  assessment?: TriageAssessment;
}
