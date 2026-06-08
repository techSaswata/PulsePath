/**
 * BUILD 11 — PDF report endpoint.
 * POST { profile, assessment } (or { sessionId } to load from DB) → application/pdf.
 */
import { NextRequest } from "next/server";
import { buildReportPdf } from "@/lib/report/pdf";
import { getSessionFull } from "@/lib/db/sessions";
import { SymptomProfile, TriageAssessment } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      profile?: SymptomProfile;
      assessment?: TriageAssessment;
    };

    let profile = body.profile;
    let assessment = body.assessment;

    if ((!profile || !assessment) && body.sessionId) {
      const full = await getSessionFull(body.sessionId);
      if (full?.session && full.assessment) {
        profile = full.session.profile;
        assessment = full.assessment;
      }
    }

    if (!profile || !assessment) {
      return new Response(JSON.stringify({ error: "Provide profile+assessment or a valid sessionId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const pdf = await buildReportPdf(profile, assessment, {
      sessionId: body.sessionId,
      generatedAt: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
    });

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pulsepath-report-${body.sessionId ?? "case"}.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Report failed";
    console.error("[api/report]", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
