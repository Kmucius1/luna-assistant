/**
 * Thin naming/ergonomics layer over the real Groq-calling logic in
 * src/lib/ai.ts (callAI/tryCallAI/parseAIJson). No provider logic lives
 * here — src/lib/ai.ts stays the single call site.
 */
import { callAI, tryCallAI, parseAIJson } from '@/lib/ai'
import { AI_DEFAULT_MAX_TOKENS } from './config'

export async function generateLunaText(
  systemPrompt: string,
  userMessage: string,
  opts?: { maxTokens?: number }
): Promise<string> {
  return callAI(systemPrompt, userMessage, opts?.maxTokens ?? AI_DEFAULT_MAX_TOKENS)
}

export async function generateLunaJSON<T>(
  systemPrompt: string,
  userMessage: string,
  opts?: { maxTokens?: number }
): Promise<T | null> {
  const raw = await tryCallAI(systemPrompt, userMessage, opts?.maxTokens ?? AI_DEFAULT_MAX_TOKENS)
  if (!raw) return null
  try {
    return parseAIJson<T>(raw)
  } catch {
    return null
  }
}
