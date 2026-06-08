/**
 * BUILD 11 — Medical handoff report (PDF) via pdfkit.
 * Produces a clinician-facing one/two-page summary from a TriageAssessment.
 */
import PDFDocument from "pdfkit";
import { SymptomProfile, TriageAssessment, URGENCY_META } from "@/lib/types";

export async function buildReportPdf(
  profile: SymptomProfile,
  a: TriageAssessment,
  meta?: { sessionId?: string; generatedAt?: string }
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const ink = "#0f172a";
  const muted = "#64748b";
  const tierColor = URGENCY_META[a.tier].color;

  // --- Header ---
  doc.fillColor("#1b63e0").fontSize(20).font("Helvetica-Bold").text("PulsePath", { continued: true });
  doc.fillColor(muted).fontSize(11).font("Helvetica").text("  ·  AI Triage Handoff Report");
  doc.moveDown(0.2);
  doc
    .fillColor(muted)
    .fontSize(9)
    .text(
      `Generated ${meta?.generatedAt ?? "now"}${meta?.sessionId ? `  ·  Session ${meta.sessionId}` : ""}`
    );
  hr(doc);

  // --- Urgency banner ---
  doc.moveDown(0.5);
  doc.rect(50, doc.y, 495, 46).fill(tierColor);
  doc
    .fillColor("#ffffff")
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(`  URGENCY: ${URGENCY_META[a.tier].short.toUpperCase()} — ${URGENCY_META[a.tier].label}`, 56, doc.y - 38);
  doc.fontSize(10).font("Helvetica").text(`  Confidence: ${a.explainability.confidence}%${a.guardrailOverride ? "   ·   ⚠ Emergency guardrail applied (AI proposed " + URGENCY_META[a.aiProposedTier].short + ")" : ""}`, 56, doc.y + 2);
  doc.fillColor(ink);
  doc.moveDown(2.2);

  // --- Presenting complaint & history ---
  section(doc, "Presenting complaint");
  body(doc, a.summary.presentingComplaint || profile.primaryComplaint || "—");

  const h = a.summary.history;
  section(doc, "History");
  body(
    doc,
    [
      h.age != null ? `Age ${h.age}` : null,
      h.sex && h.sex !== "unknown" ? `Sex ${h.sex}` : null,
      h.pregnant ? "Pregnant" : null,
      h.conditions?.length ? `Conditions: ${h.conditions.join(", ")}` : null,
      h.medications?.length ? `Medications: ${h.medications.join(", ")}` : null,
      h.allergies?.length ? `Allergies: ${h.allergies.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("  ·  ") || "No significant history recorded."
  );

  // --- Associated symptoms ---
  const present = a.summary.associatedSymptoms.filter((s) => s.present).map((s) => s.name);
  const denied = a.summary.associatedSymptoms.filter((s) => !s.present).map((s) => s.name);
  section(doc, "Associated symptoms");
  body(doc, present.length ? present.join(", ") : "None reported.");
  if (denied.length) body(doc, `Pertinent negatives: ${denied.join(", ")}`, muted);

  // --- Timeline ---
  if (a.summary.symptomTimeline.length) {
    section(doc, "Symptom timeline");
    for (const t of a.summary.symptomTimeline) {
      body(doc, `• ${t.at} — ${t.label}${t.detail ? `: ${t.detail}` : ""}`);
    }
  }

  // --- AI assessment ---
  section(doc, "AI urgency assessment");
  body(doc, `Tier: ${URGENCY_META[a.tier].short}  ·  Confidence ${a.explainability.confidence}%`);
  body(doc, "Top reasons:");
  a.explainability.topReasons.forEach((r, i) => body(doc, `   ${i + 1}. ${r}`));
  if (a.explainability.uncertaintyDrivers.length) {
    body(doc, `Uncertainty drivers: ${a.explainability.uncertaintyDrivers.join("; ")}`, muted);
  }

  // --- Differentials ---
  if (a.differentials.length) {
    section(doc, "Differential considerations");
    for (const d of a.differentials) {
      body(doc, `• ${d.condition} (${d.likelihood}; worst-case ${URGENCY_META[d.worstCaseTier].short})`);
    }
  }

  // --- Guardrails ---
  if (a.guardrailHits.length) {
    section(doc, "Emergency guardrails triggered");
    for (const g of a.guardrailHits) {
      body(doc, `• ${g.condition.replace(/_/g, " ")}: ${g.rationale}`, tierColor);
    }
  }

  // --- Red flags / what to tell provider ---
  section(doc, "Red flags to watch");
  (a.carePathway.redFlags.length ? a.carePathway.redFlags : ["None specified"]).forEach((r) =>
    body(doc, `• ${r}`)
  );

  section(doc, "Recommended next actions");
  a.carePathway.whatToDo.forEach((r) => body(doc, `• ${r}`));

  // --- Citations ---
  if (a.citations.length) {
    section(doc, "Evidence (clinical guidelines)");
    a.citations.forEach((c) => body(doc, `• [${c.source}] ${c.title}${c.url ? ` — ${c.url}` : ""}`, muted));
  }

  // --- Disclaimer ---
  hr(doc);
  doc
    .fillColor(muted)
    .fontSize(8)
    .text(
      "PulsePath is a decision-support tool and does not replace professional medical judgement. " +
        "Emergency guardrails are deterministic and cannot be overridden by the AI. Verify clinically.",
      { align: "left" }
    );

  doc.end();
  return done;
}

function hr(doc: PDFKit.PDFDocument) {
  doc.moveDown(0.4);
  doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.4);
}
function section(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.6);
  doc.fillColor("#1b63e0").fontSize(11).font("Helvetica-Bold").text(title.toUpperCase());
  doc.moveDown(0.15);
}
function body(doc: PDFKit.PDFDocument, text: string, color = "#0f172a") {
  doc.fillColor(color).fontSize(10).font("Helvetica").text(text, { lineGap: 1.5 });
}
