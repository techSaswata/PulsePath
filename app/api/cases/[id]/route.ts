import { NextRequest, NextResponse } from "next/server";
import { getSessionFull } from "@/lib/db/sessions";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const full = await getSessionFull(params.id);
  if (!full) {
    return NextResponse.json({ error: "Supabase not configured or session not found" }, { status: 404 });
  }
  return NextResponse.json(full);
}
