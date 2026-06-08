/**
 * Centralized, validated environment access.
 * Every external dependency is configured here — nothing is hard-coded elsewhere.
 * Server-only secrets are read lazily so the client bundle never trips on them.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

function optional(value: string | undefined, fallback: string): string {
  return value && value.trim() !== "" ? value : fallback;
}

/** LLM (OpenAI-compatible). */
export const llmEnv = () => ({
  baseURL: required("LLM_BASE_URL", process.env.LLM_BASE_URL),
  apiKey: required("LLM_API_KEY", process.env.LLM_API_KEY),
  model: required("LLM_MODEL", process.env.LLM_MODEL),
  temperature: Number(optional(process.env.LLM_TEMPERATURE, "0.2")),
  // Cap output tokens. Must be generous: reasoning models (e.g. Qwen3.x) emit
  // hidden reasoning tokens BEFORE the structured-output JSON, so too low a cap
  // truncates the JSON mid-structure and the parse fails ("length limit
  // reached"). 16k leaves ample headroom for reasoning + the largest agent
  // payload, while staying well below the 64k default that can trip metered
  // credit limits (e.g. OpenRouter).
  maxTokens: Number(optional(process.env.LLM_MAX_TOKENS, "16384")),
});

/** Embeddings (HF serverless router by default, or any OpenAI-compatible /v1/embeddings). */
export const embedEnv = () => ({
  provider: optional(process.env.EMBED_PROVIDER, "hf-router") as "hf-router" | "openai",
  baseURL: optional(process.env.EMBED_BASE_URL, "https://router.huggingface.co"),
  model: optional(process.env.EMBED_MODEL, "BAAI/bge-base-en-v1.5"),
  dims: Number(optional(process.env.EMBED_DIMS, "768")),
  hfToken: process.env.HF_TOKEN ?? "",
  queryPrefix: optional(process.env.EMBED_QUERY_PREFIX, ""),
});

/** Sarvam AI voice. */
export const sarvamEnv = () => ({
  apiKey: required("SARVAM_API_KEY", process.env.SARVAM_API_KEY),
  baseURL: optional(process.env.SARVAM_BASE_URL, "https://api.sarvam.ai"),
  sttModel: optional(process.env.SARVAM_STT_MODEL, "saarika:v2.5"),
  ttsModel: optional(process.env.SARVAM_TTS_MODEL, "bulbul:v2"),
  ttsSpeaker: optional(process.env.SARVAM_TTS_SPEAKER, "anushka"),
  ttsLanguage: optional(process.env.SARVAM_TTS_LANGUAGE, "en-IN"),
  ttsSampleRate: Number(optional(process.env.SARVAM_TTS_SAMPLE_RATE, "22050")),
});

/** Qdrant vector DB. */
export const qdrantEnv = () => ({
  url: optional(process.env.QDRANT_URL, "http://localhost:6333"),
  apiKey: process.env.QDRANT_API_KEY || undefined,
  guidelinesCollection: optional(process.env.QDRANT_GUIDELINES_COLLECTION, "clinical_guidelines"),
  casesCollection: optional(process.env.QDRANT_CASES_COLLECTION, "patient_cases"),
});

/** Supabase. */
export const supabaseEnv = () => ({
  url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
});

export const appEnv = () => ({
  appName: optional(process.env.NEXT_PUBLIC_APP_NAME, "PulsePath"),
  cronSecret: process.env.CRON_SECRET ?? "",
});

/**
 * Returns which integrations are configured, without throwing.
 * Used by API routes to degrade gracefully and tell the user what to fill in.
 */
export function integrationStatus() {
  const has = (v?: string) => !!(v && v.trim() !== "");
  return {
    llm: has(process.env.LLM_BASE_URL) && has(process.env.LLM_API_KEY) && has(process.env.LLM_MODEL),
    embeddings:
      optional(process.env.EMBED_PROVIDER, "hf-router") === "hf-router"
        ? has(process.env.HF_TOKEN)
        : has(process.env.EMBED_BASE_URL),
    sarvam: has(process.env.SARVAM_API_KEY),
    qdrant: has(process.env.QDRANT_URL),
    supabase: has(process.env.NEXT_PUBLIC_SUPABASE_URL) && has(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}
