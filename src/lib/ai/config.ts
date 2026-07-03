/**
 * Central AI provider config. Groq is the only provider actually wired up
 * and working in this app (see src/lib/ai.ts) — env var NAMES match what
 * was requested, but defaults point at real, working Groq models rather
 * than an unconfigured Anthropic setup.
 */
export type AIProvider = 'groq'

export const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq') as AIProvider

export const AI_MODEL =
  process.env.AI_MODEL || 'llama-3.3-70b-versatile'

export const AI_FALLBACK_MODEL =
  process.env.AI_FALLBACK_MODEL || 'llama-3.1-8b-instant'

export const AI_DEFAULT_MAX_TOKENS = 2048
