import { UrgencyTier, URGENCY_META } from "@/lib/types";

/** Tailwind-friendly style tokens for each tier (shared by badges/banners). */
export function urgencyStyles(tier: UrgencyTier): {
  bg: string;
  text: string;
  ring: string;
  solid: string;
  label: string;
  short: string;
} {
  const map: Record<UrgencyTier, { bg: string; text: string; ring: string; solid: string }> = {
    EMERGENCY: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", solid: "bg-red-600" },
    AANDE: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200", solid: "bg-orange-600" },
    GP_URGENT: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", solid: "bg-amber-500" },
    GP_ROUTINE: { bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-200", solid: "bg-cyan-600" },
    SELF_CARE: { bg: "bg-green-50", text: "text-green-700", ring: "ring-green-200", solid: "bg-green-600" },
  };
  return { ...map[tier], label: URGENCY_META[tier].label, short: URGENCY_META[tier].short };
}
