/**
 * BONUS — Simulation metrics: confusion matrix, per-tier precision/recall/F1,
 * overall accuracy, and the headline EMERGENCY RECALL (must be 100%).
 */
import { URGENCY_ORDER, UrgencyTier } from "@/lib/types";

export interface CaseResult {
  id: string;
  archetype: string;
  expectedTier: UrgencyTier;
  predictedTier: UrgencyTier;
  guardrailOverride: boolean;
  confidence: number;
  correct: boolean;
  /** True if a less-urgent prediction than expected (dangerous undertriage). */
  undertriage: boolean;
}

export interface SimMetrics {
  n: number;
  accuracy: number;
  emergencyRecall: number; // share of expected-EMERGENCY correctly flagged EMERGENCY
  emergencyCount: number;
  undertriageCount: number; // dangerous misses (predicted less urgent than truth)
  // confusion[expected][predicted] = count
  confusion: Record<UrgencyTier, Record<UrgencyTier, number>>;
  perTier: Record<UrgencyTier, { precision: number; recall: number; f1: number; support: number }>;
}

function zeroMatrix(): Record<UrgencyTier, Record<UrgencyTier, number>> {
  const m = {} as Record<UrgencyTier, Record<UrgencyTier, number>>;
  for (const e of URGENCY_ORDER) {
    m[e] = {} as Record<UrgencyTier, number>;
    for (const p of URGENCY_ORDER) m[e][p] = 0;
  }
  return m;
}

export function computeMetrics(results: CaseResult[]): SimMetrics {
  const confusion = zeroMatrix();
  let correct = 0;
  let undertriage = 0;
  for (const r of results) {
    confusion[r.expectedTier][r.predictedTier] += 1;
    if (r.correct) correct += 1;
    if (r.undertriage) undertriage += 1;
  }

  const perTier = {} as SimMetrics["perTier"];
  for (const tier of URGENCY_ORDER) {
    const tp = confusion[tier][tier];
    let fp = 0;
    let fn = 0;
    let support = 0;
    for (const other of URGENCY_ORDER) {
      if (other !== tier) fp += confusion[other][tier]; // predicted tier but truth other
      if (other !== tier) fn += confusion[tier][other]; // truth tier but predicted other
      support += confusion[tier][other]; // row total = all true-`tier` cases (incl. diagonal)
    }
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    perTier[tier] = { precision, recall, f1, support };
  }

  const emergencyCount = perTier.EMERGENCY.support;
  const emergencyRecall = emergencyCount ? perTier.EMERGENCY.recall : 1;

  return {
    n: results.length,
    accuracy: results.length ? correct / results.length : 0,
    emergencyRecall,
    emergencyCount,
    undertriageCount: undertriage,
    confusion,
    perTier,
  };
}
