"use client";

/**
 * BONUS — AI Triage Simulation Engine UI.
 * Generate N synthetic patients, run triage automatically, and visualise the
 * confusion matrix + the headline EMERGENCY RECALL metric (target: 100%).
 */
import { useState } from "react";
import { URGENCY_ORDER, URGENCY_META, UrgencyTier } from "@/lib/types";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { computeMetrics } from "@/lib/simulation/metrics";

interface CaseResult {
  id: string;
  archetype: string;
  expectedTier: UrgencyTier;
  predictedTier: UrgencyTier;
  guardrailOverride: boolean;
  confidence: number;
  correct: boolean;
  undertriage: boolean;
}
interface SimMetrics {
  n: number;
  accuracy: number;
  emergencyRecall: number;
  emergencyCount: number;
  undertriageCount: number;
  confusion: Record<UrgencyTier, Record<UrgencyTier, number>>;
  perTier: Record<UrgencyTier, { precision: number; recall: number; f1: number; support: number }>;
}
interface SimRun {
  mode: "full" | "guardrails";
  results: CaseResult[];
  metrics: SimMetrics;
}

export default function SimulationPage() {
  const [n, setN] = useState(60);
  const [mode, setMode] = useState<"full" | "guardrails">("guardrails");
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<SimRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function post(payload: Record<string, unknown>) {
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Simulation failed");
    return data;
  }

  async function start() {
    setRunning(true);
    setError(null);
    setRun(null);
    setProgress(null);
    try {
      if (mode === "guardrails") {
        // Deterministic + instant: whole run in one request.
        const data = await post({ n, mode, concurrency: 4 });
        setRun(data as SimRun);
      } else {
        // Full pipeline: process ONE batch per request so each call finishes
        // under Vercel's 60s limit, then stitch the batches together here.
        const total = Math.min(n, 200);
        const batch = 1;
        const acc: CaseResult[] = [];
        let offset = 0;
        setProgress({ done: 0, total });
        while (offset < total) {
          const data = (await post({ n: total, mode, seed: 42, offset, batch, concurrency: 1 })) as {
            results: CaseResult[];
            attempted: number;
            done: boolean;
            quotaExceeded: boolean;
            timedOut: boolean;
          };
          acc.push(...data.results);
          // Live-update so the confusion matrix fills in as cases complete.
          setRun({ mode: "full", results: [...acc], metrics: computeMetrics(acc) });
          setProgress({ done: acc.length, total });

          if (data.quotaExceeded) {
            setError(
              `LLM daily quota reached after ${acc.length} case(s) — showing partial results. ` +
                `Enable billing on the LLM key or switch to "Guardrails only" mode.`
            );
            break;
          }
          if (data.timedOut) {
            setError(`A case exceeded the time budget after ${acc.length} case(s) — showing partial results.`);
            break;
          }
          offset += data.attempted;
          if (data.done) break;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  const m = run?.metrics;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">AI Triage Simulation Engine</h1>
        <p className="mt-1 text-sm text-muted">
          Generate synthetic patients, run triage automatically, and validate that{" "}
          <strong>emergency recall = 100%</strong> via the confusion matrix.
        </p>
      </div>

      {/* Controls */}
      <div className="card flex flex-wrap items-end gap-4 p-5">
        <div>
          <label className="label">Patients</label>
          <input
            type="number"
            min={1}
            max={mode === "full" ? 200 : 5000}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="input mt-1 w-32"
          />
        </div>
        <div>
          <label className="label">Mode</label>
          <div className="mt-1 flex gap-1 rounded-xl border border-hairline p-1">
            {(["guardrails", "full"] as const).map((md) => (
              <button
                key={md}
                onClick={() => setMode(md)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  mode === md ? "bg-brand-600 text-white" : "text-muted hover:bg-slate-50"
                }`}
              >
                {md === "guardrails" ? "Guardrails only (instant)" : "Full pipeline (LLM)"}
              </button>
            ))}
          </div>
        </div>
        <button onClick={start} disabled={running} className="btn-primary">
          {running
            ? progress
              ? `Running… ${progress.done}/${progress.total}`
              : "Running…"
            : "Run simulation"}
        </button>
        {mode === "full" && (
          <p className="text-xs text-muted">
            Full mode runs the LLM pipeline one case at a time (~30s each) so it stays under Vercel&apos;s 60s limit.
            Results fill in live. On a free-tier LLM key, expect only a few cases before the daily quota stops the run.
          </p>
        )}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {m && (
        <>
          {/* Headline metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label="Emergency recall"
              value={`${(m.emergencyRecall * 100).toFixed(1)}%`}
              good={m.emergencyRecall >= 1}
              hint={`${m.emergencyCount} emergency cases`}
            />
            <Metric label="Overall accuracy" value={`${(m.accuracy * 100).toFixed(1)}%`} />
            <Metric
              label="Dangerous undertriage"
              value={String(m.undertriageCount)}
              good={m.undertriageCount === 0}
              hint="predicted less urgent than truth"
            />
            <Metric label="Patients" value={String(m.n)} />
          </div>

          {/* Confusion matrix */}
          <div className="card p-5">
            <h3 className="mb-1 text-sm font-semibold text-ink">Confusion matrix</h3>
            <p className="mb-3 text-xs text-muted">Rows = true tier, columns = predicted. Diagonal = correct.</p>
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1.5 text-left text-xs text-muted">true ↓ / pred →</th>
                    {URGENCY_ORDER.map((t) => (
                      <th key={t} className="px-3 py-1.5">
                        <UrgencyBadge tier={t} size="sm" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {URGENCY_ORDER.map((rowT) => (
                    <tr key={rowT}>
                      <td className="px-2 py-1.5">
                        <UrgencyBadge tier={rowT} size="sm" />
                      </td>
                      {URGENCY_ORDER.map((colT) => {
                        const v = m.confusion[rowT][colT];
                        const diag = rowT === colT;
                        return (
                          <td key={colT} className="px-3 py-1.5 text-center">
                            <span
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${
                                v === 0
                                  ? "text-slate-300"
                                  : diag
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                              title={`${URGENCY_META[rowT].short} → ${URGENCY_META[colT].short}: ${v}`}
                            >
                              {v}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-tier */}
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">Per-tier metrics</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2">Tier</th>
                  <th className="py-2">Support</th>
                  <th className="py-2">Precision</th>
                  <th className="py-2">Recall</th>
                  <th className="py-2">F1</th>
                </tr>
              </thead>
              <tbody>
                {URGENCY_ORDER.map((t) => (
                  <tr key={t} className="border-t border-hairline">
                    <td className="py-2">
                      <UrgencyBadge tier={t} size="sm" />
                    </td>
                    <td className="py-2 text-ink">{m.perTier[t].support}</td>
                    <td className="py-2 text-ink">{(m.perTier[t].precision * 100).toFixed(0)}%</td>
                    <td className="py-2 text-ink">{(m.perTier[t].recall * 100).toFixed(0)}%</td>
                    <td className="py-2 text-ink">{(m.perTier[t].f1 * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Misclassified cases */}
          {run!.results.some((r) => !r.correct) && (
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-ink">Misclassified cases</h3>
              <div className="space-y-1.5">
                {run!.results
                  .filter((r) => !r.correct)
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{r.archetype}</span>
                      <span className="flex items-center gap-2">
                        <UrgencyBadge tier={r.expectedTier} size="sm" />
                        <span className="text-muted">→</span>
                        <UrgencyBadge tier={r.predictedTier} size="sm" />
                        {r.undertriage && <span className="text-[11px] font-semibold text-red-600">undertriage</span>}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, good, hint }: { label: string; value: string; good?: boolean; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${good === true ? "text-green-600" : good === false ? "text-red-600" : "text-ink"}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
