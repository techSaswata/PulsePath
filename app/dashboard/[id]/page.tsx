"use client";

/**
 * BUILD 10 — Provider case detail.
 * Full clinician view: structured summary, symptoms, timeline, risk factors,
 * urgency, red flags, debate, evidence — plus the PDF handoff (Build 11).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChatMessage, SymptomProfile, TriageAssessment } from "@/lib/types";
import { AssessmentView } from "@/components/AssessmentView";
import { Timeline } from "@/components/Timeline";

interface FullSession {
  session: { id: string; profile: SymptomProfile } | null;
  messages: ChatMessage[];
  assessment: TriageAssessment | null;
}

export default function CaseDetail() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<FullSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/cases/${params.id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Not found");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="text-muted">Loading case…</p>;
  if (error || !data?.assessment || !data.session)
    return (
      <div>
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← Back to dashboard
        </Link>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {error || "Case data unavailable (Supabase may not be configured)."}
        </p>
      </div>
    );

  const { session, assessment, messages } = data;

  return (
    <div className="space-y-5">
      <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Clinician handoff</h1>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        {/* Left: structured summary */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">Patient summary</h3>
            <Field label="Presenting complaint" value={assessment.summary.presentingComplaint} />
            <Field
              label="History"
              value={
                [
                  assessment.summary.history.age != null ? `Age ${assessment.summary.history.age}` : null,
                  assessment.summary.history.sex,
                  assessment.summary.history.pregnant ? "pregnant" : null,
                  assessment.summary.history.conditions?.join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"
              }
            />
            <Field
              label="Medications"
              value={assessment.summary.history.medications?.join(", ") || "—"}
            />
            <Field label="Allergies" value={assessment.summary.history.allergies?.join(", ") || "—"} />
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">Timeline</h3>
            <Timeline events={assessment.summary.symptomTimeline} />
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">Conversation transcript</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-semibold capitalize text-muted">{m.role}: </span>
                  <span className="text-ink">{m.content}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: the full assessment */}
        <AssessmentView assessment={assessment} profile={session.profile} sessionId={session.id} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="label">{label}</p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  );
}
