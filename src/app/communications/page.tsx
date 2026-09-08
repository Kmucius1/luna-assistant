'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { ArrowLeft, Mail, Briefcase, ExternalLink, Clock, CheckCircle2 } from 'lucide-react'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

interface EmailItem {
  id: string; from: string; account: string; subject: string
  category: string; isUrgent: boolean; needsReview: boolean; action?: string
}
interface DrypTask {
  id: string; title: string; account_name?: string; due_date?: string; priority?: string; status: string
}

type Urgency = 'urgent' | 'review' | 'normal'
interface CommItem {
  id: string; kind: 'email' | 'dryp'
  person: string; source: string; context: string
  urgency: Urgency; deadline: string | null; nextAction: string; href: string
}

function todayKey(): string { return new Date().toDateString() }
function loadSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) } catch { return new Set() }
}
function saveSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...set])) } catch {}
}

export default function CommunicationsPage() {
  const [emails, setEmails] = useState<EmailItem[]>([])
  const [drypTasks, setDrypTasks] = useState<DrypTask[]>([])
  const [drypConnected, setDrypConnected] = useState(true)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | Urgency>('all')

  useEffect(() => {
    setDismissed(loadSet(`luna_comms_dismissed_${todayKey()}`))
    setSnoozed(loadSet(`luna_comms_snoozed_${todayKey()}`))
    Promise.all([
      fetch('/api/gmail/sync').then(r => r.json()).catch(() => ({ all: [] })),
      fetch('/api/dryp/tasks').then(r => r.json()).catch(() => ({ tasks: [], connected: false })),
    ]).then(([mail, dryp]) => {
      setEmails(mail.all ?? [])
      setDrypTasks(dryp.tasks ?? [])
      setDrypConnected(dryp.connected !== false)
    }).finally(() => setLoading(false))
  }, [])

  const items = useMemo<CommItem[]>(() => {
    const now = new Date()
    const emailItems: CommItem[] = emails
      .filter(e => e.category === 'dryp_client' || e.isUrgent || e.needsReview)
      .map(e => ({
        id: `email:${e.id}`, kind: 'email' as const,
        person: e.from, source: e.account, context: e.subject,
        urgency: e.isUrgent ? 'urgent' : e.needsReview ? 'review' : 'normal',
        deadline: null, nextAction: e.action || 'Review and reply', href: '/email',
      }))
    const drypItems: CommItem[] = drypTasks
      .filter(t => !['done', 'cancelled'].includes(t.status))
      .map(t => {
        const due = t.due_date ? new Date(t.due_date) : null
        const isOverdue = !!due && due < now
        const isDueSoon = !!due && due >= now && due.getTime() - now.getTime() <= 3 * 86_400_000
        return {
          id: `dryp:${t.id}`, kind: 'dryp' as const,
          person: t.account_name ?? 'DRYP', source: 'DRYP CRM', context: t.title,
          urgency: (isOverdue ? 'urgent' : isDueSoon ? 'review' : 'normal') as Urgency,
          deadline: t.due_date ?? null, nextAction: t.priority ? `Priority: ${t.priority}` : 'Follow up', href: '/dryp-hub',
        }
      })
    const rank = { urgent: 0, review: 1, normal: 2 }
    return [...emailItems, ...drypItems]
      .filter(i => !dismissed.has(i.id) && !snoozed.has(i.id))
      .filter(i => filter === 'all' || i.urgency === filter)
      .sort((a, b) => rank[a.urgency] - rank[b.urgency] || (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
  }, [emails, drypTasks, dismissed, snoozed, filter])

  function skip(id: string) {
    const next = new Set(dismissed).add(id)
    setDismissed(next)
    saveSet(`luna_comms_dismissed_${todayKey()}`, next)
  }
  function later(id: string) {
    const next = new Set(snoozed).add(id)
    setSnoozed(next)
    saveSet(`luna_comms_snoozed_${todayKey()}`, next)
  }

  const urgentCount = items.filter(i => i.urgency === 'urgent').length
  const reviewCount = items.filter(i => i.urgency === 'review').length

  return (
    <div style={{ background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)', minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">
          <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5E5474', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display, serif)', fontSize: 24, fontWeight: 700, color: '#100C1E', marginBottom: 4 }}>Communication</h1>
          <p style={{ fontSize: 13, color: '#5E5474', marginBottom: 16 }}>Email and DRYP CRM, merged into one urgency-ranked list.</p>

          {!drypConnected && (
            <div style={{ ...GLASS, padding: 14, marginBottom: 12, background: 'rgba(224,94,94,0.08)' }}>
              <p style={{ fontSize: 12, color: '#B23B3B' }}>DRYP CRM is unavailable right now — showing email only, not &ldquo;no tasks.&rdquo;</p>
            </div>
          )}

          <div style={{ ...GLASS, padding: 16, marginBottom: 14, display: 'flex', gap: 24 }}>
            <div><p style={{ fontSize: 22, fontWeight: 800, color: urgentCount > 0 ? '#B23B3B' : '#100C1E' }}>{urgentCount}</p><p style={{ fontSize: 11, color: '#5E5474' }}>Urgent</p></div>
            <div><p style={{ fontSize: 22, fontWeight: 800, color: '#100C1E' }}>{reviewCount}</p><p style={{ fontSize: 11, color: '#5E5474' }}>Needs review</p></div>
            <div><p style={{ fontSize: 22, fontWeight: 800, color: '#100C1E' }}>{items.length}</p><p style={{ fontSize: 11, color: '#5E5474' }}>Total open</p></div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {([['all', 'All'], ['urgent', 'Urgent'], ['review', 'Review'], ['normal', 'Normal']] as [typeof filter, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setFilter(v)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: filter === v ? '#5C4530' : 'rgba(255,255,255,0.5)', color: filter === v ? 'white' : '#5E5474' }}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1, 2, 3].map(i => <div key={i} style={{ ...GLASS, height: 72 }} />)}</div>
          ) : items.length === 0 ? (
            <div style={{ ...GLASS, padding: 24, textAlign: 'center' }}>
              <CheckCircle2 className="h-5 w-5 mx-auto mb-2" style={{ color: '#8AB88A' }} />
              <p style={{ fontSize: 13, color: '#5E5474' }}>Nothing needs attention right now.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => (
                <div key={item.id} style={{ ...GLASS, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.kind === 'email' ? <Mail className="h-3.5 w-3.5" style={{ color: '#A8496E' }} /> : <Briefcase className="h-3.5 w-3.5" style={{ color: '#4A7A96' }} />}
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#100C1E' }}>{item.person}</p>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 999, background: item.urgency === 'urgent' ? 'rgba(224,94,94,0.15)' : item.urgency === 'review' ? 'rgba(201,169,110,0.2)' : 'rgba(180,150,100,0.12)', color: item.urgency === 'urgent' ? '#B23B3B' : item.urgency === 'review' ? '#8A6F2A' : '#5E5474' }}>
                      {item.urgency}
                    </span>
                  </div>
                  <p style={{ fontSize: 12.5, color: '#32284A', marginBottom: 4 }}>{item.context}</p>
                  <p style={{ fontSize: 11, color: '#5E5474', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {item.source}{item.deadline && <><Clock className="h-3 w-3" /> due {item.deadline}</>} · {item.nextAction}
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link href={item.href} style={{ flex: 1, textDecoration: 'none' }}>
                      <div style={{ padding: '7px 0', borderRadius: 10, textAlign: 'center', fontSize: 11.5, fontWeight: 600, background: '#5C4530', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        Open <ExternalLink className="h-3 w-3" />
                      </div>
                    </Link>
                    <button onClick={() => later(item.id)} style={{ padding: '7px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 600, border: '1px solid rgba(180,150,100,0.25)', background: 'transparent', color: '#5E5474', cursor: 'pointer' }}>Later</button>
                    <button onClick={() => skip(item.id)} style={{ padding: '7px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 600, border: '1px solid rgba(180,150,100,0.25)', background: 'transparent', color: '#5E5474', cursor: 'pointer' }}>Skip</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  )
}
