import { embedEnv } from "@/lib/config/env";

/**
 * Abort an embedding request that stalls (e.g. a HuggingFace serverless cold
 * start). On timeout the fetch rejects, and callers in retrieve.ts fall back to
 * the keyword retriever (guidelines) / [] (cases) instead of hanging the whole
 * assessment. Override with EMBED_TIMEOUT_MS.
 */
const EMBED_TIMEOUT_MS = Number(process.env.EMBED_TIMEOUT_MS ?? "8000");

/**
 * Embeddings via the OpenAI-compatible *semantics*, but powered by a FREE
 * HuggingFace model. Two transport modes:
 *
 *  - "hf-router" (default): the free HF serverless router only exposes
 *    OpenAI-compatible /v1 for CHAT, not embeddings. So for embeddings we hit
 *    the `feature-extraction` route and wrap the raw float array into the
 *    OpenAI `{ data: [{ embedding }] }` shape ourselves.
 *
 *  - "openai": any real OpenAI-compatible /v1/embeddings endpoint (e.g. a
 *    self-hosted Text-Embeddings-Inference server, or OpenAI itself).
 *
 * Either way the rest of the codebase only sees `embed()` / `embedQuery()`.
 */

type OpenAIEmbeddingResponse = {
  data: { embedding: number[]; index: number }[];
};

async function embedHfRouter(inputs: string[]): Promise<number[][]> {
  const env = embedEnv();
  if (!env.hfToken) {
    throw new Error(
      "[embeddings] HF_TOKEN is not set. Add a HuggingFace token with " +
        "'Make calls to Inference Providers' permission to .env.local."
    );
  }
  const url = `${env.baseURL}/hf-inference/models/${env.model}/pipeline/feature-extraction`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs, normalize: true, truncate: true }),
    signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[embeddings] HF feature-extraction ${res.status}: ${body}`);
  }
  const vectors = (await res.json()) as number[][];
  return vectors;
}

async function embedOpenAICompatible(inputs: string[]): Promise<number[][]> {
  const env = embedEnv();
  const base = env.baseURL.replace(/\/$/, "");
  const url = base.endsWith("/v1") ? `${base}/embeddings` : `${base}/v1/embeddings`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.hfToken) headers.Authorization = `Bearer ${env.hfToken}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ input: inputs, model: env.model, encoding_format: "float" }),
    signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[embeddings] OpenAI-compatible /v1/embeddings ${res.status}: ${body}`);
  }
  const json = (await res.json()) as OpenAIEmbeddingResponse;
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Embed a batch of documents (no instruction prefix). */
export async function embed(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const env = embedEnv();
  const vectors =
    env.provider === "openai" ? await embedOpenAICompatible(inputs) : await embedHfRouter(inputs);
  if (vectors.length && vectors[0].length !== env.dims) {
    throw new Error(
      `[embeddings] Model returned ${vectors[0].length} dims but EMBED_DIMS=${env.dims}. ` +
        `Update EMBED_DIMS (and your Qdrant collection) to match the model.`
    );
  }
  return vectors;
}

/**
 * Embed a single search query. bge-style models retrieve best when the query
 * (only the query, not the documents) carries an instruction prefix.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const env = embedEnv();
  const prefixed = env.queryPrefix ? `${env.queryPrefix} ${query}` : query;
  const [vec] = await embed([prefixed]);
  return vec;
}

export function embeddingDims(): number {
  return embedEnv().dims;
}
