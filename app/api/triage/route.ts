/**
 * BUILD 1 + 2 + 7 — Triage API.
 *
 * Stateless-friendly design: the client sends the full session (profile +
 * transcript) and a new patient message. The server:
 *   1. extracts structured data from the message (intake),
 *   2. either asks the next adaptive question, OR
 *   3. runs the full assessment (guardrails + multi-agent debate + RAG).
 *
 * Persistence is best-effort via Supabase; the API works without it.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  SymptomProfile,
  emptyProfile,
} from "@/lib/types";
import { extractProfile, processTurn } from "@/lib/triage/intake";
import { assess } from "@/lib/triage/assess";
import {
  addMessage,
  createSession,
  saveAssessment,
  saveProfile,
} from "@/lib/db/sessions";
import { indexCase } from "@/lib/rag/retrieve";
import { scheduleFollowUps } from "@/lib/monitoring/followups";

export const runtime = "nodejs";
export const maxDuration = 60; // multi-agent debate; 60 = Vercel Hobby cap (full triage ~32s)

interface TriageRequest {
  sessionId?: string;
  profile?: SymptomProfile;
  message?: string; // patient's new message (text or transcribed voice)
  turnCount?: number;
  /** If true, skip questioning and assess immediately (e.g. body diagram done). */
  forceAssess?: boolean;
  viaVoice?: boolean;
}

export async function POST(req: NextRequest) {
  let body: TriageRequest;
  try {
    body = (await req.json()) as TriageRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    let profile: SymptomProfile = body.profile ?? emptyProfile();
    const turnCount = body.turnCount ?? 0;

    // Ensure we have a session id (created lazily).
    let sessionId = body.sessionId;
    if (!sessionId) sessionId = await createSession(profile);

    // 1+2. Fold the message in AND decide the next step in ONE LLM call
    //      (processTurn). On forceAssess (Skip button) we don't need the LLM
    //      for the decision — go straight to assessment after folding in text.
    let step: {
      readyToAssess: boolean;
      guardrailTripped: boolean;
      assistantMessage: string;
      question?: import("@/lib/types").ClarifyingQuestion;
    };

    if (body.message && body.message.trim()) {
      const text = body.message.trim();
      await addMessage(sessionId, { role: "patient", content: text }, body.viaVoice ?? false);

      if (body.forceAssess) {
        profile = await extractProfile(profile, text);
        step = { readyToAssess: true, guardrailTripped: false, assistantMessage: "Preparing your assessment…" };
      } else {
        const turn = await processTurn(profile, text, turnCount);
        profile = turn.profile;
        step = {
          readyToAssess: turn.readyToAssess,
          guardrailTripped: turn.guardrailTripped,
          assistantMessage: turn.assistantMessage,
          question: turn.question,
        };
      }
      await saveProfile(sessionId, profile);
    } else {
      // No new message (e.g. body-diagram-only "assess now").
      step = { readyToAssess: true, guardrailTripped: false, assistantMessage: "Preparing your assessment…" };
    }

    if (!step.readyToAssess) {
      await addMessage(sessionId, { role: "assistant", content: step.assistantMessage });
      return NextResponse.json({
        sessionId,
        profile,
        done: false,
        assistantMessage: step.assistantMessage,
        question: step.question ?? null,
        turnCount: turnCount + 1,
      });
    }

    // 3. Full assessment.
    const assessment = await assess(profile);
    await addMessage(sessionId, { role: "assistant", content: assessment.carePathway.whatToDo.join(" ") });
    await saveAssessment(sessionId, profile, assessment);
    // Feed the case into the similar-case store for future retrieval (Build 9).
    void indexCase(sessionId, profile, assessment.tier).catch(() => {});
    // Schedule continuous-monitoring follow-ups for non-emergency tiers (Build 12).
    void scheduleFollowUps(sessionId, assessment.tier).catch(() => {});

    return NextResponse.json({
      sessionId,
      profile,
      done: true,
      guardrailTripped: step.guardrailTripped,
      assessment,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/triage]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
