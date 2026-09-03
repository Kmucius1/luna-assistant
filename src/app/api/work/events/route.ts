import { NextRequest, NextResponse } from 'next/server'
import { getGmailTokens, listGmailMessages, type GmailMessage } from '@/lib/gmail'

// Paid, in-person modeling/brand opportunities — the kind of email that says
// "come do this shoot/appearance on this date, here's the rate." Broad on
// purpose since we don't know the exact phrasing brands/agencies use; the
// point is to surface real candidates, not to be a precise classifier.
const DEFAULT_QUERY =
  '(modeling OR model OR shoot OR photoshoot OR campaign OR "brand ambassador" OR appearance) ' +
  '(event OR booking OR casting OR "on-site" OR "on premise" OR "in-person" OR "in person") ' +
  '(pay OR paid OR rate OR fee OR compensation OR honorarium OR "day rate")'

export interface WorkEvent {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
  timestamp: number
}

export async function GET(req: NextRequest) {
  const tokens = await getGmailTokens()
  if (!tokens) return NextResponse.json({ connected: false, events: [] })

  const q = req.nextUrl.searchParams.get('q') || DEFAULT_QUERY

  try {
    const messages = await listGmailMessages(tokens.access_token, q, 25, 'metadata')
    const events: WorkEvent[] = messages
      .sort((a: GmailMessage, b: GmailMessage) => b.timestamp - a.timestamp)
      .map((m: GmailMessage) => ({
        id: m.id,
        threadId: m.threadId,
        subject: m.subject,
        from: m.from,
        snippet: m.snippet,
        date: m.date,
        timestamp: m.timestamp,
      }))
    return NextResponse.json({ connected: true, connected_email: tokens.connected_email, events, query: q })
  } catch (err) {
    console.error('Work events search error:', err)
    return NextResponse.json({ connected: true, events: [], error: 'search_failed' }, { status: 500 })
  }
}
