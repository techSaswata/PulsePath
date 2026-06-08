/**
 * BUILD 8 — Retrieval over clinical guidelines (Qdrant + embeddings).
 * BUILD 9 — Similar previous-case retrieval.
 *
 * Both gracefully degrade: if Qdrant or embeddings aren't configured, guideline
 * retrieval falls back to a deterministic keyword scorer over the seed corpus
 * so the product still produces evidence-backed citations end-to-end.
 */

import { createHash } from "node:crypto";
import { GuidelineCitation, SimilarCase, SymptomProfile, UrgencyTier } from "@/lib/types";
import { collections, ensureCollection, qdrant } from "@/lib/rag/qdrant";
import { embed, embedQuery } from "@/lib/rag/embeddings";
import { GUIDELINE_CORPUS, GuidelineDoc, toCitation } from "@/lib/rag/corpus";
import { integrationStatus } from "@/lib/config/env";

/** Compose a retrieval query string from the structured profile. */
export function profileToQuery(profile: SymptomProfile): string {
  const assoc = profile.associatedSymptoms.filter((a) => a.present).map((a) => a.name);
  return [
    profile.primaryComplaint,
    profile.bodyRegions.join(" "),
    assoc.join(" "),
    profile.severity ? `${profile.severity} severity` : "",
    profile.freeText.join(" "),
  ]
    .filter(Boolean)
    .join(". ");
}

// ---------------------------------------------------------------------------
// Guideline retrieval
// ---------------------------------------------------------------------------

export async function retrieveGuidelines(
  profile: SymptomProfile,
  topK = 5
): Promise<GuidelineCitation[]> {
  const query = profileToQuery(profile);
  const status = integrationStatus();

  if (status.qdrant && status.embeddings) {
    try {
      return await retrieveGuidelinesVector(query, topK);
    } catch (err) {
      console.warn("[rag] vector retrieval failed, falling back to keyword:", err);
    }
  }
  return keywordRetrieve(query, topK);
}

async function retrieveGuidelinesVector(query: string, topK: number): Promise<GuidelineCitation[]> {
  const { guidelines } = collections();
  const vector = await embedQuery(query);
  const res = await qdrant().search(guidelines, {
    vector,
    limit: topK,
    with_payload: true,
  });
  return res.map((p) => {
    const payload = p.payload as unknown as GuidelineDoc;
    return toCitation(payload, p.score ?? 0);
  });
}

/** Deterministic TF-style keyword scorer over the seed corpus (no deps). */
function keywordRetrieve(query: string, topK: number): GuidelineCitation[] {
  const terms = tokenize(query);
  const scored = GUIDELINE_CORPUS.map((doc) => {
    const hay = (doc.title + " " + doc.text + " " + doc.topic).toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (hay.includes(t)) score += 1;
    }
    // Normalize to a 0–1 pseudo-similarity.
    const norm = terms.length ? score / terms.length : 0;
    return { doc, score: norm };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return scored.map((s) => toCitation(s.doc, s.score));
}

function tokenize(s: string): string[] {
  const stop = new Set([
    "the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "with", "my", "i",
    "is", "it", "this", "that", "have", "has", "feel", "feeling", "pain", "very",
  ]);
  return Array.from(
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stop.has(w))
    )
  );
}

// ---------------------------------------------------------------------------
// Similar-case retrieval (Build 9)
// ---------------------------------------------------------------------------

export interface CasePayload {
  /** The original (human-readable) case id; the Qdrant point id is a derived UUID. */
  sourceId: string;
  presentingComplaint: string;
  finalTier: UrgencyTier;
  outcome?: string;
  summaryText: string;
}

/**
 * Qdrant point ids must be an unsigned int or a UUID. Our case ids are
 * arbitrary strings (session ids, "seed-sim-40"), so derive a deterministic
 * UUIDv5-style id from the string. Deterministic => re-indexing the same case
 * updates in place rather than duplicating.
 */
function deterministicUuid(input: string): string {
  // SHA-1 of the input, formatted as a v5 UUID (namespace folded into input).
  const hash = createHash("sha1").update(`pulsepath:${input}`).digest("hex");
  const h = hash.slice(0, 32).split("");
  h[12] = "5"; // version 5
  const variant = (parseInt(h[16], 16) & 0x3) | 0x8; // RFC4122 variant
  h[16] = variant.toString(16);
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

/** Retrieve the most similar prior cases. Returns [] if not configured. */
export async function retrieveSimilarCases(
  profile: SymptomProfile,
  topK = 3
): Promise<SimilarCase[]> {
  const status = integrationStatus();
  if (!status.qdrant || !status.embeddings) return [];
  try {
    const { cases } = collections();
    const vector = await embedQuery(profileToQuery(profile));
    const res = await qdrant().search(cases, {
      vector,
      limit: topK,
      with_payload: true,
    });
    return res.map((p) => {
      const payload = p.payload as unknown as CasePayload;
      return {
        id: payload.sourceId ?? String(p.id),
        presentingComplaint: payload.presentingComplaint,
        finalTier: payload.finalTier,
        outcome: payload.outcome,
        similarity: p.score ?? 0,
      };
    });
  } catch (err) {
    console.warn("[rag] similar-case retrieval failed:", err);
    return [];
  }
}

/** Upsert a completed case into the case vector store (Build 9 + 12 feedback loop). */
export async function indexCase(
  id: string,
  profile: SymptomProfile,
  finalTier: UrgencyTier,
  outcome?: string
): Promise<void> {
  const status = integrationStatus();
  if (!status.qdrant || !status.embeddings) return;
  const { cases } = collections();
  await ensureCollection(cases);
  const summaryText = profileToQuery(profile);
  const [vector] = await embed([summaryText]);
  const payload: CasePayload = {
    sourceId: id,
    presentingComplaint: profile.primaryComplaint,
    finalTier,
    outcome,
    summaryText,
  };
  await qdrant().upsert(cases, {
    points: [{ id: deterministicUuid(id), vector, payload: { ...payload } }],
  });
}
