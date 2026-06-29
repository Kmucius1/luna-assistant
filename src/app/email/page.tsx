'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Mail, RefreshCw, Star, Paperclip, ChevronRight, Sparkles,
  Copy, Check, AlertCircle, X, ExternalLink, LogOut, Inbox, Send, Plus, Trash2, UserCheck,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface GmailEmail {
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
  hasAttachment: boolean
  category: 'urgent' | 'needs_reply' | 'fyi' | 'newsletter' | 'internal'
  action?: string
  tasks?: string[]
  isPriority?: boolean
  priorityContact?: string
  account?: string
}

interface PriorityContact { id: string; name: string; email: string | null }
interface ConnectedAccount { email: string; connected: boolean }

interface SyncData {
  accounts: ConnectedAccount[]
  priority_contacts: PriorityContact[]
  total: number
  unread_count: number
  priority_count: number
  priority: GmailEmail[]
  urgent: GmailEmail[]
  needs_reply: GmailEmail[]
  fyi: GmailEmail[]
  newsletter: GmailEmail[]
  all: GmailEmail[]
  extracted_tasks: { task: string; from: string; emailId: string; subject: string; account: string }[]
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 20,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  overflow: 'hidden',
}

const CAT: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  urgent:     { bg: 'rgba(224,94,94,0.12)',   text: '#E05E5E',                dot: '#E05E5E', label: 'Urgent'      },
  needs_reply:{ bg: 'rgba(201,169,110,0.12)', text: '#C9A96E',                dot: '#C9A96E', label: 'Needs Reply' },
  fyi:        { bg: 'rgba(139,111,184,0.1)',  text: 'rgba(196,169,232,0.9)',  dot: '#8B6FB8', label: 'FYI'        },
  newsletter: { bg: 'rgba(90,138,164,0.1)',   text: 'rgba(168,196,218,0.9)',  dot: '#5A8AA4', label: 'Newsletter' },
  internal:   { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.4)', dot: 'rgba(255,255,255,0.2)', label: 'Internal' },
}

function timeAgo(ts: number) {
  const d = Date.now() - ts
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}
function initials(n: string) { return n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?' }

// ─── Priority contact badge ───────────────────────────────────────────────────
function PriorityBadge({ name }: { name: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
      background: 'rgba(201,169,110,0.18)', color: '#C9A96E',
      border: '1px solid rgba(201,169,110,0.35)',
    }}>
      ⭐ {name}
    </span>
  )
}

// ─── Email row ────────────────────────────────────────────────────────────────
function EmailRow({ email, onClick }: { email: GmailEmail; onClick: () => void }) {
  const cat = CAT[email.category] ?? CAT.fyi
  const isPri = email.isPriority

  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', padding: '12px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: isPri
        ? 'rgba(201,169,110,0.06)'
        : email.isRead ? 'transparent' : 'rgba(139,111,184,0.04)',
      display: 'flex', gap: 10, alignItems: 'flex-start',
      borderLeft: isPri ? '3px solid rgba(201,169,110,0.7)' : '3px solid transparent',
    }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isPri ? 'linear-gradient(135deg, rgba(201,169,110,0.5), rgba(201,169,110,0.25))' : `linear-gradient(135deg, ${cat.dot}44, ${cat.dot}22)`,
        border: `1.5px solid ${isPri ? 'rgba(201,169,110,0.5)' : cat.dot + '44'}`,
        fontSize: 12, fontWeight: 700,
        color: isPri ? '#C9A96E' : cat.dot,
        boxShadow: isPri ? '0 0 12px rgba(201,169,110,0.25)' : 'none',
      }}>
        {initials(email.from)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: isPri || !email.isRead ? 700 : 500, color: isPri ? '#E8D5A3' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
            {email.from}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            {email.isStarred && <Star className="h-3 w-3" style={{ color: '#C9A96E', fill: '#C9A96E' }} />}
            {email.hasAttachment && <Paperclip className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.3)' }} />}
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{timeAgo(email.timestamp)}</span>
          </div>
        </div>
        <p style={{ fontSize: 12, fontWeight: !email.isRead ? 600 : 400, color: 'rgba(255,255,255,0.75)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {email.subject}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {isPri
            ? <PriorityBadge name={email.priorityContact!} />
            : <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: cat.bg, color: cat.text, fontWeight: 600, flexShrink: 0 }}>{cat.label}</span>
          }
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {email.snippet}
          </span>
        </div>
        {email.action && (
          <p style={{ fontSize: 10, color: isPri ? '#C9A96E' : '#C9A96E', marginTop: 3, fontWeight: 600 }}>⚡ {email.action}</p>
        )}
      </div>
    </button>
  )
}

// ─── Reply drafter ────────────────────────────────────────────────────────────
function ReplyDrafter({ email, onClose }: { email: GmailEmail; onClose: () => void }) {
  const [loading, setLoading]   = useState(false)
  const [replies, setReplies]   = useState<{ short: string; professional: string; warm: string } | null>(null)
  const [sending, setSending]   = useState<string | null>(null)
  const [sent, setSent]         = useState<string | null>(null)
  const [copied, setCopied]     = useState<string | null>(null)

  useEffect(() => {
    async function draft() {
      setLoading(true)
      try {
        const res = await fetch('/api/ai/email-suggestions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email_body: email.body || email.snippet, sender: email.from, subject: email.subject }),
        })
        const d = await res.json()
        if (d.replies) setReplies(d.replies)
      } catch {}
      setLoading(false)
    }
    draft()
  }, [email])

  async function send(text: string, key: string) {
    setSending(key)
    try {
      await fetch('/api/gmail/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email.fromEmail, subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`, body: text, threadId: email.threadId }),
      })
      setSent(key)
    } catch {}
    setSending(null)
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  const options = replies ? [
    { key: 'short',        label: '⚡ Short & sweet',   text: replies.short },
    { key: 'professional', label: '💼 Professional',    text: replies.professional },
    { key: 'warm',         label: '✨ Warm & direct',   text: replies.warm },
  ] : []

  return (
    <div style={{ ...CARD, margin: '10px 0', padding: 16, border: '1px solid rgba(139,111,184,0.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(196,169,232,0.85)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <Sparkles className="inline h-3 w-3 mr-1" />AI Reply Drafts
        </p>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}><X className="h-4 w-4" /></button>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>
        Replying to <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{email.from}</strong>
      </p>
      {loading
        ? <p style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Drafting your reply…</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map(opt => (
            <div key={opt.key} style={{ ...CARD, padding: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase' }}>{opt.label}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, marginBottom: 10, whiteSpace: 'pre-line' }}>{opt.text}</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => send(opt.text, opt.key)} disabled={!!sending || !!sent}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: sent === opt.key ? 'rgba(90,138,90,0.3)' : 'rgba(139,111,184,0.25)',
                    color: sent === opt.key ? '#8AB88A' : 'rgba(255,255,255,0.85)' }}>
                  {sending === opt.key ? 'Sending…' : sent === opt.key ? '✓ Sent'
                    : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Send className="h-3 w-3" />Send</span>}
                </button>
                <button onClick={() => copy(opt.text, opt.key)}
                  style={{ padding: '8px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                  {copied === opt.key ? <Check className="h-3.5 w-3.5" style={{ color: '#8AB88A' }} /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>}
    </div>
  )
}

// ─── Priority contacts manager ────────────────────────────────────────────────
function PriorityContactsManager({ contacts, onUpdate }: { contacts: PriorityContact[]; onUpdate: () => void }) {
  const [newName, setNewName]   = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding]     = useState(false)

  async function add() {
    if (!newName.trim()) return
    setAdding(true)
    await fetch('/api/gmail/priority-contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() || null }),
    })
    setNewName(''); setNewEmail(''); setAdding(false); onUpdate()
  }

  async function remove(name: string) {
    await fetch('/api/gmail/priority-contacts', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    onUpdate()
  }

  return (
    <div style={{ ...CARD, padding: 16, border: '1px solid rgba(201,169,110,0.25)', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <UserCheck className="h-4 w-4" style={{ color: '#C9A96E' }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Priority Contacts</p>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>Always flagged urgent</span>
      </div>

      {/* Contact list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {contacts.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 12, background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E8D5A3' }}>⭐ {c.name}</p>
              {c.email && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{c.email}</p>}
            </div>
            <button onClick={() => remove(c.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="Add contact name…"
          onKeyDown={e => e.key === 'Enter' && add()}
          style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'white', outline: 'none' }}
        />
        <button onClick={add} disabled={adding || !newName.trim()}
          style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(201,169,110,0.25)', border: '1px solid rgba(201,169,110,0.35)', color: '#C9A96E', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, opacity: !newName.trim() ? 0.4 : 1 }}>
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Connect screen ───────────────────────────────────────────────────────────
function ConnectGmail({ accounts, error }: { accounts: ConnectedAccount[]; error?: string }) {
  const hasAccounts = accounts.some(a => a.connected)
  return (
    <div style={{ padding: '32px 24px', textAlign: 'center' }}>
      {hasAccounts && (
        <div style={{ ...CARD, padding: 16, marginBottom: 20, textAlign: 'left' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Connected Accounts</p>
          {accounts.filter(a => a.connected).map(a => (
            <div key={a.email} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#5A8A5A' }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{a.email}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #5A8AA4, #3A6A84)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(90,138,164,0.3)' }}>
        <Mail className="h-7 w-7 text-white" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 6, fontFamily: 'var(--font-display)' }}>
        {hasAccounts ? 'Add Another Account' : 'Connect Your Gmail'}
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 24, maxWidth: 300, margin: '0 auto 24px' }}>
        Connect info@drypdigital.com and zoe@drypdigital.com. Priority contacts (Shannon, Kaleb, Mick) will always surface at the top.
      </p>
      {error && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 12, background: 'rgba(224,94,94,0.1)', border: '1px solid rgba(224,94,94,0.2)' }}>
          <p style={{ fontSize: 12, color: '#E05E5E' }}><AlertCircle className="inline h-3.5 w-3.5 mr-1" />
            {error === 'gmail_denied' ? 'You cancelled the connection. Try again when ready.' : 'Something went wrong. Try again.'}
          </p>
        </div>
      )}
      <a href="/api/gmail/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 16, background: 'linear-gradient(135deg, #5A8AA4, #3A6A84)', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 24px rgba(90,138,164,0.35)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Sign in with Google
      </a>
      <p style={{ marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Sign in once per account to connect both</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function EmailInner() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts]           = useState<ConnectedAccount[]>([])
  const [sync, setSync]                   = useState<SyncData | null>(null)
  const [loading, setLoading]             = useState(false)
  const [tab, setTab]                     = useState<'priority' | 'urgent' | 'needs_reply' | 'fyi' | 'all' | 'tasks'>('priority')
  const [selected, setSelected]           = useState<GmailEmail | null>(null)
  const [showReply, setShowReply]         = useState(false)
  const [showContacts, setShowContacts]   = useState(false)
  const [accountFilter, setAccountFilter] = useState<string>('all')

  const connected  = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  useEffect(() => {
    fetch('/api/gmail/status').then(r => r.json()).then(d =>
      setAccounts(d.accounts ?? (d.connected ? [{ email: d.email, connected: true }] : []))
    )
  }, [connected])

  const syncEmails = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/gmail/sync').then(r => r.json())
      if (!d.error) setSync(d)
    } catch {}
    setLoading(false)
  }, [])

  const isConnected = accounts.some(a => a.connected) || connected === '1'
  useEffect(() => { if (isConnected) syncEmails() }, [isConnected, syncEmails])

  async function disconnect() {
    await fetch('/api/gmail/disconnect', { method: 'POST' })
    setAccounts([]); setSync(null)
  }

  if (!isConnected && accounts.length === 0) return (
    <div className="bg-app min-h-screen">
      <AppLayout noPad className="pt-16"><ConnectGmail accounts={[]} error={errorParam ?? undefined} /></AppLayout>
    </div>
  )

  const byAccount = (arr: GmailEmail[]) =>
    accountFilter === 'all' ? arr : arr.filter(e => e.account === accountFilter || e.fromEmail?.includes(accountFilter))

  const tabData: Record<string, GmailEmail[]> = {
    priority:    byAccount(sync?.priority    ?? []),
    urgent:      byAccount(sync?.urgent      ?? []),
    needs_reply: byAccount(sync?.needs_reply ?? []),
    fyi:         byAccount([...(sync?.fyi ?? []), ...(sync?.newsletter ?? [])]),
    all:         byAccount(sync?.all         ?? []),
    tasks:       [],
  }
  const list = tabData[tab] ?? []
  const connectedEmails = accounts.filter(a => a.connected).map(a => a.email)
  const priorityCount   = sync?.priority_count ?? 0

  return (
    <div className="bg-app min-h-screen">
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 16px 180px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, #5A8AA4, #3A6A84)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Inbox className="h-5 w-5 text-white" />
                {priorityCount > 0 && (
                  <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000', boxShadow: '0 0 8px rgba(201,169,110,0.6)' }}>
                    {priorityCount}
                  </div>
                )}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7BAEC8' }}>Gmail</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{connectedEmails.length} account{connectedEmails.length !== 1 ? 's' : ''} · {sync?.unread_count ?? '—'} unread</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowContacts(v => !v)} title="Priority contacts"
                style={{ width: 33, height: 33, borderRadius: 10, background: showContacts ? 'rgba(201,169,110,0.25)' : 'rgba(255,255,255,0.07)', border: `1px solid ${showContacts ? 'rgba(201,169,110,0.4)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <UserCheck className="h-3.5 w-3.5" style={{ color: showContacts ? '#C9A96E' : 'rgba(255,255,255,0.55)' }} />
              </button>
              <a href="/api/gmail/auth" style={{ width: 33, height: 33, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} title="Add account">
                <Plus className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
              </a>
              <button onClick={syncEmails} disabled={loading} style={{ width: 33, height: 33, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'rgba(255,255,255,0.55)' }} />
              </button>
              <button onClick={disconnect} style={{ width: 33, height: 33, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <LogOut className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>
          </div>

          {/* Priority contacts manager */}
          {showContacts && sync && (
            <PriorityContactsManager contacts={sync.priority_contacts ?? []} onUpdate={syncEmails} />
          )}

          {/* Account filter */}
          {connectedEmails.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {['all', ...connectedEmails].map(acc => (
                <button key={acc} onClick={() => setAccountFilter(acc)} style={{
                  flexShrink: 0, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: accountFilter === acc ? 'rgba(139,111,184,0.35)' : 'rgba(255,255,255,0.07)',
                  color: accountFilter === acc ? 'rgba(196,169,232,0.95)' : 'rgba(255,255,255,0.5)',
                }}>{acc === 'all' ? 'All inboxes' : acc}</button>
              ))}
            </div>
          )}

          {/* Stats */}
          {sync && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Priority',    count: sync.priority_count,            color: '#C9A96E', glow: true  },
                { label: 'Urgent',      count: sync.urgent.length,             color: '#E05E5E', glow: false },
                { label: 'Unread',      count: sync.unread_count,              color: '#8B6FB8', glow: false },
                { label: 'Tasks found', count: sync.extracted_tasks.length,    color: '#5A8AA4', glow: false },
              ].map(s => (
                <div key={s.label} style={{ ...CARD, padding: '10px 6px', textAlign: 'center', border: s.glow && s.count > 0 ? '1px solid rgba(201,169,110,0.35)' : CARD.border, boxShadow: s.glow && s.count > 0 ? '0 0 12px rgba(201,169,110,0.15)' : 'none' }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, scrollbarWidth: 'none' }}>
            {([
              { key: 'priority',    label: '⭐ Priority',   count: sync?.priority_count,            highlight: true  },
              { key: 'urgent',      label: '🔴 Urgent',    count: sync?.urgent.length,             highlight: false },
              { key: 'needs_reply', label: '⚡ Reply',     count: sync?.needs_reply.length,        highlight: false },
              { key: 'fyi',         label: '📬 FYI',       count: (sync?.fyi?.length ?? 0) + (sync?.newsletter?.length ?? 0), highlight: false },
              { key: 'tasks',       label: '✅ Tasks',     count: sync?.extracted_tasks.length,    highlight: false },
              { key: 'all',         label: 'All',          count: sync?.total,                     highlight: false },
            ] as const).map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); setShowReply(false) }}
                style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: tab === t.key
                    ? (t.highlight ? 'rgba(201,169,110,0.3)' : 'rgba(139,111,184,0.3)')
                    : 'rgba(255,255,255,0.07)',
                  color: tab === t.key
                    ? (t.highlight ? '#E8D5A3' : 'rgba(196,169,232,0.95)')
                    : 'rgba(255,255,255,0.5)',
                  boxShadow: tab === t.key && t.highlight ? '0 0 10px rgba(201,169,110,0.2)' : 'none',
                }}>
                {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
              </button>
            ))}
          </div>

          {/* Tasks tab */}
          {tab === 'tasks' && sync && (
            <div style={CARD}>
              {sync.extracted_tasks.length === 0
                ? <p style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No tasks extracted yet. Sync your inbox.</p>
                : sync.extracted_tasks.map((t, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A96E', flexShrink: 0, marginTop: 6 }} />
                    <div>
                      <p style={{ fontSize: 13, color: 'white', marginBottom: 2 }}>{t.task}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>From {t.from} · {t.subject}</p>
                      {t.account && <p style={{ fontSize: 11, color: 'rgba(139,111,184,0.6)', marginTop: 1 }}>{t.account}</p>}
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* Email list */}
          {tab !== 'tasks' && (
            <>
              {/* Priority tab empty state */}
              {tab === 'priority' && !loading && list.length === 0 && sync && (
                <div style={{ ...CARD, padding: 24, textAlign: 'center', border: '1px solid rgba(201,169,110,0.2)' }}>
                  <p style={{ fontSize: 22, marginBottom: 8 }}>⭐</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>No priority emails right now</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Shannon Martin, Kaleb Mucius, and Mick Hoover haven't emailed yet. You're clear.</p>
                </div>
              )}

              {loading && !sync && (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                  <RefreshCw className="inline h-4 w-4 animate-spin mr-2" />Reading your inbox…
                </div>
              )}

              {!loading && tab !== 'priority' && list.length === 0 && sync && (
                <p style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No emails in this category.</p>
              )}

              {list.length > 0 && (
                <div style={{ ...CARD, border: tab === 'priority' ? '1px solid rgba(201,169,110,0.25)' : CARD.border }}>
                  {list.map(email => (
                    <div key={email.id}>
                      <EmailRow email={email} onClick={() => { setSelected(selected?.id === email.id ? null : email); setShowReply(false) }} />
                      {selected?.id === email.id && (
                        <div style={{ padding: '0 14px 14px' }}>
                          <div style={{ ...CARD, padding: 14, marginTop: 8, border: email.isPriority ? '1px solid rgba(201,169,110,0.25)' : '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {email.isPriority && <div style={{ marginBottom: 6 }}><PriorityBadge name={email.priorityContact!} /></div>}
                                <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{email.subject}</p>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{email.from} · {email.date}</p>
                              </div>
                              <a href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                            {email.action && (
                              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', marginBottom: 10 }}>
                                <p style={{ fontSize: 12, color: '#C9A96E', fontWeight: 600 }}>⚡ {email.action}</p>
                              </div>
                            )}
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, whiteSpace: 'pre-line', wordBreak: 'break-word', marginBottom: 12 }}>
                              {email.body || email.snippet}
                            </p>
                            {!showReply && (
                              <button onClick={() => setShowReply(true)} style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                background: 'rgba(139,111,184,0.25)', color: 'rgba(196,169,232,0.95)', fontSize: 12, fontWeight: 600,
                              }}>
                                <Sparkles className="h-3.5 w-3.5" /> Draft AI Reply <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                              </button>
                            )}
                          </div>
                          {showReply && <ReplyDrafter email={email} onClose={() => setShowReply(false)} />}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </div>
  )
}

export default function EmailPage() {
  return (
    <Suspense fallback={<div className="bg-app min-h-screen" />}>
      <EmailInner />
    </Suspense>
  )
}
