import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { llmEnv } from "@/lib/config/env";

/**
 * Single source of truth for the LLM, configured via OpenAI-compatible env.
 * `baseURL` lives under `configuration`; `apiKey` is a top-level field.
 */
export function makeLLM(opts?: { temperature?: number }): ChatOpenAI {
  const env = llmEnv();
  // OpenRouter recommends attribution headers; harmless on other providers.
  const isOpenRouter = env.baseURL.includes("openrouter.ai");
  return new ChatOpenAI({
    model: env.model,
    apiKey: env.apiKey,
    temperature: opts?.temperature ?? env.temperature,
    maxTokens: env.maxTokens,
    // Fail fast on rate limits. The default (6) retries a 429 with long
    // exponential backoff (~100s+), which blows the serverless time budget and
    // turns a quota error into a silent timeout. 2 surfaces it in seconds so the
    // caller can report "quota exceeded" cleanly.
    maxRetries: 2,
    // Many OpenAI-compatible endpoints don't emit streaming usage chunks.
    streamUsage: false,
    configuration: {
      baseURL: env.baseURL,
      defaultHeaders: isOpenRouter
        ? {
            "HTTP-Referer": "https://pulsepath.app",
            "X-Title": "PulsePath Triage",
          }
        : undefined,
    },
  });
}

/**
 * Structured output helper. Defaults to `strict: false` because most
 * OpenAI-*compatible* endpoints don't support native strict JSON-schema mode;
 * LangChain falls back to tool-calling, which is widely supported.
 */
export function structured<T extends z.ZodTypeAny>(
  schema: T,
  name: string,
  opts?: { temperature?: number; strict?: boolean }
) {
  const llm = makeLLM({ temperature: opts?.temperature });
  return llm.withStructuredOutput(schema, {
    name,
    strict: opts?.strict ?? false,
  });
}
