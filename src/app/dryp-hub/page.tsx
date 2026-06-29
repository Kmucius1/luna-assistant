'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, AlertTriangle, CheckCircle, Clock, ArrowLeft, ExternalLink, Bell, Plus, Settings, Users, Briefcase } from 'lucide-react'
import Link from 'next/link'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}

const HEALTH_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  excellent: { bg: 'rgba(90,180,90,0.15)',   color: '#6AB86A', label: 'Excellent' },
  good:      { bg: 'rgba(90,138,90,0.12)',   color: '#8AB88A', label: 'Good'      },
  new:       { bg: 'rgba(90,138,164,0.12)',  color: '#7BAEC8', label: 'New'       },
  at_risk:   { bg: 'rgba(201,169,110,0.15)', color: '#C9A96E', label: 'At Risk'   },
  churning:  { bg: 'rgba(224,94,94,0.15)',   color: '#E05E5E', label: 'Churning'  },
}

interface Account {
  id: string; business_name: string; health_status: string
  client_pipeline_stage?: string; monthly_retainer?: number
  notes?: string; updated_at: string
  contacts_count?: number; services_count?: number; projects_count?: number
}
interface Change {
  id: string; business_name?: string; health_status?: string
  updated_at?: string; content?: string; created_at?: string
  account?: { id: string; business_name: string }
}
interface Stats {
  activeClients: number; openTasks: number; dueToday: number
  dueThisWeek: number; notesLastDay: number; atRiskCount: number
}

function timeAgo(dateStr: string) {
  const d = Date.now() - new Date(dateStr).getTime()
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}

export default function DryphubPage() {
  const [accounts,  setAccounts]  = useState<Account[]>([])
  const [changes,   setChanges]   = useState<{ updatedAccounts: Change[]; newNotes: Change[]; newAccounts: Change[] } | null>(null)
  const [stats,     setStats]     = useState<Stats | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<'clients' | 'activity' | 'tasks'>('clients')
  const [search,    setSearch]    = useState('')
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [acRes, chRes] = await Promise.all([
        fetch('/api/dryp/accounts'),
        fetch('/api/dryp/changes?hours=24'),
      ])
      const acData = await acRes.json()
      const chData = await chRes.json()
      setConnected(acData.connected)
      setAccounts(acData.accounts ?? [])
      setStats(acData.stats ?? null)
      setChanges(chData)
      setLastCheck(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    } catch { setConnected(false) }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh every 10 minutes
    const id = setInterval(load, 600_000)
    return () => clearInterval(id)
  }, [load])

  const filteredAccounts = accounts.filter(a =>
    !search || a.business_name.toLowerCase().includes(search.toLowerCase())
  )

  const totalAlerts = (changes?.newAccounts?.length ?? 0) + (changes?.updatedAccounts?.length ?? 0)
  const hasAtRisk   = accounts.some(a => ['at_risk', 'churning'].includes(a.health_status))

  return (
    <div className="bg-app min-h-screen">
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          {/* Header */}
          <div style={{ padding: '20px 20px 0' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #8B6FB8, #5A3F88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white' }}>D</div>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'white' }}>DRYP Hub</h1>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                    {connected === true ? `Last checked ${lastCheck ?? '—'}` : connected === false ? 'Not connected' : 'Connecting…'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href="https://www.dryphub.com/accounts" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                  <ExternalLink className="h-3 w-3" /> Open CRM
                </a>
                <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: '12px 16px 0' }}>

            {/* Not connected */}
            {connected === false && (
              <div style={{ ...GLASS, padding: 24, marginBottom: 14, background: 'rgba(224,94,94,0.06)', border: '1px solid rgba(224,94,94,0.2)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: '#E05E5E', marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 6 }}>DRYP Hub not connected</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 14 }}>
                      To connect LUNA to DRYP Hub, add these two environment variables in Vercel → LUNA project → Settings → Environment Variables:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {[
                        { key: 'DRYP_SUPABASE_URL', hint: 'Your DRYP Hub Supabase project URL' },
                        { key: 'DRYP_SUPABASE_SERVICE_KEY', hint: 'Service role key (not anon key)' },
                      ].map(v => (
                        <div key={v.key} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#8B6FB8', fontFamily: 'monospace' }}>{v.key}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{v.hint}</p>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                      Get these from supabase.com → DRYP Hub project → Settings → API → Project URL and Service Role Key
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Alert: new/at-risk */}
            {connected && (totalAlerts > 0 || hasAtRisk) && (
              <div style={{ ...GLASS, padding: 14, marginBottom: 12, background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.22)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bell className="h-4 w-4 flex-shrink-0" style={{ color: '#C9A96E' }} />
                <div style={{ flex: 1 }}>
                  {totalAlerts > 0 && <p style={{ fontSize: 13, color: '#C9A96E', fontWeight: 600 }}>{totalAlerts} CRM update{totalAlerts !== 1 ? 's' : ''} in the last 24 hours</p>}
                  {hasAtRisk && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>⚠ {accounts.filter(a => ['at_risk','churning'].includes(a.health_status)).length} client{accounts.filter(a => ['at_risk','churning'].includes(a.health_status)).length !== 1 ? 's' : ''} flagged at-risk or churning</p>}
                </div>
              </div>
            )}

            {/* Stats row */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { v: stats.activeClients, l: 'Active Clients',  c: '#8B6FB8' },
                  { v: stats.openTasks,     l: 'Open Tasks',      c: '#C9A96E' },
                  { v: stats.dueToday,      l: 'Due Today',       c: stats.dueToday > 0 ? '#E05E5E' : 'rgba(255,255,255,0.4)' },
                ].map(s => (
                  <div key={s.l} style={{ ...GLASS, padding: '14px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 4, fontWeight: 600 }}>{s.l}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            {connected && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {([['clients', 'Clients'], ['activity', `Activity${totalAlerts > 0 ? ` (${totalAlerts})` : ''}`], ['tasks', 'Tasks']] as [typeof tab, string][]).map(([v, label]) => (
                  <button key={v} onClick={() => setTab(v)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === v ? 'rgba(139,111,184,0.9)' : 'rgba(255,255,255,0.07)', color: tab === v ? 'white' : 'rgba(255,255,255,0.5)' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3].map(i => <div key={i} style={{ ...GLASS, height: 72 }} />)}
              </div>
            )}

            {/* Clients tab */}
            {!loading && connected && tab === 'clients' && (
              <div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '9px 14px', fontSize: 13, color: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredAccounts.map(a => {
                    const hs = HEALTH_STYLES[a.health_status] ?? HEALTH_STYLES.good
                    return (
                      <div key={a.id} style={{ ...GLASS, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                              <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{a.business_name}</p>
                              <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: hs.bg, color: hs.color }}>{hs.label}</span>
                            </div>
                            {a.client_pipeline_stage && (
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 5, textTransform: 'capitalize' }}>
                                {a.client_pipeline_stage.replace(/_/g, ' ')}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: 10 }}>
                              {a.monthly_retainer && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>${a.monthly_retainer.toLocaleString()}/mo</span>}
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Updated {timeAgo(a.updated_at)}</span>
                            </div>
                          </div>
                          <a href={`https://www.dryphub.com/accounts/${a.id}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginTop: 2 }}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                  {filteredAccounts.length === 0 && (
                    <div style={{ ...GLASS, padding: 32, textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No clients found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity tab */}
            {!loading && connected && tab === 'activity' && changes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* New clients */}
                {changes.newAccounts?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#8AB88A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>New clients</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {changes.newAccounts.map((a: Change) => (
                        <div key={a.id} style={{ ...GLASS, padding: '12px 16px', background: 'rgba(90,138,90,0.07)', border: '1px solid rgba(90,138,90,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{a.business_name}</p>
                            <p style={{ fontSize: 11, color: '#8AB88A' }}>New client · {timeAgo(a.updated_at ?? a.created_at ?? '')}</p>
                          </div>
                          <a href={`https://www.dryphub.com/accounts/${a.id}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Updated accounts */}
                {changes.updatedAccounts?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Updated client records</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {changes.updatedAccounts.map((a: Change) => (
                        <div key={a.id} style={{ ...GLASS, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{a.business_name}</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Updated {timeAgo(a.updated_at ?? '')}</p>
                          </div>
                          <a href={`https://www.dryphub.com/accounts/${a.id}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New notes */}
                {changes.newNotes?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#7BAEC8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>New meeting notes</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {changes.newNotes.map((n: Change) => (
                        <div key={n.id} style={{ ...GLASS, padding: '12px 16px' }}>
                          {n.account && <p style={{ fontSize: 11, fontWeight: 700, color: '#7BAEC8', marginBottom: 4 }}>{n.account.business_name}</p>}
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{n.content?.slice(0, 120)}{(n.content?.length ?? 0) > 120 ? '…' : ''}</p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{timeAgo(n.created_at ?? '')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!changes.newAccounts?.length && !changes.updatedAccounts?.length && !changes.newNotes?.length && (
                  <div style={{ ...GLASS, padding: 32, textAlign: 'center' }}>
                    <CheckCircle className="h-6 w-6" style={{ color: '#8AB88A', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>No changes in the last 24 hours</p>
                  </div>
                )}
              </div>
            )}

            {/* Tasks tab */}
            {!loading && connected && tab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ ...GLASS, padding: 18, textAlign: 'center' }}>
                  <a href="https://www.dryphub.com/tasks" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 14, background: 'linear-gradient(135deg, #8B6FB8, #6A4F9B)', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    <ExternalLink className="h-4 w-4" /> Open DRYP Tasks
                  </a>
                  {stats && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: '#C9A96E' }}>{stats.openTasks}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Open</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: stats.dueToday > 0 ? '#E05E5E' : 'rgba(255,255,255,0.4)' }}>{stats.dueToday}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Due today</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: '#8B6FB8' }}>{stats.dueThisWeek}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Due this week</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Meeting note reminder info */}
            {connected && (
              <div style={{ ...GLASS, padding: 16, marginTop: 14, background: 'rgba(139,111,184,0.05)', border: '1px solid rgba(139,111,184,0.18)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#8B6FB8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Meeting Note Reminders</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                  LUNA checks DRYP Hub after each calendar meeting ends. If no notes were added for that client today, you'll see an alert here and in the daily check-in. Always add notes within 30 min of your meeting.
                </p>
                <a href="https://www.dryphub.com/notes" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8B6FB8', textDecoration: 'none', marginTop: 8 }}>
                  <Plus className="h-3 w-3" /> Add a note in DRYP Hub
                </a>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
