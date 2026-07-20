import { NextRequest, NextResponse } from 'next/server'
import { callAI, DAILY_BRIEF_PROMPT, parseAIJson } from '@/lib/ai'

const FALLBACK = {
  greeting: 'You showed up. That is enough.',
  mood_summary: 'Some days the most powerful thing is to begin quietly, without pressure.',
  top_3: ['Show up for what matters most today', 'Protect your energy', 'One clear next step'],
  can_wait: [],
  first_step: 'Choose one task that moves the needle and give it your full attention first.',
  spiritual_message: 'Move with intention before speed.',
  human_design_message: 'As a Projector, wait for recognition. Do not force.',
  chart_reflection: 'Your Scorpio Sun wants to go deep. Your Cancer Moon needs to feel safe first.',
  affirmation: 'Your consistency builds legacy. Today counts.',
  self_care_action: 'Drink water first.',
  thing_to_avoid: 'Forcing progress before you feel grounded.',
  ai_message: 'You are becoming the woman you see in your future.',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { checkIn, tasks } = body

    let context = "Generate Zoe's morning daily brief."
    if (checkIn) {
      context += `\n\nMorning check-in data:
- Wake time: ${checkIn.wakeTime || 'unknown'}
- Sleep rating: ${checkIn.sleepRating}/10
- Energy rating: ${checkIn.energyRating}/10
- Mood rating: ${checkIn.moodRating}/10
- Had dream: ${checkIn.hadDream ? 'yes' : 'no'}
${checkIn.dreamText ? `- Dream: ${checkIn.dreamText}` : ''}
- Feeling: ${checkIn.feeling || 'not shared'}
- On mind: ${checkIn.onMind || 'not shared'}
- Support need: ${checkIn.supportNeed || 'general guidance'}
- Pride goal: ${checkIn.prideGoal || 'not set'}`
    }
    if (tasks?.length) {
      context += `\n\nOpen tasks: ${tasks.slice(0, 5).map((t: { title: string }) => t.title).join(', ')}`
    }

    try {
      const result = await callAI(DAILY_BRIEF_PROMPT, context, 2000)
      const parsed = parseAIJson(result)
      return NextResponse.json(parsed)
    } catch (aiErr) {
      console.error('Daily brief AI call failed, using fallback:', aiErr)
      return NextResponse.json(FALLBACK)
    }
  } catch (err) {
    console.error('Daily brief error:', err)
    return NextResponse.json(FALLBACK)
  }
}
