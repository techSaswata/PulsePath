"use client";

/**
 * BUILD 1 (conversational intake + adaptive questions) — orchestrates the whole
 * patient-facing triage flow, wiring in:
 *   Build 4 (voice in/out), Build 5 (body diagram), Build 6 (live timeline),
 *   and rendering Build 7 (AssessmentView) when complete.
 *
 * State (profile + transcript) is held client-side and sent to /api/triage each
 * turn, so the conversation works with or without a database.
 */
import { useEffect, useRef, useState } from "react";
import {
  BodyRegion,
  ChatMessage,
  ClarifyingQuestion,
  SymptomProfile,
  TriageAssessment,
  emptyProfile,
} from "@/lib/types";
import { BodyDiagram } from "@/components/BodyDiagram";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { SpeakButton } from "@/components/SpeakButton";
import { Timeline } from "@/components/Timeline";
import { AssessmentView } from "@/components/AssessmentView";

const GREETING =
  "Hi, I'm your PulsePath triage assistant. I'll ask a few questions to understand your symptoms and point you to the right level of care. To start — what's the main problem that's troubling you today?";

export function TriageChat() {
  const [profile, setProfile] = useState<SymptomProfile>(emptyProfile());
  const [transcript, setTranscript] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [question, setQuestion] = useState<ClarifyingQuestion | null>(null);
  const [input, setInput] = useState("");
  const [turnCount, setTurnCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [thinking, setThinking] = useState(false);
  const [assessment, setAssessment] = useState<TriageAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viaVoice, setViaVoice] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, thinking, assessment]);

  function toggleRegion(r: BodyRegion) {
    setProfile((p) => ({
      ...p,
      bodyRegions: p.bodyRegions.includes(r)
        ? p.bodyRegions.filter((x) => x !== r)
        : [...p.bodyRegions, r],
    }));
  }

  async function send(text: string, forceAssess = false) {
    const message = text.trim();
    if (!message && !forceAssess) return;
    setError(null);
    setQuestion(null);
    if (message) setTranscript((t) => [...t, { role: "patient", content: message }]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          profile,
          message,
          turnCount,
          forceAssess,
          viaVoice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setSessionId(data.sessionId);
      if (data.profile) setProfile(data.profile);
      setViaVoice(false);

      if (data.done) {
        setAssessment(data.assessment as TriageAssessment);
      } else {
        setTurnCount(data.turnCount ?? turnCount + 1);
        setTranscript((t) => [...t, { role: "assistant", content: data.assistantMessage }]);
        if (data.question) setQuestion(data.question as ClarifyingQuestion);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setThinking(false);
    }
  }

  function reset() {
    setProfile(emptyProfile());
    setTranscript([{ role: "assistant", content: GREETING }]);
    setQuestion(null);
    setInput("");
    setTurnCount(0);
    setSessionId(undefined);
    setAssessment(null);
    setError(null);
  }

  const present = profile.associatedSymptoms.filter((s) => s.present);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      {/* ---- Left: conversation / assessment ---- */}
      <div className="card flex h-[72vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-ink">
              {assessment ? "Assessment complete" : "Triage conversation"}
            </span>
          </div>
          <button onClick={reset} className="text-xs font-medium text-muted hover:text-ink">
            Start over
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {transcript.map((m, i) => (
            <Bubble key={i} role={m.role}>
              <div className="flex items-start gap-2">
                <span>{m.content}</span>
                {m.role === "assistant" && <SpeakButton text={m.content} />}
              </div>
            </Bubble>
          ))}

          {question && !assessment && (
            <div className="ml-1 animate-rise rounded-xl border border-brand-100 bg-brand-50/60 p-3">
              <p className="text-sm font-medium text-ink">{question.question}</p>
              {question.rationale && (
                <p className="mt-1 text-xs text-muted">
                  <span className="font-semibold">Why I'm asking:</span> {question.rationale}
                </p>
              )}
              {question.options && question.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {question.options.map((opt) => (
                    <button key={opt} onClick={() => send(opt)} className="chip hover:!bg-brand-100">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {thinking && (
            <Bubble role="assistant">
              <span className="inline-flex gap-1">
                <span className="dot h-2 w-2 rounded-full bg-brand-400" style={{ animationDelay: "0s" }} />
                <span className="dot h-2 w-2 rounded-full bg-brand-400" style={{ animationDelay: "0.2s" }} />
                <span className="dot h-2 w-2 rounded-full bg-brand-400" style={{ animationDelay: "0.4s" }} />
              </span>
            </Bubble>
          )}

          {assessment && (
            <div className="animate-rise">
              <AssessmentView assessment={assessment} profile={profile} sessionId={sessionId} />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        {!assessment && (
          <div className="border-t border-hairline p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Describe your symptoms…"
                disabled={thinking}
                className="input max-h-32 flex-1 resize-none"
              />
              <VoiceRecorder
                disabled={thinking}
                onTranscript={(text) => {
                  setViaVoice(true);
                  setInput((cur) => (cur ? cur + " " + text : text));
                }}
              />
              <button onClick={() => send(input)} disabled={thinking || !input.trim()} className="btn-primary">
                Send
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <p className="text-[11px] text-muted">
                {turnCount > 0 ? `${turnCount} question${turnCount === 1 ? "" : "s"} asked` : "Type or use voice"}
              </p>
              {profile.primaryComplaint && (
                <button onClick={() => send("", true)} disabled={thinking} className="text-[11px] font-medium text-brand-600 hover:underline">
                  Skip questions & assess now →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---- Right: structured profile / body diagram / timeline ---- */}
      <div className="space-y-5">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Where does it hurt?</h3>
          <p className="mb-3 text-xs text-muted">
            Tap the body to mark pain locations — this gives the AI extra context.
          </p>
          <BodyDiagram selected={profile.bodyRegions} onToggle={toggleRegion} />
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Live symptom profile</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Complaint" value={profile.primaryComplaint || "—"} />
            <Row label="Onset" value={profile.onset || "—"} />
            <Row
              label="Severity"
              value={profile.severity ? `${profile.severity}${profile.severityScore != null ? ` (${profile.severityScore}/10)` : ""}` : "—"}
            />
            <Row label="Present" value={present.length ? present.map((s) => s.name).join(", ") : "—"} />
          </dl>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Symptom timeline</h3>
          <Timeline events={profile.timeline} />
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, children }: { role: ChatMessage["role"]; children: React.ReactNode }) {
  const isPatient = role === "patient";
  return (
    <div className={`flex animate-rise ${isPatient ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isPatient ? "bg-brand-600 text-white" : "bg-slate-100 text-ink"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="label">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
