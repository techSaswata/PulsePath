/** Build 7 — radial confidence indicator. */
export function ConfidenceRing({ value, size = 88 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const stroke = Math.max(8, Math.round(size * 0.1));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  // Tiered palette — a gradient pair for the arc + a solid base for track/glow.
  const tier =
    v >= 85
      ? { from: "#34d399", to: "#16a34a", solid: "#16a34a" }
      : v >= 65
      ? { from: "#22d3ee", to: "#0891b2", solid: "#0891b2" }
      : v >= 45
      ? { from: "#fbbf24", to: "#d97706", solid: "#d97706" }
      : { from: "#f87171", to: "#dc2626", solid: "#dc2626" };

  // Scale the centered labels to the ring so "CONFIDENCE" always fits inside it.
  const numberSize = Math.round(size * 0.27);
  const pctSize = Math.round(numberSize * 0.6);
  const labelSize = Math.max(7, Math.round(size * 0.105));
  const gradId = `cr-grad-${Math.round(v)}-${size}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tier.from} />
            <stop offset="100%" stopColor={tier.to} />
          </linearGradient>
        </defs>
        {/* Continuous track — same hue, soft. Keeps the outer ring a closed circle (no white break). */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tier.solid}
          strokeOpacity={0.16}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress arc — gradient + soft glow. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.7s ease",
            filter: `drop-shadow(0 1px 2px ${tier.solid}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="flex items-baseline font-bold text-ink tabular-nums" style={{ fontSize: numberSize }}>
          {v}
          <span className="font-semibold" style={{ fontSize: pctSize }}>
            %
          </span>
        </span>
        <span
          className="font-semibold uppercase text-muted whitespace-nowrap"
          style={{ fontSize: labelSize, letterSpacing: "0.04em", marginTop: Math.round(size * 0.05) }}
        >
          confidence
        </span>
      </div>
    </div>
  );
}
