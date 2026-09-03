'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, AlertTriangle, CheckCircle, ArrowLeft, ExternalLink, Bell, Plus } from 'lucide-react'
import Link from 'next/link'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const HEALTH_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  excellent: { bg: 'rgba(90,180,90,0.15)',   color: '#4A8A4A', label: 'Excellent' },
  good:      { bg: 'rgba(90,138,90,0.12)',   color: '#5A8A5A', label: 'Good'      },
  new:       { bg: 'rgba(90,138,164,0.12)',  color: '#4A7A96', label: 'New'       },
  at_risk:   { bg: 'rgba(201,169,110,0.15)', color: '#8A6F2A', label: 'At Risk'   },
  churning:  { bg: 'rgba(224,94,94,0.15)',   color: '#B23B3B', label: 'Churning'  },
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
    <div
      className="bg-app min-h-screen"
      style={{
        '--app-bg-from': '#FBF8F2',
        '--app-bg-mid': '#F6F1E7',
        '--app-bg-to': '#F0E9DA',
      } as React.CSSProperties}
    >
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          {/* Header */}
          <div style={{ padding: '20px 20px 0' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5E5474', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #5C4530, #B8934A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white' }}>D</div>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#F5EFE3' }}>DRYP Hub</h1>
                  <p style={{ fontSize: 11, color: 'rgba(245,239,227,0.72)', marginTop: 1 }}>
                    {connected === true ? `Last checked ${lastCheck ?? '—'}` : connected === false ? 'Not connected' : 'Connecting…'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href="https://www.dryphub.com/accounts" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 12, border: '1px solid rgba(180,150,100,0.16)', background: 'rgba(255,255,255,0.5)', color: '#5E5474', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                  <ExternalLink className="h-3 w-3" /> Open CRM
                </a>
                <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 12, border: '1px solid rgba(180,150,100,0.16)', background: 'rgba(255,255,255,0.5)', color: '#5E5474', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: '12px 16px 0' }}>

            {/* Not connected */}
            {connected === false && (
              <div style={{ ...GLASS, padding: 24, marginBottom: 14, background: 'rgba(250,225,222,0.92)', border: '1px solid rgba(224,94,94,0.4)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: '#B23B3B', marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E', marginBottom: 6 }}>DRYP Hub not connected</p>
                    <p style={{ fontSize: 13, color: '#32284A', lineHeight: 1.6, marginBottom: 14 }}>
                      To connect LUNA to DRYP Hub, add these two environment variables in Vercel → LUNA project → Settings → Environment Variables:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {[
                        { key: 'DRYP_SUPABASE_URL', hint: 'Your DRYP Hub Supabase project URL' },
                        { key: 'DRYP_SUPABASE_SERVICE_KEY', hint: 'Service role key (not anon key)' },
                      ].map(v => (
                        <div key={v.key} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(180,150,100,0.18)' }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#8A6F2A', fontFamily: 'monospace' }}>{v.key}</p>
                          <p style={{ fontSize: 11, color: '#5E5474', marginTop: 2 }}>{v.hint}</p>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: '#5E5474', lineHeight: 1.5 }}>
                      Get these from supabase.com → DRYP Hub project → Settings → API → Project URL and Service Role Key
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Alert: new/at-risk */}
            {connected && (totalAlerts > 0 || hasAtRisk) && (
              <div style={{ ...GLASS, padding: 14, marginBottom: 12, background: 'rgba(244,235,212,0.9)', border: '1px solid rgba(201,169,110,0.4)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bell className="h-4 w-4 flex-shrink-0" style={{ color: '#5C4530' }} />
                <div style={{ flex: 1 }}>
                  {totalAlerts > 0 && <p style={{ fontSize: 13, color: '#8A6F2A', fontWeight: 600 }}>{totalAlerts} CRM update{totalAlerts !== 1 ? 's' : ''} in the last 24 hours</p>}
                  {hasAtRisk && <p style={{ fontSize: 12, color: '#32284A', marginTop: 2 }}>⚠ {accounts.filter(a => ['at_risk','churning'].includes(a.health_status)).length} client{accounts.filter(a => ['at_risk','churning'].includes(a.health_status)).length !== 1 ? 's' : ''} flagged at-risk or churning</p>}
                </div>
              </div>
            )}

            {/* Stats row */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { v: stats.activeClients, l: 'Active Clients',  c: '#8A6F2A' },
                  { v: stats.openTasks,     l: 'Open Tasks',      c: '#5C4530' },
                  { v: stats.dueToday,      l: 'Due Today',       c: stats.dueToday > 0 ? '#B23B3B' : '#5E5474' },
                ].map(s => (
                  <div key={s.l} style={{ ...GLASS, padding: '14px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</p>
                    <p style={{ fontSize: 10, color: '#5E5474', marginTop: 4, fontWeight: 600 }}>{s.l}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            {connected && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {([['clients', 'Clients'], ['activity', `Activity${totalAlerts > 0 ? ` (${totalAlerts})` : ''}`], ['tasks', 'Tasks']] as [typeof tab, string][]).map(([v, label]) => (
                  <button key={v} onClick={() => setTab(v)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === v ? '#5C4530' : 'rgba(255,255,255,0.5)', color: tab === v ? 'white' : '#5E5474' }}>
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
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" style={{ width: '100%', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,150,100,0.18)', borderRadius: 12, padding: '9px 14px', fontSize: 13, color: '#100C1E', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredAccounts.map(a => {
                    const hs = HEALTH_STYLES[a.health_status] ?? HEALTH_STYLES.good
                    return (
                      <div key={a.id} style={{ ...GLASS, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E' }}>{a.business_name}</p>
                              <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: hs.bg, color: hs.color }}>{hs.label}</span>
                            </div>
                            {a.client_pipeline_stage && (
                              <p style={{ fontSize: 11, color: '#5E5474', marginBottom: 5, textTransform: 'capitalize' }}>
                                {a.client_pipeline_stage.replace(/_/g, ' ')}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: 10 }}>
                              {a.monthly_retainer && <span style={{ fontSize: 11, color: '#5E5474' }}>${a.monthly_retainer.toLocaleString()}/mo</span>}
                              <span style={{ fontSize: 11, color: '#8A8098' }}>Updated {timeAgo(a.updated_at)}</span>
                            </div>
                          </div>
                          <a href={`https://www.dryphub.com/accounts/${a.id}`} target="_blank" rel="noreferrer" style={{ color: '#8A8098', flexShrink: 0, marginTop: 2 }}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                  {filteredAccounts.length === 0 && (
                    <div style={{ ...GLASS, padding: 32, textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: '#8A8098' }}>No clients found.</p>
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
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#4A8A4A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>New clients</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {changes.newAccounts.map((a: Change) => (
                        <div key={a.id} style={{ ...GLASS, padding: '12px 16px', background: 'rgba(224,236,224,0.92)', border: '1px solid rgba(90,138,90,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#100C1E' }}>{a.business_name}</p>
                            <p style={{ fontSize: 11, color: '#4A8A4A' }}>New client · {timeAgo(a.updated_at ?? a.created_at ?? '')}</p>
                          </div>
                          <a href={`https://www.dryphub.com/accounts/${a.id}`} target="_blank" rel="noreferrer" style={{ color: '#8A8098' }}>
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
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#8A6F2A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Updated client records</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {changes.updatedAccounts.map((a: Change) => (
                        <div key={a.id} style={{ ...GLASS, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#100C1E' }}>{a.business_name}</p>
                            <p style={{ fontSize: 11, color: '#5E5474' }}>Updated {timeAgo(a.updated_at ?? '')}</p>
                          </div>
                          <a href={`https://www.dryphub.com/accounts/${a.id}`} target="_blank" rel="noreferrer" style={{ color: '#8A8098' }}>
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
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#4A7A96', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>New meeting notes</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {changes.newNotes.map((n: Change) => (
                        <div key={n.id} style={{ ...GLASS, padding: '12px 16px' }}>
                          {n.account && <p style={{ fontSize: 11, fontWeight: 700, color: '#4A7A96', marginBottom: 4 }}>{n.account.business_name}</p>}
                          <p style={{ fontSize: 13, color: '#32284A', lineHeight: 1.5 }}>{n.content?.slice(0, 120)}{(n.content?.length ?? 0) > 120 ? '…' : ''}</p>
                          <p style={{ fontSize: 10, color: '#8A8098', marginTop: 4 }}>{timeAgo(n.created_at ?? '')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!changes.newAccounts?.length && !changes.updatedAccounts?.length && !changes.newNotes?.length && (
                  <div style={{ ...GLASS, padding: 32, textAlign: 'center' }}>
                    <CheckCircle className="h-6 w-6" style={{ color: '#4A8A4A', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, color: '#8A8098' }}>No changes in the last 24 hours</p>
                  </div>
                )}
              </div>
            )}

            {/* Tasks tab */}
            {!loading && connected && tab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ ...GLASS, padding: 18, textAlign: 'center' }}>
                  <a href="https://www.dryphub.com/tasks" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 14, background: 'linear-gradient(135deg, #5C4530, #B8934A)', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    <ExternalLink className="h-4 w-4" /> Open DRYP Tasks
                  </a>
                  {stats && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: '#8A6F2A' }}>{stats.openTasks}</p>
                        <p style={{ fontSize: 10, color: '#5E5474' }}>Open</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: stats.dueToday > 0 ? '#B23B3B' : '#5E5474' }}>{stats.dueToday}</p>
                        <p style={{ fontSize: 10, color: '#5E5474' }}>Due today</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: '#4A7A96' }}>{stats.dueThisWeek}</p>
                        <p style={{ fontSize: 10, color: '#5E5474' }}>Due this week</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Meeting note reminder info */}
            {connected && (
              <div style={{ ...GLASS, padding: 16, marginTop: 14, background: 'rgba(244,235,212,0.9)', border: '1px solid rgba(201,169,110,0.35)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#8A6F2A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Meeting Note Reminders</p>
                <p style={{ fontSize: 12, color: '#32284A', lineHeight: 1.6 }}>
                  LUNA checks DRYP Hub after each calendar meeting ends. If no notes were added for that client today, you&apos;ll see an alert here and in the daily check-in. Always add notes within 30 min of your meeting.
                </p>
                <a href="https://www.dryphub.com/notes" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8A6F2A', textDecoration: 'none', marginTop: 8 }}>
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
