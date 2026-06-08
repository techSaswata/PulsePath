import { NextResponse } from "next/server";
import { integrationStatus } from "@/lib/config/env";

export const runtime = "nodejs";

/** Tells the UI which integrations are configured, so it can show setup hints. */
export async function GET() {
  return NextResponse.json({ ok: true, integrations: integrationStatus() });
}
