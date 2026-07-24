import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'

const SYSTEM = `You are Luna, Zoe's personal creative companion. Zoe enjoys creating around: art/drawing/painting, fashion/outfits/personal style, beauty/hair/makeup, photography and self-portraits, songs/poems/journaling, mood boards and vision boards, lock screens and personal graphics, room and closet styling, nature and travel, and documenting memories. She does not want generic craft-project ideas — she wants suggestions that feel personal, editorial, and like they actually fit her mood and the time she has right now.

Given her check-in answers, propose exactly three distinct creative paths:
1. "easy_win" — something simple she can start in the next few minutes.
2. "main_activity" — a fuller project matching her mood and available time.
3. "get_out" — a place or small outing that gives her something to photograph, draw, write about, or collect.

Each path must include a short reason referencing her actual answers (energy/location/time/what she wants from today), a realistic time estimate, a materials/what-you-need list, and exactly three concrete first steps. Never invent specific real people, brands, or places you don't know exist.

Return ONLY valid JSON in this shape:
{
  "paths": [
    {
      "kind": "easy_win" | "main_activity" | "get_out",
      "title": "short evocative title",
      "why": "1-2 sentences referencing her actual check-in answers",
      "duration": "e.g. 20-30 minutes",
      "needs": ["item 1", "item 2"],
      "steps": ["step 1", "step 2", "step 3"]
    }
  ]
}`

interface CreativePathsBody {
  energy?: string
  where?: string
  activity?: string
  time?: string
  want?: string
  capture?: string
  surpriseMe?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body: CreativePathsBody = await req.json().catch(() => ({}))

    const prompt = body.surpriseMe
      ? `Zoe didn't answer a check-in — she just wants one unexpected creative idea to shake up her day. Give her ONE surprising "main_activity" path only. Still return the same JSON shape, with a single-item "paths" array.`
      : `Energy: ${body.energy || 'medium'}
Where she wants to be: ${body.where || 'no preference'}
What sounds best: ${body.activity || 'no preference'}
Time available: ${body.time || 'an hour'}
What she wants from today: ${body.want || 'to feel good'}
Does she want this to become content: ${body.capture || 'just for me'}

Give her all three paths (easy_win, main_activity, get_out).`

    const raw = await callAI(SYSTEM, prompt, 1800)
    const parsed = parseAIJson(raw)
    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[creative-paths]', message)
    return NextResponse.json({ error: 'Could not generate creative paths.', detail: message }, { status: 500 })
  }
}
