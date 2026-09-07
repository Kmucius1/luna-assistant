/**
 * Central AI provider config. Groq is the only provider actually wired up
 * and working in this app (see src/lib/ai.ts) — env var NAMES match what
 * was requested, but defaults point at real, working Groq models rather
 * than an unconfigured Anthropic setup.
 */
export type AIProvider = 'groq'

export const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq') as AIProvider

// llama-3.3-70b-versatile / llama-3.1-8b-instant were removed from Groq's
// catalog (confirmed via GET /openai/v1/models — neither exists anymore,
// breaking every AI feature in the app with a 404 model_not_found).
// Replaced with Groq's current general-purpose chat models.
export const AI_MODEL =
  process.env.AI_MODEL || 'openai/gpt-oss-120b'

export const AI_FALLBACK_MODEL =
  process.env.AI_FALLBACK_MODEL || 'openai/gpt-oss-20b'

export const AI_DEFAULT_MAX_TOKENS = 2048
