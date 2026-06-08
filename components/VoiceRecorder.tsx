"use client";

/**
 * BUILD 4 — Voice Doctor input.
 * Records mic audio via MediaRecorder, posts the blob to /api/voice/stt
 * (Sarvam saarika), and returns the transcript to the parent.
 */
import { useRef, useState } from "react";

export function VoiceRecorder({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await transcribe(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
    } catch (e) {
      setError("Microphone access was denied or is unavailable.");
    }
  }

  function stop() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", blob, "recording.webm");
      const res = await fetch("/api/voice/stt", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      if (data.transcript) onTranscript(data.transcript);
      else setError("No speech detected. Please try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={recording ? stop : start}
        title={recording ? "Stop recording" : "Speak your symptoms"}
        className={`btn ${recording ? "bg-red-600 text-white hover:bg-red-700" : "btn-ghost"} ${
          busy ? "opacity-60" : ""
        }`}
      >
        {busy ? (
          <Spinner />
        ) : recording ? (
          <>
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> Stop
          </>
        ) : (
          <>
            <MicIcon /> Speak
          </>
        )}
      </button>
      {error && <span className="max-w-[200px] text-right text-[11px] text-red-600">{error}</span>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
