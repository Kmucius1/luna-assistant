'use client'
import { useCallback, useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { MessageCircle, Sparkles, Copy, Check, AlertTriangle, RefreshCw, Send, Pencil } from 'lucide-react'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}

const REGEN_OPTIONS: { instruction: string; label: string }[] = [
  { instruction: 'shorter', label: 'Shorter' },
  { instruction: 'warmer', label: 'Warmer' },
  { instruction: 'more_direct', label: 'More direct' },
  { instruction: 'more_like_me', label: 'More like me' },
]

interface DraftRow {
  id: string
  message_id: string
  variant: 'quick' | 'friendly' | 'detailed'
  ai_original_text: string
  current_text: string
  edited: boolean
  regenerate_count: number
  status: 'draft' | 'approved' | 'sent'
}

interface ContactRow {
  id: string
  name: string
  relationship: string | null
}

interface MessageRow {
  id: string
  sender_name: string
  message_text: string
  received_at: string
  processing_status: 'pending' | 'processing' | 'done' | 'failed'
  processing_error: string | null
  summary: string | null
  request: string | null
  urgency: 'low' | 'medium' | 'high' | 'critical' | null
  urgency_reason: string | null
  tone: string | null
  past_context: string | null
  missing_info: string | null
  created_at: string
}

const VARIANT_LABEL: Record<DraftRow['variant'], string> = {
  quick: '⚡ Quick',
  friendly: '💬 Friendly',
  detailed: '📝 Detailed',
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

function urgencyColor(urgency: MessageRow['urgency']): string {
  if (urgency === 'high' || urgency === 'critical') return '#E05E5E'
  if (urgency === 'medium') return '#C9A96E'
  return 'rgba(255,255,255,0.5)'
}

function DraftCard({ draft, contactName, onUpdated }: {
  draft: DraftRow
  contactName: string
  onUpdated: (d: DraftRow) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(draft.current_text)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSent = draft.status === 'sent'

  function copy() {
    navigator.clipboard.writeText(draft.current_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function startEdit() {
    setEditValue(draft.current_text)
    setIsEditing(true)
    setError(null)
  }

  async function saveEdit() {
    if (!editValue.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/luna/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editValue }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onUpdated(data.draft)
      setIsEditing(false)
    } catch {
      setError('Could not save that edit — try again.')
    } finally {
      setSaving(false)
    }
  }

  async function regenerate(instruction: string) {
    setRegenerating(instruction)
    setError(null)
    try {
      const res = await fetch(`/api/luna/drafts/${draft.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onUpdated(data.draft)
    } catch {
      setError('LUNA could not regenerate that draft — try again.')
    } finally {
      setRegenerating(null)
    }
  }

  async function approveAndSend() {
    setApproving(true)
    setError(null)
    try {
      const res = await fetch(`/api/luna/drafts/${draft.id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      navigator.clipboard.writeText(draft.current_text)
      onUpdated(data.draft)
      setConfirming(false)
    } catch {
      setError('Could not mark this as sent — try again.')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div style={{ ...GLASS, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)' }}>
          {VARIANT_LABEL[draft.variant]}
          {draft.edited && <span style={{ marginLeft: 8, fontSize: 10, color: '#C4A8E8' }}>edited</span>}
          {isSent && <span style={{ marginLeft: 8, fontSize: 10, color: '#7FD97F' }}>sent</span>}
        </p>
        <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
          {copied ? <Check style={{ width: 14, height: 14, color: '#7FD97F' }} /> : <Copy style={{ width: 14, height: 14 }} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {isEditing ? (
        <div>
          <textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            rows={3}
            className="luna-input"
            style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'white', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box', colorScheme: 'dark' as React.CSSProperties['colorScheme'] }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={saveEdit} disabled={saving} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(139,111,184,0.85)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save edit'}
            </button>
            <button onClick={() => setIsEditing(false)} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.88)', marginBottom: 12 }}>{draft.current_text}</p>
      )}

      {!isEditing && !isSent && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {REGEN_OPTIONS.map(opt => (
              <button key={opt.instruction} onClick={() => regenerate(opt.instruction)} disabled={regenerating !== null}
                style={{ fontSize: 11, padding: '5px 11px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', opacity: regenerating !== null && regenerating !== opt.instruction ? 0.4 : 1 }}>
                {regenerating === opt.instruction ? '…' : opt.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, background: 'rgba(139,111,184,0.15)', color: '#C4A8E8', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Pencil style={{ width: 13, height: 13 }} /> Edit
            </button>
            <button onClick={() => setConfirming(true)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #8B6FB8, #6A4F9B)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Send style={{ width: 13, height: 13 }} /> Approve & Send
            </button>
          </div>
        </>
      )}

      {confirming && (
        <div style={{ marginTop: 12, padding: 14, borderRadius: 14, background: 'rgba(139,111,184,0.1)', border: '1px solid rgba(139,111,184,0.25)' }}>
          <p style={{ fontSize: 13, color: 'white', marginBottom: 10 }}>Send this message to {contactName}?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirming(false)} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={approveAndSend} disabled={approving} style={{ padding: '8px 14px', borderRadius: 10, background: '#8B6FB8', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: approving ? 0.6 : 1 }}>
              {approving ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {isSent && (
        <p style={{ fontSize: 12, color: '#7FD97F' }}>Copied to clipboard — paste it into Messages.</p>
      )}

      {error && <p style={{ fontSize: 11, color: '#E05E5E', marginTop: 8 }}>{error}</p>}
    </div>
  )
}

export default function TextMessagingPage() {
  const [message, setMessage] = useState<MessageRow | null>(null)
  const [contact, setContact] = useState<ContactRow | null>(null)
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/luna/messages/latest')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessage(data.message)
      setContact(data.contact)
      setDrafts(data.drafts ?? [])
      setLoadError(null)
    } catch {
      setLoadError('Could not load your messages right now.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function retry() {
    if (!message) return
    setRetrying(true)
    try {
      const res = await fetch(`/api/luna/messages/${message.id}/retry`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.message) setMessage(data.message)
      if (data.drafts) setDrafts(data.drafts)
    } catch {
      setLoadError('Retry failed — try again in a moment.')
    } finally {
      setRetrying(false)
    }
  }

  function updateDraft(updated: DraftRow) {
    setDrafts(prev => prev.map(d => d.id === updated.id ? updated : d))
  }

  const allSent = drafts.length > 0 && drafts.every(d => d.status === 'sent')

  return (
    <div className="bg-app min-h-screen">
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 20px 120px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(139,111,184,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle style={{ width: 18, height: 18, color: '#8B6FB8' }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8B6FB8' }}>Text Messaging</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>LUNA reads, thinks, and drafts replies for you.</p>
            </div>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 20 }}>
            Your latest text.
          </h1>

          {loading && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Loading…</p>}

          {!loading && loadError && (
            <div style={{ ...GLASS, padding: 16, background: 'rgba(224,94,94,0.07)', border: '1.5px solid rgba(224,94,94,0.22)' }}>
              <p style={{ fontSize: 13, color: '#E05E5E' }}>{loadError}</p>
            </div>
          )}

          {!loading && !loadError && !message && (
            <div style={{ ...GLASS, padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>No messages yet — waiting for the first text to come through.</p>
            </div>
          )}

          {!loading && message && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* New message banner */}
              <div style={{ ...GLASS, padding: 16, background: allSent ? 'rgba(255,255,255,0.04)' : 'rgba(201,169,110,0.08)', border: allSent ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(201,169,110,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: allSent ? 'rgba(255,255,255,0.4)' : '#C9A96E', marginBottom: 4 }}>
                      {allSent ? `Sent to ${message.sender_name}` : 'New Message Detected'}
                    </p>
                    <p style={{ fontSize: 13, color: 'white' }}>From {message.sender_name} · {timeAgo(message.received_at)}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontStyle: 'italic' }}>&ldquo;{message.message_text}&rdquo;</p>
                  </div>
                </div>
              </div>

              {/* Failed analysis */}
              {message.processing_status === 'failed' && (
                <div style={{ ...GLASS, padding: 16, background: 'rgba(224,94,94,0.07)', border: '1.5px solid rgba(224,94,94,0.22)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <AlertTriangle style={{ width: 18, height: 18, flexShrink: 0, color: '#E05E5E', marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#E05E5E', marginBottom: 5 }}>LUNA couldn&apos;t analyze this message.</p>
                      <p style={{ fontSize: 12, color: '#C87070', lineHeight: 1.6 }}>{message.processing_error ?? 'Something went wrong.'}</p>
                    </div>
                  </div>
                  <button onClick={retry} disabled={retrying} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: 'rgba(224,94,94,0.15)', color: '#E05E5E', border: '1px solid rgba(224,94,94,0.3)', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: retrying ? 0.6 : 1 }}>
                    <RefreshCw style={{ width: 13, height: 13 }} /> {retrying ? 'Retrying…' : 'Retry analysis'}
                  </button>
                </div>
              )}

              {(message.processing_status === 'pending' || message.processing_status === 'processing') && (
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>LUNA is analyzing this message…</p>
                </div>
              )}

              {/* Analysis */}
              {message.processing_status === 'done' && (
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C4A8E8', marginBottom: 10 }}>LUNA&apos;s Summary</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {message.summary && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Summary</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{message.summary}</p>
                      </div>
                    )}
                    {message.request && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What they&apos;re asking</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{message.request}</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 20 }}>
                      {message.tone && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tone</p>
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{message.tone}</p>
                        </div>
                      )}
                      {message.urgency && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Urgency</p>
                          <p style={{ fontSize: 13, color: urgencyColor(message.urgency), textTransform: 'capitalize', fontWeight: 700 }}>{message.urgency}</p>
                        </div>
                      )}
                    </div>
                    {message.urgency_reason && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>{message.urgency_reason}</p>
                    )}
                    {message.past_context && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Past context</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{message.past_context}</p>
                      </div>
                    )}
                    {message.missing_info && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Missing information</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{message.missing_info}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Drafts */}
              {message.processing_status === 'done' && drafts.length > 0 && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles style={{ width: 12, height: 12 }} /> LUNA&apos;s Drafts
                  </p>
                  {drafts.map(draft => (
                    <DraftCard key={draft.id} draft={draft} contactName={contact?.name ?? message.sender_name} onUpdated={updateDraft} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  )
}
