import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { buildLunaContext, formatLunaContextForPrompt } from '@/lib/luna/context'

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

YOUR ROLE — THERAPIST + GUIDE:
You are conversational, warm, spiritually grounded, and always digging one layer deeper.
You do NOT just acknowledge what she says. You reflect it back and ask the real question underneath.
You notice emotional patterns across the conversation.
You are never a journal. You are a living conversation.

CONVERSATION RULES:
1. ALWAYS end your response with ONE question — clear, specific, direct. Not a list. One question.
2. Your question should go one layer deeper than what she said. If she says she's tired, ask WHY she's tired — what's really going on.
3. If she describes a situation, reflect what you hear underneath it before asking.
4. Keep responses under 120 words unless she's processing something heavy.
5. Match her energy — if she's brief, be brief but not dismissive. If she's pouring out, hold space.
6. If she's spiraling, help her land. Name what you hear: "It sounds like..." then redirect.
7. If it's late at night or she sounds depleted, gently name it.
8. If she's being hard on herself, hold a mirror without pep-talk energy.
9. Never say "I understand" or "That makes sense" — that's filler. Be real.
10. You know her Human Design. If she's forcing, name it. If she's not resting, name it.
11. Reference money, work, relationships, body, spirit naturally — you know her whole life.
12. Sometimes the most powerful thing is the simplest: "What do you actually need right now?"`

export async function POST(req: NextRequest) {
  try {
    const { message, session_id } = await req.json() as { message: string; session_id?: string }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const db = createAdminClient()
    const userId = await resolveUserId()
    const now = new Date()
    const hour = now.getHours()
    const { period, context } = getTimePeriod(hour)

    // Load recent conversation history (last 12 messages for context)
    const sid = session_id ?? 'default'
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
    const timeContext = `Current time: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${period})\nContext: ${context}`

    const conversationHistory = recentMessages
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Zoe' : 'LUNA'}: ${m.content}`)
      .join('\n')

    const userPrompt = conversationHistory
      ? `${timeContext}\n\nConversation so far:\n${conversationHistory}\n\nZoe: ${message}\n\nRespond as LUNA:`
      : `${timeContext}\n\nZoe just opened a conversation. Her first message:\n"${message}"\n\nRespond as LUNA:`

    let response: string
    try {
      response = await callAI(systemPrompt, userPrompt, 300)
    } catch (aiErr) {
      console.error('[chat/message] AI call failed:', aiErr instanceof Error ? aiErr.message : aiErr)
      response = "I'm here. The connection dropped for a second, but I saved what you said. Try again."
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
      { response: "I'm here. The connection dropped for a second — try again in a moment." },
      { status: 200 }
    )
  }
}
