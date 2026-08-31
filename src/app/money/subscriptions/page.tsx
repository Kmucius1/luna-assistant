'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/money/format'

const BG = 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)'
const GOLDEN = '#5C4530'
const GREEN = '#5A8A6A'
const RED = '#C96B5A'
const AMBER = '#C9923A'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(180,150,100,0.16)',
  borderRadius: 18, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}
const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5474',
}

interface Subscription {
  id: string; merchant_normalized: string; display_name: string
  expected_amount: number | null; billing_frequency: string | null
  last_charge_date: string | null; next_expected_date: string | null
  status: string; ownership_type: string; login_note: string | null
  monthly_savings: number | null; yearly_savings: number | null
}

const STATUS_COLOR: Record<string, string> = {
  cancel: RED, review: AMBER, keep: GREEN, business: '#6A8AE8', unknown: '#5E5474', canceled: '#5E5474', paused: '#5E5474',
}

function monthlyAmount(sub: Subscription): number {
  const amt = sub.expected_amount ?? 0
  if (sub.billing_frequency === 'annual') return amt / 12
  if (sub.billing_frequency === 'quarterly') return amt / 3
  if (sub.billing_frequency === 'weekly') return amt * 4
  if (sub.billing_frequency === 'biweekly') return amt * 2
  return amt
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'cancel' | 'review'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/money/subscriptions', { cache: 'no-store' })
      const data = await res.json()
      setSubs(data.subscriptions ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(id: string, status: string) {
    setSubs(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    await fetch('/api/money/subscriptions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
  }

  const active = subs.filter(s => !['canceled'].includes(s.status))
  const canceled = subs.filter(s => s.status === 'canceled')
  const filtered = filter === 'all' ? active : active.filter(s => s.status === filter)
  const monthlyTotal = active.reduce((s, sub) => s + monthlyAmount(sub), 0)
  const cancelCount = active.filter(s => s.status === 'cancel').length
  const reviewCount = active.filter(s => s.status === 'review').length
  const potentialSavings = active.filter(s => s.status === 'cancel').reduce((s, sub) => s + monthlyAmount(sub), 0)

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F5EFE3', marginBottom: 4 }}>Subscriptions</h1>
          <p style={{ fontSize: 13, color: 'rgba(245,239,227,0.72)', marginBottom: 18 }}>{active.length} active · {formatCurrency(monthlyTotal)}/mo</p>

          {potentialSavings > 0 && (
            <div style={{ ...CARD, padding: 16, border: `1px solid ${RED}55`, background: 'rgba(250,225,222,0.92)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle style={{ width: 18, height: 18, color: RED, flexShrink: 0 }} />
              <p style={{ fontSize: 12.5, color: '#100C1E' }}>{cancelCount} flagged to cancel — {formatCurrency(potentialSavings)}/mo ({formatCurrency(potentialSavings * 12)}/yr) potential savings</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['all', 'cancel', 'review'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '7px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: filter === f ? 'rgba(201,169,110,0.2)' : 'rgba(255,255,255,0.5)', color: filter === f ? GOLDEN : '#5E5474',
                  border: filter === f ? '1px solid rgba(201,169,110,0.3)' : '1px solid rgba(180,150,100,0.16)' }}>
                {f === 'all' ? 'All' : f === 'cancel' ? `Cancel (${cancelCount})` : `Review (${reviewCount})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><RefreshCw className="h-5 w-5 animate-spin mx-auto" style={{ color: 'rgba(245,239,227,0.72)' }} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ ...CARD, padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#5E5474' }}>Nothing here yet.</p>
            </div>
          ) : (
            filtered.map(sub => (
              <div key={sub.id} style={{ ...CARD, padding: 16, marginBottom: 10, borderLeft: `3px solid ${STATUS_COLOR[sub.status]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 14.5, fontWeight: 700, color: '#100C1E', margin: 0 }}>{sub.display_name}</p>
                    <p style={{ fontSize: 11, color: '#5E5474', margin: '2px 0 0', textTransform: 'capitalize' }}>
                      {sub.billing_frequency ?? 'unknown frequency'} · {sub.ownership_type}
                    </p>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: GOLDEN, margin: 0 }}>{sub.expected_amount ? formatCurrency(sub.expected_amount) : '—'}</p>
                </div>
                {sub.login_note && <p style={{ fontSize: 12, color: '#32284A', lineHeight: 1.5, marginBottom: 10 }}>{sub.login_note}</p>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['keep', 'review', 'cancel', 'business'] as const).map(s => (
                    <button key={s} onClick={() => setStatus(sub.id, s)}
                      style={{ padding: '6px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                        background: sub.status === s ? `${STATUS_COLOR[s]}30` : 'rgba(255,255,255,0.5)',
                        color: sub.status === s ? STATUS_COLOR[s] : '#5E5474',
                        border: `1px solid ${sub.status === s ? STATUS_COLOR[s] : 'rgba(180,150,100,0.16)'}55` }}>
                      {s === 'keep' ? 'Keep' : s === 'review' ? 'Review' : s === 'cancel' ? 'Cancel' : 'Business'}
                    </button>
                  ))}
                  {sub.status !== 'canceled' && (
                    <button onClick={() => setStatus(sub.id, 'canceled')}
                      style={{ padding: '6px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.5)', color: '#5E5474', border: '1px solid rgba(180,150,100,0.16)' }}>
                      Mark canceled
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {canceled.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p style={{ ...LABEL, marginBottom: 10, color: `${RED}80` }}>Canceled ({canceled.length})</p>
              {canceled.map(sub => (
                <div key={sub.id} style={{ ...CARD, padding: '12px 14px', marginBottom: 8, opacity: 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#32284A' }}>{sub.display_name}</p>
                    <p style={{ fontSize: 12, color: RED }}>{formatCurrency(monthlyAmount(sub))}/mo · canceled — watching for stray charges</p>
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
