/**
 * Tests for the Emergency Guardrail Engine (Build 3).
 *
 * These cover the project's core safety invariant: the deterministic rules in
 * `runGuardrails` must fire on every emergency presentation (recall), must NOT
 * fire on benign presentations, and must always surface the most urgent tier.
 *
 * The engine is pure and synchronous — no LLM, DB or network — so these run
 * offline with no API keys.
 */

import { describe, expect, it } from "vitest";
import { buildSignalBag, runGuardrails } from "@/lib/guardrails/engine";
import {
  AssociatedSymptom,
  emptyProfile,
  GuardrailCondition,
  SymptomProfile,
} from "@/lib/types";

/** Build a SymptomProfile from a few free-text lines plus optional overrides. */
function profile(
  freeText: string[],
  overrides: Partial<SymptomProfile> = {}
): SymptomProfile {
  return { ...emptyProfile(), primaryComplaint: freeText[0] ?? "", freeText, ...overrides };
}

/** Convenience: which conditions fired for a given profile. */
function firedConditions(p: SymptomProfile): GuardrailCondition[] {
  return runGuardrails(p).hits.map((h) => h.condition);
}

describe("runGuardrails — emergency recall (each rule fires)", () => {
  const cases: Array<{ name: string; text: string[]; expect: GuardrailCondition }> = [
    {
      name: "heart attack: chest pain radiating to the arm with sweating",
      text: ["I have chest pain spreading to my left arm and I'm sweating"],
      expect: "HEART_ATTACK",
    },
    {
      name: "heart attack: crushing chest pain alone",
      text: ["crushing chest pain that won't go away"],
      expect: "HEART_ATTACK",
    },
    {
      name: "stroke: FAST features present",
      text: ["face drooping on one side, slurred speech, sudden weakness"],
      expect: "STROKE",
    },
    {
      name: "meningitis: thunderclap headache",
      text: ["the worst headache of my life came on suddenly"],
      expect: "MENINGITIS",
    },
    {
      name: "meningitis: meningism cluster with fever",
      text: ["high fever with a stiff neck and sensitive to light"],
      expect: "MENINGITIS",
    },
    {
      name: "sepsis: deterioration signs with fever",
      text: ["high fever, mottled skin and very fast breathing"],
      expect: "SEPSIS",
    },
    {
      name: "anaphylaxis: airway compromise in allergic context",
      text: ["my throat is closing and my tongue is swelling after eating peanuts"],
      expect: "ANAPHYLAXIS",
    },
    {
      name: "severe bleeding: uncontrolled haemorrhage",
      text: ["deep cut that won't stop bleeding"],
      expect: "SEVERE_BLEEDING",
    },
    {
      name: "suicide risk: disclosed intent",
      text: ["I want to die and have been thinking about how to kill myself"],
      expect: "SUICIDE_RISK",
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const result = runGuardrails(profile(c.text));
      expect(firedConditions(profile(c.text))).toContain(c.expect);
      // Every emergency rule forces the EMERGENCY tier.
      expect(result.forcedTier).toBe("EMERGENCY");
    });
  }
});

describe("runGuardrails — a fired hit is explainable", () => {
  it("returns rationale, matched signals and a patient action", () => {
    const result = runGuardrails(
      profile(["chest pain radiating down my left arm with cold sweat"])
    );
    const hit = result.hits.find((h) => h.condition === "HEART_ATTACK");
    expect(hit).toBeDefined();
    expect(hit!.forcedTier).toBe("EMERGENCY");
    expect(hit!.rationale.length).toBeGreaterThan(0);
    expect(hit!.matchedSignals.length).toBeGreaterThan(0);
    expect(hit!.patientAction.length).toBeGreaterThan(0);
  });
});

describe("runGuardrails — no false positives on benign presentations", () => {
  it("mild headache does not fire any guardrail", () => {
    const result = runGuardrails(profile(["I've had a mild headache for two days"]));
    expect(result.hits).toHaveLength(0);
    expect(result.forcedTier).toBeNull();
  });

  it("common cold does not fire any guardrail", () => {
    const result = runGuardrails(profile(["runny nose, mild sore throat and a slight cough"]));
    expect(result.hits).toHaveLength(0);
    expect(result.forcedTier).toBeNull();
  });

  it("isolated mild chest pain (no radiation / autonomic / crushing) does not fire heart attack", () => {
    const result = runGuardrails(profile(["mild chest pain when I press on it"]));
    expect(firedConditions(profile(["mild chest pain when I press on it"]))).not.toContain(
      "HEART_ATTACK"
    );
    expect(result.forcedTier).toBeNull();
  });

  it("an empty profile fires nothing", () => {
    const result = runGuardrails(emptyProfile());
    expect(result.hits).toHaveLength(0);
    expect(result.forcedTier).toBeNull();
  });
});

describe("runGuardrails — multiple hits and tier reconciliation", () => {
  it("collects all independent hits and keeps the most urgent tier", () => {
    const result = runGuardrails(
      profile([
        "chest pain radiating to my left arm with sweating",
        "I also want to die",
      ])
    );
    const conditions = result.hits.map((h) => h.condition);
    expect(conditions).toContain("HEART_ATTACK");
    expect(conditions).toContain("SUICIDE_RISK");
    expect(result.hits.length).toBeGreaterThanOrEqual(2);
    // EMERGENCY is the most urgent tier — it must win.
    expect(result.forcedTier).toBe("EMERGENCY");
  });
});

describe("negation — explicitly denied symptoms must NOT fire", () => {
  const cases: Array<{ name: string; text: string[]; notExpected: GuardrailCondition }> = [
    {
      name: "denied chest pain + shortness of breath does not fire heart attack",
      text: ["I have a bad headache, no chest pain and no shortness of breath"],
      notExpected: "HEART_ATTACK",
    },
    {
      name: "'denies' chest pain does not fire heart attack even with autonomic words",
      text: ["Patient denies chest pain but reports some sweating and nausea"],
      notExpected: "HEART_ATTACK",
    },
    {
      name: "denied meningism cluster does not fire meningitis",
      text: ["I have a headache but no stiff neck and I'm not sensitive to light"],
      notExpected: "MENINGITIS",
    },
    {
      name: "denied suicidal ideation does not fire suicide risk",
      text: ["No suicidal thoughts at all, I'm feeling much better today"],
      notExpected: "SUICIDE_RISK",
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const result = runGuardrails(profile(c.text));
      expect(firedConditions(profile(c.text))).not.toContain(c.notExpected);
      expect(result.forcedTier).toBeNull();
    });
  }
});

describe("negation — red-flag phrases with INTERNAL negation still fire (recall preserved)", () => {
  const cases: Array<{ name: string; text: string[]; expect: GuardrailCondition }> = [
    {
      name: "'can't breathe' still fires anaphylaxis",
      text: ["I can't breathe and my throat is closing after a bee sting"],
      expect: "ANAPHYLAXIS",
    },
    {
      name: "'won't stop bleeding' still fires severe bleeding",
      text: ["The wound won't stop bleeding no matter how hard I press"],
      expect: "SEVERE_BLEEDING",
    },
    {
      name: "'can't speak' still fires stroke",
      text: ["Suddenly I can't speak properly and my face is drooping"],
      expect: "STROKE",
    },
    {
      name: "'no reason to live' still fires suicide risk",
      text: ["I feel like there's no reason to live anymore"],
      expect: "SUICIDE_RISK",
    },
    {
      name: "'not passed urine' (with fever) still fires sepsis",
      text: ["High fever and I have not passed urine all day, feeling confused"],
      expect: "SEPSIS",
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const result = runGuardrails(profile(c.text));
      expect(firedConditions(profile(c.text))).toContain(c.expect);
      expect(result.forcedTier).toBe("EMERGENCY");
    });
  }
});

describe("buildSignalBag — signal extraction", () => {
  it("includes complaint, body regions, positive symptoms, timeline and free text (lowercased)", () => {
    const associated: AssociatedSymptom[] = [
      { name: "Sweating", present: true },
      { name: "Cough", present: false }, // pertinent negative — must be excluded
    ];
    const bag = buildSignalBag(
      profile(["Feeling Unwell"], {
        primaryComplaint: "Chest Pain",
        bodyRegions: ["chest"],
        associatedSymptoms: associated,
        timeline: [{ at: "2026-06-18T08:00:00Z", label: "Started", detail: "this morning" }],
        age: 57,
        pregnant: false,
        severityScore: 8,
      })
    );

    expect(bag.text).toContain("chest pain");
    expect(bag.text).toContain("chest");
    expect(bag.text).toContain("sweating");
    expect(bag.text).toContain("started this morning");
    expect(bag.text).toContain("feeling unwell");
    // Pertinent negatives are tracked separately, not dumped into the haystack.
    expect(bag.text).not.toContain("cough");
    // Everything is normalized to lowercase.
    expect(bag.text).toBe(bag.text.toLowerCase());

    expect(bag.age).toBe(57);
    expect(bag.pregnant).toBe(false);
    expect(bag.severityScore).toBe(8);
  });
});
