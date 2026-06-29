'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useLocation } from '@/hooks/useLocation'
import { RefreshCw, Heart, Star, Sparkles, Eye, Shield, Flame, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { LoveGuidance } from '@/app/api/astrology/love-guidance/route'

// ─── Design ──────────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 22,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
}

const LOVE_CARD: React.CSSProperties = {
  ...GLASS,
  background: 'rgba(180,100,140,0.08)',
  border: '1px solid rgba(200,120,160,0.18)',
}

function Label({ text, color = 'rgba(255,255,255,0.38)' }: { text: string; color?: string }) {
  return <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color, marginBottom: 8 }}>{text}</p>
}

function LoveBadge({ text }: { text: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(200,120,160,0.18)', border: '1px solid rgba(200,120,160,0.3)', color: 'rgb(230,160,190)' }}>
      {text}
    </span>
  )
}

function IntensityBar({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ width: 14, height: 4, borderRadius: 2, background: i < value ? 'rgba(230,160,190,0.8)' : 'rgba(255,255,255,0.1)' }} />
      ))}
    </div>
  )
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────
function Shimmer({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 22, background: 'rgba(255,255,255,0.05)', marginBottom: 14 }} className="shimmer" />
}

// ─── Compatibility chart ──────────────────────────────────────────────────────
const COMPATIBILITY = [
  { signs: 'Aries · Leo · Sagittarius', match: 'High', emoji: '🔥', why: 'Fire energy matches your Sag Venus — bold, honest, adventurous love. They keep up with your spirit.' },
  { signs: 'Gemini · Aquarius',         match: 'High', emoji: '💨', why: 'Air feeds your Gemini Rising — mental stimulation, wit, and a sense of freedom. Your mind ignites first.' },
  { signs: 'Libra · Taurus',            match: 'Good', emoji: '✨', why: 'Venus-ruled partners speak your Mars in Libra language — beauty, fairness, and relational harmony.' },
  { signs: 'Scorpio · Cancer · Pisces', match: 'Deep', emoji: '🌊', why: 'Water signs reach your Scorpio Sun depth. These bonds go soul-level. Intense but transformative.' },
  { signs: 'Virgo · Capricorn',         match: 'Grow', emoji: '📚', why: 'Earth grounds your fire but can feel restrictive. Growth potential — if they give you room to breathe.' },
]

// ─── What you need ────────────────────────────────────────────────────────────
const LOVE_NEEDS = [
  { icon: '🦋', title: 'Freedom to grow',    text: 'Your Sag Venus 29° cannot be caged. Love must expand you, not contain you.' },
  { icon: '🧠', title: 'Mental connection',   text: 'Gemini Rising means you fall in love through conversation and ideas first.' },
  { icon: '🌊', title: 'Emotional honesty',   text: 'Cancer Moon needs to feel safe. You open only when you trust completely.' },
  { icon: '🔥', title: 'Real depth',          text: 'Scorpio Sun requires authenticity. Shallow connections drain you quickly.' },
  { icon: '⚖️', title: 'Fairness + beauty',   text: 'Mars in Libra is attracted to partners who treat love as a true partnership.' },
  { icon: '✉️', title: 'Genuine invitation',  text: 'As a Projector, the right love comes to you — it does not need to be chased.' },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LovePage() {
  const location = useLocation()
  const [data,    setData]    = useState<LoveGuidance | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'today' | 'compatibility' | 'navigate'>('today')
  const [refresh, setRefresh] = useState(false)

  const load = useCallback(async (forceRefresh = false) => {
    if (!location.localTime && !forceRefresh) return
    setLoading(true)
    try {
      const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone
      const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      const url  = `/api/astrology/love-guidance?tz=${encodeURIComponent(tz)}&date=${encodeURIComponent(date)}${forceRefresh ? '&refresh=1' : ''}`
      const res  = await fetch(url)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch { /* keep previous data or null */ }
    setLoading(false)
    setRefresh(false)
  }, [location.localTime])

  useEffect(() => { if (location.localTime) load() }, [location.localTime, load])

  const handleRefresh = () => { setRefresh(true); load(true) }

  return (
    <div className="bg-app min-h-screen">
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          {/* ── Hero ───────────────────────────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(160deg, rgba(160,60,110,0.35) 0%, rgba(80,20,60,0.3) 50%, rgba(20,10,30,0) 100%)',
            padding: '28px 20px 24px',
            position: 'relative',
          }}>
            <Link href="/astrology" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.45)', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Astrology
            </Link>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Heart className="h-5 w-5" style={{ color: 'rgb(220,130,170)' }} fill="rgb(220,130,170)" />
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'white' }}>Love Energy</h1>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', maxWidth: 280, lineHeight: 1.5 }}>
                  Your love life, read through the stars — transits, compatibility, and how to navigate it all.
                </p>
                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                  <LoveBadge text="Venus: Sagittarius 29°" />
                  <LoveBadge text="Mars: Libra 6°" />
                  <LoveBadge text="7th House: Sagittarius" />
                </div>
              </div>
              <button onClick={handleRefresh} disabled={refresh || loading} style={{ width: 34, height: 34, borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <RefreshCw className={`h-4 w-4 ${(refresh || loading) ? 'animate-spin' : ''}`} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
              {([['today','Today\'s Reading'],['compatibility','Compatibility'],['navigate','Navigate']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: tab === id ? 'rgba(200,120,160,0.3)' : 'rgba(255,255,255,0.06)',
                  color: tab === id ? 'rgb(240,180,210)' : 'rgba(255,255,255,0.45)',
                  boxShadow: tab === id ? '0 0 16px rgba(200,120,160,0.2)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px 16px 0' }}>

            {/* ── TODAY'S READING TAB ──────────────────────────────────────── */}
            {tab === 'today' && (
              <>
                {loading ? (
                  <><Shimmer h={160} /><Shimmer h={120} /><Shimmer h={100} /><Shimmer h={140} /></>
                ) : data ? (
                  <>
                    {/* Daily message */}
                    <div style={{ ...LOVE_CARD, padding: 20, marginBottom: 14 }}>
                      <Label text="Today's Love Message" color="rgb(220,130,170)" />
                      <p style={{ fontSize: 14, color: 'white', lineHeight: 1.65 }}>{data.daily_message}</p>
                    </div>

                    {/* Love energy + Venus */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <div style={{ ...GLASS, padding: 16 }}>
                        <Label text="Your Energy" color="rgb(200,160,220)" />
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{data.love_energy}</p>
                      </div>
                      <div style={{ ...GLASS, padding: 16 }}>
                        <Label text="Venus Influence" color="rgb(200,160,220)" />
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{data.venus_influence}</p>
                      </div>
                    </div>

                    {/* How you attract */}
                    <div style={{ ...GLASS, padding: 18, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <Star className="h-4 w-4" style={{ color: '#C9A96E' }} fill="#C9A96E" />
                        <Label text="What You're Attracting" color="#C9A96E" />
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65 }}>{data.attract_energy}</p>
                    </div>

                    {/* Compatibility now */}
                    <div style={{ ...LOVE_CARD, padding: 18, marginBottom: 14 }}>
                      <Label text="Magnetically Aligned With Right Now" color="rgb(220,130,170)" />
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65 }}>{data.compatibility_now}</p>
                    </div>

                    {/* Watch out */}
                    <div style={{ ...GLASS, padding: 16, background: 'rgba(180,80,60,0.08)', border: '1px solid rgba(180,80,60,0.2)', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        <Shield className="h-4 w-4" style={{ color: '#C96B5A' }} />
                        <Label text="Watch Out For" color="#C96B5A" />
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{data.watch_out}</p>
                    </div>

                    {/* Navigate now */}
                    <div style={{ ...GLASS, padding: 18, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                        <Eye className="h-4 w-4" style={{ color: '#8B6FB8' }} />
                        <Label text="Navigate Love Right Now" color="#8B6FB8" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(data.navigate_now ?? []).map((tip, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(139,111,184,0.2)', border: '1px solid rgba(139,111,184,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#8B6FB8', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Love ritual */}
                    <div style={{ ...LOVE_CARD, padding: 18, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <Flame className="h-4 w-4" style={{ color: 'rgb(220,130,170)' }} />
                        <Label text="Love Ritual for Today" color="rgb(220,130,170)" />
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65 }}>{data.love_ritual}</p>
                    </div>

                    {/* Affirmation */}
                    <div style={{ padding: 20, borderRadius: 22, background: 'linear-gradient(135deg, rgba(160,60,110,0.3), rgba(80,40,100,0.3))', border: '1px solid rgba(200,120,160,0.25)', textAlign: 'center', marginBottom: 14 }}>
                      <Sparkles className="h-5 w-5" style={{ color: 'rgb(230,160,190)', margin: '0 auto 10px' }} />
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'white', lineHeight: 1.55, fontStyle: 'italic' }}>"{data.affirmation}"</p>
                    </div>
                  </>
                ) : (
                  <div style={{ ...GLASS, padding: 24, textAlign: 'center', marginBottom: 14 }}>
                    <Heart className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Unable to load love guidance — tap ↻ to try again.</p>
                  </div>
                )}
              </>
            )}

            {/* ── COMPATIBILITY TAB ─────────────────────────────────────────── */}
            {tab === 'compatibility' && (
              <>
                {/* Venus + Mars synopsis */}
                <div style={{ ...LOVE_CARD, padding: 20, marginBottom: 14 }}>
                  <Label text="Your Love Blueprint" color="rgb(220,130,170)" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.05)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(220,130,170,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>♀ Venus · How You Love</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 4 }}>Sagittarius 29°</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>Freedom-seeking, all-or-nothing, adventurous. You love with your full spirit. Cannot stay where love feels like a cage.</p>
                    </div>
                    <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.05)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,160,220,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>♂ Mars · How You Pursue</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 4 }}>Libra 6°</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>Through harmony, beauty, fairness. You move toward love gracefully — not through force or aggression.</p>
                    </div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                      <span style={{ color: 'rgb(220,130,170)', fontWeight: 600 }}>As a Projector:</span> You are not designed to chase. The right love WILL pursue you when you are energetically open and living your purpose. Wait for the invitation — it will feel different from settling.
                    </p>
                  </div>
                </div>

                {/* Compatibility grid */}
                <div style={{ marginBottom: 14 }}>
                  <Label text="Sign Compatibility" color="rgba(255,255,255,0.38)" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {COMPATIBILITY.map((c) => (
                      <div key={c.signs} style={{ ...GLASS, padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{c.emoji}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{c.signs}</p>
                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: c.match === 'High' ? 'rgba(90,138,90,0.25)' : c.match === 'Deep' ? 'rgba(100,80,160,0.25)' : c.match === 'Good' ? 'rgba(90,138,164,0.25)' : 'rgba(180,120,60,0.25)', color: c.match === 'High' ? '#8AB88A' : c.match === 'Deep' ? '#B088E8' : c.match === 'Good' ? '#7BAEC8' : '#C9A96E', border: `1px solid ${c.match === 'High' ? 'rgba(90,138,90,0.4)' : c.match === 'Deep' ? 'rgba(100,80,160,0.4)' : c.match === 'Good' ? 'rgba(90,138,164,0.4)' : 'rgba(180,120,60,0.4)'}` }}>{c.match}</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>{c.why}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What you need */}
                <div style={{ ...LOVE_CARD, padding: 18, marginBottom: 14 }}>
                  <Label text="What You Need in Love" color="rgb(220,130,170)" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {LOVE_NEEDS.map((n) => (
                      <div key={n.title} style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 18, marginBottom: 6 }}>{n.icon}</div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── NAVIGATE TAB ──────────────────────────────────────────────── */}
            {tab === 'navigate' && (
              <>
                {/* 7th house */}
                <div style={{ ...LOVE_CARD, padding: 20, marginBottom: 14 }}>
                  <Label text="Your Partnership House" color="rgb(220,130,170)" />
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>7th House: Sagittarius</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, marginBottom: 14 }}>
                    Your partnership house is Sagittarius — you are meant for connections that feel like adventures, not obligations. Your ideal partner expands your world, shares your love of truth and freedom, and never makes you feel small. You need someone who can grow alongside you, not someone who holds you still.
                  </p>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '14px 0' }} />
                  <p style={{ fontSize: 12, color: 'rgba(220,130,170,0.8)', lineHeight: 1.55 }}>
                    ✦ Relationships that feel restrictive, controlling, or energetically heavy are NOT your alignment — no matter how much you try. Your chart shows freedom is not optional in love, it is a requirement.
                  </p>
                </div>

                {/* Projector in love */}
                <div style={{ ...GLASS, padding: 18, marginBottom: 14 }}>
                  <Label text="Your HD Love Strategy" color="#8B6FB8" />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>Self-Projected Projector · 4/6 Profile</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { icon: '📣', title: 'Speak to know', body: 'You know how you feel about someone by talking it through — journal out loud, voice-note yourself, tell a trusted friend. Clarity about love comes from expression, not thinking.' },
                      { icon: '⏳', title: 'Wait for the invitation', body: 'You are not designed to pursue. When the right person arrives, they come TO you — a clear invitation, genuine interest. Chasing is the not-self behavior that leads to burnout and wrong partnerships.' },
                      { icon: '👥', title: 'Your network is your love source', body: 'Your 4th line means love will most likely come through someone already in your orbit — a friend-of-a-friend, a familiar face, someone who already knows you. Cold-approach dating is not your path.' },
                      { icon: '🌟', title: 'Live your purpose, draw your person', body: 'The most magnetic thing you can do is live fully in your design — doing what energizes you, resting when you need to, being authentic. The right love arrives when you are most yourself.' },
                    ].map(item => (
                      <div key={item.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#8B6FB8', marginBottom: 4 }}>{item.title}</p>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>{item.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* North Node */}
                <div style={{ ...LOVE_CARD, padding: 18, marginBottom: 14 }}>
                  <Label text="North Node in Cancer · Love Evolution" color="rgb(220,130,170)" />
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65 }}>
                    Your soul is growing toward Cancer — toward receiving love, nurturing, emotional depth, and building a true emotional home. Your South Node is Capricorn (past pattern: achieving, proving, being self-sufficient). The growth edge in love is letting yourself be held, cared for, and truly known. You do not have to earn love. You are worthy of it simply by being you.
                  </p>
                </div>

                {/* Chiron */}
                <div style={{ ...GLASS, padding: 18, marginBottom: 14, background: 'rgba(80,40,120,0.1)', border: '1px solid rgba(100,60,160,0.2)' }}>
                  <Label text="Chiron in Sagittarius · The Love Wound" color="#9B7FC8" />
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65 }}>
                    Your Chiron in Sagittarius (15°) carries a wound around: freedom, belief, and the fear that loving deeply means losing yourself. You may have learned that love comes with strings attached, that staying free means staying alone, or that you have to teach and give before you can receive. The healing: you CAN have both — love and freedom. The right partner expands you, not shrinks you.
                  </p>
                </div>

                {/* Signs right now */}
                <div style={{ ...GLASS, padding: 18, marginBottom: 14 }}>
                  <Label text="Signs You're Ready for Real Love" color="#C9A96E" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'When being with them feels like home AND adventure — both at once',
                      'When you can speak your truth without bracing for impact',
                      'When they pursue you clearly — and you feel genuinely wanted, not just convenient',
                      'When the connection makes you more yourself, not less',
                      'When you feel safe enough to let your Cancer Moon show',
                    ].map((sign, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Heart className="h-3.5 w-3.5" style={{ color: 'rgb(220,130,170)', marginTop: 3, flexShrink: 0 }} fill="rgb(220,130,170)" />
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>{sign}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Red flags for Zoe */}
                <div style={{ ...GLASS, padding: 18, background: 'rgba(180,60,60,0.07)', border: '1px solid rgba(180,60,60,0.18)', marginBottom: 14 }}>
                  <Label text="Red Flags (Based on Your Chart)" color="#C96B5A" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'Anyone who makes you feel like you\'re "too much" — you\'re not, they\'re too little',
                      'Love that requires you to be smaller, quieter, or less free',
                      'Connections that drain instead of energize — your body will tell you',
                      'Someone who cannot handle your Scorpio emotional depth and intensity',
                      'People who arrive with confusion or mixed signals — your 4/6 deserves clarity',
                    ].map((flag, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ color: '#C96B5A', marginTop: 2, flexShrink: 0 }}>✗</span>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>{flag}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </AppLayout>
    </div>
  )
}
