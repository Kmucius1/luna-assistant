import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callAI, parseAIJson } from '@/lib/ai'

const SYSTEM = `You are Luna, helping Zoe lightly organize a raw captured thought AFTER it's already safely saved — you are never the reason it got saved, and you never replace her original words.

Read the raw entry and suggest, gently:
- category: exactly one of thoughts, todos, ideas, feelings, work, personal, creative, content, shopping, research, people, money, health, later
- title: a short 3-8 word title capturing the gist (never invent detail that isn't there)
- summary: one plain sentence, only if it adds real clarity — otherwise leave empty
- confidence: "high" if the content is clearly one thing, "medium" if it's a reasonable guess, "low" if it's ambiguous, fragmentary, or could be read multiple ways
- possible_action: one honest suggestion for what this could become (e.g. "task", "later", "note", "shopping_item", "none") — "none" is a completely valid and common answer; do not force every thought into being productivity work. Feelings, memories, and unfinished ideas are allowed to just stay Brain Dump entries.

Return ONLY valid JSON: { "category": "...", "title": "...", "summary": "...", "confidence": "high"|"medium"|"low", "possible_action": "..." }`

export async function POST(req: NextRequest) {
  let entryId: string | undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    ;({ entryId } = await req.json())
    if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 })

    const { data: entry } = await supabase.from('brain_dump_entries').select('raw_content, transcript, ai_analysis_enabled').eq('id', entryId).eq('user_id', user.id).single()
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    if (!entry.ai_analysis_enabled) {
      await supabase.from('brain_dump_entries').update({ analysis_status: 'skipped' }).eq('id', entryId).eq('user_id', user.id)
      return NextResponse.json({ skipped: true })
    }

    await supabase.from('brain_dump_entries').update({ analysis_status: 'processing' }).eq('id', entryId).eq('user_id', user.id)

    const content = entry.transcript || entry.raw_content
    const raw = await callAI(SYSTEM, content, 300)
    const parsed = parseAIJson<{ category: string; title: string; summary: string; confidence: 'high' | 'medium' | 'low'; possible_action: string }>(raw)

    const { data: updated, error } = await supabase.from('brain_dump_entries').update({
      ai_suggested_category: parsed.category,
      ai_suggested_title: parsed.title,
      ai_summary: parsed.summary || null,
      ai_confidence: parsed.confidence,
      analysis_status: 'done',
    }).eq('id', entryId).eq('user_id', user.id).select().single()
    if (error) throw error

    return NextResponse.json({ entry: updated, possible_action: parsed.possible_action })
  } catch (error) {
    console.error('[brain-dump/analyze] error:', error)
    try {
      if (entryId) {
        const supabase = await createClient()
        await supabase.from('brain_dump_entries').update({ analysis_status: 'failed' }).eq('id', entryId)
      }
    } catch {}
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
