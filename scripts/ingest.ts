/**
 * BUILD 8 — RAG ingestion pipeline.
 *
 *   npm run rag:ingest                # embed the curated seed corpus into Qdrant
 *   npm run rag:ingest -- ./docs.json # ALSO ingest your own guideline docs
 *
 * Custom docs file is a JSON array of:
 *   { source, title, url, topic, text }   (text is chunked automatically)
 *
 * This is a real pipeline: it ensures the collection exists at the right dims,
 * chunks long texts, embeds via the configured (free HF) embeddings, and
 * upserts with payloads so retrieval returns full citations.
 */
import "./_env";
import { readFileSync, existsSync } from "node:fs";
import { embed, embeddingDims } from "@/lib/rag/embeddings";
import { collections, ensureCollection, qdrant } from "@/lib/rag/qdrant";
import { GUIDELINE_CORPUS, GuidelineDoc } from "@/lib/rag/corpus";

function chunk(text: string, maxChars = 900, overlap = 120): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return [clean];
  const out: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    // Prefer to break on a sentence boundary.
    const slice = clean.slice(start, end);
    const lastStop = slice.lastIndexOf(". ");
    if (end < clean.length && lastStop > maxChars * 0.5) end = start + lastStop + 1;
    out.push(clean.slice(start, end).trim());
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return out;
}

// Stable numeric id from a string (Qdrant accepts uint or uuid ids).
function pointId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

async function main() {
  const extra = process.argv[2];
  const docs: GuidelineDoc[] = [...GUIDELINE_CORPUS];

  if (extra) {
    if (!existsSync(extra)) throw new Error(`Custom docs file not found: ${extra}`);
    const parsed = JSON.parse(readFileSync(extra, "utf8")) as GuidelineDoc[];
    console.log(`Loaded ${parsed.length} custom docs from ${extra}`);
    docs.push(...parsed);
  }

  const { guidelines } = collections();
  console.log(`Ensuring collection "${guidelines}" @ ${embeddingDims()} dims…`);
  await ensureCollection(guidelines);

  // Build chunk records with stable ids.
  type Rec = { id: number; doc: GuidelineDoc; text: string };
  const records: Rec[] = [];
  for (const doc of docs) {
    const parts = chunk(doc.text);
    parts.forEach((text, i) => {
      records.push({ id: pointId(`${doc.id}#${i}`), doc: { ...doc, text }, text });
    });
  }
  console.log(`Embedding ${records.length} chunks…`);

  // Embed in batches.
  const BATCH = 16;
  const points: { id: number; vector: number[]; payload: Record<string, unknown> }[] = [];
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const vectors = await embed(batch.map((r) => r.text));
    batch.forEach((r, j) =>
      points.push({ id: r.id, vector: vectors[j], payload: { ...r.doc } })
    );
    process.stdout.write(`  ${Math.min(i + BATCH, records.length)}/${records.length}\r`);
  }
  console.log("");

  console.log(`Upserting ${points.length} points into Qdrant…`);
  await qdrant().upsert(guidelines, { points });
  console.log("✅ Ingestion complete.");
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
