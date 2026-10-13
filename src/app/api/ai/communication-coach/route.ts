import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { callAI, parseAIJson, COMMUNICATION_COACH_PROMPT } from '@/lib/ai'

const ZOE_USER_ID = OWNER_USER_ID

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  return _groq
}

interface Alternative { label: string; strategy: string; text: string }
interface CoachResult {
  needs_clarification: boolean
  clarifying_question: string | null
  analysis?: {
    relationship: string; tone_detected: string; likely_intent: string
    zoe_goal: string; recommended_approach: string; confidence: number
  }
  best_response?: { label: string; text: string; reason: string }
  alternatives?: Alternative[]
}

function isValidResult(v: unknown): v is CoachResult {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  if (typeof r.needs_clarification !== 'boolean') return false
  if (r.needs_clarification) return true
  if (!r.best_response || typeof r.best_response !== 'object') return false
  const best = r.best_response as Record<string, unknown>
  if (typeof best.text !== 'string' || !best.text.trim()) return false
  if (!Array.isArray(r.alternatives) || r.alternatives.length < 3) return false
  const alts = r.alternatives as unknown[]
  return alts.slice(0, 3).every(a =>
    a && typeof a === 'object' && typeof (a as Record<string, unknown>).text === 'string' && (a as Record<string, unknown>).text
  )
}

// Screenshot -> the full back-and-forth thread inside it, who said what, and
// the real emotional tone evident from the image (not just the words). A
// flat OCR transcription can't tell "them" from "me" or read tone from bubble
// color/punctuation/pacing, which is exactly what made LUNA's read of a
// screenshot feel like it didn't understand the conversation. Same Groq
// vision model already used for wardrobe photo detection — no new provider.
interface ThreadTurn { sender: 'them' | 'me' | 'unclear'; text: string }
interface ScreenshotAnalysis { thread: ThreadTurn[]; emotional_read: string; latest_incoming_message: string | null }

async function analyzeScreenshotThread(image: string): Promise<ScreenshotAnalysis | null> {
  try {
    const completion = await getGroq().chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `This is a screenshot of a text/DM/email conversation thread. Read every message bubble in it, in order top to bottom.

Use bubble color/alignment to tell who sent each message — the device owner's own messages are usually right-aligned and one color (e.g. blue or green), the other person's are usually left-aligned and a different color (e.g. gray). If it's genuinely unclear who sent a message, mark that turn "unclear".

Also read the real EMOTIONAL tone of the thread from actual visual/textual cues — punctuation intensity, capitalization, emoji, one-word replies, apology language, excitement, coldness, distance. Don't invent emotion that isn't actually evidenced in the screenshot.

Return ONLY valid JSON, no commentary:
{
  "thread": [{"sender": "them" | "me" | "unclear", "text": "exact message text"}],
  "emotional_read": "2-3 sentences on the real emotional tone/dynamic visible in this thread",
  "latest_incoming_message": "the exact text of the LAST message sent by \\"them\\" (not by the device owner) — null if the thread ends on the device owner's own message or there's no incoming message at all"
}`,
          },
          { type: 'image_url', image_url: { url: image } },
        ],
      }],
    })
    const raw = completion.choices[0]?.message?.content ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0]) as ScreenshotAnalysis
  } catch (err) {
    console.error('[communication-coach] screenshot thread analysis failed:', err instanceof Error ? err.message : err)
    return null
  }
}

async function generate(systemPrompt: string, context: string): Promise<CoachResult> {
  const raw = await callAI(systemPrompt, context, 1800)
  const parsed = parseAIJson<CoachResult>(raw)
  if (isValidResult(parsed)) return parsed

  // One retry with an explicit correction — never fall back to fabricated content.
  const retryRaw = await callAI(
    systemPrompt,
    `${context}\n\nYour previous response did not match the required JSON schema exactly. Return ONLY valid JSON matching the schema — needs_clarification (boolean), and when false: analysis, best_response (with non-empty text), and alternatives (an array of at least 3 items each with non-empty text).`,
    1800
  )
  const retryParsed = parseAIJson<CoachResult>(retryRaw)
  if (isValidResult(retryParsed)) return retryParsed
  throw new Error('AI did not return a valid result after retry')
}

// Models occasionally return confidence as a 0-1 fraction despite the
// prompt asking for 0-100 — normalize defensively so the UI never shows
// a nonsense "1% confident".
function normalizeConfidence(result: CoachResult): CoachResult {
  const c = result.analysis?.confidence
  if (result.analysis && typeof c === 'number' && c > 0 && c <= 1) {
    result.analysis.confidence = Math.round(c * 100)
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      message?: string
      image?: string
      direction?: 'received' | 'written'
      relationship?: string
      goal?: string
      contact_id?: string | null
      contact_name?: string | null
      adjust?: 'shorter' | 'warmer' | 'firmer' | 'regenerate' | null
      previous_response_id?: string | null
    }

    let message = (body.message ?? '').trim()
    const { direction = 'received', relationship, goal, contact_id, contact_name, adjust, previous_response_id } = body

    let screenshotAnalysis: ScreenshotAnalysis | null = null
    if (!message && body.image) {
      screenshotAnalysis = await analyzeScreenshotThread(body.image)
      const lastText = screenshotAnalysis?.thread?.filter(t => t.text?.trim()).slice(-1)[0]?.text
      message = screenshotAnalysis?.latest_incoming_message?.trim() || lastText?.trim() || ''
    }
    if (!message) {
      return NextResponse.json({ error: "Couldn't read a message — paste it, speak it, or try a clearer screenshot." }, { status: 400 })
    }

    const userId = await resolveUserId()
    const db = createAdminClient()

    // ── Adjust an existing best response (shorter/warmer/firmer) — a small,
    // fast rewrite call, not a full re-analysis.
    if (adjust && adjust !== 'regenerate' && previous_response_id) {
      const { data: prev } = await db.from('coach_responses').select('best_response').eq('id', previous_response_id).eq('user_id', userId).maybeSingle()
      const prevText = (prev?.best_response as { text?: string } | null)?.text
      if (!prevText) {
        return NextResponse.json({ error: 'Could not find the original response to adjust.' }, { status: 400 })
      }
      const instruction = adjust === 'shorter' ? 'Make it noticeably shorter while keeping the meaning and her voice.'
        : adjust === 'warmer' ? 'Make it warmer and more emotionally open, still sounding like her, not sappy.'
        : 'Make it firmer and more direct — less softening, still respectful, still sounds like her.'
      const raw = await callAI(
        `${COMMUNICATION_COACH_PROMPT}\n\nYou are rewriting ONE reply per this instruction: ${instruction}\nReturn ONLY valid JSON: { "text": "the rewritten reply" }`,
        `Original reply to rewrite:\n${prevText}\n\nOriginal message it responds to:\n${message}`,
        500
      )
      const parsed = parseAIJson<{ text?: string }>(raw)
      if (!parsed.text?.trim()) {
        return NextResponse.json({ error: 'Adjustment failed — try again.' }, { status: 502 })
      }
      return NextResponse.json({ best_response: { label: 'Best match for you', text: parsed.text.trim(), reason: instruction } })
    }

    // ── Contact-specific context — only this person's data, never a broader dump.
    let contactNotes = ''
    let recentHistory: string[] = []
    if (contact_id) {
      const [{ data: contact }, { data: recent }] = await Promise.all([
        db.from('coach_contacts').select('name, relationship_type, notes').eq('id', contact_id).eq('user_id', userId).maybeSingle(),
        db.from('coach_responses').select('best_response, alternatives').eq('user_id', userId).eq('contact_id', contact_id)
          .order('created_at', { ascending: false }).limit(15),
      ])
      if (contact?.notes) contactNotes = contact.notes
      recentHistory = (recent ?? []).flatMap((r: { best_response: unknown; alternatives: unknown }) => {
        const texts: string[] = []
        const best = r.best_response as { text?: string } | null
        if (best?.text) texts.push(best.text)
        const alts = r.alternatives as { text?: string }[] | null
        if (alts) texts.push(...alts.map(a => a?.text).filter((t): t is string => !!t))
        return texts
      }).slice(0, 20)
    }

    const { data: profile } = await db.from('coach_profile').select('learned_notes').eq('user_id', userId).maybeSingle()

    const isRegenerate = adjust === 'regenerate'
    if (isRegenerate && previous_response_id) {
      const { data: prev } = await db.from('coach_responses').select('best_response, alternatives').eq('id', previous_response_id).eq('user_id', userId).maybeSingle()
      if (prev) {
        const best = (prev.best_response as { text?: string } | null)?.text
        const alts = (prev.alternatives as { text?: string }[] | null)?.map(a => a?.text).filter((t): t is string => !!t) ?? []
        recentHistory = [...(best ? [best] : []), ...alts, ...recentHistory].slice(0, 20)
      }
    }

    const contextLines = [
      `Message direction: ${direction === 'written' ? 'This is a draft Zoe wrote — help her improve/finalize it.' : 'This is a message Zoe received and needs to respond to.'}`,
      relationship ? `Relationship: ${relationship}` : 'Relationship: not specified — infer from the message and state your interpretation in the analysis.',
      goal ? `Zoe's stated goal for this reply: ${goal}` : "Zoe didn't pick a specific goal — infer the best approach.",
      contact_name ? `This is about: ${contact_name}` : '',
      contactNotes ? `What Zoe has saved about this person:\n${contactNotes}` : '',
      screenshotAnalysis?.thread?.length ? `Full recent thread from the screenshot, in order:\n${screenshotAnalysis.thread.map(t => `${t.sender === 'them' ? 'Them' : t.sender === 'me' ? 'Zoe' : '?'}: ${t.text}`).join('\n')}` : '',
      screenshotAnalysis?.emotional_read ? `Emotional read of the screenshot (from tone/visual cues, not just the words): ${screenshotAnalysis.emotional_read}` : '',
      profile?.learned_notes ? `Learned preferences about Zoe's communication style (from her own feedback over time):\n${profile.learned_notes}` : '',
      recentHistory.length ? `recent_response_history (do not repeat these, use genuinely different phrasing/strategy):\n${recentHistory.map(t => `- ${t}`).join('\n')}` : '',
      isRegenerate ? 'Zoe asked to regenerate — give meaningfully different options than recent_response_history above, not a light rewording.' : '',
      `\nThe message${direction === 'written' ? ' (her draft)' : ' she received'}:\n${message}`,
    ].filter(Boolean).join('\n\n')

    let result: CoachResult
    try {
      result = normalizeConfidence(await generate(COMMUNICATION_COACH_PROMPT, contextLines))
    } catch (err) {
      console.error('[communication-coach] generation failed:', err)
      return NextResponse.json({ error: "LUNA couldn't put together a reliable response — try again in a moment." }, { status: 502 })
    }

    if (result.needs_clarification) {
      return NextResponse.json(result)
    }

    // Fold the screenshot's thread + emotional read into the same jsonb
    // `analysis` column (no schema change needed) — this is what makes a
    // saved conversation genuinely useful the NEXT time Zoe asks about this
    // contact: recentHistory above already re-reads coach_responses for
    // context, so a richer analysis here directly improves future replies.
    const analysisToSave = screenshotAnalysis
      ? { ...result.analysis, thread: screenshotAnalysis.thread, emotional_read: screenshotAnalysis.emotional_read }
      : result.analysis

    let responseId: string | null = null
    try {
      const { data } = await db.from('coach_responses').insert({
        user_id: userId,
        contact_id: contact_id || null,
        contact_name: contact_name || null,
        direction,
        relationship_type: relationship || null,
        goal: goal || null,
        original_message: message,
        analysis: analysisToSave,
        best_response: result.best_response,
        alternatives: result.alternatives,
      }).select('id').single()
      responseId = data?.id ?? null
    } catch (err) {
      console.error('[communication-coach] persist failed:', err)
    }

    // A screenshot she handed LUNA is exactly the kind of thing she wants
    // "always noted" for later — drop it into her general knowledge base too,
    // not just the coach's own per-contact history.
    if (body.image && screenshotAnalysis) {
      try {
        await db.from('brain_dump_entries').insert({
          user_id: userId,
          raw_content: message,
          entry_type: 'image',
          category: 'people',
          title: contact_name ? `Conversation with ${contact_name}` : 'A conversation LUNA read',
          ai_summary: screenshotAnalysis.emotional_read || null,
          ai_analysis_enabled: false,
          analysis_status: 'done',
          status: 'kept',
        })
      } catch (err) {
        console.error('[communication-coach] brain-dump note failed:', err)
      }
    }

    return NextResponse.json({ ...result, response_id: responseId, emotional_read: screenshotAnalysis?.emotional_read ?? null })
  } catch (err) {
    console.error('[communication-coach] error:', err)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
