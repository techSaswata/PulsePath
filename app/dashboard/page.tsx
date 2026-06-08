"use client";

/**
 * BUILD 10 — Provider Dashboard (list view).
 * Lists assessed triage sessions with urgency, confidence and guardrail flags.
 * Clicking a row opens the full clinician summary.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { UrgencyTier } from "@/lib/types";

interface CaseRow {
  id: string;
  final_tier: UrgencyTier | null;
  confidence: number | null;
  guardrail_override: boolean | null;
  created_at: string;
  presenting_complaint: string;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Provider Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Assessed triage cases, newest first.</p>
        </div>
        <Link href="/" className="btn-ghost">
          New triage
        </Link>
      </div>

      {/* Tier summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["EMERGENCY", "AANDE", "GP_URGENT", "GP_ROUTINE", "SELF_CARE"] as UrgencyTier[]).map((t) => (
          <div key={t} className="card p-4">
            <UrgencyBadge tier={t} size="sm" />
            <p className="mt-2 text-2xl font-bold text-ink">{counts[t] ?? 0}</p>
          </div>
        ))}
      </div>

      {!configured && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Supabase isn't configured, so saved cases can't be listed. Fill in the Supabase keys in{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> and run the SQL in{" "}
          <code className="rounded bg-amber-100 px-1">/sql</code>. Live triage still works without it.
        </div>
      )}

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
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && cases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted">
                  No assessed cases yet. Complete a triage on the home page.
                </td>
              </tr>
            )}
            {cases.map((c) => (
              <tr key={c.id} className="border-b border-hairline last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link href={`/dashboard/${c.id}`} className="font-medium text-brand-700 hover:underline">
                    {c.presenting_complaint || "—"}
                  </Link>
                </td>
                <td className="px-5 py-3">{c.final_tier && <UrgencyBadge tier={c.final_tier} size="sm" />}</td>
                <td className="px-5 py-3 text-ink">{c.confidence != null ? `${c.confidence}%` : "—"}</td>
                <td className="px-5 py-3">
                  {c.guardrail_override ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-200">
                      ⚠ guardrail
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-muted">{new Date(c.created_at).toLocaleString()}</td>
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
