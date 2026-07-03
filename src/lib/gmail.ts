import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI  = process.env.GMAIL_REDIRECT_URI ?? 'https://mylunaguide.online/api/gmail/callback'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

function adminDb() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ─── OAuth URL ────────────────────────────────────────────────────────────────
export function getGmailAuthUrl(loginHint?: string): string {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
  })
  if (loginHint) params.set('login_hint', loginHint)
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ─── Token exchange ───────────────────────────────────────────────────────────
export async function exchangeGmailCode(code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  return res.json() as Promise<{
    access_token: string; refresh_token: string; expires_in: number; token_type: string
  }>
}

// ─── Refresh access token ─────────────────────────────────────────────────────
async function refreshAccessToken(refresh_token: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  const data = await res.json() as { access_token: string; expires_in: number }
  return data
}

// ─── Get stored tokens (auto-refresh if expired) ──────────────────────────────
export async function getGmailTokens(): Promise<{ access_token: string; connected_email: string } | null> {
  const db = adminDb()
  const { data } = await db.from('gmail_tokens').select('*').order('connected_at', { ascending: false }).limit(1).single()
  if (!data) return null

  const expiry = data.token_expiry ? new Date(data.token_expiry).getTime() : 0
  const needsRefresh = Date.now() > expiry - 60_000

  if (needsRefresh && data.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(data.refresh_token)
      const newExpiry  = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      await db.from('gmail_tokens').update({ access_token: refreshed.access_token, token_expiry: newExpiry }).eq('id', data.id)
      return { access_token: refreshed.access_token, connected_email: data.email }
    } catch { return null }
  }

  return { access_token: data.access_token, connected_email: data.email }
}

// ─── Get ALL connected accounts' tokens (auto-refresh each if expired) ────────
export async function getAllValidGmailTokens(): Promise<{ access_token: string; connected_email: string }[]> {
  const db = adminDb()
  const { data } = await db.from('gmail_tokens').select('*').order('connected_at', { ascending: true })
  if (!data?.length) return []

  const results: { access_token: string; connected_email: string }[] = []
  await Promise.all(data.map(async (row: {
    id: string; email: string; access_token: string; refresh_token: string; token_expiry: string
  }) => {
    try {
      const expiry       = row.token_expiry ? new Date(row.token_expiry).getTime() : 0
      const needsRefresh = Date.now() > expiry - 60_000
      let access_token    = row.access_token

      if (needsRefresh && row.refresh_token) {
        const refreshed = await refreshAccessToken(row.refresh_token)
        access_token     = refreshed.access_token
        const newExpiry  = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        await db.from('gmail_tokens').update({ access_token, token_expiry: newExpiry }).eq('id', row.id)
      }

      results.push({ access_token, connected_email: row.email })
    } catch { /* skip accounts whose refresh fails — don't fail the whole batch */ }
  }))

  return results
}

// ─── Store tokens ─────────────────────────────────────────────────────────────
export async function storeGmailTokens(tokens: {
  access_token: string; refresh_token: string; expires_in: number; email: string
}) {
  const db = adminDb()
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const { error } = await db.from('gmail_tokens').upsert({
    email:         tokens.email,
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expiry:  expiry,
    connected_at:  new Date().toISOString(),
  }, { onConflict: 'email' })
  if (error) throw new Error(`Failed to save Gmail token: ${error.message}`)
}

// ─── Revoke / disconnect ──────────────────────────────────────────────────────
export async function disconnectGmail() {
  const db = adminDb()
  await db.from('gmail_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

// ─── Gmail API fetch helper ───────────────────────────────────────────────────
async function gmailFetch(access_token: string, path: string, opts?: RequestInit) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json', ...opts?.headers },
  })
  if (!res.ok) throw new Error(`Gmail API error ${res.status}: ${await res.text()}`)
  return res.json()
}

// ─── Parse email address from header ─────────────────────────────────────────
function parseEmailHeader(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/)
  if (match) return { name: match[1].replace(/"/g, '').trim(), email: match[2] }
  return { name: raw, email: raw }
}

// ─── Decode base64url ─────────────────────────────────────────────────────────
function decodeBase64(str: string) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

// ─── Extract plain text body from message parts ───────────────────────────────
function extractBody(payload: GmailPayload): string {
  if (payload.body?.data) return decodeBase64(payload.body.data)
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64(part.body.data)
    }
    for (const part of payload.parts) {
      const nested = extractBody(part)
      if (nested) return nested
    }
  }
  return ''
}

interface GmailPayload {
  mimeType?: string
  body?: { data?: string; size?: number }
  parts?: GmailPayload[]
  headers?: { name: string; value: string }[]
}

export interface GmailMessage {
  id: string
  threadId: string
  from: string
  fromEmail: string
  subject: string
  snippet: string
  body: string
  date: string
  timestamp: number
  isRead: boolean
  isStarred: boolean
  labels: string[]
  hasAttachment: boolean
}

// ─── Fast inbox counts (no per-message fetches) ───────────────────────────────
// Gmail's search endpoint returns resultSizeEstimate directly, so counting
// unread/starred messages doesn't require fetching each message individually.
export async function getGmailInboxCounts(access_token: string, sinceQuery = 'newer_than:3d') {
  const [unread, starred] = await Promise.all([
    gmailFetch(access_token, `/messages?q=${encodeURIComponent(`in:inbox is:unread ${sinceQuery}`)}&maxResults=1`),
    gmailFetch(access_token, `/messages?q=${encodeURIComponent(`in:inbox is:starred ${sinceQuery}`)}&maxResults=1`),
  ])
  return {
    unreadCount:  unread.resultSizeEstimate ?? 0,
    starredCount: starred.resultSizeEstimate ?? 0,
  }
}

// ─── List messages ────────────────────────────────────────────────────────────
// format 'full' fetches each message's complete body (needed to display an
// inbox); 'metadata' skips the body and is much faster when callers only
// need counts/flags (isRead, isStarred, labels).
export async function listGmailMessages(
  access_token: string,
  query = 'in:inbox',
  maxResults = 30,
  format: 'full' | 'metadata' = 'full',
): Promise<GmailMessage[]> {
  const list = await gmailFetch(access_token, `/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`)
  if (!list.messages?.length) return []

  const messages = await Promise.all(
    list.messages.map(async (m: { id: string }) => {
      try {
        const msg = await gmailFetch(access_token, `/messages/${m.id}?format=${format}`)
        const headers: { name: string; value: string }[] = msg.payload?.headers ?? []
        const h = (name: string) => headers.find(hh => hh.name.toLowerCase() === name.toLowerCase())?.value ?? ''
        const from = parseEmailHeader(h('From'))
        return {
          id:            msg.id,
          threadId:      msg.threadId,
          from:          from.name || from.email,
          fromEmail:     from.email,
          subject:       h('Subject') || '(no subject)',
          snippet:       msg.snippet ?? '',
          body:          extractBody(msg.payload as GmailPayload).slice(0, 2000),
          date:          h('Date'),
          timestamp:     parseInt(msg.internalDate ?? '0'),
          isRead:        !msg.labelIds?.includes('UNREAD'),
          isStarred:     msg.labelIds?.includes('STARRED') ?? false,
          labels:        msg.labelIds ?? [],
          hasAttachment: msg.payload?.parts?.some((p: GmailPayload) => p.mimeType?.startsWith('application/')) ?? false,
        } satisfies GmailMessage
      } catch { return null }
    })
  )
  return messages.filter(Boolean) as GmailMessage[]
}

// ─── Mark as read ─────────────────────────────────────────────────────────────
export async function markAsRead(access_token: string, messageId: string) {
  await gmailFetch(access_token, `/messages/${messageId}/modify`, {
    method: 'POST',
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
  })
}

// ─── Send email ───────────────────────────────────────────────────────────────
export async function sendGmailMessage(access_token: string, opts: {
  to: string; subject: string; body: string; threadId?: string; replyToMessageId?: string
}) {
  const headers = [
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    opts.replyToMessageId ? `In-Reply-To: ${opts.replyToMessageId}` : '',
  ].filter(Boolean).join('\r\n')

  const raw = Buffer.from(`${headers}\r\n\r\n${opts.body}`).toString('base64url')
  return gmailFetch(access_token, '/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw, ...(opts.threadId ? { threadId: opts.threadId } : {}) }),
  })
}

// ─── Get user's Gmail address ─────────────────────────────────────────────────
export async function getGmailProfile(access_token: string): Promise<{ emailAddress: string }> {
  return gmailFetch(access_token, '/profile')
}
