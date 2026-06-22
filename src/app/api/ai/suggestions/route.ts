import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildLunaContext(tz?: string, localDate?: string, localTime?: string): string {
  const clientTz = tz || 'America/New_York'
  const dateStr = localDate || new Intl.DateTimeFormat('en-US', { timeZone: clientTz, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  const timeStr = localTime || new Intl.DateTimeFormat('en-US', { timeZone: clientTz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())
  return `You are generating suggestion chips for Zoe Taylor Herstich's personal AI assistant LUNA.
Zoe is: Scorpio Sun 22°, Cancer Moon 4°, Gemini Rising 12°, Mercury Scorpio, Venus Sagittarius, Mars Libra.
Human Design: Self-Projected Projector, 4/6 profile. Clarity comes through her voice/speaking.
She runs Ad-Vantage Media Agency and DRYP Digital. USF student. Creative, emotionally intelligent, truth-seeking.
Current date: ${dateStr}
Current local time: ${timeStr}

Generate SHORT, honest, specific options she can TAP to answer the question.
Each option should be 2-7 words. Raw, real, not generic.
Return ONLY a JSON array of 5 strings. No other text.`
}

const CONTEXT_PRESETS: Record<string, string[]> = {
  // Morning
  'how are you feeling': ['Honestly pretty good', 'Tired but grateful', 'Scattered and anxious', 'Heavy but present', 'Clear and ready', 'Low energy today'],
  'energy': ['Running on fumes', 'Actually good today', 'Caffeinated and wired', 'Slow but steady', 'Full capacity', 'Drained already'],
  'sleep': ['Slept great actually', 'Woke up too early', 'Tossed and turned', 'Finally deep sleep', 'Fell asleep late', 'Interrupted multiple times'],
  'dream': ['Wild vivid dream', 'Something about my mom', 'Work stress dream', 'I was somewhere else', 'Can\'t quite remember', 'No dreams tonight'],
  'on your mind': ['Work deliverables piling', 'Money is on my mind', 'A relationship feeling', 'Something I said yesterday', 'Too many open loops', 'Nervous about something'],
  'support': ['Calm and grounding', 'Confidence and fire', 'Clarity to decide', 'Gentleness today', 'Motivation to start', 'Permission to rest'],
  'proud': ['Showed up anyway', 'Said something true', 'Made real progress', 'Set a boundary', 'Delivered something good', 'Took care of myself'],
  // Journal
  'carrying': ['A heavy heaviness', 'Too many thoughts', 'Someone else\'s energy', 'Unprocessed feelings', 'Work pressure', 'Creative frustration'],
  'avoiding': ['A hard conversation', 'Looking at finances', 'A decision I need', 'Someone\'s feelings', 'My own needs', 'The thing I know'],
  'release': ['The need to control', 'Someone\'s opinion of me', 'An old story', 'Perfectionism today', 'Comparison energy', 'Tension in my chest'],
  'body': ['Tight in my shoulders', 'Tired in my core', 'Restless and fidgety', 'Heavy and low', 'Actually clear and open', 'Headache building'],
  'soul': ['It already knows', 'This needs to end', 'Rest is next', 'Something is shifting', 'Trust the process', 'I\'m not lost'],
  // Night
  'today': ['More than expected', 'Less than I wanted', 'Exactly what I needed', 'Hard but important', 'A small win', 'An emotional day'],
  'grateful': ['My health', 'One real moment', 'Something that worked', 'A good conversation', 'That I showed up', 'Quiet at the end'],
  'tomorrow': ['Start easier', 'One focused block', 'Protect my morning', 'Say no to something', 'Rest first', 'Be more patient'],
  // Generic
  'mood': ['Genuinely good', 'A little off', 'Scattered today', 'Surprisingly peaceful', 'Low and quiet', 'Anxious underneath'],
  'intention': ['Protect my energy', 'Create something real', 'Stay in my lane', 'Move the needle forward', 'Trust my instincts', 'Rest without guilt'],
  'goal': ['Complete the main thing', 'One creative hour', 'Send the message', 'Finish what I started', 'Make one decision', 'Rest and recharge'],
}

function matchPreset(context: string): string[] | null {
  const lower = context.toLowerCase()
  for (const [key, vals] of Object.entries(CONTEXT_PRESETS)) {
    if (lower.includes(key)) return vals
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { context, history = [], type = 'general', tz, localDate, localTime } = await req.json()
    const LUNA_CONTEXT = buildLunaContext(tz as string | undefined, localDate as string | undefined, localTime as string | undefined)

    // Check for preset (fast path)
    const preset = matchPreset(context)
    if (preset && Math.random() > 0.35) {
      // Return preset shuffled, with slight variation
      const shuffled = [...preset].sort(() => Math.random() - 0.5)
      return NextResponse.json({ suggestions: shuffled.slice(0, 5) })
    }

    // Generate via Claude
    const historyContext = history.length
      ? `\nRecent answers from this session:\n${history.slice(-3).map((h: string) => `- "${h}"`).join('\n')}`
      : ''

    const prompt = `Question/field: "${context}"
Type: ${type}${historyContext}

Generate 5 SHORT (2-7 word) honest, specific suggestions Zoe could tap to answer this.
Think about what a real Scorpio Sun / Cancer Moon woman would actually feel or think here.
Raw honesty over positive spin. Variety — include at least one lighter and one heavier option.
Return only a JSON array of 5 strings.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: LUNA_CONTEXT,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    const match = raw.match(/\[[\s\S]*?\]/)
    const suggestions: string[] = match ? JSON.parse(match[0]) : []

    return NextResponse.json({ suggestions: suggestions.slice(0, 5) })
  } catch (err) {
    console.error('suggestions error:', err)
    return NextResponse.json({ suggestions: ['Something is on my mind', 'Hard to put into words', 'Let me think about this', 'More than I expected', 'Still processing'] })
  }
}
