"use client";

/**
 * BUILD 4 — Text-to-speech playback (Sarvam bulbul).
 * Speaks the assistant's message so it "feels like talking to a real nurse".
 */
import { useState } from "react";

export function SpeakButton({ text }: { text: string }) {
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);

  async function speak() {
    if (busy || playing) return;
    setBusy(true);
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "TTS failed");
      const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
      setPlaying(true);
      audio.onended = () => setPlaying(false);
      await audio.play();
    } catch {
      // Silent: voice is an enhancement, not required.
      setPlaying(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={speak}
      title="Read aloud"
      className="rounded-full p-1.5 text-muted transition hover:bg-slate-100 hover:text-brand-600"
    >
      {playing ? <WaveIcon /> : <SpeakerIcon />}
    </button>
  );
}

function SpeakerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  );
}
function WaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-brand-600">
      <path d="M4 12h2l2-5 4 14 3-9 2 4h3" />
    </svg>
  );
}
