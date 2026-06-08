/**
 * BUILD 3 — Emergency Guardrail Engine.
 *
 * Hard-coded, deterministic clinical safety rules. These run INDEPENDENTLY of
 * the LLM and CANNOT be overridden or downgraded by the AI. If any rule fires,
 * its forced tier is applied via `mostUrgent(...)` — the AI may only ever be
 * *raised* to a more urgent tier by a guardrail, never the reverse.
 *
 * Each rule is intentionally readable and auditable. Pattern matching is done
 * over a normalized "signal bag" extracted from the structured profile + the
 * raw free text, so it works whether symptoms arrive via chat, body diagram,
 * or voice transcript.
 *
 * Conditions covered (per spec): STROKE, HEART_ATTACK, SEPSIS, MENINGITIS,
 * plus ANAPHYLAXIS, SEVERE_BLEEDING and SUICIDE_RISK which are equally
 * non-negotiable emergencies.
 */

import {
  GuardrailCondition,
  GuardrailHit,
  SymptomProfile,
  UrgencyTier,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Signal extraction — turn the structured profile + free text into a flat,
// lowercase searchable haystack plus a set of matched concept flags.
// ---------------------------------------------------------------------------

export interface SignalBag {
  text: string; // normalized concatenation of everything the patient said/marked
  age?: number;
  pregnant?: boolean;
  severityScore?: number;
}

export function buildSignalBag(profile: SymptomProfile): SignalBag {
  const parts: string[] = [];
  parts.push(profile.primaryComplaint);
  parts.push(...profile.freeText);
  parts.push(...profile.bodyRegions);
  for (const a of profile.associatedSymptoms) {
    // Only positive findings go in the haystack; negatives are tracked separately.
    if (a.present) parts.push(a.name);
  }
  parts.push(...(profile.aggravatingFactors ?? []));
  for (const t of profile.timeline) parts.push(`${t.label} ${t.detail ?? ""}`);
  const text = parts.join(" \n ").toLowerCase();
  return {
    text,
    age: profile.age,
    pregnant: profile.pregnant,
    severityScore: profile.severityScore,
  };
}

/** Does the haystack contain ANY of the given phrases (substring match)? */
function any(text: string, phrases: string[]): string[] {
  return phrases.filter((p) => text.includes(p));
}

/** Does the haystack contain a phrase matching this regex? Returns matches. */
function rx(text: string, re: RegExp): string[] {
  const m = text.match(re);
  return m ? [m[0]] : [];
}

// ---------------------------------------------------------------------------
// Vocabulary — symptom synonym banks used by multiple rules.
// ---------------------------------------------------------------------------

const V = {
  chestPain: ["chest pain", "chest tightness", "chest pressure", "crushing chest", "tight chest", "pressure in my chest", "pain in my chest", "heavy chest"],
  radiation: ["left arm", "arm pain", "jaw pain", "pain in my jaw", "radiating", "radiates", "into my shoulder", "shoulder and arm", "down my arm", "neck and jaw"],
  cardiacAssoc: ["sweating", "clammy", "cold sweat", "short of breath", "shortness of breath", "breathless", "nausea", "vomiting", "lightheaded", "impending doom"],
  faceDroop: ["face drooping", "facial droop", "face dropped", "one side of my face", "drooping face", "mouth drooping", "lopsided smile"],
  armWeakness: ["arm weakness", "weak arm", "can't lift my arm", "cannot lift my arm", "arm went numb", "one arm", "weakness on one side", "weak on one side", "numb on one side"],
  speech: ["slurred speech", "slurring", "can't speak", "cannot speak", "speech problems", "trouble speaking", "words come out wrong", "garbled speech"],
  strokeOther: ["sudden numbness", "vision loss", "lost vision", "double vision", "sudden confusion", "loss of balance", "sudden weakness"],
  thunderclap: ["worst headache", "thunderclap", "worst headache of my life", "sudden severe headache", "explosive headache", "headache like a thunderclap"],
  meningism: ["stiff neck", "neck stiffness", "can't touch chin to chest", "photophobia", "light hurts my eyes", "sensitive to light", "non-blanching rash", "rash that doesn't fade", "glass test", "purple rash", "spots that don't fade"],
  feverHigh: ["high fever", "very high temperature", "burning up", "fever"],
  sepsisSigns: ["mottled", "mottled skin", "blue lips", "blue tinge", "not passed urine", "no urine", "very fast breathing", "rapid breathing", "confused", "slurred", "feels like dying", "feel like i'm going to die", "extremely unwell", "can't stay awake", "cannot stay awake", "won't wake up", "floppy", "rash that won't fade"],
  anaphylaxis: ["throat closing", "throat is closing", "can't breathe", "cannot breathe", "swollen tongue", "swelling of my tongue", "lips swelling", "swollen lips", "hives all over", "anaphylaxis", "allergic reaction", "tongue swelling", "wheezing after", "collapsed after eating", "throat tightening"],
  severeBleeding: ["bleeding heavily", "won't stop bleeding", "uncontrolled bleeding", "spurting blood", "lost a lot of blood", "coughing up blood", "vomiting blood", "blood in vomit", "heavy bleeding"],
  suicide: ["want to die", "kill myself", "end my life", "suicidal", "suicide", "hurt myself", "no reason to live", "overdose", "take my own life", "self harm", "harm myself"],
  pregnancyEmergency: ["heavy vaginal bleeding", "severe abdominal pain", "no fetal movement", "baby not moving", "severe headache and swelling"],
};

// ---------------------------------------------------------------------------
// The rules. Each returns a GuardrailHit | null. Order does not matter — all
// fire independently and all hits are collected.
// ---------------------------------------------------------------------------

type Rule = (bag: SignalBag) => GuardrailHit | null;

const hit = (
  condition: GuardrailCondition,
  rationale: string,
  matchedSignals: string[],
  patientAction: string,
  forcedTier: UrgencyTier = "EMERGENCY"
): GuardrailHit => ({ condition, forcedTier, rationale, matchedSignals, patientAction });

const EMERGENCY_ACTION =
  "Call emergency services now (999 / 112 / 911). Do not drive yourself. Stay with the patient.";

/** HEART ATTACK — chest pain + a radiation OR autonomic feature. */
const heartAttackRule: Rule = (bag) => {
  const chest = any(bag.text, V.chestPain);
  if (chest.length === 0) return null;
  const radiation = any(bag.text, V.radiation);
  const assoc = any(bag.text, V.cardiacAssoc);
  // Classic ACS pattern: chest pain that radiates, or chest pain + autonomic symptoms.
  if (radiation.length > 0 || assoc.length > 0) {
    return hit(
      "HEART_ATTACK",
      "Possible acute coronary syndrome: chest pain with " +
        (radiation.length ? "radiation" : "") +
        (radiation.length && assoc.length ? " and " : "") +
        (assoc.length ? "associated autonomic features" : "") +
        ".",
      [...chest, ...radiation, ...assoc],
      "Call 999/112/911 now. If available and not allergic, chew one 300mg aspirin. Sit and rest."
    );
  }
  // Severe, crushing chest pain alone still escalates.
  if (any(bag.text, ["crushing chest", "crushing pain", "elephant on my chest", "vice-like"]).length) {
    return hit(
      "HEART_ATTACK",
      "Crushing/pressure-type chest pain — must exclude acute coronary syndrome.",
      chest,
      EMERGENCY_ACTION
    );
  }
  return null;
};

/** STROKE — FAST: Face, Arm, Speech. Any single FAST feature is positive. */
const strokeRule: Rule = (bag) => {
  const face = any(bag.text, V.faceDroop);
  const arm = any(bag.text, V.armWeakness);
  const speech = any(bag.text, V.speech);
  const other = any(bag.text, V.strokeOther);
  const fastCount = [face.length > 0, arm.length > 0, speech.length > 0].filter(Boolean).length;
  if (fastCount >= 1 || other.length > 0) {
    const matched = [...face, ...arm, ...speech, ...other];
    const features = [
      face.length ? "Face droop" : null,
      arm.length ? "Arm weakness" : null,
      speech.length ? "Speech difficulty" : null,
      other.length ? "Sudden neuro deficit" : null,
    ]
      .filter(Boolean)
      .join(", ");
    return hit(
      "STROKE",
      `FAST positive (${features}) — time-critical, possible stroke.`,
      matched,
      "Call 999/112/911 immediately. Note the time symptoms started — it matters for treatment."
    );
  }
  return null;
};

/** MENINGITIS — thunderclap/severe headache OR meningism cluster, esp. with fever. */
const meningitisRule: Rule = (bag) => {
  const thunder = any(bag.text, V.thunderclap);
  const mening = any(bag.text, V.meningism);
  const fever = any(bag.text, V.feverHigh);
  // Sudden severe / thunderclap headache is itself an emergency (SAH/meningitis).
  if (thunder.length > 0) {
    return hit(
      "MENINGITIS",
      "Sudden severe / thunderclap headache — must exclude subarachnoid haemorrhage or meningitis.",
      thunder,
      EMERGENCY_ACTION
    );
  }
  // Meningism cluster (neck stiffness / photophobia / non-blanching rash), worse with fever.
  if (mening.length >= 1 && (fever.length > 0 || mening.length >= 2)) {
    return hit(
      "MENINGITIS",
      "Meningitis red-flag cluster (" + mening.join(", ") + ")" + (fever.length ? " with fever" : "") + ".",
      [...mening, ...fever],
      "Call 999/112/911 now. A rash that does not fade under a glass is a medical emergency."
    );
  }
  return null;
};

/** SEPSIS — infection signs + systemic deterioration. */
const sepsisRule: Rule = (bag) => {
  const fever = any(bag.text, V.feverHigh);
  const sepsis = any(bag.text, V.sepsisSigns);
  const infection = any(bag.text, ["infection", "uti", "pneumonia", "cellulitis", "wound", "abscess", "covid", "flu", "chest infection"]);
  // Sepsis: deterioration signs are the alarm. Pair with fever or known infection.
  if (sepsis.length >= 1 && (fever.length > 0 || infection.length > 0 || sepsis.length >= 2)) {
    return hit(
      "SEPSIS",
      "Possible sepsis — systemic deterioration signs (" + sepsis.join(", ") + ")" +
        (fever.length ? " with fever" : infection.length ? " with suspected infection" : "") +
        ".",
      [...sepsis, ...fever, ...infection],
      "Call 999/112/911 now and say you are worried about sepsis. This can deteriorate fast."
    );
  }
  return null;
};

/** ANAPHYLAXIS — airway/breathing compromise in an allergic context. */
const anaphylaxisRule: Rule = (bag) => {
  const ana = any(bag.text, V.anaphylaxis);
  if (ana.length >= 1) {
    return hit(
      "ANAPHYLAXIS",
      "Possible anaphylaxis — airway/breathing compromise in an allergic context.",
      ana,
      "Use an adrenaline auto-injector (EpiPen) now if available, then call 999/112/911. Lie flat with legs raised."
    );
  }
  return null;
};

/** SEVERE BLEEDING / HAEMORRHAGE. */
const bleedingRule: Rule = (bag) => {
  const bleed = any(bag.text, V.severeBleeding);
  if (bleed.length >= 1) {
    return hit(
      "SEVERE_BLEEDING",
      "Severe or uncontrolled bleeding.",
      bleed,
      "Call 999/112/911. Apply firm direct pressure to the wound with a clean cloth and keep pressing."
    );
  }
  return null;
};

/** SUICIDE / SELF-HARM RISK — mental health emergency. */
const suicideRule: Rule = (bag) => {
  const s = any(bag.text, V.suicide);
  if (s.length >= 1) {
    return hit(
      "SUICIDE_RISK",
      "Disclosed suicidal ideation or self-harm intent — mental health emergency.",
      s,
      "You are not alone. Call 999/112/911 or a crisis line now (UK: Samaritans 116 123; US: 988). Stay with someone you trust."
    );
  }
  return null;
};

const RULES: Rule[] = [
  heartAttackRule,
  strokeRule,
  meningitisRule,
  sepsisRule,
  anaphylaxisRule,
  bleedingRule,
  suicideRule,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GuardrailResult {
  hits: GuardrailHit[];
  /** The most urgent tier forced by any hit, or null if none fired. */
  forcedTier: UrgencyTier | null;
}

/** Run all guardrails against a profile. Pure, deterministic, synchronous. */
export function runGuardrails(profile: SymptomProfile): GuardrailResult {
  const bag = buildSignalBag(profile);
  const hits: GuardrailHit[] = [];
  for (const rule of RULES) {
    const h = rule(bag);
    if (h) hits.push(h);
  }
  let forcedTier: UrgencyTier | null = null;
  for (const h of hits) {
    if (forcedTier === null) forcedTier = h.forcedTier;
    else {
      // Always keep the most urgent.
      const order: UrgencyTier[] = ["EMERGENCY", "AANDE", "GP_URGENT", "GP_ROUTINE", "SELF_CARE"];
      forcedTier = order.indexOf(h.forcedTier) < order.indexOf(forcedTier) ? h.forcedTier : forcedTier;
    }
  }
  return { hits, forcedTier };
}
