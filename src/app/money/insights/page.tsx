'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sparkles, RefreshCw } from 'lucide-react'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  padding: 18,
  marginBottom: 12,
}
const GOLDEN = '#C9A96E'

interface MoneyInsights {
  daily_move: string
  pattern_noticed: string
  highest_self_action: string
  affirmation: string
  alert_if_any: string | null
  spending_theme: string
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<MoneyInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateInsights = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/money/insights', { method: 'POST' })
      const data = await res.json()
      setInsights(data)
    } catch {
      setError('Failed to generate insights. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>

          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', fontFamily: 'var(--font-display, sans-serif)', marginBottom: 4 }}>Money Insights</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              Saturn Taurus energy — slow wealth, grounded choices, real patterns.
            </p>
          </div>

          {/* Saturn reminder */}
          <div style={{ ...CARD, background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.2)', padding: 22 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLDEN, marginBottom: 10 }}>Saturn in Taurus</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>
              Zoe is learning money discipline, self-worth, and slow wealth. Saturn&apos;s lesson: consistent, grounded action builds lasting wealth. Not fast. Not frantic. Steady.
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: GOLDEN, marginTop: 12, fontStyle: 'italic' }}>
              &ldquo;Wealth is built through calm choices, not panic moves.&rdquo;
            </p>
          </div>

          {/* Generate button */}
          {!insights && !loading && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <button onClick={generateInsights}
                style={{
                  padding: '14px 32px', borderRadius: 16, cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(201,169,110,0.3), rgba(201,169,110,0.15))',
                  border: '1px solid rgba(201,169,110,0.4)',
                  color: GOLDEN, fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto',
                  boxShadow: '0 4px 20px rgba(201,169,110,0.15)',
                }}>
                <Sparkles className="h-5 w-5" />
                Generate My Money Insights
              </button>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 12 }}>
                LUNA reads your spending and returns grounded, shame-free guidance.
              </p>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" style={{ color: GOLDEN }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Reading your patterns…</p>
            </div>
          )}

          {error && (
            <div style={{ ...CARD, background: 'rgba(224,94,94,0.08)', border: '1px solid rgba(224,94,94,0.2)' }}>
              <p style={{ fontSize: 13, color: '#E05E5E' }}>{error}</p>
            </div>
          )}

          {insights && (
            <div>
              {/* Theme */}
              {insights.spending_theme && (
                <div style={{ ...CARD, textAlign: 'center', padding: 24, background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.2)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLDEN, marginBottom: 10 }}>This Month&apos;s Energy</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: 'white', fontFamily: 'var(--font-display, sans-serif)' }}>{insights.spending_theme}</p>
                </div>
              )}

              {/* Pattern */}
              {insights.pattern_noticed && (
                <div style={CARD}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Pattern Noticed</p>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{insights.pattern_noticed}</p>
                </div>
              )}

              {/* Daily move */}
              {insights.daily_move && (
                <div style={{ ...CARD, background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.25)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLDEN, marginBottom: 10 }}>One Money Move Today</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'white', lineHeight: 1.6 }}>{insights.daily_move}</p>
                </div>
              )}

              {/* Highest self */}
              {insights.highest_self_action && (
                <div style={CARD}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(139,111,184,0.7)', marginBottom: 10 }}>Your Highest Self Would…</p>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, fontStyle: 'italic' }}>{insights.highest_self_action}</p>
                </div>
              )}

              {/* Affirmation */}
              {insights.affirmation && (
                <div style={{ ...CARD, textAlign: 'center', padding: 24, background: 'rgba(139,111,184,0.06)', border: '1px solid rgba(139,111,184,0.2)' }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(196,169,232,0.9)', lineHeight: 1.6 }}>&ldquo;{insights.affirmation}&rdquo;</p>
                </div>
              )}

              {/* Alert */}
              {insights.alert_if_any && (
                <div style={{ ...CARD, background: 'rgba(224,94,94,0.06)', border: '1px solid rgba(224,94,94,0.2)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E05E5E', marginBottom: 8 }}>Heads Up</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{insights.alert_if_any}</p>
                </div>
              )}

              {/* Regenerate */}
              <button onClick={generateInsights} disabled={loading}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(201,169,110,0.25)', color: GOLDEN, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                <RefreshCw className="h-4 w-4" />
                Regenerate Insights
              </button>
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  )
}
