import { UrgencyTier } from "@/lib/types";
import { urgencyStyles } from "@/lib/ui/urgency";

export function UrgencyBadge({ tier, size = "md" }: { tier: UrgencyTier; size?: "sm" | "md" | "lg" }) {
  const s = urgencyStyles(tier);
  const sz =
    size === "lg" ? "text-sm px-3.5 py-1.5" : size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-3 py-1";
  const emergency = tier === "EMERGENCY";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${s.bg} ${s.text} ${s.ring} ${sz}`}>
      <span className="relative flex items-center justify-center">
        {emergency && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${s.solid} opacity-60`} />
        )}
        <span className={`relative h-2 w-2 rounded-full ${s.solid}`} />
      </span>
      {s.short}
    </span>
  );
}
