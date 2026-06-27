/**
 * BONUS — Synthetic patient generator for the Triage Simulation Engine.
 *
 * Each archetype is a labelled vignette with a clinically-correct expected tier.
 * We generate variations (demographics, severity, phrasing) so a run can scale
 * to N patients while keeping a ground-truth label for every case. This powers
 * the confusion matrix and the headline "emergency recall" metric.
 *
 * Critically, the EMERGENCY archetypes encode the exact red-flag patterns the
 * guardrail engine must catch (stroke/MI/sepsis/meningitis/anaphylaxis/bleed),
 * so a correct system achieves 100% emergency recall.
 */

import { SymptomProfile, UrgencyTier, emptyProfile } from "@/lib/types";

export interface SyntheticPatient {
  id: string;
  expectedTier: UrgencyTier;
  archetype: string;
  profile: SymptomProfile;
}

interface Archetype {
  name: string;
  expectedTier: UrgencyTier;
  build: (rng: Rng) => SymptomProfile;
}

// --- tiny seeded RNG so runs are reproducible -------------------------------
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    // xorshift32
    this.s ^= this.s << 13;
    this.s ^= this.s >>> 17;
    this.s ^= this.s << 5;
    return (this.s >>> 0) / 0xffffffff;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  bool(p = 0.5): boolean {
    return this.next() < p;
  }
}

function base(rng: Rng): SymptomProfile {
  const p = emptyProfile();
  p.age = rng.int(18, 85);
  p.sex = rng.pick(["male", "female"]);
  return p;
}

// ---------------------------------------------------------------------------
// Archetypes. EMERGENCY ones must trip guardrails.
// ---------------------------------------------------------------------------

const ARCHETYPES: Archetype[] = [
  // --- EMERGENCY ---
  {
    name: "Acute MI (chest pain + radiation)",
    expectedTier: "EMERGENCY",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "crushing chest pain";
      p.bodyRegions = ["chest", "left-arm"];
      p.severity = "severe";
      p.severityScore = rng.int(8, 10);
      p.associatedSymptoms = [
        { name: "pain radiating to left arm", present: true },
        { name: "sweating", present: true },
        { name: "shortness of breath", present: rng.bool(0.8) },
      ];
      p.freeText = ["I have crushing chest pain spreading to my left arm and I'm sweating and short of breath"];
      return p;
    },
  },
  {
    name: "Stroke (FAST positive)",
    expectedTier: "EMERGENCY",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "sudden weakness on one side";
      p.bodyRegions = ["face", "right-arm"];
      p.associatedSymptoms = [
        { name: "facial droop", present: true },
        { name: "arm weakness", present: true },
        { name: "slurred speech", present: rng.bool(0.7) },
      ];
      p.freeText = ["My face is drooping on one side and my arm went weak suddenly, my speech is slurred"];
      return p;
    },
  },
  {
    name: "Meningitis (thunderclap + meningism)",
    expectedTier: "EMERGENCY",
    build: (rng) => {
      const p = base(rng);
      p.age = rng.int(16, 30);
      p.primaryComplaint = "worst headache of my life";
      p.bodyRegions = ["head", "neck"];
      p.severity = "severe";
      p.associatedSymptoms = [
        { name: "stiff neck", present: true },
        { name: "photophobia", present: true },
        { name: "high fever", present: rng.bool(0.8) },
        { name: "non-blanching rash", present: rng.bool(0.5) },
      ];
      p.freeText = ["The worst headache of my life came on suddenly, my neck is stiff and light hurts my eyes"];
      return p;
    },
  },
  {
    name: "Sepsis (infection + deterioration)",
    expectedTier: "EMERGENCY",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "feeling extremely unwell with fever";
      p.associatedSymptoms = [
        { name: "high fever", present: true },
        { name: "confused", present: true },
        { name: "very fast breathing", present: true },
        { name: "mottled skin", present: rng.bool(0.6) },
        { name: "chest infection", present: rng.bool(0.5) },
      ];
      p.freeText = ["I have a high fever, I feel confused, my breathing is very fast and my skin looks mottled"];
      return p;
    },
  },
  {
    name: "Anaphylaxis",
    expectedTier: "EMERGENCY",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "severe allergic reaction";
      p.associatedSymptoms = [
        { name: "throat closing", present: true },
        { name: "swollen tongue", present: true },
        { name: "hives all over", present: rng.bool(0.8) },
      ];
      p.allergies = ["peanuts"];
      p.freeText = ["My throat is closing and my tongue is swelling after eating, I have hives all over"];
      return p;
    },
  },
  // --- A&E TODAY ---
  {
    name: "Acute appendicitis",
    expectedTier: "AANDE",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "severe lower right abdominal pain";
      p.bodyRegions = ["abdomen"];
      p.severity = "severe";
      p.severityScore = rng.int(7, 9);
      p.durationHours = rng.int(12, 36);
      p.associatedSymptoms = [
        { name: "nausea", present: true },
        { name: "low-grade fever", present: true },
        { name: "pain worse on movement", present: true },
      ];
      p.freeText = ["Pain started near my belly button and moved to the lower right, worse when I move, I feel sick"];
      return p;
    },
  },
  {
    name: "Possible fracture (significant injury)",
    expectedTier: "AANDE",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "severe ankle pain after a fall, cannot bear weight";
      p.bodyRegions = [rng.pick(["left-leg", "right-leg"])];
      p.severity = "severe";
      p.associatedSymptoms = [
        { name: "swelling", present: true },
        { name: "cannot bear weight", present: true },
        { name: "deformity", present: rng.bool(0.4) },
      ];
      p.freeText = ["I fell and now I can't put any weight on my ankle, it's very swollen"];
      return p;
    },
  },
  // --- GP URGENT ---
  {
    name: "UTI with fever",
    expectedTier: "GP_URGENT",
    build: (rng) => {
      const p = base(rng);
      p.sex = "female";
      p.primaryComplaint = "burning when urinating with mild fever";
      p.bodyRegions = ["pelvis"];
      p.severity = "moderate";
      p.durationHours = rng.int(24, 72);
      p.associatedSymptoms = [
        { name: "frequent urination", present: true },
        { name: "mild fever", present: true },
        { name: "back pain", present: rng.bool(0.3) },
      ];
      p.freeText = ["It burns when I pee and I keep needing to go, I have a mild fever"];
      return p;
    },
  },
  {
    name: "Worsening asthma (no severe distress)",
    expectedTier: "GP_URGENT",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "asthma feels worse than usual the last 2 days";
      p.bodyRegions = ["chest"];
      p.conditions = ["asthma"];
      p.severity = "moderate";
      p.associatedSymptoms = [
        { name: "mild wheeze", present: true },
        { name: "using inhaler more", present: true },
        { name: "severe breathlessness", present: false },
      ];
      p.freeText = ["My asthma has been worse for two days and I'm using my inhaler more than normal"];
      return p;
    },
  },
  // --- GP ROUTINE ---
  {
    name: "Chronic knee pain",
    expectedTier: "GP_ROUTINE",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "ongoing knee pain for a few weeks";
      p.bodyRegions = [rng.pick(["left-leg", "right-leg"])];
      p.severity = "mild";
      p.durationHours = rng.int(336, 1000);
      p.associatedSymptoms = [
        { name: "stiffness in the morning", present: true },
        { name: "no swelling", present: false },
      ];
      p.freeText = ["My knee has been aching for a few weeks, stiff in the mornings, no swelling"];
      return p;
    },
  },
  {
    name: "Mild persistent rash",
    expectedTier: "GP_ROUTINE",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "itchy rash that's been there for 10 days";
      p.bodyRegions = ["general"];
      p.severity = "mild";
      p.associatedSymptoms = [
        { name: "itching", present: true },
        { name: "fever", present: false },
        { name: "rash fades under glass", present: true },
      ];
      p.freeText = ["I've had an itchy rash for about ten days, no fever, it fades when I press a glass on it"];
      return p;
    },
  },
  // --- SELF CARE ---
  {
    name: "Common cold",
    expectedTier: "SELF_CARE",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "runny nose, sneezing, mild sore throat";
      p.bodyRegions = ["head", "neck"];
      p.severity = "mild";
      p.durationHours = rng.int(24, 96);
      p.associatedSymptoms = [
        { name: "runny nose", present: true },
        { name: "mild sore throat", present: true },
        { name: "high fever", present: false },
        { name: "shortness of breath", present: false },
      ];
      p.freeText = ["I have a runny nose, sneezing and a mild sore throat, no high fever"];
      return p;
    },
  },
  {
    name: "Mild tension headache",
    expectedTier: "SELF_CARE",
    build: (rng) => {
      const p = base(rng);
      p.primaryComplaint = "mild headache after a long day at the screen";
      p.bodyRegions = ["head"];
      p.severity = "mild";
      p.associatedSymptoms = [
        { name: "tightness around the head", present: true },
        { name: "sudden severe onset", present: false },
        { name: "neck stiffness", present: false },
        { name: "fever", present: false },
      ];
      p.freeText = ["I have a mild dull headache after staring at screens all day, it eases with rest"];
      return p;
    },
  },
];

export function archetypeList(): { name: string; expectedTier: UrgencyTier }[] {
  return ARCHETYPES.map((a) => ({ name: a.name, expectedTier: a.expectedTier }));
}

/** Build the single patient at global index `i` (deterministic for a seed). */
function patientAt(i: number, seed: number): SyntheticPatient {
  const archetype = ARCHETYPES[i % ARCHETYPES.length];
  const rng = new Rng(seed + i * 2654435761);
  return {
    id: `sim-${i + 1}`,
    expectedTier: archetype.expectedTier,
    archetype: archetype.name,
    profile: archetype.build(rng),
  };
}

/** Generate N synthetic patients, cycling archetypes with varied seeds. */
export function generatePatients(n: number, seed = 42): SyntheticPatient[] {
  const out: SyntheticPatient[] = [];
  for (let i = 0; i < n; i++) out.push(patientAt(i, seed));
  return out;
}

/**
 * Generate the patients for global indices [offset, offset+limit), clamped to
 * `total`. Because every patient is derived purely from its global index, a
 * slice is bit-for-bit identical to the same indices of a full `generatePatients`
 * run — which is what lets the simulation be processed batch-by-batch across
 * multiple short serverless requests (Vercel's 60s function limit) without
 * changing the result.
 */
export function generatePatientSlice(
  total: number,
  offset: number,
  limit: number,
  seed = 42
): SyntheticPatient[] {
  const out: SyntheticPatient[] = [];
  const end = Math.min(offset + limit, total);
  for (let i = Math.max(0, offset); i < end; i++) out.push(patientAt(i, seed));
  return out;
}
