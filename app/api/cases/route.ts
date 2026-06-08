/**
 * BUILD 10 (data) — list assessed sessions for the provider dashboard.
 */
import { NextResponse } from "next/server";
import { listAssessedSessions } from "@/lib/db/sessions";
import { supabaseConfigured } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // reads live data; never prerender at build

export async function GET() {
  const rows = await listAssessedSessions(100);
  return NextResponse.json({ configured: supabaseConfigured(), cases: rows });
}
