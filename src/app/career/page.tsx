'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Compass, Sparkles, Mic, ExternalLink, RefreshCw, Loader2, AlertCircle, TrendingUp, Users, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { DryphubAccount, DryphubTask } from '@/lib/dryp-crm'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CareerResult {
  career_energy?: string
  highest_use_work?: string[]
  recognition_check?: string
  voice_clarity_prompt?: string
  career_lesson?: string
  current_pattern?: string
  highest_self_action?: string
  career_message?: string
  chart_theme?: string
}

interface WeekResult {
  week_theme?: string
  energy_summary?: string
  what_to_keep?: string[]
  what_to_release?: string[]
  next_week_intention?: string
  affirmation?: string
}

// ─── Design ───────────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 18,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

// Same visual language as GLASS but matches the padding of the shared
// GlassCard component (p-5 = 20px). Used in place of <GlassCard> on this
// page because .glass-card is forced to white text under [data-theme="dark"]
// with !important — this page is locked light regardless of the site
// theme toggle, so it can't rely on that theme-dependent global class.
const CARD: React.CSSProperties = { ...GLASS, borderRadius: 20, padding: 20 }

const HEALTH_STYLES: Record<string, { color: string; label: string }> = {
  excellent: { color: '#5A8A5A', label: 'Excellent' },
  good:      { color: '#8BAD78', label: 'Good'      },
  new:       { color: '#A8C4DA', label: 'New'       },
  at_risk:   { color: '#E08B4A', label: 'At risk'   },
  churning:  { color: '#E05E5E', label: 'Churning'  },
}

const STAGE_LABELS: Record<string, string> = {
  onboarding:    'Onboarding',
  working_on_it: 'Active',
  proposal:      'Proposal',
  closed:        'Closed',
  prospect:      'Prospect',
}

const RECOGNITION_QUESTIONS = [
  'Am I being asked for this, or am I pushing my way in?',
  'Is this opening naturally, or am I forcing the door?',
  'Are people recognizing me for this specific work?',
  'Am I working from invitation or from fear of being unseen?',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dueDaysLabel(dateStr?: string) {
  if (!dateStr) return null
  const d    = new Date(dateStr); d.setHours(0,0,0,0)
  const now  = new Date();        now.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000)
  if (diff < 0)   return { text: 'Overdue', color: '#E05E5E' }
  if (diff === 0) return { text: 'Due today', color: '#E08B4A' }
  if (diff === 1) return { text: 'Tomorrow',  color: '#5C4530' }
  if (diff <= 7)  return { text: `${diff}d`,  color: '#5E5474' }
  return null
}

const PO: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const sortP = (a: DryphubTask, b: DryphubTask) => (PO[a.priority ?? 'low'] ?? 3) - (PO[b.priority ?? 'low'] ?? 3)

// ─── Subcomponents ────────────────────────────────────────────────────────────
function ClientCard({ account, tasks }: { account: DryphubAccount; tasks: DryphubTask[] }) {
  const h     = HEALTH_STYLES[account.health_status] ?? HEALTH_STYLES.new
  const stage = STAGE_LABELS[account.client_pipeline_stage ?? ''] ?? account.client_pipeline_stage ?? ''
  const top   = tasks.sort(sortP).slice(0, 3)

  return (
    <div style={{ ...GLASS, padding: '14px 16px', borderLeft: `3px solid ${h.color}22` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E' }}>{account.business_name.trim()}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: h.color, background: `${h.color}18`, padding: '2px 8px', borderRadius: 8 }}>{h.label}</span>
            {stage && <span style={{ fontSize: 10, color: '#5E5474', fontWeight: 600 }}>{stage}</span>}
            {account.monthly_retainer && account.monthly_retainer > 0 && (
              <span style={{ fontSize: 10, color: '#5C4530', fontWeight: 700 }}>${account.monthly_retainer.toLocaleString()}/mo</span>
            )}
          </div>
        </div>
        {tasks.length > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#8A6F2A', background: 'rgba(240,228,200,0.92)', padding: '4px 8px', borderRadius: 8 }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {top.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {top.map(t => {
            const due = dueDaysLabel(t.due_date)
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: t.priority === 'high' || t.priority === 'critical' ? '#E08B4A' : 'rgba(94,84,116,0.25)' }} />
                <p style={{ fontSize: 12, color: '#32284A', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                {due && <span style={{ fontSize: 10, color: due.color, fontWeight: 700, flexShrink: 0 }}>{due.text}</span>}
              </div>
            )
          })}
          {tasks.length > 3 && (
            <p style={{ fontSize: 11, color: '#8A8098', marginTop: 2 }}>+{tasks.length - 3} more</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab = 'today' | 'clients' | 'lanes' | 'week'

export default function CareerCompassScreen() {
  const [tab,        setTab]        = useState<Tab>('today')
  const [accounts,   setAccounts]   = useState<DryphubAccount[]>([])
  const [tasks,      setTasks]      = useState<DryphubTask[]>([])
  const [crmLoading, setCrmLoading] = useState(true)
  const [crmError,   setCrmError]   = useState(false)

  // Today AI
  const [compassLoading, setCompassLoading] = useState(false)
  const [compassResult,  setCompassResult]  = useState<CareerResult | null>(null)

  // Week AI
  const [weekAnswers, setWeekAnswers] = useState<Record<string,string>>({})
  const [weekLoading, setWeekLoading] = useState(false)
  const [weekResult,  setWeekResult]  = useState<WeekResult | null>(null)

  const loadCrm = useCallback(() => {
    setCrmLoading(true); setCrmError(false)
    Promise.all([
      fetch('/api/dryp/accounts').then(r => r.json()),
      fetch('/api/dryp/tasks').then(r => r.json()),
    ]).then(([a, t]) => {
      if (a.accounts) setAccounts(a.accounts)
      if (t.tasks)    setTasks(t.tasks)
    }).catch(() => setCrmError(true))
    .finally(() => setCrmLoading(false))
  }, [])

  useEffect(() => { loadCrm() }, [loadCrm])

  async function generateCompass() {
    setCompassLoading(true)
    try {
      const res = await fetch('/api/ai/career-compass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, accounts }),
      })
      setCompassResult(await res.json())
    } catch {
      setCompassResult({ career_energy: 'Today is a Projector day — work from invitation, not urgency.', highest_use_work: ['One deliverable that unblocks a client', 'One DRYP system action', 'One communication that moves a deal forward'], recognition_check: 'Is this invited or am I pushing?' })
    } finally {
      setCompassLoading(false)
    }
  }

  async function submitWeek() {
    setWeekLoading(true)
    try {
      const res = await fetch('/api/ai/weekly-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reflections: weekAnswers, checklist_pct: 0 }),
      })
      setWeekResult(await res.json())
    } catch {
      setWeekResult({ week_theme: 'Reflection received', energy_summary: 'Your week held real work and real growth.' })
    } finally {
      setWeekLoading(false)
    }
  }

  // Derived
  const tasksByClient = tasks.reduce<Record<string, DryphubTask[]>>((acc, t) => {
    if (!t.account_id) return acc
    acc[t.account_id] = acc[t.account_id] ?? []; acc[t.account_id].push(t); return acc
  }, {})
  const retainerAccounts = accounts.filter(a => a.monthly_retainer && a.monthly_retainer > 0)
  const totalMRR = retainerAccounts.reduce((s, a) => s + (a.monthly_retainer ?? 0), 0)
  const atRiskAccounts = accounts.filter(a => a.health_status === 'at_risk' || a.health_status === 'churning')

  const WEEK_QUESTIONS = [
    { key: 'energy',      q: 'What work gave me energy this week?' },
    { key: 'recognized',  q: 'Where was I recognized or invited?' },
    { key: 'forced',      q: 'Where did I force something?' },
    { key: 'system',      q: 'What should become a system?' },
    { key: 'park',        q: 'What should be parked?' },
    { key: 'learned',     q: 'What did this week teach me?' },
  ]

  return (
    <div
      className="min-h-screen bg-app overflow-x-hidden"
      style={{
        '--app-bg-from': '#FBF8F2',
        '--app-bg-mid': '#F6F1E7',
        '--app-bg-to': '#F0E9DA',
        '--text-1': '#100C1E',
      } as React.CSSProperties}
    >
      <div className="fixed top-0 right-0 pointer-events-none z-0" style={{ width: 300, height: 300, background: 'radial-gradient(circle at 75% 12%, rgba(168,196,218,0.08) 0%, transparent 65%)', filter: 'blur(60px)' }} />
      <AppLayout>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,196,218,0.12)', border: '1px solid rgba(168,196,218,0.2)' }}>
              <Compass className="h-5 w-5" style={{ color: 'var(--lunar)' }} strokeWidth={1.6} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Career Compass</h1>
              <p style={{ fontSize: 11, color: '#5E5474' }}>
                {crmLoading ? 'Syncing CRM…' : crmError ? 'CRM unavailable' : `${accounts.length} clients · ${tasks.length} open tasks`}
              </p>
            </div>
          </div>
          <button onClick={loadCrm} disabled={crmLoading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 12, border: '1px solid rgba(180,150,100,0.16)', background: 'rgba(255,255,255,0.5)', color: '#5E5474', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {crmLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </button>
        </div>

        {/* CRM stat pills */}
        {!crmLoading && !crmError && accounts.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 12, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)' }}>
              <Users className="h-3 w-3" style={{ color: '#8A6F2A' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#8A6F2A' }}>{accounts.length} clients</span>
            </div>
            {totalMRR > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 12, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.18)' }}>
                <TrendingUp className="h-3 w-3" style={{ color: '#5C4530' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#5C4530' }}>${totalMRR.toLocaleString()}/mo retainer</span>
              </div>
            )}
            {tasks.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 12, background: 'rgba(168,196,218,0.09)', border: '1px solid rgba(168,196,218,0.16)' }}>
                <Clock className="h-3 w-3" style={{ color: 'var(--lunar)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lunar)' }}>{tasks.length} open tasks</span>
              </div>
            )}
            {atRiskAccounts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 12, background: 'rgba(224,94,94,0.09)', border: '1px solid rgba(224,94,94,0.18)' }}>
                <AlertCircle className="h-3 w-3" style={{ color: '#E05E5E' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#E05E5E' }}>{atRiskAccounts.length} at risk</span>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 20, flexWrap: 'wrap' }}>
          {([
            { key: 'today',   label: '🧭 Today'   },
            { key: 'clients', label: '👥 Clients'  },
            { key: 'lanes',   label: '📦 Lanes'    },
            { key: 'week',    label: '📅 Week'     },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: tab === key ? 'rgba(168,196,218,0.18)' : 'transparent',
              border: tab === key ? '1px solid rgba(168,196,218,0.32)' : '1px solid rgba(180,150,100,0.14)',
              color: tab === key ? '#4A7A96' : '#5E5474',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── TODAY TAB ────────────────────────────────────── */}
        {tab === 'today' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!compassResult ? (
              <>
                {/* Context preview */}
                {!crmLoading && tasks.length > 0 && (
                  <div style={{ ...GLASS, padding: '12px 16px', background: 'rgba(255,255,255,0.45)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8098', marginBottom: 8 }}>Live context for your compass</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {tasks.filter(t => t.priority === 'high' || t.priority === 'critical').slice(0, 4).map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#E08B4A', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: '#5E5474' }}>{t.title}{t.account_name ? ` — ${t.account_name}` : ''}</span>
                        </div>
                      ))}
                      <p style={{ fontSize: 11, color: '#8A8098', marginTop: 2 }}>{accounts.length} clients · ${totalMRR.toLocaleString()}/mo MRR</p>
                    </div>
                  </div>
                )}
                <button onClick={generateCompass} disabled={compassLoading} style={{
                  width: '100%', padding: '16px', borderRadius: 18, fontWeight: 700, fontSize: 14, color: 'white', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(168,196,218,0.6), rgba(201,169,110,0.6))',
                  border: '1px solid rgba(168,196,218,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {compassLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading your career energy…</> : <><Sparkles className="h-4 w-4" /> Generate Career Compass</>}
                </button>
              </>
            ) : (
              <>
                <div style={CARD}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lunar)', marginBottom: 8 }}>Career energy today</p>
                  <p style={{ fontSize: 14, color: '#100C1E', lineHeight: 1.6 }}>{compassResult.career_energy}</p>
                  {compassResult.chart_theme && <p style={{ fontSize: 11, fontStyle: 'italic', color: '#8A8098', marginTop: 8 }}>{compassResult.chart_theme}</p>}
                </div>

                {compassResult.highest_use_work && compassResult.highest_use_work.length > 0 && (
                  <div style={{ ...CARD, background: 'rgba(244,235,212,0.9)', border: '1px solid rgba(201,169,110,0.35)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A6F2A', marginBottom: 10 }}>Highest-use work today</p>
                    {compassResult.highest_use_work.map((w, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, paddingTop: 8, paddingBottom: 8, borderBottom: i < compassResult.highest_use_work!.length - 1 ? '1px solid rgba(201,169,110,0.15)' : 'none' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#8A6F2A', minWidth: 20 }}>0{i+1}</span>
                        <p style={{ fontSize: 14, color: '#100C1E' }}>{w}</p>
                      </div>
                    ))}
                  </div>
                )}

                {compassResult.recognition_check && (
                  <div style={CARD}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C4530', marginBottom: 8 }}>Recognition check</p>
                    <p style={{ fontSize: 14, fontStyle: 'italic', color: '#100C1E' }}>{compassResult.recognition_check}</p>
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {RECOGNITION_QUESTIONS.map((q, i) => (
                        <p key={i} style={{ fontSize: 12, color: '#5E5474' }}>· {q}</p>
                      ))}
                    </div>
                  </div>
                )}

                {compassResult.voice_clarity_prompt && (
                  <div style={{ ...GLASS, padding: '14px 16px', background: 'rgba(244,235,212,0.9)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A6F2A', marginBottom: 8 }}>Voice clarity</p>
                    <p style={{ fontSize: 14, fontStyle: 'italic', color: '#100C1E', lineHeight: 1.6 }}>{compassResult.voice_clarity_prompt}</p>
                    <Link href="/dictation">
                      <button style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#8A6F2A', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Mic className="h-3.5 w-3.5" /> Speak it out →
                      </button>
                    </Link>
                  </div>
                )}

                {compassResult.current_pattern && (
                  <div style={CARD}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8098', marginBottom: 10 }}>Pattern → Highest Self</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(224,94,94,0.06)', border: '1px solid rgba(224,94,94,0.12)' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#E05E5E', marginBottom: 4 }}>Pattern</p>
                        <p style={{ fontSize: 13, color: '#100C1E' }}>{compassResult.current_pattern}</p>
                      </div>
                      <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(90,138,90,0.06)', border: '1px solid rgba(90,138,90,0.12)' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#5A8A5A', marginBottom: 4 }}>Highest self</p>
                        <p style={{ fontSize: 13, color: '#100C1E' }}>{compassResult.highest_self_action}</p>
                      </div>
                    </div>
                  </div>
                )}

                {compassResult.career_message && (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontStyle: 'italic', color: '#5E5474' }}>
                      &ldquo;{compassResult.career_message}&rdquo;
                    </p>
                  </div>
                )}

                <button onClick={() => setCompassResult(null)} style={{ width: '100%', padding: '12px', borderRadius: 14, fontSize: 13, fontWeight: 600, color: '#5E5474', background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(180,150,100,0.16)', cursor: 'pointer' }}>
                  Regenerate
                </button>
              </>
            )}
          </div>
        )}

        {/* ── CLIENTS TAB ──────────────────────────────────── */}
        {tab === 'clients' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {crmLoading && [1,2,3].map(i => <div key={i} style={{ ...GLASS, height: 80, background: 'rgba(255,255,255,0.4)' }} />)}

            {!crmLoading && crmError && (
              <div style={{ ...GLASS, padding: '20px', textAlign: 'center', background: 'rgba(224,94,94,0.08)' }}>
                <AlertCircle className="h-8 w-8 mx-auto mb-2" style={{ color: '#E05E5E' }} />
                <p style={{ fontSize: 13, color: '#5E5474' }}>Can&apos;t reach DRYP CRM right now.</p>
              </div>
            )}

            {!crmLoading && !crmError && accounts.length > 0 && (
              <>
                {/* Retainer clients first */}
                {retainerAccounts.length > 0 && (
                  <>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C4530', marginBottom: 4 }}>
                      Retainer clients — ${totalMRR.toLocaleString()}/mo
                    </p>
                    {retainerAccounts.map(a => (
                      <ClientCard key={a.id} account={a} tasks={tasksByClient[a.id] ?? []} />
                    ))}
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8098', marginBottom: 4, marginTop: 8 }}>
                      All clients
                    </p>
                  </>
                )}
                {accounts.filter(a => !a.monthly_retainer || a.monthly_retainer <= 0).map(a => (
                  <ClientCard key={a.id} account={a} tasks={tasksByClient[a.id] ?? []} />
                ))}
              </>
            )}

            {/* Open in CRM */}
            <a href="https://dryphub.com/accounts" target="_blank" rel="noreferrer" style={{ ...GLASS, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, textDecoration: 'none' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#5E5474' }}>Open in DRYP CRM</p>
              <ExternalLink className="h-4 w-4" style={{ color: '#8A8098' }} />
            </a>
          </div>
        )}

        {/* ── LANES TAB ────────────────────────────────────── */}
        {tab === 'lanes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#5E5474', lineHeight: 1.6 }}>
              Your career is multi-lane. Ideas are safe here — one priority at a time.
            </p>

            {[
              {
                label: 'Client Work',
                color: 'var(--lunar)',
                items: accounts.length > 0
                  ? accounts.map(a => a.business_name.trim())
                  : ['EHM Strategies', 'Flanagan\'s Irish Pub', 'Villa Residential', 'Babe Coffee Lounge'],
                live: accounts.length > 0,
              },
              { label: 'DRYP Growth',       color: '#B79A5C',           items: ['DRYP Digital', 'DRYPHub CRM', 'Newsletter Studio', 'DRYP Studio', 'Social content'],   live: false },
              { label: 'Money Moves',        color: '#5C4530',           items: ['TikTok Shop', 'Dropshipping', 'Trading', 'Passive income streams'],                    live: false },
              { label: 'Creative Identity',  color: 'var(--blush)',      items: ['Content creation', 'Sewing + clothing brand', 'Painting', 'Dance', 'Tattoo art'],      live: false },
              { label: 'Future Projects',    color: 'var(--herb)',       items: ['Nurturly', 'LINK\'d UP', 'Bikini brand', 'Books', '144-client prep'],                  live: false },
              { label: 'Parked',             color: '#8A8098', items: ['Ideas waiting for the right moment — safe here'],                               live: false },
            ].map(lane => (
              <div key={lane.label} style={{ ...GLASS, padding: '14px 16px', borderLeft: `3px solid ${lane.color}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: lane.color }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#100C1E' }}>{lane.label}</p>
                  {lane.live && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: lane.color, background: `${lane.color}18`, padding: '2px 6px', borderRadius: 6 }}>live</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {lane.items.map((item, j) => (
                    <span key={j} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: `${lane.color}18`, border: `1px solid ${lane.color}30`, color: lane.color === '#8A8098' ? '#5E5474' : lane.color }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <p style={{ fontSize: 11, fontStyle: 'italic', textAlign: 'center', color: '#8A8098', paddingBottom: 8 }}>
              One main priority. Everything else stays safe.
            </p>
          </div>
        )}

        {/* ── WEEK TAB ─────────────────────────────────────── */}
        {tab === 'week' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!weekResult ? (
              <>
                <p style={{ fontSize: 13, color: '#5E5474', lineHeight: 1.6, marginBottom: 4 }}>
                  Reflect on your week. Answer what feels true — LUNA will read the pattern.
                </p>
                {WEEK_QUESTIONS.map(({ key, q }) => (
                  <div key={key}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#5E5474', marginBottom: 6 }}>{q}</p>
                    <textarea
                      value={weekAnswers[key] ?? ''}
                      onChange={e => setWeekAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                      rows={2}
                      placeholder="Speak your truth…"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13,
                        background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,150,100,0.18)',
                        color: '#100C1E', resize: 'none', outline: 'none', boxSizing: 'border-box',
                        lineHeight: 1.5,
                      }}
                    />
                  </div>
                ))}
                <button onClick={submitWeek} disabled={weekLoading || Object.keys(weekAnswers).length === 0} style={{
                  width: '100%', padding: '14px', borderRadius: 16, fontWeight: 700, fontSize: 14, color: 'white', cursor: 'pointer', marginTop: 4,
                  background: 'linear-gradient(135deg, rgba(168,196,218,0.55), rgba(201,169,110,0.55))',
                  border: '1px solid rgba(168,196,218,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: Object.keys(weekAnswers).length === 0 ? 0.5 : 1,
                }}>
                  {weekLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading your week…</> : <><Sparkles className="h-4 w-4" /> Reflect on my week</>}
                </button>
              </>
            ) : (
              <>
                {weekResult.week_theme && (
                  <div style={{ ...GLASS, padding: '18px 20px', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: 20, textAlign: 'center' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A6F2A', marginBottom: 8 }}>This week&apos;s theme</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#100C1E' }}>{weekResult.week_theme}</p>
                  </div>
                )}
                {weekResult.energy_summary && (
                  <div style={CARD}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lunar)', marginBottom: 8 }}>Energy summary</p>
                    <p style={{ fontSize: 14, color: '#100C1E', lineHeight: 1.65 }}>{weekResult.energy_summary}</p>
                  </div>
                )}
                {weekResult.what_to_keep && weekResult.what_to_keep.length > 0 && (
                  <div style={CARD}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5A8A5A', marginBottom: 8 }}>Keep doing</p>
                    {weekResult.what_to_keep.map((w, i) => <p key={i} style={{ fontSize: 13, color: '#100C1E', paddingTop: 4, paddingBottom: 4 }}>· {w}</p>)}
                  </div>
                )}
                {weekResult.what_to_release && weekResult.what_to_release.length > 0 && (
                  <div style={CARD}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E05E5E', marginBottom: 8 }}>Release</p>
                    {weekResult.what_to_release.map((w, i) => <p key={i} style={{ fontSize: 13, color: '#100C1E', paddingTop: 4, paddingBottom: 4 }}>· {w}</p>)}
                  </div>
                )}
                {weekResult.next_week_intention && (
                  <div style={CARD}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C4530', marginBottom: 8 }}>Next week intention</p>
                    <p style={{ fontSize: 14, color: '#100C1E', lineHeight: 1.65 }}>{weekResult.next_week_intention}</p>
                  </div>
                )}
                {weekResult.affirmation && (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontStyle: 'italic', color: '#5E5474' }}>
                      &ldquo;{weekResult.affirmation}&rdquo;
                    </p>
                  </div>
                )}
                <button onClick={() => { setWeekResult(null); setWeekAnswers({}) }} style={{ width: '100%', padding: '12px', borderRadius: 14, fontSize: 13, fontWeight: 600, color: '#5E5474', background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(180,150,100,0.16)', cursor: 'pointer' }}>
                  Reflect again
                </button>
              </>
            )}

            {/* Link to work page */}
            <Link href="/work" style={{ textDecoration: 'none' }}>
              <div style={{ ...GLASS, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#5E5474' }}>See this week&apos;s open tasks</p>
                <ChevronRight className="h-4 w-4" style={{ color: '#8A8098' }} />
              </div>
            </Link>
          </div>
        )}

        <div style={{ height: 32 }} />
      </AppLayout>
    </div>
  )
}
