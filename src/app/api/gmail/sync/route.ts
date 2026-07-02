import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getGmailTokens, listGmailMessages, type GmailMessage } from '@/lib/gmail'
import { callAI } from '@/lib/ai'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// ─── Priority contacts ────────────────────────────────────────────────────────
const PRIORITY_DEFAULTS = ['Shannon Martin', 'Kaleb Mucius', 'Mick Hoover']

async function getPriorityContacts(): Promise<{ name: string; email: string | null }[]> {
  try {
    const { data } = await adminDb().from('priority_contacts').select('name, email')
    if (data?.length) return data
  } catch {}
  return PRIORITY_DEFAULTS.map(name => ({ name, email: null }))
}

function matchesPriority(email: GmailMessage, contacts: { name: string; email: string | null }[]): string | null {
  const fromLower    = email.from.toLowerCase()
  const emailLower   = email.fromEmail.toLowerCase()
  for (const c of contacts) {
    const nameLower = c.name.toLowerCase()
    if (fromLower.includes(nameLower) || nameLower.includes(fromLower)) return c.name
    if (c.email && (emailLower === c.email.toLowerCase() || emailLower.includes(c.email.toLowerCase()))) return c.name
    // Match first + last name parts individually (e.g. "shannon" in "shannon martin noreply@...")
    const parts = nameLower.split(' ')
    if (parts.length >= 2 && parts.every(p => fromLower.includes(p))) return c.name
  }
  return null
}

// ─── Multi-account tokens ─────────────────────────────────────────────────────
async function getAllTokens(): Promise<{ access_token: string; connected_email: string }[]> {
  try {
    const { data } = await adminDb()
      .from('gmail_tokens')
      .select('email, access_token, refresh_token, token_expiry')
      .order('connected_at', { ascending: true })
    if (!data?.length) return []
    return data.map((row: { email: string; access_token: string }) => ({
      access_token: row.access_token, connected_email: row.email,
    }))
  } catch {
    const single = await getGmailTokens()
    return single ? [single] : []
  }
}

// ─── AI categorization (only for non-priority emails) ────────────────────────
interface CategorizedEmail {
  id: string
  category: 'urgent' | 'needs_reply' | 'fyi' | 'newsletter' | 'internal'
  action?: string
  tasks?: string[]
}

async function categorizeEmails(emails: (GmailMessage & { account: string })[]) {
  if (!emails.length) return []
  const summaries = emails.slice(0, 30).map((e, i) =>
    `[${i}] From: ${e.from} <${e.fromEmail}>\nSubject: ${e.subject}\nSnippet: ${e.snippet}`
  ).join('\n---\n')

  try {
    const SYSTEM = "You are Zoe's AI email assistant. Zoe runs Ad-Vantage Media Agency and DRYP Digital. Categorize emails accurately and extract real action items. Return ONLY valid JSON arrays, no markdown."
    const userPrompt = `Categorize each email below.

Categories:
- urgent: needs response TODAY, deadline or time-sensitive. ALWAYS use "urgent" for: bills due, payment due, invoice, statement due, balance due, past due, medical bills, doctor bills, insurance EOB, prescription ready, lab results, appointment reminders, account past due, collection notices, utility shutoff warnings.
- needs_reply: requires a response but not urgent
- fyi: informational, no reply needed
- newsletter: marketing, newsletters, subscriptions
- internal: automated notifications, system emails

IMPORTANT: Any email about money owed, medical care, insurance, prescriptions, or health appointments must be "urgent". When in doubt on financial or medical emails, choose "urgent" over "fyi".

For each email, also extract concrete ACTION ITEMS as short task strings if present.

Emails:
${summaries}

Return ONLY valid JSON array: [{"index": 0, "category": "...", "action": "one sentence what Zoe needs to do", "tasks": ["task1"]}]
"tasks" is empty array if none. "action" is empty string if none.`

    const text = await callAI(SYSTEM, userPrompt, 1200)
    const match = text.match(/\[[\s\S]*\]/)
    const parsed: { index: number; category: string; action?: string; tasks?: string[] }[] = match
      ? JSON.parse(match[0]) : []

    return parsed.map(p => ({
      id:       emails[p.index]?.id ?? '',
      category: (p.category as CategorizedEmail['category']) ?? 'fyi',
      action:   p.action || undefined,
      tasks:    p.tasks ?? [],
    })).filter(p => p.id) as CategorizedEmail[]
  } catch { return [] }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET() {
  const allTokens = await getAllTokens()
  if (!allTokens.length) return NextResponse.json({ error: 'not_connected' }, { status: 401 })

  const priorityContacts = await getPriorityContacts()

  try {
    // Fetch from all accounts in parallel
    const accountEmails = await Promise.all(
      allTokens.map(async (tok) => {
        // Also search specifically for emails FROM priority contacts (read or unread)
        const priorityQuery = priorityContacts.map(c => `from:(${c.name})`).join(' OR ')
        const [unread, starred, priorityMail] = await Promise.all([
          listGmailMessages(tok.access_token, 'in:inbox is:unread', 20),
          listGmailMessages(tok.access_token, 'in:inbox is:starred', 5),
          priorityQuery ? listGmailMessages(tok.access_token, `in:inbox ${priorityQuery}`, 10) : Promise.resolve([]),
        ])
        const seen = new Set<string>()
        return [...priorityMail, ...unread, ...starred]
          .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
          .map(e => ({ ...e, account: tok.connected_email }))
      })
    )

    // Merge + de-duplicate globally
    const globalSeen = new Set<string>()
    const allEmails = accountEmails.flat().filter(e => {
      if (globalSeen.has(e.id)) return false
      globalSeen.add(e.id)
      return true
    })
    allEmails.sort((a, b) => b.timestamp - a.timestamp)

    // ── Step 1: Flag priority contacts immediately, before AI ──
    const priorityFlagged = allEmails.map(e => {
      const match = matchesPriority(e, priorityContacts)
      return { ...e, isPriority: !!match, priorityContact: match ?? undefined }
    })

    // ── Step 2: AI categorize only non-priority emails (saves tokens) ──
    const nonPriority = priorityFlagged.filter(e => !e.isPriority)
    const categorized = await categorizeEmails(nonPriority)

    // ── Step 3: Merge results ──
    const merged = priorityFlagged.map(e => {
      if (e.isPriority) {
        // Priority contacts are always urgent, extract tasks from snippet
        return {
          ...e,
          category: 'urgent' as const,
          action:   `Reply to ${e.priorityContact} — this is a priority contact`,
          tasks:    [],
        }
      }
      const cat = categorized.find(c => c.id === e.id)
      return { ...e, category: cat?.category ?? 'fyi', action: cat?.action, tasks: cat?.tasks ?? [] }
    })

    // ── Priority contacts always float to the very top ──
    const priority    = merged.filter(e => e.isPriority)
    const urgent      = merged.filter(e => !e.isPriority && e.category === 'urgent')
    const needs_reply = merged.filter(e => !e.isPriority && e.category === 'needs_reply')
    const fyi         = merged.filter(e => !e.isPriority && e.category === 'fyi')
    const newsletter  = merged.filter(e => !e.isPriority && e.category === 'newsletter')

    const extracted_tasks = merged.flatMap(e =>
      (e.tasks ?? []).map(t => ({ task: t, from: e.from, emailId: e.id, subject: e.subject, account: (e as { account?: string }).account ?? '' }))
    )

    return NextResponse.json({
      accounts:          allTokens.map(t => ({ email: t.connected_email, connected: true })),
      priority_contacts: priorityContacts,
      total:             merged.length,
      unread_count:      merged.filter(e => !e.isRead).length,
      priority_count:    priority.length,
      priority,
      urgent,
      needs_reply,
      fyi,
      newsletter,
      all: merged,
      extracted_tasks,
    })
  } catch (err) {
    console.error('Gmail sync error:', err)
    return NextResponse.json({ error: 'sync_failed' }, { status: 500 })
  }
}
