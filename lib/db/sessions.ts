/**
 * Session persistence helpers. All functions degrade to no-ops / in-memory
 * behaviour when Supabase isn't configured, so the product runs end-to-end
 * for a demo without a database, and persists for real once keys are filled.
 */

import { supabaseAdmin, supabaseConfigured } from "@/lib/db/supabase";
import {
  ChatMessage,
  SymptomProfile,
  TriageAssessment,
  UrgencyTier,
} from "@/lib/types";

export interface SessionRow {
  id: string;
  status: "in_progress" | "assessed" | "closed";
  profile: SymptomProfile;
  final_tier: UrgencyTier | null;
  confidence: number | null;
  created_at: string;
}

export async function createSession(profile: SymptomProfile): Promise<string> {
  if (!supabaseConfigured()) return cryptoId();
  const { data, error } = await supabaseAdmin()
    .from("triage_sessions")
    .insert({ profile })
    .select("id")
    .single();
  if (error) throw new Error(`[db] createSession: ${error.message}`);
  return data.id as string;
}

export async function saveProfile(sessionId: string, profile: SymptomProfile): Promise<void> {
  if (!supabaseConfigured()) return;
  const { error } = await supabaseAdmin()
    .from("triage_sessions")
    .update({ profile })
    .eq("id", sessionId);
  if (error) console.warn("[db] saveProfile:", error.message);
}

export async function addMessage(
  sessionId: string,
  msg: ChatMessage,
  viaVoice = false
): Promise<void> {
  if (!supabaseConfigured()) return;
  const { error } = await supabaseAdmin().from("messages").insert({
    session_id: sessionId,
    role: msg.role,
    content: msg.content,
    via_voice: viaVoice,
  });
  if (error) console.warn("[db] addMessage:", error.message);
}

export async function saveAssessment(
  sessionId: string,
  profile: SymptomProfile,
  assessment: TriageAssessment
): Promise<void> {
  if (!supabaseConfigured()) return;
  const sb = supabaseAdmin();
  const { error: aErr } = await sb.from("assessments").insert({
    session_id: sessionId,
    tier: assessment.tier,
    ai_proposed_tier: assessment.aiProposedTier,
    guardrail_override: assessment.guardrailOverride,
    confidence: assessment.explainability.confidence,
    payload: assessment,
  });
  if (aErr) console.warn("[db] saveAssessment(assessment):", aErr.message);

  const { error: sErr } = await sb
    .from("triage_sessions")
    .update({
      status: "assessed",
      profile,
      final_tier: assessment.tier,
      ai_proposed_tier: assessment.aiProposedTier,
      guardrail_override: assessment.guardrailOverride,
      confidence: assessment.explainability.confidence,
    })
    .eq("id", sessionId);
  if (sErr) console.warn("[db] saveAssessment(session):", sErr.message);
}

export async function getSessionFull(sessionId: string): Promise<{
  session: SessionRow | null;
  messages: ChatMessage[];
  assessment: TriageAssessment | null;
} | null> {
  if (!supabaseConfigured()) return null;
  const sb = supabaseAdmin();
  const { data: session } = await sb.from("triage_sessions").select("*").eq("id", sessionId).single();
  const { data: msgs } = await sb
    .from("messages")
    .select("role,content,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const { data: assessment } = await sb
    .from("assessments")
    .select("payload")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    session: (session as SessionRow) ?? null,
    messages: (msgs ?? []).map((m) => ({ role: m.role, content: m.content, at: m.created_at })),
    assessment: (assessment?.payload as TriageAssessment) ?? null,
  };
}

export interface DashboardRow {
  id: string;
  final_tier: UrgencyTier | null;
  confidence: number | null;
  guardrail_override: boolean | null;
  created_at: string;
  presenting_complaint: string;
}

export async function listAssessedSessions(limit = 50): Promise<DashboardRow[]> {
  if (!supabaseConfigured()) return [];
  const { data, error } = await supabaseAdmin()
    .from("triage_sessions")
    .select("id, final_tier, confidence, guardrail_override, created_at, profile")
    .eq("status", "assessed")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[db] listAssessedSessions:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    final_tier: r.final_tier,
    confidence: r.confidence,
    guardrail_override: r.guardrail_override,
    created_at: r.created_at,
    presenting_complaint: (r.profile as SymptomProfile)?.primaryComplaint ?? "—",
  }));
}

function cryptoId(): string {
  // RFC4122-ish without importing uuid; fine for ephemeral in-memory sessions.
  return "sess_" + Math.abs(hashString(String(Date.now()) + Math.floor(performance.now()))).toString(36);
}
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
