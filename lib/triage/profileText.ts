import { SymptomProfile } from "@/lib/types";

/** Render a structured profile into a readable clinical vignette for the LLM. */
export function renderProfileText(p: SymptomProfile): string {
  const lines: string[] = [];
  const demo = [
    p.age != null && p.age > 0 ? `${p.age}yo` : null,
    p.sex && p.sex !== "unknown" ? p.sex : null,
    p.pregnant ? "pregnant" : null,
  ]
    .filter(Boolean)
    .join(" ");
  if (demo) lines.push(`Demographics: ${demo}`);
  lines.push(`Primary complaint: ${p.primaryComplaint || "(not yet stated)"}`);
  if (p.onset) lines.push(`Onset: ${p.onset}`);
  if (p.durationHours != null && p.durationHours > 0) lines.push(`Duration: ~${p.durationHours} hours`);
  if (p.severity) {
    const score = p.severityScore != null && p.severityScore > 0 ? ` (${p.severityScore}/10)` : "";
    lines.push(`Severity: ${p.severity}${score}`);
  }
  if (p.bodyRegions.length) lines.push(`Location (body diagram): ${p.bodyRegions.join(", ")}`);

  const present = p.associatedSymptoms.filter((a) => a.present).map((a) => a.name);
  const denied = p.associatedSymptoms.filter((a) => !a.present).map((a) => a.name);
  if (present.length) lines.push(`Associated symptoms (present): ${present.join(", ")}`);
  if (denied.length) lines.push(`Pertinent negatives (denied): ${denied.join(", ")}`);
  if (p.aggravatingFactors?.length) lines.push(`Aggravating factors: ${p.aggravatingFactors.join(", ")}`);
  if (p.relievingFactors?.length) lines.push(`Relieving factors: ${p.relievingFactors.join(", ")}`);

  if (p.timeline.length) {
    lines.push("Timeline:");
    for (const t of p.timeline) lines.push(`  - ${t.at}: ${t.label}${t.detail ? ` — ${t.detail}` : ""}`);
  }
  if (p.conditions?.length) lines.push(`Chronic conditions: ${p.conditions.join(", ")}`);
  if (p.medications?.length) lines.push(`Medications: ${p.medications.join(", ")}`);
  if (p.allergies?.length) lines.push(`Allergies: ${p.allergies.join(", ")}`);
  if (p.freeText.length) lines.push(`Patient's own words: "${p.freeText.join(" / ")}"`);
  return lines.join("\n");
}
