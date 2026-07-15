import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

const VALID_TAGS = ['sounds_like_me', 'too_soft', 'too_harsh', 'too_long', 'too_formal', 'not_what_i_meant'] as const
type Tag = typeof VALID_TAGS[number]

// Only correction-type tags become a standing preference — "sounds like me"
// is confirmation, not something to act on.
const LEARNED_NOTE: Partial<Record<Tag, string>> = {
  too_soft: 'Zoe has repeatedly marked replies as too soft — default to more direct, less cushioned phrasing.',
  too_harsh: 'Zoe has repeatedly marked replies as too harsh — soften the delivery a bit more by default, without losing directness.',
  too_long: "Zoe has repeatedly marked replies as too long — keep replies shorter and more compact by default.",
  too_formal: 'Zoe has repeatedly marked replies as too formal — keep the tone more casual/conversational by default.',
  not_what_i_meant: "LUNA has repeatedly misread Zoe's intent — ask a clarifying question more readily instead of guessing.",
}

// A pattern needs to repeat before it changes anything — one bad rating
// doesn't rewrite the profile.
const PATTERN_THRESHOLD = 3

export async function POST(req: NextRequest) {
  try {
    const { response_id, tag } = await req.json() as { response_id?: string; tag?: string }
    if (!response_id || !tag || !VALID_TAGS.includes(tag as Tag)) {
      return NextResponse.json({ error: 'response_id and a valid tag are required' }, { status: 400 })
    }

    const userId = await resolveUserId()
    const db = createAdminClient()

    const { error } = await db.from('coach_feedback').insert({ user_id: userId, response_id, tag })
    if (error) {
      console.error('[communication-coach/feedback] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const note = LEARNED_NOTE[tag as Tag]
    if (note) {
      const { count } = await db.from('coach_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('tag', tag)

      if ((count ?? 0) >= PATTERN_THRESHOLD) {
        const { data: profile } = await db.from('coach_profile').select('learned_notes').eq('user_id', userId).maybeSingle()
        const existing = profile?.learned_notes ?? ''
        if (!existing.includes(note)) {
          const updated = existing ? `${existing}\n${note}` : note
          await db.from('coach_profile').upsert({ user_id: userId, learned_notes: updated, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[communication-coach/feedback] error:', err)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
