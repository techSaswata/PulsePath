/**
 * BUILD 6 — Medical Timeline.
 * Visual symptom progression: "started 3 days ago → worsened yesterday → fever today".
 */
import { Severity, TimelineEvent } from "@/lib/types";

const sevColor: Record<Severity, string> = {
  mild: "bg-green-500",
  moderate: "bg-amber-500",
  severe: "bg-red-500",
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-muted">No timeline captured yet.</p>;
  }
  return (
    <ol className="relative ml-2 border-l-2 border-hairline">
      {events.map((e, i) => (
        <li key={i} className="relative ml-5 pb-5 last:pb-0">
          <span
            className={`absolute -left-[1.65rem] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white ${
              e.severity ? sevColor[e.severity] : "bg-brand-500"
            }`}
          />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-ink">{e.label}</span>
            <span className="text-xs text-muted">{e.at}</span>
            {e.severity && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                {e.severity}
              </span>
            )}
          </div>
          {e.detail && <p className="mt-0.5 text-sm text-muted">{e.detail}</p>}
        </li>
      ))}
    </ol>
  );
}
