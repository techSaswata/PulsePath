"use client";

/**
 * BUILD 10 — Provider Dashboard (list view).
 * Lists assessed triage sessions with urgency, confidence and guardrail flags.
 * Clicking a row opens the full clinician summary.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { URGENCY_ORDER, UrgencyTier } from "@/lib/types";

interface CaseRow {
  id: string;
  final_tier: UrgencyTier | null;
  confidence: number | null;
  guardrail_override: boolean | null;
  created_at: string;
  presenting_complaint: string;
}

const TIER_LABELS: Record<UrgencyTier, string> = {
  EMERGENCY: "Emergency",
  AANDE: "A&E",
  GP_URGENT: "GP Urgent",
  GP_ROUTINE: "GP Routine",
  SELF_CARE: "Self-care",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ConfidencePill({ value }: { value: number }) {
  const color =
    value >= 85 ? "bg-green-100 text-green-700" :
    value >= 65 ? "bg-cyan-100 text-cyan-700" :
    value >= 45 ? "bg-amber-100 text-amber-700" :
    "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}>
      {value}%
    </span>
  );
}

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UrgencyTier | "ALL">("ALL");

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((d) => {
        setCases(d.cases ?? []);
        setConfigured(d.configured);
      })
      .finally(() => setLoading(false));
  }, []);

  const counts = countByTier(cases);
  const filtered = filter === "ALL" ? cases : cases.filter((c) => c.final_tier === filter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Provider Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {cases.length > 0 ? `${cases.length} assessed case${cases.length === 1 ? "" : "s"}, newest first.` : "Assessed triage cases."}
          </p>
        </div>
        <Link href="/triage" className="btn-primary">
          New triage
        </Link>
      </div>

      {/* Tier summary cards — clickable to filter */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {URGENCY_ORDER.map((t) => (
          <button
            key={t}
            onClick={() => setFilter((f) => (f === t ? "ALL" : t))}
            className={`card p-4 text-left transition hover:shadow-float ${filter === t ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}
          >
            <UrgencyBadge tier={t} size="sm" />
            <p className="mt-2 text-2xl font-bold text-ink">{counts[t] ?? 0}</p>
            <p className="text-[10px] text-muted">{TIER_LABELS[t]}</p>
          </button>
        ))}
      </div>

      {/* Active filter indicator */}
      {filter !== "ALL" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Filtering by:</span>
          <UrgencyBadge tier={filter} size="sm" />
          <button
            onClick={() => setFilter("ALL")}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {!configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Supabase isn't configured — saved cases can't be listed. Fill in the Supabase keys in{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> and run{" "}
          <code className="rounded bg-amber-100 px-1">/sql</code>. Live triage still works without it.
        </div>
      )}

      {/* Cases table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Presenting complaint</th>
              <th className="px-5 py-3 font-semibold">Urgency</th>
              <th className="px-5 py-3 font-semibold">Confidence</th>
              <th className="px-5 py-3 font-semibold">Flags</th>
              <th className="px-5 py-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-muted">
                    <svg className="h-5 w-5 animate-spin text-brand-400" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Loading cases…
                  </div>
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center">
                  <div className="inline-flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <svg className="h-7 w-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-ink">
                        {filter !== "ALL" ? `No ${TIER_LABELS[filter]} cases` : "No assessed cases yet"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {filter !== "ALL" ? (
                          <button onClick={() => setFilter("ALL")} className="text-brand-600 hover:underline">
                            Show all cases
                          </button>
                        ) : (
                          <>Complete a triage to see cases here.</>
                        )}
                      </p>
                    </div>
                    {filter === "ALL" && (
                      <Link href="/triage" className="btn-primary text-xs">
                        Start first triage
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="group border-b border-hairline last:border-0 transition hover:bg-slate-50/80">
                <td className="px-5 py-3.5">
                  <Link
                    href={`/dashboard/${c.id}`}
                    className="font-medium text-brand-700 group-hover:underline"
                  >
                    {c.presenting_complaint || "—"}
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  {c.final_tier && <UrgencyBadge tier={c.final_tier} size="sm" />}
                </td>
                <td className="px-5 py-3.5">
                  {c.confidence != null ? <ConfidencePill value={c.confidence} /> : <span className="text-muted">—</span>}
                </td>
                <td className="px-5 py-3.5">
                  {c.guardrail_override ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-200">
                      ⚠ guardrail
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-muted" title={new Date(c.created_at).toLocaleString()}>
                    {timeAgo(c.created_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function countByTier(cases: CaseRow[]): Partial<Record<UrgencyTier, number>> {
  const out: Partial<Record<UrgencyTier, number>> = {};
  for (const c of cases) if (c.final_tier) out[c.final_tier] = (out[c.final_tier] ?? 0) + 1;
  return out;
}
