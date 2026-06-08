/**
 * BUILD 12 — Continuous monitoring.
 *
 * For non-emergency tiers we schedule re-check follow-ups. If the patient
 * reports worsening symptoms at a follow-up, we re-assess and escalate.
 * The cron endpoint (/api/monitor) advances due follow-ups.
 */

import { supabaseAdmin, supabaseConfigured } from "@/lib/db/supabase";
import { UrgencyTier, urgencyRank } from "@/lib/types";

/** Re-check cadence per tier, in hours. Emergency/A&E are not "monitored" — they're sent to care. */
export const FOLLOWUP_SCHEDULE: Record<UrgencyTier, { hours: number; label: string }[]> = {
  EMERGENCY: [],
  AANDE: [],
  GP_URGENT: [{ hours: 6, label: "Re-check in 6h — confirm you've been seen or symptoms haven't worsened" }],
  GP_ROUTINE: [
    { hours: 24, label: "Re-check in 24h" },
    { hours: 72, label: "Re-check in 3 days" },
  ],
  SELF_CARE: [
    { hours: 6, label: "Re-check in 6h" },
    { hours: 24, label: "Re-check in 24h" },
    { hours: 72, label: "Re-check in 3 days" },
  ],
};

export async function scheduleFollowUps(
  sessionId: string,
  tier: UrgencyTier,
  now: Date = new Date()
): Promise<number> {
  if (!supabaseConfigured()) return 0;
  const plan = FOLLOWUP_SCHEDULE[tier];
  if (!plan.length) return 0;
  const rows = plan.map((p) => ({
    session_id: sessionId,
    due_at: new Date(now.getTime() + p.hours * 3600_000).toISOString(),
    label: p.label,
    status: "pending" as const,
  }));
  const { error } = await supabaseAdmin().from("follow_ups").insert(rows);
  if (error) {
    console.warn("[monitor] scheduleFollowUps:", error.message);
    return 0;
  }
  return rows.length;
}

export interface DueFollowUp {
  id: string;
  session_id: string;
  label: string;
  due_at: string;
}

export async function getDueFollowUps(now: Date = new Date()): Promise<DueFollowUp[]> {
  if (!supabaseConfigured()) return [];
  const { data, error } = await supabaseAdmin()
    .from("follow_ups")
    .select("id, session_id, label, due_at")
    .eq("status", "pending")
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true })
    .limit(100);
  if (error) {
    console.warn("[monitor] getDueFollowUps:", error.message);
    return [];
  }
  return (data ?? []) as DueFollowUp[];
}

/** Mark a follow-up as sent (the patient is prompted to re-check). */
export async function markSent(id: string): Promise<void> {
  if (!supabaseConfigured()) return;
  await supabaseAdmin().from("follow_ups").update({ status: "sent" }).eq("id", id);
}

/**
 * Record a patient's follow-up response and decide escalation. If the new tier
 * is more urgent than the original, mark escalated.
 */
export async function recordFollowUpResponse(
  followUpId: string,
  response: string,
  newTier: UrgencyTier,
  originalTier: UrgencyTier
): Promise<{ escalated: boolean }> {
  const escalated = urgencyRank(newTier) < urgencyRank(originalTier);
  if (!supabaseConfigured()) return { escalated };
  await supabaseAdmin()
    .from("follow_ups")
    .update({
      status: escalated ? "escalated" : "completed",
      response,
      outcome_tier: newTier,
      escalated,
    })
    .eq("id", followUpId);
  return { escalated };
}
