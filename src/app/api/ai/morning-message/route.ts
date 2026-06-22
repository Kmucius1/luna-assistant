import { NextRequest, NextResponse } from 'next/server'
import { MORNING_MESSAGE_PROMPT, callAI, parseAIJson } from '@/lib/ai'

// ─── Mode auto-selection ──────────────────────────────────────
function selectMode(sleep: number, energy: number, mood: number, supportNeed: string, wakeTime: string): string {
  const hour = wakeTime ? parseInt(wakeTime.split(':')[0]) : new Date().getHours()

  if (hour >= 10) return 'Late Wake-Up Recalibration'
  if (sleep <= 4 || (sleep <= 5 && energy <= 4)) return 'Recovery Morning'
  if (mood <= 4) return 'Emotional Morning'
  if (energy <= 4) return 'Rest and Repair Morning'
  if (supportNeed === 'reset') return 'Late Wake-Up Recalibration'
  if (supportNeed === 'calm' && mood >= 7) return 'Soft Start'
  if (supportNeed === 'focus' && energy >= 7) return 'High-Focus Work Day'
  if (supportNeed === 'comfort') return 'Emotional Morning'
  if (supportNeed === 'confidence') return 'High-Focus Work Day'
  if (supportNeed === 'direction') return 'Big Client Day'
  if (sleep >= 8 && energy >= 8 && mood >= 7) return 'High-Focus Work Day'
  return 'Soft Start'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      wake_time = '',
      sleep_rating = 7,
      energy_rating = 7,
      mood_rating = 7,
      had_dream = false,
      dream_text = '',
      feeling = '',
      on_mind = '',
      support_need = '',
      pride_goal = '',
      work_context = '',
      schedule_context = '',
      recent_messages = [], // Array of { date, greeting, mantra, crystal, tone_mode }
      moon_data = null,     // From /api/astrology/moon
    } = body

    const auto_mode = selectMode(sleep_rating, energy_rating, mood_rating, support_need, wake_time)
    // Use client's local timezone if provided so date is correct for Zoe (not UTC)
    const clientTz = (body.tz as string) || 'America/New_York'
    const today = new Intl.DateTimeFormat('en-US', {
      timeZone: clientTz, weekday: 'long', month: 'long', day: 'numeric',
    }).format(new Date())

    // ── Build the recent message history context ──────────────
    const recentHistory = recent_messages.length > 0
      ? `RECENT MORNING MESSAGES (DO NOT REPEAT THESE):
${recent_messages.slice(0, 7).map((m: { date?: string; greeting?: string; mantra?: string; crystal?: string; tone_mode?: string }, i: number) => `${i + 1}. [${m.date}] Greeting: "${m.greeting}" | Mantra: "${m.mantra}" | Crystal: ${m.crystal} | Mode: ${m.tone_mode}`).join('\n')}`
      : 'No recent messages — this may be her first morning check-in.'

    // ── Build moon context ────────────────────────────────────
    const moonContext = moon_data
      ? `LIVE MOON DATA (accurate, use this for astrology reflection):
Moon Phase: ${moon_data.phase?.name} (${moon_data.phase?.illumination}% illuminated)
Moon Sign: ${moon_data.sign?.formatted} in ${moon_data.sign?.name}
Moon Sign Energy: ${moon_data.sign?.keywords}
${moon_data.next_ingress ? `Moon enters next sign: ${moon_data.next_ingress}` : ''}`
      : 'Moon data unavailable — use general spiritual themes.'

    // ── Build her morning state ───────────────────────────────
    const morningState = `TODAY: ${today}
TONE MODE TO USE: ${auto_mode}

HER MORNING STATE:
Wake time: ${wake_time || 'not specified'}
Sleep quality: ${sleep_rating}/10
Energy level: ${energy_rating}/10
Mood: ${mood_rating}/10
${had_dream && dream_text ? `Dream: ${dream_text}` : had_dream ? 'Had a dream but did not remember it' : 'No dream recalled'}
${feeling ? `What she is feeling: ${feeling}` : ''}
${on_mind ? `What is on her mind: ${on_mind}` : ''}
${support_need ? `What she needs today: ${support_need}` : ''}
${pride_goal ? `What would make her proud tonight: ${pride_goal}` : ''}

REAL-LIFE CONTEXT:
${schedule_context || 'No schedule context provided — speak to the day in general terms.'}
${work_context || ''}

${moonContext}

${recentHistory}

Generate her morning message. Make it feel like it was written specifically for this morning, not pulled from a template. She should feel SEEN.`

    const raw = await callAI(MORNING_MESSAGE_PROMPT, morningState, 1200)
    const result = parseAIJson<{
      greeting: string
      soul_read: string
      astrology_reflection: string
      human_design_reminder: string
      work_awareness: string
      highest_self_lesson: string
      protect: string
      release: string
      first_move: string
      crystal: string
      crystal_why: string
      mantra: string
      tone_mode: string
      day_theme: string
    }>(raw)

    return NextResponse.json({ ...result, date: today, auto_mode })

  } catch (err) {
    console.error('Morning message error:', err)

    // ── Fallback — never leave her without a message ──────────
    const hour = new Date().getHours()
    const fallbacks = [
      {
        greeting: 'Good morning, beautiful.',
        soul_read: 'Your body knows what it needs. Before anything else, breathe.',
        astrology_reflection: 'The moon is always somewhere in the sky, moving through you. Trust what feels true today, not what feels urgent.',
        human_design_reminder: 'As a Projector, your energy is precious. Choose one thing to give your full attention to — not five things at half power.',
        work_awareness: 'Before you open the work, open yourself. Everything will get done.',
        highest_self_lesson: 'She does not chase. She calls in.',
        protect: 'Your first two hours — they belong to you before they belong to anyone else.',
        release: 'The pressure to have it all figured out.',
        first_move: 'Drink water. Look out a window. Then begin.',
        crystal: 'Amethyst',
        crystal_why: 'Hold it when you feel scattered — it brings you back to your own frequency.',
        mantra: 'I choose presence over pressure.',
        tone_mode: hour >= 10 ? 'Late Wake-Up Recalibration' : 'Soft Start',
        day_theme: 'Grace before speed',
      },
      {
        greeting: 'There you are.',
        soul_read: 'You came back. That is the whole practice — returning to yourself, every single morning.',
        astrology_reflection: 'Something in the sky is always working in your favor, even when it does not feel like it. Today asks for trust.',
        human_design_reminder: 'Your truth is in your voice. If you have a decision waiting, say it out loud before you commit.',
        work_awareness: 'The work will be there. Your clarity is the most valuable tool you have. Protect it first.',
        highest_self_lesson: 'Slow is not the same as behind.',
        protect: 'Your peace before 10 AM.',
        release: 'Anyone else\'s timeline.',
        first_move: 'Name one thing that only you can do today. Start there.',
        crystal: 'Moonstone',
        crystal_why: 'Carry it when you need to trust the timing of things you cannot control.',
        mantra: 'I move at my own pace. That is power.',
        tone_mode: 'Soft Start',
        day_theme: 'Return to yourself',
      },
    ]

    const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)]
    return NextResponse.json({ ...fallback, date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) })
  }
}
