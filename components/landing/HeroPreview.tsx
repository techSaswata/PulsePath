import { URGENCY_ORDER, URGENCY_META } from "@/lib/types";
import { urgencyStyles } from "@/lib/ui/urgency";
import { ConfidenceRing } from "@/components/ConfidenceRing";

/**
 * A static, illustrative "assessment card" for the hero — shows the shape of a
 * real PulsePath result (urgency ladder + confidence + reasons) at a glance.
 */
export function HeroPreview() {
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-100/60 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="label">Example assessment</p>
            <p className="text-sm font-semibold text-ink">“Chest pain spreading to my left arm”</p>
          </div>
          <ConfidenceRing value={96} size={80} />
        </div>

        {/* Urgency ladder */}
        <div className="space-y-1.5">
          {URGENCY_ORDER.map((t) => {
            const s = urgencyStyles(t);
            const active = t === "EMERGENCY";
            return (
              <div
                key={t}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 transition ${
                  active ? `${s.bg} ${s.ring} ring-1` : "border-hairline opacity-60"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${s.solid}`} />
                  <span className={`text-sm ${active ? "font-semibold text-ink" : "text-muted"}`}>
                    {URGENCY_META[t].short}
                  </span>
                </span>
                {active && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    ⚠ guardrail
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="label">Why</p>
          <ul className="mt-1 space-y-1 text-xs text-muted">
            <li>1. Chest pain with radiation to the left arm + sweating</li>
            <li>2. Heart-attack guardrail matched (cannot be overridden)</li>
            <li>3. Pattern consistent with acute coronary syndrome</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
