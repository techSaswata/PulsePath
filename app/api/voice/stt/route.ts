/**
 * BUILD 4 — Voice Doctor: speech-to-text.
 * Accepts multipart/form-data with an audio `file`, returns the transcript.
 */
import { NextRequest, NextResponse } from "next/server";
import { sarvamSTT } from "@/lib/voice/sarvam";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio 'file'" }, { status: 400 });
    }
    const languageCode = (form.get("language_code") as string) || undefined;
    const result = await sarvamSTT(file, {
      languageCode,
      filename: (file as File).name || "recording.webm",
      mimeType: file.type || "audio/webm",
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "STT failed";
    console.error("[api/voice/stt]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
