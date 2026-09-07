import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculatePriorityScore } from '@/lib/priority'
import type { Task } from '@/types'
import { ZOE_LIFESTYLE_PROFILE, ZOE_GYM_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function mondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

// DRYP's `priority` field is free text, not a fixed union — map loosely to
// the local Task model's urgency scale so calculatePriorityScore has
// something real to work with, rather than skipping DRYP tasks entirely.
function drypPriorityToUrgency(priority?: string): Task['urgency_level'] {
  const p = (priority ?? '').toLowerCase()
  if (p.includes('urgent') || p.includes('critical')) return 'critical'
  if (p.includes('high')) return 'high'
  if (p.includes('low')) return 'low'
  return 'medium'
}

interface DrypTaskFlagged {
  id: string
  title: string
  account_name?: string
  due_date?: string
  priority?: string
  isOverdue: boolean
  isStuck: boolean
}

function isShapeValid(parsed: Record<string, unknown>): boolean {
  const days = parsed.days as Record<string, unknown> | undefined
  const top3b = parsed.top_3_business as unknown[] | undefined
  const top3p = parsed.top_3_personal as unknown[] | undefined
  return !!days && WEEKDAYS.every(d => d in days) && Array.isArray(top3b) && Array.isArray(top3p)
}

const SYSTEM = `You are LUNA, Zoe's personal planner, finishing her Sunday Weekly Reset. You already gathered her real calendar, DRYP CRM, and email data. Now merge that with her answers to a short questionnaire into her final Monday-through-Sunday plan.

${ZOE_LIFESTYLE_PROFILE}

Weekday gym focus reference: ${JSON.stringify(ZOE_GYM_BY_DAY)}

You are also given a pre-ranked list of her highest-priority open tasks (already objectively scored — do not re-rank from scratch, just phrase the top ones with a short reason, breaking ties using client/context importance where the score alone can't).

Return ONLY valid JSON in exactly this shape (all 7 weekdays required, use the exact keys Monday..Sunday):
{
  "days": {
    "Monday": {
      "work_location": "home",
      "meetings": [{ "time": "2:00 PM", "title": "...", "locationType": "virtual", "detail": "..." }],
      "work_blocks": [{ "time": "10:00 AM", "label": "...", "detail": "..." }],
      "gym_focus": "...",
      "meals": { "breakfast": "...", "lunch": "...", "dinner": "..." },
      "errands": ["..."],
      "self_care": ["..."],
      "outfit_type": "...",
      "personal_plans": ["..."]
    }
  },
  "laundry_cleaning_day": "...",
  "grocery_day": "... or null",
  "top_3_business": [{ "title": "...", "reason": "...", "source": "dryp" }],
  "top_3_personal": [{ "title": "...", "reason": "..." }],
  "ai_message": "warm, practical closing note from Luna about the week ahead"
}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const questionnaireAnswers = body.answers ?? {}

    const now = new Date()
    const dateKey = mondayOf(now)
    const db = createAdminClient()

    const { data: gatherRow } = await db
      .from('daily_generation_cache')
      .select('payload')
      .eq('user_id', ZOE_USER_ID)
      .eq('date_key', dateKey)
      .eq('generation_type', 'weekly_reset_gather')
      .maybeSingle()

    const gather = (gatherRow?.payload ?? {}) as {
      week_summary?: string
      flagged_deadlines?: string[]
      meeting_notes?: string[]
      dryp_load_summary?: string
      events?: { title: string; day: string; time: string; locationType: string }[]
      dryp_tasks?: DrypTaskFlagged[]
    }

    // Objective ranking first — the AI phrases the top candidates, it
    // doesn't invent the ranking.
    const { data: localTasks } = await db
      .from('tasks')
      .select('id, title, category, project, due_date, urgency_level, money_impact, emotional_weight, estimated_minutes, status')
      .eq('user_id', ZOE_USER_ID)
      .not('status', 'in', '("done","cancelled")')

    const scoredLocal = (localTasks ?? []).map((t: Record<string, unknown>) => ({
      title: t.title as string,
      score: calculatePriorityScore(t as Partial<Task>),
      source: 'local' as const,
    }))

    const scoredDryp = (gather.dryp_tasks ?? []).map(t => ({
      title: t.title + (t.account_name ? ` (${t.account_name})` : ''),
      score: calculatePriorityScore({
        urgency_level: drypPriorityToUrgency(t.priority),
        due_date: t.due_date,
      }),
      source: 'dryp' as const,
    }))

    const topCandidates = [...scoredLocal, ...scoredDryp]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)

    const userPrompt = `WEEK SUMMARY FROM GATHER STEP:
${gather.week_summary ?? 'Not available.'}

FLAGGED DEADLINES:
${(gather.flagged_deadlines ?? []).join('\n') || 'None flagged.'}

MEETING NOTES:
${(gather.meeting_notes ?? []).join('\n') || 'None.'}

DRYP LOAD: ${gather.dryp_load_summary ?? 'Not available.'}

CLASSIFIED MEETINGS THIS WEEK:
${(gather.events ?? []).map(e => `• ${e.day} ${e.time} — ${e.title} [${e.locationType}]`).join('\n') || 'None.'}

TOP-SCORED CANDIDATE TASKS (pre-ranked, pick from these for top_3_business, don't invent new ones):
${topCandidates.map(c => `• [${c.source}] ${c.title} (score ${c.score})`).join('\n') || 'None available.'}

ZOE'S ANSWERS TO THIS WEEK'S QUESTIONNAIRE:
${JSON.stringify(questionnaireAnswers, null, 2)}

Build the full Monday-through-Sunday plan now. Respect her stated work-location preference from the questionnaire where given, otherwise use the default pattern. If she said no groceries needed, set grocery_day to null. Keep every string value concise (one short sentence max) — this output has 7 days of nested detail, so brevity per field matters more than completeness of prose.`

    // A 7-day nested plan is the most complex JSON shape anywhere in this
    // app — give it real headroom and a couple of self-repair passes rather
    // than the single-shot pattern simpler prompts use, since truncation
    // and escaping slips are meaningfully more likely at this size.
    let raw = await callAI(SYSTEM, userPrompt, 6000)
    let parsed: Record<string, unknown> | null = null
    let parseFailureReason = ''
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        parsed = parseAIJson<Record<string, unknown>>(raw)
        if (isShapeValid(parsed)) { parseFailureReason = ''; break }
        parseFailureReason = 'missing required fields (all 7 weekday keys under "days", or top_3_business/top_3_personal as arrays)'
      } catch (e) {
        parsed = null
        parseFailureReason = e instanceof Error ? e.message : 'invalid JSON'
      }
      if (attempt < 2) {
        const repairPrompt = `Your previous JSON response had a problem: ${parseFailureReason}. Here is what you returned:\n${raw}\n\nReturn the corrected, complete, VALID JSON in the exact same shape. Double-check every string value is properly escaped (no unescaped quotes or line breaks inside string values), and that every array/object is properly closed.`
        raw = await callAI(SYSTEM, repairPrompt, 6000)
      }
    }
    if (!parsed) throw new Error(`AI could not produce valid JSON after retries: ${parseFailureReason}`)

    const payload = { ...parsed, week_of: dateKey, questionnaire_answers: questionnaireAnswers }

    try {
      await db.from('daily_generation_cache').upsert({
        user_id: ZOE_USER_ID,
        date_key: dateKey,
        timezone: 'America/New_York',
        generation_type: 'weekly_reset_final',
        payload,
        source: 'ai',
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id,date_key,generation_type' })
    } catch (saveError) {
      console.error('[luna/weekly-reset/finalize] failed to persist final payload:', saveError instanceof Error ? saveError.message : saveError)
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[luna/weekly-reset/finalize] POST error:', message)
    return NextResponse.json({ error: 'Could not finalize your week.', detail: message }, { status: 500 })
  }
}
