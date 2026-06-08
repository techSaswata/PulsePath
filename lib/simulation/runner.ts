/**
 * BONUS — Simulation runner.
 *
 * Two modes:
 *  - "full": run the entire pipeline (multi-agent debate + RAG + guardrails)
 *    on each synthetic patient. Highest fidelity, slower / uses LLM tokens.
 *  - "guardrails": run ONLY the deterministic guardrail engine. Instant, no
 *    LLM, and ideal for proving emergency recall = 100% in the test set, since
 *    every EMERGENCY archetype is designed to trip a hard rule.
 *
 * `concurrency` bounds parallel "full" runs so we don't hammer the LLM endpoint.
 */
import { UrgencyTier, urgencyRank } from "@/lib/types";
import { generatePatients, SyntheticPatient } from "@/lib/simulation/patients";
import { CaseResult, computeMetrics, SimMetrics } from "@/lib/simulation/metrics";
import { runGuardrails } from "@/lib/guardrails/engine";
import { assess } from "@/lib/triage/assess";

export type SimMode = "full" | "guardrails";

export interface SimRunResult {
  mode: SimMode;
  results: CaseResult[];
  metrics: SimMetrics;
}

function toResult(p: SyntheticPatient, predicted: UrgencyTier, guardrailOverride: boolean, confidence: number): CaseResult {
  const correct = predicted === p.expectedTier;
  const undertriage = urgencyRank(predicted) > urgencyRank(p.expectedTier); // less urgent than truth
  return {
    id: p.id,
    archetype: p.archetype,
    expectedTier: p.expectedTier,
    predictedTier: predicted,
    guardrailOverride,
    confidence,
    correct,
    undertriage,
  };
}

/** Guardrails-only: deterministic, instant, no LLM. */
export function runGuardrailSimulation(n: number, seed = 42): SimRunResult {
  const patients = generatePatients(n, seed);
  const results = patients.map((p) => {
    const gr = runGuardrails(p.profile);
    // With no LLM, default non-flagged cases to a conservative SELF_CARE baseline;
    // the point of this mode is to prove EMERGENCY recall via hard rules.
    const predicted: UrgencyTier = gr.forcedTier ?? "SELF_CARE";
    return toResult(p, predicted, !!gr.forcedTier, gr.forcedTier ? 99 : 50);
  });
  return { mode: "guardrails", results, metrics: computeMetrics(results) };
}

/** Full pipeline simulation with bounded concurrency. */
export async function runFullSimulation(
  n: number,
  seed = 42,
  concurrency = 4,
  onProgress?: (done: number, total: number) => void
): Promise<SimRunResult> {
  const patients = generatePatients(n, seed);
  const results: CaseResult[] = new Array(patients.length);
  let done = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < patients.length) {
      const i = cursor++;
      const p = patients[i];
      try {
        const a = await assess(p.profile);
        results[i] = toResult(p, a.tier, a.guardrailOverride, a.explainability.confidence);
      } catch (err) {
        // On failure, record a conservative guardrail-only fallback so the run completes.
        const gr = runGuardrails(p.profile);
        results[i] = toResult(p, gr.forcedTier ?? "SELF_CARE", !!gr.forcedTier, 0);
        console.warn(`[sim] case ${p.id} failed, used guardrail fallback:`, err);
      }
      done++;
      onProgress?.(done, patients.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, patients.length) }, () => worker()));
  return { mode: "full", results, metrics: computeMetrics(results) };
}
