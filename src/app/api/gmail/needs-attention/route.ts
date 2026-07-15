import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAllValidGmailTokens, listGmailMessages, type GmailMessage } from '@/lib/gmail'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const PRIORITY_DEFAULTS = ['Shannon Martin', 'Kaleb Mucius', 'Mick Hoover']

async function getPriorityContacts(): Promise<{ name: string; email: string | null }[]> {
  try {
    const { data } = await adminDb().from('priority_contacts').select('name, email')
    if (data?.length) return data
  } catch {}
  return PRIORITY_DEFAULTS.map(name => ({ name, email: null }))
}

function matchesPriority(email: GmailMessage, contacts: { name: string; email: string | null }[]): boolean {
  const fromLower  = email.from.toLowerCase()
  const emailLower = email.fromEmail.toLowerCase()
  for (const c of contacts) {
    const nameLower = c.name.toLowerCase()
    if (fromLower.includes(nameLower) || nameLower.includes(fromLower)) return true
    if (c.email && (emailLower === c.email.toLowerCase() || emailLower.includes(c.email.toLowerCase()))) return true
    const parts = nameLower.split(' ')
    if (parts.length >= 2 && parts.every(p => fromLower.includes(p))) return true
  }
  return false
}

// Lightweight "needs a reply" signal for dashboard widgets — no AI
// classification, metadata-only Gmail fetch, so it's cheap enough to poll.
export async function GET() {
  try {
    const tokens = await getAllValidGmailTokens()
    if (!tokens.length) {
      return NextResponse.json({ connected: false, count: 0, top: [] })
    }

    const contacts = await getPriorityContacts()

    const perAccount = await Promise.all(tokens.map(t =>
      listGmailMessages(t.access_token, 'in:inbox is:unread', 20, 'metadata').catch(() => [] as GmailMessage[])
    ))

    const flagged = perAccount.flat()
      .map(e => ({ ...e, isPriority: matchesPriority(e, contacts) }))
      .filter(e => e.isPriority || e.isStarred)
      .sort((a, b) => b.timestamp - a.timestamp)

    return NextResponse.json({
      connected: true,
      count: flagged.length,
      top: flagged.slice(0, 5).map(e => ({
        id: e.id, from: e.from, subject: e.subject, snippet: e.snippet, isPriority: e.isPriority,
      })),
    })
  } catch (err) {
    console.error('[gmail/needs-attention]', err instanceof Error ? err.message : err)
    return NextResponse.json({ connected: false, count: 0, top: [] }, { status: 200 })
  }
}
