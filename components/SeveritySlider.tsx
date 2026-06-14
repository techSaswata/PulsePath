"use client";

import { useState } from "react";

const LABELS = [
  "None", "Minimal", "Mild", "Mild–moderate", "Moderate",
  "Moderate", "Moderate–severe", "Severe", "Severe", "Very severe", "Worst possible",
];
const EMOJI = ["😊", "🙂", "😐", "😕", "😟", "😣", "😖", "😫", "😩", "😰", "😱"];

const trackColor = (v: number) => {
  if (v <= 3) return "bg-green-500";
  if (v <= 5) return "bg-amber-500";
  if (v <= 7) return "bg-orange-500";
  return "bg-red-600";
};

export function SeveritySlider({ onAppend }: { onAppend: (text: string) => void }) {
  const [value, setValue] = useState<number | null>(null);
  const [used, setUsed] = useState(false);

  function handleAdd() {
    if (value === null) return;
    onAppend(`My pain / symptom severity is ${value}/10 (${LABELS[value].toLowerCase()})`);
    setUsed(true);
    setTimeout(() => setUsed(false), 2000);
  }

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">Pain / severity rating</h3>

      <div className="space-y-3">
        <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide text-muted">
          <span>0 — None</span>
          <span>10 — Worst</span>
        </div>

        {/* Track with coloured fill */}
        <div className="relative pt-1">
          <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-200 ${value !== null ? trackColor(value) : "bg-slate-200"}`}
              style={{ width: value !== null ? `${value * 10}%` : "0%" }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={value ?? 5}
            onChange={(e) => setValue(Number(e.target.value))}
            onMouseDown={() => { if (value === null) setValue(5); }}
            onTouchStart={() => { if (value === null) setValue(5); }}
            className="absolute inset-x-0 top-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => setValue(n)}
              className={`h-7 w-7 rounded-full text-xs font-semibold transition ${
                value === n
                  ? "bg-brand-600 text-white shadow-sm scale-110"
                  : "bg-slate-100 text-muted hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {value !== null ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{EMOJI[value]}</span>
              <div>
                <p className="text-sm font-bold text-ink">{value}/10</p>
                <p className="text-[11px] text-muted">{LABELS[value]}</p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                used
                  ? "bg-green-100 text-green-700"
                  : "bg-brand-600 text-white hover:bg-brand-700"
              }`}
            >
              {used ? "✓ Added" : "Add to message"}
            </button>
          </div>
        ) : (
          <p className="text-center text-[11px] text-muted">Tap a number or slide to rate</p>
        )}
      </div>
    </div>
  );
}
