"use client";

/** Triage conversation progress indicator. */
export function TriageProgress({ current, max = 7 }: { current: number; max?: number }) {
  const pct = Math.min(1, current / max);
  const label =
    current === 0
      ? "Describe your symptoms to begin"
      : current >= max
        ? "Finalising assessment…"
        : `Question ${current} of ~${max}`;

  return (
    <div className="flex items-center gap-3 border-b border-hairline bg-slate-50/70 px-5 py-2.5">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.max(3, pct * 100)}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-[11px] font-medium text-muted">{label}</span>
    </div>
  );
}
