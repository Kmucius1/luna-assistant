import { ZOE_SOUL, callAI, parseAIJson } from '@/lib/ai'

// ─── Zoe's literal texting voice (distinct from ZOE_SOUL's reflective-coaching tone) ──
const ZOE_TEXT_VOICE = `
HOW ZOE ACTUALLY TEXTS (not how a generic assistant writes):
- Personal, casual, natural, warm, emotionally honest
- Usually SHORTER than a typical AI response — no padding, no filler
- Uses conversational shorthand where it fits naturally: "rn", "tmr", "im", "idk", "okay"
- Can use short stacked thoughts instead of one polished paragraph
- Can use capitalization for emotion, but doesn't force it
- Light on emojis — never more than one, often none
- Never sounds overly edited, robotic, corporate, or formal by default
- Never ends on a corny/cheesy closing line ("Talk soon!", "Sending love!", "Can't wait!")
- Doesn't over-explain or repeat the sender's own words back at them
- For sensitive topics: soft, direct, calm, honest without attacking, self-respecting without being cold
- For professional contacts: warm and clear but still conversational — confident, not corporate, no hype
- The right voice depends on WHO she's texting and WHAT the message is about — never one style for everyone

STRICT ANTI-INVENTION RULE:
Never invent a specific time, date, plan, promise, address, price, name, or past conversation that
is not explicitly present in the contact info or recent thread context given to you below. If the
incoming message asks about something you don't have confirmed details for, the reply must hedge
honestly — e.g. "let me double check and get back to you" — instead of stating a fabricated answer.

IMPORTANT — the sender stating a plan is NOT the same as Zoe having confirmed it. If the incoming
message itself asserts a specific time/date/plan (e.g. "are we still on for coffee tomorrow at 10?")
and that same detail does NOT independently appear in the thread context below, you do NOT have
grounds to confirm it — do not draft "yeah still on for 10." Zoe has no memory of agreeing to that
time; only the thread context counts as confirmed. In that exact situation, all 3 drafts must hedge
instead, e.g. "let me check and confirm" / "lemme double check my schedule and get back to you" —
never affirm a detail whose only source is the sender's own message.
`

export const TEXT_ANALYSIS_AND_DRAFTS_PROMPT = `${ZOE_SOUL}
${ZOE_TEXT_VOICE}

You are analyzing one incoming text message on Zoe's behalf and drafting 3 reply options in her real
texting voice. Read the sender's tone and relationship to Zoe, decide what they're actually asking,
and draft replies that vary mainly in LENGTH and DETAIL — not one casual reply next to two generic-AI
ones. All three must sound like the same person texting.

Return ONLY valid JSON (no markdown fences, no extra text) in exactly this shape:
{
  "summary": "1-2 sentence plain read of what this message is about",
  "request": "what the sender wants or is asking for, in plain terms",
  "urgency": "low|medium|high|critical",
  "urgencyReason": "why you rated it that way",
  "tone": "how the message reads emotionally (e.g. 'casual and checking in', 'stressed', 'playful')",
  "pastContext": "relevant prior context if given below, or 'No prior context available' if none was provided — never invent this",
  "missingInfo": "any facts you'd need to answer with full confidence but weren't given, or empty string if nothing is missing",
  "voiceMode": "a short label for which version of Zoe's voice fits this reply (e.g. 'warm-casual', 'soft-sensitive', 'professional-warm')",
  "confidence": 0.0,
  "drafts": {
    "quick": "the shortest natural reply that still answers the message",
    "friendly": "a warmer, slightly fuller version that still sounds like her",
    "detailed": "a fuller reply with more context or next steps, still in her voice — not corporate"
  }
}`

const TEXT_DRAFT_REGENERATE_PROMPT = `${ZOE_SOUL}
${ZOE_TEXT_VOICE}

Zoe wants one specific reply draft rewritten with a specific adjustment, while still sounding like her
and staying accurate to the same facts/context as the original draft. Do not add any new facts.

Return ONLY valid JSON (no markdown fences, no extra text) in exactly this shape:
{ "text": "the rewritten draft" }`

export interface ContactProfileInput {
  name: string
  relationship?: string | null
  toneNotes?: string | null
  voiceProfile?: Record<string, unknown> | null
}

export interface ThreadMessageInput {
  sender: string
  text: string
  receivedAt: string
}

export interface AnalyzeIncomingTextInput {
  messageText: string
  senderName: string
  contact: ContactProfileInput
  recentThreadMessages: ThreadMessageInput[]
}

export interface TextAnalysisResult {
  summary: string
  request: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  urgencyReason: string
  tone: string
  pastContext: string
  missingInfo: string
  voiceMode: string
  confidence: number
  drafts: {
    quick: string
    friendly: string
    detailed: string
  }
}

function buildAnalysisContext(input: AnalyzeIncomingTextInput): string {
  const { messageText, senderName, contact, recentThreadMessages } = input

  const contactBlock = [
    `Contact name: ${contact.name}`,
    contact.relationship ? `Relationship: ${contact.relationship}` : null,
    contact.toneNotes ? `How Zoe usually talks to them: ${contact.toneNotes}` : null,
    contact.voiceProfile && Object.keys(contact.voiceProfile).length > 0
      ? `Learned voice profile for this contact: ${JSON.stringify(contact.voiceProfile)}`
      : null,
  ].filter(Boolean).join('\n')

  const historyBlock = recentThreadMessages.length > 0
    ? recentThreadMessages
        .map(m => `[${m.receivedAt}] ${m.sender}: ${m.text}`)
        .join('\n')
    : 'No prior messages in this thread — this is the first message from this contact.'

  return [
    contactBlock,
    '',
    'Recent thread context:',
    historyBlock,
    '',
    `New incoming message from ${senderName}:`,
    messageText,
  ].join('\n')
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export async function analyzeIncomingText(input: AnalyzeIncomingTextInput): Promise<TextAnalysisResult> {
  const context = buildAnalysisContext(input)
  const raw = await callAI(TEXT_ANALYSIS_AND_DRAFTS_PROMPT, context, 2000, true)
  const parsed = parseAIJson<TextAnalysisResult>(raw)

  if (
    !parsed.drafts ||
    !isNonEmptyString(parsed.drafts.quick) ||
    !isNonEmptyString(parsed.drafts.friendly) ||
    !isNonEmptyString(parsed.drafts.detailed)
  ) {
    throw new Error('AI response was missing one or more required drafts')
  }

  return parsed
}

export type RegenerateInstruction = 'shorter' | 'warmer' | 'more_direct' | 'more_like_me'

const INSTRUCTION_TEXT: Record<RegenerateInstruction, string> = {
  shorter: 'Make this reply noticeably shorter — trim it down to the fewest words that still answer the message.',
  warmer: 'Make this reply warmer and more affectionate, while staying natural — not over the top.',
  more_direct: 'Make this reply more direct and to the point — cut any softening or hedging that is not necessary.',
  more_like_me: "Compare this reply against Zoe's real texting voice traits above and rewrite it to match more closely — fix anything that reads too formal, too AI, or too generic.",
}

export interface RegenerateDraftInput {
  originalAnalysisContext: string
  currentDraftText: string
  variant: 'quick' | 'friendly' | 'detailed'
  instruction: RegenerateInstruction
}

export async function regenerateDraftVariant(input: RegenerateDraftInput): Promise<string> {
  const { originalAnalysisContext, currentDraftText, variant, instruction } = input

  const context = [
    `Original message context:`,
    originalAnalysisContext,
    '',
    `Current "${variant}" draft:`,
    currentDraftText,
    '',
    `Requested adjustment: ${INSTRUCTION_TEXT[instruction]}`,
  ].join('\n')

  const raw = await callAI(TEXT_DRAFT_REGENERATE_PROMPT, context, 500, true)
  const parsed = parseAIJson<{ text: string }>(raw)

  if (!isNonEmptyString(parsed.text)) {
    throw new Error('AI response was missing the rewritten draft text')
  }

  return parsed.text
}
