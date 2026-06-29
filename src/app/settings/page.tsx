'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingPage } from '@/components/ui/loading'
import { createClient } from '@/lib/supabase/client'
import { AssistantProfile } from '@/types'
import { Sparkles, Save, User, Brain, Sun, Moon, Mail, Calendar, Plug, LogOut, Check, RefreshCw, AlertTriangle, X, ExternalLink, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme'

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 20,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  padding: 20,
  marginBottom: 14,
}

function SectionLabel({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      {icon}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{text}</p>
        {sub && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{sub}</p>}
      </div>
    </div>
  )
}

function FieldLabel({ text }: { text: string }) {
  return <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>{text}</p>
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'white', outline: 'none',
  fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box',
}

// ─── Default profile ──────────────────────────────────────────────────────────
const DEFAULT_PROFILE: Omit<AssistantProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  preferred_tone: 'Clear, warm, human, and confident. Not too formal. Gets to the point.',
  business_context: "Zoe runs Ad-Vantage Media Agency and DRYP Digital. Active clients: EHM Strategies, DRYP Studio, Babe Coffee Lounge, Flanagan's Irish Pub, Villa Residential, Hoover Digital, Linked Up events.",
  personal_context: 'Zoe is in school at USF. She has personal appointments, social media goals, content creation goals, and business growth goals.',
  banned_phrases: ['As per my last email', 'I hope this email finds you well', 'Please don\'t hesitate', 'Best regards', 'Synergy', 'Leverage'],
  response_style: 'Direct and clear. Warm but not overly casual. No corporate filler. No over-explaining.',
  main_projects: ['EHM Strategies', 'DRYP Studio', 'DRYP Digital', 'Ad-Vantage', 'Hoover Digital', 'Babe Coffee Lounge', "Flanagan's Irish Pub", 'Villa Residential', 'Linked Up', 'USF'],
  common_contacts: 'Mick (Flanagan\'s), Shannon Martin, Kaleb Mucius, clients from EHM, DRYP team, USF professors',
  daily_routine: 'Morning: email + priority tasks. Afternoon: client work and calls. Evening: creative and admin.',
  personal_goals: 'Grow Ad-Vantage, expand DRYP Studio, graduate from USF, grow personal social media, stay healthy.',
}

// ─── Connection status row ────────────────────────────────────────────────────
interface ConnStatus { email: string; label: string; connected: boolean; calendarConnected?: boolean }

function ConnRow({ item, onDisconnect, connecting }: {
  item: ConnStatus
  onDisconnect: (email: string) => void
  connecting: string | null
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: item.connected ? 'rgba(90,138,90,0.2)' : 'rgba(255,255,255,0.07)',
          border: `1px solid ${item.connected ? 'rgba(90,138,90,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
          <Mail className="h-4 w-4" style={{ color: item.connected ? '#8AB88A' : 'rgba(255,255,255,0.4)' }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: item.connected ? 'white' : 'rgba(255,255,255,0.55)' }}>{item.email}</p>
          <p style={{ fontSize: 10, color: item.connected ? '#8AB88A' : 'rgba(255,255,255,0.35)' }}>
            {item.connected ? '✓ Gmail connected' : 'Not connected'}
            {item.connected && item.calendarConnected ? ' · ✓ Calendar' : ''}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {item.connected ? (
          <button onClick={() => onDisconnect(item.email)} style={{ padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <LogOut className="h-3 w-3" /> Disconnect
          </button>
        ) : (
          <a href={`/api/gmail/auth?hint=${encodeURIComponent(item.email)}`} style={{
            padding: '7px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            background: connecting === item.email ? 'rgba(90,138,164,0.2)' : 'rgba(90,138,164,0.25)',
            border: '1px solid rgba(90,138,164,0.4)', color: '#7BAEC8', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#7BAEC8"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Connect with Google
          </a>
        )}
      </div>
    </div>
  )
}

// ─── OAuth status banner ─────────────────────────────────────────────────────
const ERROR_MESSAGES: Record<string, string> = {
  gmail_denied:  'Google sign-in was cancelled or denied.',
  gmail_failed:  'Google connection failed — most likely your OAuth app is in Testing mode. See the fix below.',
  access_denied: 'Google blocked access. If you see "app not authorized", your OAuth app is in Testing mode or your Google Workspace admin has restricted third-party apps.',
  org_internal:  'Your Google Workspace admin has restricted this app. You need to allow it in admin.google.com → Security → API Controls.',
}

function OAuthBanner() {
  const params  = useSearchParams()
  const error   = params.get('error')
  const connected = params.get('connected')
  const [show, setShow] = useState(true)
  if (!show || (!error && !connected)) return null

  if (connected) return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(90,138,90,0.12)', border: '1px solid rgba(90,138,90,0.3)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <Check className="h-4 w-4 flex-shrink-0" style={{ color: '#8AB88A' }} />
      <p style={{ fontSize: 13, color: '#8AB88A', flex: 1 }}>Connected: {decodeURIComponent(connected)}</p>
      <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X className="h-4 w-4" /></button>
    </div>
  )

  return (
    <div style={{ borderRadius: 16, background: 'rgba(224,94,94,0.08)', border: '1px solid rgba(224,94,94,0.25)', marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#E05E5E' }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: '#E05E5E', fontWeight: 700, marginBottom: 4 }}>Connection failed</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            {ERROR_MESSAGES[error ?? ''] ?? `Error: ${error} — see fix below.`}
          </p>
          {params.get('reason') && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: 6 }}>
              {decodeURIComponent(params.get('reason')!)}
            </p>
          )}
        </div>
        <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}><X className="h-4 w-4" /></button>
      </div>
      {/* Fix instructions */}
      <div style={{ padding: '0 16px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>How to fix</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { n: '1', text: 'Go to console.cloud.google.com → your project → APIs & Services → OAuth consent screen' },
            { n: '2', text: 'Check the status — if it says "Testing", either add info@drypdigital.com and zoe@drypdigital.com as Test Users, OR change Publishing Status to "Production"' },
            { n: '3', text: 'If your Google Workspace admin has locked down third-party apps: go to admin.google.com → Security → API Controls → App Access Control → change to "Trust internal + trusted apps" or add this app by Client ID' },
            { n: '4', text: 'Once done, come back here and click Connect with Google again' },
          ].map(step => (
            <div key={step.n} style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: 'rgba(224,94,94,0.2)', color: '#E05E5E', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{step.n}</div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{step.text}</p>
            </div>
          ))}
          <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#7BAEC8', textDecoration: 'none', marginTop: 4 }}>
            <ExternalLink className="h-3 w-3" /> Open Google Cloud Console
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [profile, setProfile]   = useState(DEFAULT_PROFILE)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [bannedInput, setBannedInput]     = useState('')
  const [projectsInput, setProjectsInput] = useState('')
  const [connStatus, setConnStatus] = useState<{ accounts: { email: string }[]; connected: boolean }>({ accounts: [], connected: false })
  const [calendarCount, setCalendarCount] = useState<number | null>(null)
  const [checkingCal, setCheckingCal]     = useState(false)
  const [connecting, setConnecting]       = useState<string | null>(null)
  const supabase = createClient()

  const ZOES_ACCOUNTS: ConnStatus[] = [
    { email: 'info@drypdigital.com', label: 'Primary Business', connected: connStatus.accounts.some(a => a.email === 'info@drypdigital.com'), calendarConnected: calendarCount !== null },
    { email: 'zoe@drypdigital.com',  label: 'Personal + Calendar', connected: connStatus.accounts.some(a => a.email === 'zoe@drypdigital.com'), calendarConnected: calendarCount !== null },
  ]

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('assistant_profile').select('*').eq('user_id', user.id).single()
    if (data) {
      setProfile(data)
      setProfileId(data.id)
      setBannedInput((data.banned_phrases || []).join(', '))
      setProjectsInput((data.main_projects || []).join(', '))
    } else {
      setBannedInput(DEFAULT_PROFILE.banned_phrases.join(', '))
      setProjectsInput(DEFAULT_PROFILE.main_projects.join(', '))
    }
    setLoading(false)
  }, [supabase])

  const checkConnections = useCallback(async () => {
    const res = await fetch('/api/gmail/status')
    const d   = await res.json()
    setConnStatus({ accounts: d.accounts ?? [], connected: d.connected })
  }, [])

  const checkCalendar = useCallback(async () => {
    setCheckingCal(true)
    try {
      const res = await fetch('/api/calendar/today')
      const d   = await res.json()
      setCalendarCount(d.error ? null : d.count ?? 0)
    } catch { setCalendarCount(null) }
    setCheckingCal(false)
  }, [])

  useEffect(() => {
    loadProfile()
    checkConnections()
    checkCalendar()
  }, [loadProfile, checkConnections, checkCalendar])

  async function handleDisconnect(email: string) {
    // Disconnect a specific account (simplified: disconnect all for now)
    await fetch('/api/gmail/disconnect', { method: 'POST' })
    await checkConnections()
    setCalendarCount(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const profileData = {
      ...profile,
      banned_phrases: bannedInput.split(',').map(s => s.trim()).filter(Boolean),
      main_projects:  projectsInput.split(',').map(s => s.trim()).filter(Boolean),
      updated_at:     new Date().toISOString(),
    }

    if (profileId) {
      await supabase.from('assistant_profile').update(profileData).eq('id', profileId)
    } else {
      const { data } = await supabase.from('assistant_profile').insert({ ...profileData, user_id: user.id }).select().single()
      if (data) setProfileId(data.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <AppLayout><LoadingPage /></AppLayout>

  const allConnected = ZOES_ACCOUNTS.every(a => a.connected)

  return (
    <div className="bg-app min-h-screen">
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>

          {/* Page title */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 3 }}>Settings</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Connect your accounts and customize LUNA</p>
          </div>

          {/* OAuth result banner */}
          <Suspense fallback={null}>
            <OAuthBanner />
          </Suspense>

          {/* ── FINANCE & BANKING ────────────────────────────────── */}
          <div style={CARD}>
            <SectionLabel icon={<DollarSign className="h-4 w-4" style={{ color: 'rgba(201,169,110,0.7)' }} />} text="Finance & Banking" sub="CSV import" />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 14 }}>
              Import your bank statements to track spending, bills, and subscriptions. Download a CSV from your bank and drag it into LUNA.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/money/import" style={{ flex: 1, height: 38, borderRadius: 12, border: '1px solid rgba(201,169,110,0.4)', background: 'rgba(201,169,110,0.1)', color: '#C9A96E', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                Import CSV
              </Link>
              <Link href="/money" style={{ flex: 1, height: 38, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                Money Dashboard →
              </Link>
            </div>
          </div>

          {/* ── CONNECTIONS ───────────────────────────────────────── */}
          <div style={CARD}>
            <SectionLabel icon={<Plug className="h-4 w-4" style={{ color: 'rgba(139,111,184,0.7)' }} />} text="Connections" sub="Gmail + Calendar — both sync together" />

            {/* Gmail accounts */}
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Gmail Accounts</p>
            {ZOES_ACCOUNTS.map(item => (
              <ConnRow key={item.email} item={item} onDisconnect={handleDisconnect} connecting={connecting} />
            ))}

            {/* Connection note + troubleshooting */}
            {!allConnected && (
              <>
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(139,111,184,0.08)', border: '1px solid rgba(139,111,184,0.18)' }}>
                  <p style={{ fontSize: 12, color: 'rgba(196,169,232,0.8)', lineHeight: 1.5 }}>
                    Connect both Google Workspace accounts so LUNA reads all your emails and calendar events. Gmail + Calendar are authorized together in one sign-in.
                  </p>
                </div>
                <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.2)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#C9A96E', marginBottom: 8 }}>If connection fails — most common fix:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      'Go to console.cloud.google.com → APIs & Services → OAuth consent screen',
                      'If status = "Testing": add info@drypdigital.com + zoe@drypdigital.com as Test Users (or publish to Production)',
                      'If your drypdigital.com Workspace blocks third-party apps: admin.google.com → Security → API Controls → allow third-party apps',
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#C9A96E', flexShrink: 0 }}>{i + 1}.</span>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{s}</p>
                      </div>
                    ))}
                  </div>
                  <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7BAEC8', textDecoration: 'none', marginTop: 8 }}>
                    <ExternalLink className="h-3 w-3" /> Open Google Cloud Console
                  </a>
                </div>
              </>
            )}

            {/* Calendar status */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Google Calendar</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: calendarCount !== null ? 'rgba(90,138,90,0.2)' : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${calendarCount !== null ? 'rgba(90,138,90,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                    <Calendar className="h-4 w-4" style={{ color: calendarCount !== null ? '#8AB88A' : 'rgba(255,255,255,0.4)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: calendarCount !== null ? 'white' : 'rgba(255,255,255,0.55)' }}>
                      {calendarCount !== null ? `${calendarCount} event${calendarCount !== 1 ? 's' : ''} today` : 'Calendar not connected'}
                    </p>
                    <p style={{ fontSize: 10, color: calendarCount !== null ? '#8AB88A' : 'rgba(255,255,255,0.35)' }}>
                      {calendarCount !== null ? '✓ Connected via Google OAuth · auto-syncs with Gmail' : 'Connects automatically when you sign into Google above'}
                    </p>
                  </div>
                </div>
                <button onClick={checkCalendar} disabled={checkingCal} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <RefreshCw className={`h-3 w-3 ${checkingCal ? 'animate-spin' : ''}`} style={{ color: 'rgba(255,255,255,0.45)' }} />
                </button>
              </div>
              {calendarCount === null && connStatus.connected && (
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)' }}>
                  <p style={{ fontSize: 12, color: '#C9A96E' }}>
                    ⚡ Reconnect your Google account above to add Calendar access — click "Connect with Google" on a connected account to re-authorize with calendar scope.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── APPEARANCE ───────────────────────────────────────── */}
          <div style={CARD}>
            <SectionLabel icon={<Sun className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.45)' }} />} text="Appearance" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 2 }}>Theme</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Currently {theme === 'dark' ? 'dark' : 'light'} mode</p>
              </div>
              <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 14, border: '1px solid rgba(139,111,184,0.3)', background: 'rgba(139,111,184,0.1)', cursor: 'pointer', color: 'white', fontSize: 13, fontWeight: 600 }}>
                {theme === 'dark' ? <><Sun className="h-4 w-4" style={{ color: '#C9A96E' }} /> Light mode</> : <><Moon className="h-4 w-4" style={{ color: '#8B6FB8' }} /> Dark mode</>}
              </button>
            </div>
          </div>

          {/* ── ACCOUNT ──────────────────────────────────────────── */}
          <div style={CARD}>
            <SectionLabel icon={<User className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.45)' }} />} text="Account" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FB8, #6A4F9B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'white', border: '2px solid rgba(139,111,184,0.4)' }}>Z</div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Zoe Taylor</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Owner · DRYP Digital</p>
                </div>
              </div>
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: '1px solid rgba(224,94,94,0.3)', background: 'rgba(224,94,94,0.08)', color: '#E05E5E', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </div>

          {/* ── AI PROFILE ───────────────────────────────────────── */}
          <form onSubmit={handleSave}>
            <div style={CARD}>
              <SectionLabel icon={<Brain className="h-4 w-4" style={{ color: 'rgba(139,111,184,0.7)' }} />} text="AI Profile" sub="LUNA reads this to write in your voice" />

              <div style={{ marginBottom: 14 }}>
                <FieldLabel text="Your preferred tone" />
                <textarea value={profile.preferred_tone} rows={2} style={INPUT_STYLE}
                  onChange={e => setProfile(p => ({ ...p, preferred_tone: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel text="Business context" />
                <textarea value={profile.business_context} rows={3} style={INPUT_STYLE}
                  onChange={e => setProfile(p => ({ ...p, business_context: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel text="Personal context" />
                <textarea value={profile.personal_context} rows={2} style={INPUT_STYLE}
                  onChange={e => setProfile(p => ({ ...p, personal_context: e.target.value }))} />
              </div>
              <div>
                <FieldLabel text="Response style" />
                <textarea value={profile.response_style} rows={2} style={INPUT_STYLE}
                  onChange={e => setProfile(p => ({ ...p, response_style: e.target.value }))} />
              </div>
            </div>

            <div style={CARD}>
              <SectionLabel icon={<Sparkles className="h-4 w-4" style={{ color: 'rgba(201,169,110,0.7)' }} />} text="Banned Phrases" sub="AI will never use these in your replies" />
              <textarea value={bannedInput} rows={2} style={INPUT_STYLE}
                onChange={e => setBannedInput(e.target.value)}
                placeholder="Comma-separated: As per my last email, I hope this finds you well..." />
            </div>

            <div style={CARD}>
              <SectionLabel icon={<User className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.45)' }} />} text="Projects & Contacts" />
              <div style={{ marginBottom: 14 }}>
                <FieldLabel text="Main projects (comma-separated)" />
                <textarea value={projectsInput} rows={2} style={INPUT_STYLE}
                  onChange={e => setProjectsInput(e.target.value)} />
              </div>
              <div>
                <FieldLabel text="Common contacts" />
                <textarea value={profile.common_contacts} rows={2} style={INPUT_STYLE}
                  onChange={e => setProfile(p => ({ ...p, common_contacts: e.target.value }))} />
              </div>
            </div>

            <div style={CARD}>
              <SectionLabel icon={<Sparkles className="h-4 w-4" style={{ color: 'rgba(201,169,110,0.7)' }} />} text="Goals & Daily Routine" />
              <div style={{ marginBottom: 14 }}>
                <FieldLabel text="Personal goals" />
                <textarea value={profile.personal_goals} rows={2} style={INPUT_STYLE}
                  onChange={e => setProfile(p => ({ ...p, personal_goals: e.target.value }))} />
              </div>
              <div>
                <FieldLabel text="Daily routine" />
                <textarea value={profile.daily_routine} rows={2} style={INPUT_STYLE}
                  onChange={e => setProfile(p => ({ ...p, daily_routine: e.target.value }))} />
              </div>
            </div>

            {/* Save */}
            <button type="submit" disabled={saving} style={{
              width: '100%', padding: '14px 0', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              background: saved ? 'rgba(90,138,90,0.3)' : 'linear-gradient(135deg, #8B6FB8, #6A4F9B)',
              color: saved ? '#8AB88A' : 'white',
              boxShadow: saved ? 'none' : '0 6px 24px rgba(139,111,184,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.3s ease',
            }}>
              {saved
                ? <><Check className="h-4 w-4" /> Settings Saved</>
                : saving
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
                : <><Save className="h-4 w-4" /> Save Settings</>
              }
            </button>
          </form>

        </div>
      </AppLayout>
    </div>
  )
}
