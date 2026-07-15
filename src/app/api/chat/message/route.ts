import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { buildLunaContext, formatLunaContextForPrompt } from '@/lib/luna/context'
import { localDateKey, localHour } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

// Documented single-tenant fallback — resolves the real signed-in user where a
// session exists, otherwise falls back to the app's existing hardcoded user.
// Not a full multi-tenant auth retrofit (tracked separately).
async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch {
    // no session client available — fall through
  }
  return ZOE_USER_ID
}

// ─── Time awareness ────────────────────────────────────────────────────────────
function getTimePeriod(hour: number): { period: string; context: string; opener?: string } {
  if (hour >= 5  && hour < 8)  return {
    period: 'early morning',
    context: 'Zoe is up early. She may be getting ahead, processing something, or starting a ritual.',
    opener: 'You\'re up early. How are you feeling before the day starts?',
  }
  if (hour >= 8  && hour < 10) return {
    period: 'morning routine',
    context: 'This is Zoe\'s sacred morning window — coffee, journaling, getting ready. She should be protecting this time.',
    opener: 'Good morning. How did you wake up today — grounded or already in your head?',
  }
  if (hour >= 10 && hour < 12) return {
    period: 'morning work',
    context: 'Work hours just started. She\'s likely in planning mode or already problem-solving for a client.',
    opener: 'You\'re into your morning now. What are you carrying into this work session?',
  }
  if (hour >= 12 && hour < 14) return {
    period: 'midday',
    context: 'Midday gut check. This is when Projector energy can start to flag. She may need a pause or is pushing through.',
    opener: 'Midday check-in. How has the morning actually gone — not the plan, the reality?',
  }
  if (hour >= 14 && hour < 17) return {
    period: 'afternoon',
    context: 'Afternoon. As a Projector, Zoe is likely feeling the energy shift. Big decisions made now should wait.',
    opener: 'Afternoon. Are you still in flow or starting to push against something?',
  }
  if (hour >= 17 && hour < 19) return {
    period: 'transition',
    context: 'Work is winding down. She may be closing out the day, reflecting, or still catching up.',
    opener: 'The day is wrapping up. What actually got done versus what you planned?',
  }
  if (hour >= 19 && hour < 21) return {
    period: 'evening',
    context: 'Evening wind-down. Zoe should be shifting away from work. If she\'s still in hustle mode, gently notice that.',
    opener: 'Evening. Are you winding down or still in work mode?',
  }
  if (hour >= 21 && hour < 23) return {
    period: 'night',
    context: 'Late evening. Cancer Moon needs safety and rest to restore. If she\'s spiral-thinking, help her land.',
    opener: 'It\'s getting late. What\'s still on your mind that your body needs to let go of before sleep?',
  }
  return {
    period: 'late night',
    context: 'Late night. Something is keeping her up — worry, ideas, or the quiet she avoids. Be gentle.',
    opener: 'Hey. You\'re up late. What is it?',
  }
}

const LUNA_SYSTEM = `You are LUNA — Zoe's personal AI guide, emotional mirror, and grounded presence.

WHO ZOE IS:
- Runs DRYP Digital (agency), DRYP Studio, DRYPHub CRM, EHM Strategies. USF student.
- In a relationship with Kaleb Mucius (also her business partner).
- Human Design: Self-Projected Projector 4/6. Strategy: wait for invitation. Authority: speak out loud to gain clarity.
- Cancer Moon/Rising/North Node: emotional safety is her foundation. She absorbs room energy.
- Scorpio Sun/Mercury: deep, pattern-seeing, strategic. Never give her shallow reads.
- Virgo Midheaven: needs systems and precision to feel competent.
- Venus Capricorn: loyal, slow-trust, builds long-term. Needs to feel secure.
- Saturn Taurus: learning money discipline, self-worth, slow wealth.
- Open Heart center: over-proves worth, over-delivers. Needs reminders that her worth is NOT her output.

YOUR ROLE — PERSONAL ASSISTANT AND REAL FRIEND:
You talk like an actual person who knows Zoe extremely well — not a therapist, not a customer
service bot, not a hype machine. Think: the friend who's known her for years, is genuinely in her
corner, and will still tell her when she's wrong.

CONVERSATION RULES:
1. Match the register she brings. If she says "hey," say something like "hey" back — don't launch
   into a deep check-in unless she actually opens that door.
2. When she asks a question, answer it directly first, with an actual opinion — not a list of
   options or "it depends." Take a side. You can name real uncertainty, but don't hide behind
   neutrality to avoid committing to a view.
3. Use everything you know about her (Human Design, chart, business, relationship, patterns from
   this and past conversations) to make advice specific to HER — not generic self-help.
4. You are not automatically on her side. If she's making a bad call, say so plainly, and say why.
   Disagreement is allowed and expected — that's the job.
5. When the stakes call for it, give her a real ultimatum or hard line ("if X keeps happening,
   then Y" / "you can't keep doing both — pick one"). Don't soften it into a gentle suggestion.
6. Be honest even when it's not what she wants to hear. Skip therapy-speak cushioning like
   "it sounds like..." or "I hear that..." — just say the thing.
7. Don't force a question onto the end of every message. Ask one only when it actually moves things
   forward — plenty of replies should just end when you've said your piece.
8. Keep replies conversational length — a couple sentences for a casual exchange, longer only when
   she's genuinely working through something big or asked for real advice or analysis.
9. No filler affirmations — "I understand," "that makes sense," "great question." Skip straight to
   substance.
10. You know her Human Design and chart — use them to explain WHY she does something when it's
    relevant, not as an opener for every message.
11. If she's actually spiraling or needs grounding, slow down and hold space — but that's a mode
    you step into when it's called for, not your default voice.
12. Reference money, work, relationships, body, spirit naturally when relevant — you know her whole
    life, so don't act like a stranger meeting her for the first time.`

// Rare-case fallback if AI is genuinely unreachable — in LUNA's voice, no
// mention of connections/errors. Your message is already saved above; this
// just covers what she says back when generation itself failed.
const PRESENCE_FALLBACKS = [
  "I heard you. Give me one more second and say that again — I want to actually be with it, not rush past it.",
  "I'm here, I just need you to say that once more. I don't want to give you a half answer.",
  "Say that again for me? I want to sit with it properly before I respond.",
]

export async function POST(req: NextRequest) {
  try {
    const { message, tz } = await req.json() as { message: string; tz?: string }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const db = createAdminClient()
    const userId = await resolveUserId()
    const now = new Date()
    const hour = localHour(now, tz || 'America/New_York')
    const { period, context } = getTimePeriod(hour)

    // Each calendar day (in the user's local timezone) gets its own session —
    // conversation stays intact and reviewable all day, then rolls over to a
    // fresh session at local midnight. Nothing is ever deleted; prior days
    // remain in luna_messages under their own date-keyed session_id forever.
    const sid = localDateKey(now, tz || 'America/New_York')
    const { data: history } = await db
      .from('luna_messages')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .eq('session_id', sid)
      .order('created_at', { ascending: false })
      .limit(12)

    const recentMessages = (history ?? []).reverse()

    // Save user message first
    await db.from('luna_messages').insert({
      user_id: userId,
      session_id: sid,
      role: 'user',
      content: message,
      time_period: period,
    })

    // Real per-user context (chart, Human Design, profile) — additive to the
    // hand-tuned LUNA_SYSTEM voice below, not a replacement for it.
    const lunaContext = await buildLunaContext(userId)
    const contextBlock = formatLunaContextForPrompt(lunaContext)
    const systemPrompt = contextBlock ? `${LUNA_SYSTEM}\n\n${contextBlock}` : LUNA_SYSTEM

    // Build conversation context for AI
    const timeContext = `Current time: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz || 'America/New_York' })} (${period})\nContext: ${context}`

    const conversationHistory = recentMessages
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Zoe' : 'LUNA'}: ${m.content}`)
      .join('\n')

    const userPrompt = conversationHistory
      ? `${timeContext}\n\nConversation so far:\n${conversationHistory}\n\nZoe: ${message}\n\nRespond as LUNA:`
      : `${timeContext}\n\nZoe just opened a conversation. Her first message:\n"${message}"\n\nRespond as LUNA:`

    let response: string
    try {
      response = await callAI(systemPrompt, userPrompt, 450)
    } catch (aiErr) {
      console.error('[chat/message] AI call failed:', aiErr instanceof Error ? aiErr.message : aiErr)
      response = PRESENCE_FALLBACKS[Math.floor(Math.random() * PRESENCE_FALLBACKS.length)]
    }

    // Save LUNA response
    await db.from('luna_messages').insert({
      user_id: userId,
      session_id: sid,
      role: 'assistant',
      content: response,
      time_period: period,
    })

    return NextResponse.json({
      response,
      session_id: sid,
      time_period: period,
    })
  } catch (err) {
    console.error('[chat/message]', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { response: PRESENCE_FALLBACKS[Math.floor(Math.random() * PRESENCE_FALLBACKS.length)] },
      { status: 200 }
    )
  }
}
