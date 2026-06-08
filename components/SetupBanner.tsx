"use client";

import { useEffect, useState } from "react";

type Status = Record<string, boolean>;

/** Non-blocking banner that tells the operator which integrations need keys. */
export function SetupBanner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setStatus(d.integrations))
      .catch(() => {});
  }, []);

  if (!status || dismissed) return null;
  const missing = Object.entries(status)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  if (missing.length === 0) return null;

  return (
    <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <div>
        <span className="font-semibold text-amber-800">Setup:</span>{" "}
        <span className="text-amber-700">
          Not yet configured — {missing.join(", ")}. PulsePath still runs in degraded mode
          (guardrails work; RAG falls back to keyword search). Fill these in{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> for full capability.
        </span>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700">
        ✕
      </button>
    </div>
  );
}
