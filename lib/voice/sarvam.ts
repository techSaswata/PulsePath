import { sarvamEnv } from "@/lib/config/env";

/**
 * Sarvam AI voice client (server-side only — uses the secret subscription key).
 * Auth header is `api-subscription-key` (NOT Authorization: Bearer).
 */

export interface SarvamTranscript {
  transcript: string;
  languageCode: string | null;
  requestId: string | null;
}

/**
 * Speech-to-text. Accepts raw audio bytes + filename/mime.
 * Sync endpoint handles up to ~30s of audio.
 */
export async function sarvamSTT(
  audio: Buffer | Blob,
  opts?: { filename?: string; languageCode?: string; mimeType?: string }
): Promise<SarvamTranscript> {
  const env = sarvamEnv();
  const form = new FormData();

  const blob =
    audio instanceof Blob
      ? audio
      : new Blob([new Uint8Array(audio)], { type: opts?.mimeType ?? "audio/wav" });
  form.append("file", blob, opts?.filename ?? "recording.wav");
  form.append("model", env.sttModel);
  form.append("language_code", opts?.languageCode ?? "unknown");
  // `mode` is only valid for saaras:* models; harmless to include for transcribe.
  if (env.sttModel.startsWith("saaras")) form.append("mode", "transcribe");

  const res = await fetch(`${env.baseURL}/speech-to-text`, {
    method: "POST",
    headers: {
      // Do NOT set Content-Type — FormData sets the multipart boundary.
      "api-subscription-key": env.apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[sarvam:stt] ${res.status}: ${body}`);
  }
  const json = (await res.json()) as {
    transcript?: string;
    language_code?: string | null;
    request_id?: string | null;
  };
  return {
    transcript: json.transcript ?? "",
    languageCode: json.language_code ?? null,
    requestId: json.request_id ?? null,
  };
}

export interface SarvamSpeech {
  /** Concatenated base64 WAV audio. */
  audioBase64: string;
  mimeType: "audio/wav";
}

/**
 * Text-to-speech. Returns base64-encoded WAV.
 * bulbul:v2 caps text at 1500 chars; bulbul:v3 at 2500. We chunk long text.
 */
export async function sarvamTTS(
  text: string,
  opts?: { languageCode?: string; speaker?: string; sampleRate?: number }
): Promise<SarvamSpeech> {
  const env = sarvamEnv();
  const maxChars = env.ttsModel.startsWith("bulbul:v3") ? 2400 : 1400;
  const chunks = chunkText(text, maxChars);

  const audios: string[] = [];
  for (const chunk of chunks) {
    const res = await fetch(`${env.baseURL}/text-to-speech`, {
      method: "POST",
      headers: {
        "api-subscription-key": env.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: chunk,
        target_language_code: opts?.languageCode ?? env.ttsLanguage,
        speaker: opts?.speaker ?? env.ttsSpeaker,
        model: env.ttsModel,
        speech_sample_rate: opts?.sampleRate ?? env.ttsSampleRate,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[sarvam:tts] ${res.status}: ${body}`);
    }
    const json = (await res.json()) as { audios?: string[] };
    if (json.audios?.length) audios.push(...json.audios);
  }

  return { audioBase64: audios.join(""), mimeType: "audio/wav" };
}

/** Split on sentence boundaries, keeping each chunk under `maxChars`. */
function chunkText(text: string, maxChars: number): string[] {
  const clean = text.trim();
  if (clean.length <= maxChars) return [clean];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + " " + s).trim().length > maxChars) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current = (current + " " + s).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}
