"use client";

/**
 * BUILD 5 — Body Diagram Input.
 * Click regions (head/face/neck/chest/abdomen/back/pelvis/arms/legs) to mark
 * pain locations. Selected regions are fed to the triage profile as context.
 */
import { BodyRegion } from "@/lib/types";

const REGION_LABEL: Record<BodyRegion, string> = {
  head: "Head",
  face: "Face",
  neck: "Neck",
  chest: "Chest",
  abdomen: "Abdomen",
  back: "Back",
  pelvis: "Pelvis",
  "left-arm": "Left arm",
  "right-arm": "Right arm",
  "left-leg": "Left leg",
  "right-leg": "Right leg",
  general: "General",
};

export function BodyDiagram({
  selected,
  onToggle,
}: {
  selected: BodyRegion[];
  onToggle: (r: BodyRegion) => void;
}) {
  const on = (r: BodyRegion) => selected.includes(r);
  const fill = (r: BodyRegion) => (on(r) ? "#2f83f7" : "#e8eef6");
  const stroke = (r: BodyRegion) => (on(r) ? "#1b63e0" : "#cbd5e1");

  const region = (r: BodyRegion, node: React.ReactNode) => (
    <g
      role="button"
      tabIndex={0}
      aria-label={REGION_LABEL[r]}
      aria-pressed={on(r)}
      onClick={() => onToggle(r)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(r);
        }
      }}
      className="cursor-pointer outline-none transition [&>*]:transition-colors focus-visible:opacity-80"
    >
      {node}
    </g>
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 220 420" width="200" height="382" className="select-none">
        {/* Head */}
        {region("head", <circle cx="110" cy="34" r="24" fill={fill("head")} stroke={stroke("head")} strokeWidth="2" />)}
        {/* Face (inner) */}
        {region(
          "face",
          <circle cx="110" cy="40" r="11" fill={fill("face")} stroke={stroke("face")} strokeWidth="1.6" />
        )}
        {/* Neck */}
        {region("neck", <rect x="100" y="58" width="20" height="16" rx="4" fill={fill("neck")} stroke={stroke("neck")} strokeWidth="2" />)}
        {/* Chest */}
        {region("chest", <rect x="74" y="74" width="72" height="56" rx="12" fill={fill("chest")} stroke={stroke("chest")} strokeWidth="2" />)}
        {/* Abdomen */}
        {region("abdomen", <rect x="78" y="132" width="64" height="50" rx="10" fill={fill("abdomen")} stroke={stroke("abdomen")} strokeWidth="2" />)}
        {/* Pelvis */}
        {region("pelvis", <rect x="80" y="184" width="60" height="30" rx="10" fill={fill("pelvis")} stroke={stroke("pelvis")} strokeWidth="2" />)}
        {/* Left arm (patient's left = viewer right) */}
        {region("left-arm", <rect x="150" y="78" width="20" height="96" rx="10" fill={fill("left-arm")} stroke={stroke("left-arm")} strokeWidth="2" />)}
        {/* Right arm */}
        {region("right-arm", <rect x="50" y="78" width="20" height="96" rx="10" fill={fill("right-arm")} stroke={stroke("right-arm")} strokeWidth="2" />)}
        {/* Left leg */}
        {region("left-leg", <rect x="112" y="216" width="24" height="150" rx="12" fill={fill("left-leg")} stroke={stroke("left-leg")} strokeWidth="2" />)}
        {/* Right leg */}
        {region("right-leg", <rect x="84" y="216" width="24" height="150" rx="12" fill={fill("right-leg")} stroke={stroke("right-leg")} strokeWidth="2" />)}
      </svg>

      <div className="flex flex-wrap justify-center gap-1.5">
        {(["back", "general"] as BodyRegion[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onToggle(r)}
            className={`chip ${on(r) ? "!border-brand-300 !bg-brand-50 !text-brand-700" : ""}`}
          >
            {REGION_LABEL[r]}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <p className="text-center text-xs text-muted">
          Marked: <span className="font-medium text-ink">{selected.map((r) => REGION_LABEL[r]).join(", ")}</span>
        </p>
      )}
    </div>
  );
}
