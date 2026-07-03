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

// ─── AI categorization ─────────────────────────────────────────────────────────
export type MailCategory =
  | 'dryp_client'   // DRYP Digital business/client work: proposals, project updates, CRM, team coordination
  | 'personal'      // Zoe's personal life: friends, family, personal errands, personal accounts
  | 'recap'         // digests, summaries, "here's what happened" roundups
  | 'tracking'      // shipping/delivery/order tracking
  | 'bills_medical' // bills, invoices to pay, medical/health, insurance, prescriptions
  | 'admin_tools'   // account/tool notifications, password resets, system/service notices
  | 'promo'         // marketing, newsletters, promotional content

interface CategorizedEmail {
  id: string
  category: MailCategory
  isMeeting: boolean
  isUrgent: boolean
  needsReview: boolean
  action?: string
  tasks?: string[]
}

async function categorizeEmails(emails: (GmailMessage & { account: string })[]) {
  if (!emails.length) return []
  const summaries = emails.slice(0, 40).map((e, i) =>
    `[${i}] Account: ${e.account}\nFrom: ${e.from} <${e.fromEmail}>\nSubject: ${e.subject}\nSnippet: ${e.snippet}`
  ).join('\n---\n')

  try {
    const SYSTEM = "You are LUNA, Zoe Taylor's personal AI assistant and command center. Zoe is Founder/CMO of DRYP Digital, but LUNA serves her whole life, not just her business role -- personal mail matters just as much as client work. Categorize emails accurately, don't default everything to business just because it's plausible. Return ONLY valid JSON arrays, no markdown."
    const userPrompt = `Zoe has three connected inboxes:
- zoettaylor14@gmail.com: her personal inbox (personal life, personal bills, deliveries, appointments, subscriptions)
- zoe@drypdigital.com: her DRYP Digital business inbox (as Founder/CMO -- clients, proposals, meetings, CRM)
- info@drypdigital.com: the DRYP Digital team inbox (shared team communication)

The account an email arrived in is a HINT, not a rule -- a personal bill or medical appointment can land in any inbox and must still be recognized as personal/bills_medical, not forced into business just because of which account received it.

For each email below, determine:

1. category (pick exactly one):
   - dryp_client: DRYP Digital business/client work -- client emails, proposals, project updates, CRM/outreach, team coordination for DRYP
   - personal: Zoe's personal life -- friends, family, personal errands, non-business accounts/services
   - recap: digests, summaries, weekly/daily roundups, "here's what happened" content
   - tracking: shipping, delivery, or order tracking updates
   - bills_medical: bills, invoices to pay, medical care, insurance, prescriptions, health appointments
   - admin_tools: account/tool notifications, password resets, security alerts, system or service notices (not bills)
   - promo: marketing, newsletters, promotional content, sales offers

2. isMeeting: true if this is a meeting invite, scheduling request, or calendar-related ask (regardless of category -- a client meeting is both dryp_client AND isMeeting)

3. isUrgent: true if it needs action TODAY or is time-sensitive/has a deadline. Bills due, payment due, past due, medical appointments, prescription ready, lab results, security alerts, and anything with a real deadline should be isUrgent regardless of category.

4. needsReview: true ONLY if you are genuinely unsure how to categorize this one (ambiguous content, mixed signals) -- don't overuse this, most emails should have a confident category.

5. Extract concrete ACTION ITEMS as short task strings if present.

Emails:
${summaries}

Return ONLY valid JSON array: [{"index": 0, "category": "...", "isMeeting": false, "isUrgent": false, "needsReview": false, "action": "one sentence what Zoe needs to do", "tasks": ["task1"]}]
"tasks" is empty array if none. "action" is empty string if none.`

    const text = await callAI(SYSTEM, userPrompt, 1600)
    const match = text.match(/\[[\s\S]*\]/)
    const parsed: {
      index: number; category: string; isMeeting?: boolean; isUrgent?: boolean; needsReview?: boolean
      action?: string; tasks?: string[]
    }[] = match ? JSON.parse(match[0]) : []

    return parsed.map(p => ({
      id:          emails[p.index]?.id ?? '',
      category:    (p.category as MailCategory) ?? 'admin_tools',
      isMeeting:   !!p.isMeeting,
      isUrgent:    !!p.isUrgent,
      needsReview: !!p.needsReview,
      action:      p.action || undefined,
      tasks:       p.tasks ?? [],
    })).filter(p => p.id) as CategorizedEmail[]
  } catch (err) {
    console.error('Email categorization failed:', err instanceof Error ? err.message : err)
    return []
  }
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

    // ── Step 1: Flag priority contacts ──
    const priorityFlagged = allEmails.map(e => {
      const match = matchesPriority(e, priorityContacts)
      return { ...e, isPriority: !!match, priorityContact: match ?? undefined }
    })

    // ── Step 2: AI categorize every email, so priority contacts still land in the right
    //            domain/type tabs (DRYP Clients, Zoe Personal, Meetings, etc.) ──
    const categorized = await categorizeEmails(priorityFlagged)

    // ── Step 3: Merge results ──
    const merged = priorityFlagged.map(e => {
      const cat = categorized.find(c => c.id === e.id)
      return {
        ...e,
        category:    cat?.category ?? 'admin_tools' as MailCategory,
        isMeeting:   cat?.isMeeting ?? false,
        // Priority contacts always surface as urgent, on top of whatever the AI found
        isUrgent:    e.isPriority || (cat?.isUrgent ?? false),
        needsReview: cat?.needsReview ?? false,
        action:      e.isPriority ? (cat?.action || `Reply to ${e.priorityContact} — this is a priority contact`) : cat?.action,
        tasks:       cat?.tasks ?? [],
      }
    })

    const extracted_tasks = merged.flatMap(e =>
      (e.tasks ?? []).map(t => ({ task: t, from: e.from, emailId: e.id, subject: e.subject, account: e.account }))
    )

    return NextResponse.json({
      accounts:          allTokens.map(t => ({ email: t.connected_email, connected: true })),
      priority_contacts: priorityContacts,
      total:             merged.length,
      unread_count:      merged.filter(e => !e.isRead).length,
      priority_count:    merged.filter(e => e.isPriority || e.isUrgent).length,
      all:               merged,
      extracted_tasks,
    })
  } catch (err) {
    console.error('Gmail sync error:', err)
    return NextResponse.json({ error: 'sync_failed' }, { status: 500 })
  }
}
