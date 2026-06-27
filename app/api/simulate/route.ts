/**
 * BONUS — Simulation API.
 *
 * Two shapes, because the two modes have very different cost profiles:
 *
 *  - "guardrails": deterministic, instant, no LLM. Whole run in ONE request.
 *      POST { n, mode:"guardrails", seed? } → { mode, results, metrics }
 *
 *  - "full": runs the LLM pipeline (~30s+/patient), so it CANNOT finish N
 *      patients inside Vercel's 60s function limit. Instead it is processed
 *      one BATCH per request — the client calls repeatedly, advancing `offset`,
 *      and stitches the batches together (computing metrics client-side).
 *      POST { n, mode:"full", seed?, offset?, batch?, concurrency? }
 *        → { mode, results, offset, attempted, total, done, quotaExceeded, timedOut }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  runFullSlice,
  runGuardrailSimulation,
} from "@/lib/simulation/runner";
import { generatePatientSlice } from "@/lib/simulation/patients";
import { supabaseAdmin, supabaseConfigured } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby cap. Full mode stays well under this by processing ONE small batch per request.

// Server-side budget — return before Vercel kills the function, leaving margin
// for cold start + network so the client always gets a clean response.
const SLICE_DEADLINE_MS = 45_000;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      n?: number;
      mode?: "full" | "guardrails";
      seed?: number;
      concurrency?: number;
      persist?: boolean;
      offset?: number;
      batch?: number;
    };

    const mode = body.mode ?? "guardrails";
    const seed = body.seed ?? 42;
    const cappedN = Math.max(1, Math.min(body.n ?? 50, mode === "full" ? 200 : 5000));

    // ---- Full pipeline: one batch per request (Vercel-safe) ----------------
    if (mode === "full") {
      const offset = Math.max(0, Math.floor(body.offset ?? 0));
      // Default batch = 1: one ~30s assessment fits comfortably under 60s and
      // keeps within free-tier LLM rate limits. Raise on a paid tier.
      const batch = Math.max(1, Math.min(Math.floor(body.batch ?? 1), 8));
      const concurrency = Math.max(1, Math.min(body.concurrency ?? 1, batch));

      const slice = generatePatientSlice(cappedN, offset, batch, seed);
      const { results, quotaExceeded, timedOut } = await runFullSlice(
        slice,
        concurrency,
        SLICE_DEADLINE_MS
      );

      const attempted = slice.length;
      const done = quotaExceeded || offset + attempted >= cappedN;
      return NextResponse.json({
        mode: "full",
        results,
        offset,
        attempted,
        total: cappedN,
        done,
        quotaExceeded,
        timedOut,
      });
    }

    // ---- Guardrails only: deterministic, whole run in one request ----------
    const run = runGuardrailSimulation(cappedN, seed);

    if (body.persist && supabaseConfigured()) {
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
