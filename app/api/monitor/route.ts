/**
 * BUILD 12 — Continuous monitoring cron endpoint.
 *
 * GET  /api/monitor?secret=...  → advances all due follow-ups (marks them sent).
 *      Wire this to a scheduler (Vercel Cron, GitHub Action, etc.).
 * POST /api/monitor             → record a patient's follow-up response, re-assess,
 *      and escalate if the new tier is more urgent.
 *
 * Authorize the cron GET with CRON_SECRET to prevent public triggering.
 */
import { NextRequest, NextResponse } from "next/server";
import { appEnv } from "@/lib/config/env";
import {
  getDueFollowUps,
  markSent,
  recordFollowUpResponse,
} from "@/lib/monitoring/followups";
import { assess } from "@/lib/triage/assess";
import { getSessionFull } from "@/lib/db/sessions";
import { extractProfile } from "@/lib/triage/intake";
import { UrgencyTier } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby cap

export async function GET(req: NextRequest) {
  const expected = appEnv().cronSecret;
  if (expected) {
    // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically.
    // Also accept `?secret=` for manual / local invocation.
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const query = req.nextUrl.searchParams.get("secret");
    if (bearer !== expected && query !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const due = await getDueFollowUps();
  await Promise.all(due.map((f) => markSent(f.id)));
  return NextResponse.json({
    ok: true,
    processed: due.length,
    followUps: due.map((f) => ({ id: f.id, sessionId: f.session_id, label: f.label })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { followUpId, sessionId, response, originalTier } = (await req.json()) as {
      followUpId: string;
      sessionId: string;
      response: string;
      originalTier: UrgencyTier;
    };
    if (!followUpId || !sessionId || !response) {
      return NextResponse.json({ error: "followUpId, sessionId, response required" }, { status: 400 });
    }

    // Re-assess using the prior profile + the new follow-up response.
    const full = await getSessionFull(sessionId);
    const priorProfile = full?.session?.profile;
    if (!priorProfile) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const updated = await extractProfile(priorProfile, response);
    const assessment = await assess(updated);
    const { escalated } = await recordFollowUpResponse(
      followUpId,
      response,
      assessment.tier,
      originalTier
    );

    return NextResponse.json({ ok: true, escalated, newTier: assessment.tier, assessment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Monitor failed";
    console.error("[api/monitor]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
