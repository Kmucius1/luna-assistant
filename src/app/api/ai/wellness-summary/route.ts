import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'

const SYSTEM = `You are Luna, Zoe's personal wellness companion. Wellness for Zoe isn't calorie-counting or habit-streaks — it's a daily reset room that answers one question: "Have I taken care of myself today?" She cares about staying tan (beach/pool/sunshine), skincare, hair care, sleep, recovery from the gym, hydration, and generally feeling good rather than being optimized.

Given today's real signals below, write ONE short, warm, specific paragraph (2-3 sentences max) suggesting how she might take care of herself today or tonight. Reference the actual signals given — don't invent facts not provided. Sound like a thoughtful friend who already knows her routines, not a habit-tracker app. Never say "complete your habits" or anything checklist-like.

Return ONLY valid JSON: { "message": "..." }`

interface WellnessSummaryBody {
  mood?: string
  weatherForecast?: string
  tempF?: number
  uvIndex?: number | null
  gymFocusToday?: string
  hydrationProgress?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: WellnessSummaryBody = await req.json().catch(() => ({}))

    const prompt = `Today's feeling: ${body.mood || 'not shared yet'}
Weather: ${body.tempF ? `${body.tempF}°F, ${body.weatherForecast}` : 'unknown'}
UV index: ${body.uvIndex ?? 'unknown'}
Today's gym focus: ${body.gymFocusToday || 'unknown'}
Hydration so far today: ${body.hydrationProgress || 'unknown'}`

    const raw = await callAI(SYSTEM, prompt, 400)
    const parsed = parseAIJson(raw)
    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[wellness-summary]', message)
    return NextResponse.json({ error: 'Could not generate wellness summary.', detail: message }, { status: 500 })
  }
}
