import { QdrantClient } from "@qdrant/js-client-rest";
import { qdrantEnv } from "@/lib/config/env";
import { embeddingDims } from "@/lib/rag/embeddings";

let _client: QdrantClient | null = null;

export function qdrant(): QdrantClient {
  if (_client) return _client;
  const env = qdrantEnv();
  _client = new QdrantClient({ url: env.url, apiKey: env.apiKey });
  return _client;
}

export function collections() {
  const env = qdrantEnv();
  return { guidelines: env.guidelinesCollection, cases: env.casesCollection };
}

/**
 * Idempotently ensure a collection exists with the configured embedding dims
 * and cosine distance (we normalize vectors at embed time).
 */
export async function ensureCollection(name: string): Promise<void> {
  const client = qdrant();
  const dims = embeddingDims();
  const existing = await client.getCollections();
  const found = existing.collections.find((c) => c.name === name);
  if (found) return;
  await client.createCollection(name, {
    vectors: { size: dims, distance: "Cosine" },
    optimizers_config: { default_segment_number: 2 },
  });
}

export async function qdrantConfigured(): Promise<boolean> {
  try {
    await qdrant().getCollections();
    return true;
  } catch {
    return false;
  }
}
