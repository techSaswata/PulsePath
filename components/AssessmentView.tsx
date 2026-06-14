"use client";

/**
 * Renders a full TriageAssessment for the patient:
 *  - Build 7: urgency tier + confidence ring + ranked top-5 reasons
 *  - Build 3: emergency guardrail banner (when applied)
 *  - care pathway (what to do / tell provider / red flags)
 *  - Build 2: multi-agent debate transcript (collapsible)
 *  - Build 8/9: evidence citations + similar prior cases (collapsible)
 *  - Build 11: download PDF handoff report
 *  - Copy assessment summary to clipboard
 */
import { useState } from "react";
import { SymptomProfile, TriageAssessment, URGENCY_META } from "@/lib/types";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { ConfidenceRing } from "@/components/ConfidenceRing";
import { SpeakButton } from "@/components/SpeakButton";
import { urgencyStyles } from "@/lib/ui/urgency";

const AGENT_COLORS: Record<string, string> = {
  symptom: "bg-blue-50 text-blue-700",
  risk: "bg-amber-50 text-amber-700",
  differential: "bg-purple-50 text-purple-700",
  safety: "bg-red-50 text-red-700",
  final: "bg-green-50 text-green-700",
};

export function AssessmentView({
  assessment,
  profile,
  sessionId,
}: {
  assessment: TriageAssessment;
  profile: SymptomProfile;
  sessionId?: string;
}) {
  const a = assessment;
  const s = urgencyStyles(a.tier);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [debateOpen, setDebateOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, profile, assessment: a }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pulsepath-report.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    } finally {
      setDownloading(false);
    }
  }

  function copyToClipboard() {
    const meta = URGENCY_META[a.tier];
    const lines = [
      `PulsePath Triage Assessment`,
      `Urgency: ${meta.label} (${a.explainability.confidence}% confidence)`,
      ``,
      `Action: ${meta.action}`,
      ``,
      `Top reasons:`,
      ...a.explainability.topReasons.map((r, i) => `  ${i + 1}. ${r}`),
      ``,
      `What to do:`,
      ...a.carePathway.whatToDo.map((x) => `  • ${x}`),
      ``,
      `Red flags — seek help if:`,
      ...a.carePathway.redFlags.map((x) => `  • ${x}`),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="space-y-5">
      {/* --- Urgency + guardrail banner --- */}
      <div className={`rounded-2xl border ${s.ring} ${s.bg} p-5`}>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <ConfidenceRing value={a.explainability.confidence} />
            <div>
              <UrgencyBadge tier={a.tier} size="lg" />
              <h2 className="mt-1.5 text-xl font-bold text-ink">{s.label}</h2>
              <p className={`text-sm ${s.text}`}>{a.carePathway.whatToDo[0]}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SpeakButton text={`${s.label}. ${a.carePathway.whatToDo.join(". ")}`} />
            <button
              onClick={copyToClipboard}
              className={`btn-ghost text-xs transition ${copied ? "!bg-green-50 !text-green-700 !border-green-200" : ""}`}
            >
              {copied ? "✓ Copied" : "Copy summary"}
            </button>
            <button onClick={downloadPdf} disabled={downloading} className="btn-ghost text-xs">
              {downloading ? "Preparing…" : "PDF report"}
            </button>
          </div>
        </div>

        {a.guardrailOverride && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-white p-3 text-sm">
            <span className="mt-0.5 text-red-600">⚠</span>
            <p className="text-ink">
              An <strong>emergency safety guardrail</strong> was triggered and has set the urgency to{" "}
              <strong>{s.short}</strong>. This deterministic rule cannot be overridden by the AI (the AI alone
              proposed <strong>{urgencyStyles(a.aiProposedTier).short}</strong>).
            </p>
          </div>
        )}
      </div>

      {/* --- Guardrail hits --- */}
      {a.guardrailHits.length > 0 && (
        <Section title="Emergency patterns detected">
          <div className="space-y-2">
            {a.guardrailHits.map((g, i) => (
              <div key={i} className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-700">{g.condition.replace(/_/g, " ")}</p>
                <p className="text-sm text-ink">{g.rationale}</p>
                <p className="mt-1 text-sm font-medium text-red-700">{g.patientAction}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* --- Build 7: explainability --- */}
      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Why this assessment (top reasons)">
          <ol className="space-y-2">
            {a.explainability.topReasons.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink">
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ol>
          {a.explainability.uncertaintyDrivers.length > 0 && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="label">What could change this</p>
              <p className="mt-1 text-sm text-muted">{a.explainability.uncertaintyDrivers.join(" · ")}</p>
            </div>
          )}
        </Section>

        <Section title="Your care pathway">
          <PathGroup label="What to do" items={a.carePathway.whatToDo} />
          <PathGroup label="What to tell your provider" items={a.carePathway.whatToTellProvider} />
          <PathGroup label="Red flags — seek urgent help if these appear" items={a.carePathway.redFlags} danger />
        </Section>
      </div>

      {/* --- Differentials --- */}
      {a.differentials.length > 0 && (
        <Section title="Possible explanations being considered">
          <div className="grid gap-2 sm:grid-cols-2">
            {a.differentials.map((d, i) => (
              <div key={i} className="rounded-xl border border-hairline p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{d.condition}</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      d.likelihood === "high" ? "text-red-600" : d.likelihood === "moderate" ? "text-amber-600" : "text-muted"
                    }`}
                  >
                    {d.likelihood}
                  </span>
                </div>
                {d.supportingFeatures.length > 0 && (
                  <p className="mt-1 text-xs text-muted">{d.supportingFeatures.join(", ")}</p>
                )}
                <div className="mt-2">
                  <UrgencyBadge tier={d.worstCaseTier} size="sm" />
                  <span className="ml-1.5 text-[11px] text-muted">worst-case</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* --- Build 2: debate transcript (collapsible) --- */}
      <Collapsible
        title="How the AI care team reasoned (multi-agent debate)"
        open={debateOpen}
        onToggle={() => setDebateOpen((o) => !o)}
        badge={`${a.debate.length} agents`}
      >
        <div className="space-y-2.5">
          {a.debate.map((c, i) => (
            <div key={i} className="flex gap-3">
              <span
                className={`mt-0.5 flex-none rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  AGENT_COLORS[c.agent] ?? "bg-slate-50 text-slate-700"
                }`}
              >
                {c.agent}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{c.summary}</p>
                <p className="text-sm text-muted">{c.reasoning}</p>
              </div>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* --- Build 8/9: evidence + similar cases (collapsible) --- */}
      {(a.citations.length > 0 || a.similarCases.length > 0) && (
        <Collapsible
          title="Evidence & similar cases"
          open={evidenceOpen}
          onToggle={() => setEvidenceOpen((o) => !o)}
          badge={`${a.citations.length} guidelines · ${a.similarCases.length} similar cases`}
        >
          <div className="grid gap-5 md:grid-cols-2">
            {a.citations.length > 0 && (
              <div>
                <p className="label mb-2">Clinical guidelines</p>
                <ul className="space-y-2">
                  {a.citations.map((c, i) => (
                    <li key={i} className="rounded-xl border border-hairline p-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {c.source}
                        </span>
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-700 hover:underline">
                            {c.title}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-ink">{c.title}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted">{c.snippet}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {a.similarCases.length > 0 && (
              <div>
                <p className="label mb-2">Most similar previous cases</p>
                <ul className="space-y-2">
                  {a.similarCases.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-xl border border-hairline p-3">
                      <div>
                        <p className="text-sm text-ink">{c.presentingComplaint}</p>
                        {c.outcome && <p className="text-xs text-muted">{c.outcome}</p>}
                      </div>
                      <div className="text-right">
                        <UrgencyBadge tier={c.finalTier} size="sm" />
                        <p className="mt-1 text-[11px] text-muted">{Math.round(c.similarity * 100)}% match</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Collapsible>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card animate-rise p-5">
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Collapsible({
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="card animate-rise overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50/60"
      >
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {badge && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-muted">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 flex-none text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="border-t border-hairline px-5 pb-5 pt-4">{children}</div>}
    </section>
  );
}

function PathGroup({ label, items, danger }: { label: string; items: string[]; danger?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="mb-3 last:mb-0">
      <p className={`label ${danger ? "!text-red-600" : ""}`}>{label}</p>
      <ul className="mt-1 space-y-1">
        {items.map((x, i) => (
          <li key={i} className={`flex gap-2 text-sm ${danger ? "text-red-700" : "text-ink"}`}>
            <span className={danger ? "text-red-400" : "text-brand-400"}>•</span>
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}
