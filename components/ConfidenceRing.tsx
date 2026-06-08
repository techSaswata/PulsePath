/** Build 7 — radial confidence indicator. */
export function ConfidenceRing({ value, size = 88 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const color = v >= 85 ? "#16a34a" : v >= 65 ? "#0891b2" : v >= 45 ? "#d97706" : "#dc2626";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-ink">{v}%</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">confidence</span>
      </div>
    </div>
  );
}
