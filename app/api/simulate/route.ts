/**
 * BONUS — Simulation API.
 * POST { n, mode: "full"|"guardrails", seed?, concurrency? }
 * Returns per-case results + metrics (confusion matrix, emergency recall).
 */
import { NextRequest, NextResponse } from "next/server";
import { runFullSimulation, runGuardrailSimulation } from "@/lib/simulation/runner";
import { supabaseAdmin, supabaseConfigured } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { n = 50, mode = "guardrails", seed = 42, concurrency = 4, persist = false } =
      (await req.json()) as {
        n?: number;
        mode?: "full" | "guardrails";
        seed?: number;
        concurrency?: number;
        persist?: boolean;
      };

    const cappedN = Math.max(1, Math.min(n, mode === "full" ? 200 : 5000));

    const run =
      mode === "full"
        ? await runFullSimulation(cappedN, seed, concurrency)
        : runGuardrailSimulation(cappedN, seed);

    if (persist && supabaseConfigured()) {
      await supabaseAdmin()
        .from("simulation_runs")
        .insert({
          label: `${mode} x${cappedN}`,
          n_patients: cappedN,
          metrics: run.metrics,
          results: run.results,
        });
    }

    return NextResponse.json(run);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Simulation failed";
    console.error("[api/simulate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
