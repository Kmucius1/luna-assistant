'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { drawCards } from '@/lib/tarot-deck'
import { DrawnCard } from '@/lib/tarot-deck'
import { saveTarotReading, getTarotHistory, getTarotStats, TarotHistoryEntry } from '@/lib/tarot-history'

const glass = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
} as const

const VIOLET = '#8B6FB8'
const LUNAR = '#A8C4DA'
const GOLDEN = '#C9A96E'
const BLUSH = '#E8C0C2'

interface Spread {
  key: string
  emoji: string
  name: string
  description: string
  positions: string[]
  count: number
}

const SPREADS: Spread[] = [
  {
    key: 'daily',
    emoji: '🌅',
    name: 'Daily Clarity',
    description: 'One message for right now',
    positions: ['Message for today'],
    count: 1,
  },
  {
    key: 'love',
    emoji: '💜',
    name: 'Love & Connection',
    description: 'Current energy / Open to / Release',
    positions: ['Current energy', 'Open to receive', 'What to release'],
    count: 3,
  },
  {
    key: 'work',
    emoji: '💼',
    name: 'Career & Purpose',
    description: 'Where you are / Best action / Outcome',
    positions: ['Where you are', 'Best action', 'Outcome'],
    count: 3,
  },
  {
    key: 'money',
    emoji: '💰',
    name: 'Money & Abundance',
    description: 'Current flow / Blocks / Invitation',
    positions: ['Current flow', 'The block', 'The invitation'],
    count: 3,
  },
  {
    key: 'shadow',
    emoji: '🌑',
    name: 'Shadow Work',
    description: "What's hidden / What's surfacing / What to integrate",
    positions: ["What's hidden", "What's surfacing", 'What to integrate'],
    count: 3,
  },
  {
    key: 'now',
    emoji: '✨',
    name: 'What do I need right now?',
    description: 'One truth for this exact moment',
    positions: ['Truth for now'],
    count: 1,
  },
  {
    key: 'next',
    emoji: '🌙',
    name: 'Next Chapter',
    description: "What's leaving / What's arriving / The gift in between",
    positions: ["What's leaving", "What's arriving", 'The gift between'],
    count: 3,
  },
  {
    key: 'full',
    emoji: '🔮',
    name: 'Full Reading',
    description: 'Complete picture of where you are',
    positions: ['Foundation', 'Present energy', 'Challenge', 'What to call in', 'Outcome'],
    count: 5,
  },
]

type View = 'spread-select' | 'drawing' | 'reading' | 'history'

interface CardReading {
  card: string
  position: string
  reversed: boolean
  personal_reading: string
  chart_connection: string
  key_message: string
}

interface TarotReading {
  overall_theme: string
  tagline: string
  card_readings: CardReading[]
  overall_message: string
  action: string
  affirmation: string
  time_note: string
}

export default function TarotPage() {
  const [view, setView] = useState<View>('spread-select')
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null)
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([])
  const [flipped, setFlipped] = useState<boolean[]>([])
  const [reading, setReading] = useState<TarotReading | null>(null)
  const [loadingReading, setLoadingReading] = useState(false)
  const [readingError, setReadingError] = useState(false)
  const [resonance, setResonance] = useState<1 | 2 | 3 | null>(null)
  const [saved, setSaved] = useState(false)
  const [history, setHistory] = useState<TarotHistoryEntry[]>([])
  const [stats, setStats] = useState({ total: 0, resonance_avg: 0, accuracy_pct: 0, by_spread: {} as Record<string, number> })
  const [currentReadingId] = useState(() => `tarot_${Date.now()}`)
  const [timeOfDay, setTimeOfDay] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    const m = new Date().getMinutes()
    const period = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    setTimeOfDay(`${displayH}:${m.toString().padStart(2, '0')} ${period}`)
    setHistory(getTarotHistory())
    setStats(getTarotStats())
  }, [])

  function chooseSpread(spread: Spread) {
    setSelectedSpread(spread)
    const cards = drawCards(spread.count).map((c, i) => ({ ...c, position: spread.positions[i] }))
    setDrawnCards(cards)
    setFlipped(new Array(spread.count).fill(false))
    setReading(null)
    setResonance(null)
    setSaved(false)
    setReadingError(false)
    setView('drawing')
  }

  function flipCard(i: number) {
    setFlipped(prev => {
      const next = [...prev]
      next[i] = true
      return next
    })
  }

  function allFlipped() {
    return flipped.length > 0 && flipped.every(Boolean)
  }

  async function getReading() {
    if (!selectedSpread) return
    setLoadingReading(true)
    setReadingError(false)
    setView('reading')
    try {
      const res = await fetch('/api/ai/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spread_key: selectedSpread.key,
          spread_name: selectedSpread.name,
          positions: selectedSpread.positions,
          cards: drawnCards.map(c => ({
            name: c.name,
            reversed: c.reversed,
            position: c.position ?? '',
            keywords: c.keywords,
          })),
          time_of_day: timeOfDay,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setReading(data)
    } catch {
      setReadingError(true)
    } finally {
      setLoadingReading(false)
    }
  }

  function rateResonance(r: 1 | 2 | 3) {
    if (!selectedSpread || !reading) return
    setResonance(r)
    const entry: TarotHistoryEntry = {
      id: currentReadingId,
      date: new Date().toISOString(),
      spread_key: selectedSpread.key,
      spread_name: selectedSpread.name,
      cards: drawnCards,
      reading_summary: reading.tagline ?? '',
      resonance: r,
    }
    saveTarotReading(entry)
    setSaved(true)
    setHistory(getTarotHistory())
    setStats(getTarotStats())
  }

  function resetToHome() {
    setView('spread-select')
    setSelectedSpread(null)
    setDrawnCards([])
    setFlipped([])
    setReading(null)
    setResonance(null)
    setSaved(false)
    setReadingError(false)
  }

  function resonanceEmoji(r: 1 | 2 | 3 | null) {
    if (r === 3) return '✨'
    if (r === 2) return '👍'
    if (r === 1) return '🤔'
    return '—'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0f0a1a 0%, #12101f 50%, #0a0f18 100%)' }}>
      <AppLayout noPad>
        <div style={{ padding: '64px 16px 180px' }}>

          {/* ── SPREAD SELECT ─────────────────────────────── */}
          {view === 'spread-select' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,111,184,0.14)', fontSize: 20 }}>
                  🔮
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: VIOLET, marginBottom: 1 }}>Tarot</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{timeOfDay}</p>
                </div>
              </div>

              <h1 style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginTop: 16, marginBottom: 6, fontFamily: 'Georgia, serif' }}>
                What do you need to see right now?
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Choose your reading.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {SPREADS.map(spread => (
                  <button
                    key={spread.key}
                    onClick={() => chooseSpread(spread)}
                    style={{
                      ...glass,
                      padding: 16,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      border: '1px solid rgba(255,255,255,0.09)',
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{spread.emoji}</span>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', lineHeight: 1.3 }}>{spread.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{spread.description}</p>
                    <p style={{ fontSize: 10, color: VIOLET, fontWeight: 600, marginTop: 2 }}>{spread.count === 1 ? '1 card' : `${spread.count} cards`}</p>
                  </button>
                ))}
              </div>

              {/* Stats bar */}
              {stats.total > 0 && (
                <div style={{ ...glass, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{stats.total}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>readings</p>
                  </div>
                  <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: VIOLET }}>{stats.resonance_avg.toFixed(1)}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>avg resonance</p>
                  </div>
                  <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: GOLDEN }}>{Math.round(stats.accuracy_pct)}%</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>resonant</p>
                  </div>
                </div>
              )}

              {history.length > 0 && (
                <button
                  onClick={() => setView('history')}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Past readings →
                </button>
              )}
            </div>
          )}

          {/* ── DRAWING ───────────────────────────────────── */}
          {view === 'drawing' && selectedSpread && (
            <div>
              <button onClick={resetToHome} style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20, cursor: 'pointer', background: 'none', border: 'none' }}>
                ← Back
              </button>

              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <p style={{ fontSize: 22, marginBottom: 6 }}>{selectedSpread.emoji}</p>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', fontFamily: 'Georgia, serif' }}>{selectedSpread.name}</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                  {allFlipped() ? 'Cards revealed — ready for your reading.' : 'Tap each card to reveal it.'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
                {drawnCards.map((card, i) => {
                  const isFlipped = flipped[i]
                  return (
                    <div
                      key={i}
                      onClick={() => !isFlipped && flipCard(i)}
                      style={{ cursor: isFlipped ? 'default' : 'pointer' }}
                    >
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                        {selectedSpread.positions[i]}
                      </p>
                      <div style={{
                        ...glass,
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        opacity: isFlipped ? 1 : 0.9,
                        transition: 'all 0.4s',
                        transform: isFlipped ? 'scale(1)' : 'scale(0.98)',
                      }}>
                        {isFlipped ? (
                          <>
                            <div style={{ fontSize: 32, flexShrink: 0 }}>{card.emoji}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{card.name}</p>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: '0.07em',
                                  textTransform: 'uppercase',
                                  padding: '2px 7px',
                                  borderRadius: 20,
                                  background: card.reversed ? 'rgba(232,192,194,0.12)' : 'rgba(139,111,184,0.14)',
                                  color: card.reversed ? BLUSH : VIOLET,
                                }}>
                                  {card.reversed ? 'Reversed' : 'Upright'}
                                </span>
                              </div>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                                {card.keywords.join(' · ')}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              background: 'rgba(139,111,184,0.08)',
                              border: '1px solid rgba(139,111,184,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              flexShrink: 0,
                            }}>
                              ✦
                            </div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>Tap to reveal</p>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>Card {i + 1} of {drawnCards.length}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {allFlipped() && (
                <button
                  onClick={getReading}
                  style={{
                    width: '100%',
                    padding: '15px 0',
                    borderRadius: 18,
                    background: `linear-gradient(135deg, ${VIOLET}, #6B4F9B)`,
                    color: 'white',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    letterSpacing: '0.02em',
                  }}
                >
                  Get my reading →
                </button>
              )}
            </div>
          )}

          {/* ── READING ───────────────────────────────────── */}
          {view === 'reading' && (
            <div>
              <button onClick={() => setView('drawing')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20, cursor: 'pointer', background: 'none', border: 'none' }}>
                ← Back to cards
              </button>

              {loadingReading && (
                <div style={{ textAlign: 'center', paddingTop: 60 }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    margin: '0 auto 20px',
                    background: 'radial-gradient(circle, rgba(139,111,184,0.3), transparent)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }} />
                  <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    Reading your cards...
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
                    Connecting to your chart and your energy
                  </p>
                </div>
              )}

              {readingError && !loadingReading && (
                <div style={{ textAlign: 'center', paddingTop: 40 }}>
                  <p style={{ fontSize: 32, marginBottom: 16 }}>🌙</p>
                  <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontFamily: 'Georgia, serif' }}>
                    The connection dropped.
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>
                    Your cards are still drawn. Try again.
                  </p>
                  <button
                    onClick={getReading}
                    style={{
                      padding: '12px 28px',
                      borderRadius: 14,
                      background: 'rgba(139,111,184,0.15)',
                      color: VIOLET,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: `1px solid rgba(139,111,184,0.25)`,
                    }}
                  >
                    Try again
                  </button>
                </div>
              )}

              {reading && !loadingReading && (
                <div>
                  {/* Hero card */}
                  <div style={{
                    ...glass,
                    padding: 24,
                    marginBottom: 20,
                    background: 'rgba(139,111,184,0.09)',
                    border: '1px solid rgba(139,111,184,0.18)',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: VIOLET, marginBottom: 10 }}>
                      {selectedSpread?.name}
                    </p>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.95)', fontFamily: 'Georgia, serif', marginBottom: 10, lineHeight: 1.3 }}>
                      {reading.overall_theme}
                    </h2>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontStyle: 'italic' }}>
                      {reading.tagline}
                    </p>
                  </div>

                  {/* Card readings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                    {reading.card_readings.map((cr, i) => {
                      const drawn = drawnCards.find(c => c.name === cr.card)
                      return (
                        <div key={i} style={{ ...glass, padding: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: 24 }}>{drawn?.emoji ?? '🔮'}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{cr.card}</p>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: '0.06em',
                                  textTransform: 'uppercase',
                                  padding: '2px 6px',
                                  borderRadius: 20,
                                  background: cr.reversed ? 'rgba(232,192,194,0.1)' : 'rgba(139,111,184,0.12)',
                                  color: cr.reversed ? BLUSH : VIOLET,
                                }}>
                                  {cr.reversed ? 'Reversed' : 'Upright'}
                                </span>
                              </div>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>{cr.position}</p>
                            </div>
                          </div>

                          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, marginBottom: 12 }}>
                            {cr.personal_reading}
                          </p>

                          <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(168,196,218,0.07)', marginBottom: 10 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: LUNAR, marginBottom: 4 }}>Chart connection</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55 }}>{cr.chart_connection}</p>
                          </div>

                          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5, fontStyle: 'italic' }}>
                            &ldquo;{cr.key_message}&rdquo;
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Overall message */}
                  <div style={{ ...glass, padding: 22, marginBottom: 14, background: 'rgba(201,169,110,0.05)', border: '1px solid rgba(201,169,110,0.12)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLDEN, marginBottom: 10 }}>Overall message</p>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{reading.overall_message}</p>
                  </div>

                  {/* Action */}
                  <div style={{ ...glass, padding: 18, marginBottom: 14 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A8A5A', marginBottom: 8 }}>The call to action</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)', lineHeight: 1.55 }}>{reading.action}</p>
                  </div>

                  {/* Affirmation */}
                  <div style={{ borderRadius: 20, padding: '20px 22px', marginBottom: 14, textAlign: 'center', background: 'rgba(139,111,184,0.06)', border: '1px solid rgba(139,111,184,0.1)' }}>
                    <p style={{ fontSize: 16, fontStyle: 'italic', color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>
                      &ldquo;{reading.affirmation}&rdquo;
                    </p>
                  </div>

                  {/* Time note */}
                  {reading.time_note && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.6, marginBottom: 28, fontStyle: 'italic' }}>
                      {reading.time_note}
                    </p>
                  )}

                  {/* Resonance */}
                  <div style={{ ...glass, padding: 22, textAlign: 'center' }}>
                    {!resonance ? (
                      <>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>Does this resonate?</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                          {([
                            { label: '✨ Deeply', value: 3 as const },
                            { label: '👍 Partially', value: 2 as const },
                            { label: '🤔 Not really', value: 1 as const },
                          ] as const).map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => rateResonance(opt.value)}
                              style={{
                                padding: '9px 14px',
                                borderRadius: 12,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 14, color: VIOLET, fontWeight: 600, marginBottom: 16 }}>
                          {saved ? 'Saved ✓' : 'Saving...'}
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                          <button
                            onClick={resetToHome}
                            style={{
                              padding: '11px 20px',
                              borderRadius: 13,
                              background: `linear-gradient(135deg, ${VIOLET}, #6B4F9B)`,
                              color: 'white',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: 'none',
                            }}
                          >
                            New reading
                          </button>
                          <button
                            onClick={() => setView('history')}
                            style={{
                              padding: '11px 20px',
                              borderRadius: 13,
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.5)',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Past readings
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY ───────────────────────────────────── */}
          {view === 'history' && (
            <div>
              <button onClick={resetToHome} style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20, cursor: 'pointer', background: 'none', border: 'none' }}>
                ← Back
              </button>

              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: 'Georgia, serif', marginBottom: 16 }}>Past Readings</h2>

              {stats.total > 0 && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                  <span style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(139,111,184,0.14)', color: VIOLET, fontSize: 12, fontWeight: 700 }}>
                    {stats.total} readings
                  </span>
                  <span style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(201,169,110,0.12)', color: GOLDEN, fontSize: 12, fontWeight: 700 }}>
                    {Math.round(stats.accuracy_pct)}% resonant
                  </span>
                  <span style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(168,196,218,0.1)', color: LUNAR, fontSize: 12, fontWeight: 700 }}>
                    {stats.resonance_avg.toFixed(1)} avg
                  </span>
                </div>
              )}

              {history.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 48 }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>🔮</p>
                  <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    No readings yet. Your first one is waiting.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {history.map(entry => (
                    <div key={entry.id} style={{ ...glass, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 2 }}>{entry.spread_name}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <span style={{ fontSize: 18 }}>{resonanceEmoji(entry.resonance)}</span>
                      </div>
                      {entry.reading_summary && (
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, marginBottom: 10, fontStyle: 'italic' }}>
                          &ldquo;{entry.reading_summary}&rdquo;
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {entry.cards.slice(0, 4).map((c, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
                            {c.emoji} {c.name}{c.reversed ? ' ↓' : ''}
                          </span>
                        ))}
                        {entry.cards.length > 4 && (
                          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>
                            +{entry.cards.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </AppLayout>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </div>
  )
}
