/**
 * BUILD 4 — Voice Doctor: text-to-speech (Sarvam bulbul).
 * Returns base64 WAV the browser can play.
 */
import { NextRequest, NextResponse } from "next/server";
import { sarvamTTS } from "@/lib/voice/sarvam";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text, languageCode, speaker } = (await req.json()) as {
      text?: string;
      languageCode?: string;
      speaker?: string;
    };
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Missing 'text'" }, { status: 400 });
    }
    const speech = await sarvamTTS(text.trim(), { languageCode, speaker });
    return NextResponse.json(speech);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "TTS failed";
    console.error("[api/voice/tts]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
