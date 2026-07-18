'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, Copy as DuplicateIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/money/format'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)'
const RED = '#C96B5A'
const AMBER = '#C9923A'
const GOLDEN = '#C9A96E'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
}

const SEVERITY_COLOR: Record<string, string> = { high: RED, medium: AMBER, low: 'rgba(255,255,255,0.4)' }

interface TxnRef { id: string; merchant_normalized: string | null; amount: number; posted_date: string | null; transaction_date: string | null }
interface DuplicateAlert {
  id: string; severity: string; reason: string; status: string
  transaction_a: TxnRef; transaction_b: TxnRef
}

export default function DuplicatesPage() {
  const [alerts, setAlerts] = useState<DuplicateAlert[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/money/duplicates', { cache: 'no-store' })
      const data = await res.json()
      setAlerts(data.alerts ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function resolve(id: string, status: string) {
    setAlerts(prev => prev.filter(a => a.id !== id))
    await fetch('/api/money/duplicates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
  }

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 4 }}>Duplicate Charges</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 18 }}>{alerts.length} open alert{alerts.length !== 1 ? 's' : ''}</p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><RefreshCw className="h-5 w-5 animate-spin mx-auto" style={{ color: 'rgba(255,255,255,0.4)' }} /></div>
          ) : alerts.length === 0 ? (
            <div style={{ ...CARD, padding: 32, textAlign: 'center' }}>
              <DuplicateIcon style={{ width: 26, height: 26, color: 'rgba(255,255,255,0.3)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Nothing flagged right now.</p>
            </div>
          ) : (
            alerts.map(a => {
              const total = a.transaction_a.amount + a.transaction_b.amount
              const color = SEVERITY_COLOR[a.severity] ?? 'rgba(255,255,255,0.4)'
              return (
                <div key={a.id} style={{ ...CARD, padding: 16, marginBottom: 12, borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color, padding: '2px 8px', borderRadius: 20, background: `${color}22`, border: `1px solid ${color}55` }}>{a.severity}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'white', lineHeight: 1.5, marginBottom: 10 }}>{a.reason}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {[a.transaction_a, a.transaction_b].map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t.posted_date ?? t.transaction_date}</span>
                        <span style={{ color: 'white', fontWeight: 700 }}>{formatCurrency(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Total: {formatCurrency(total)}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[['expected', 'Mark expected'], ['duplicate', 'Confirm duplicate'], ['dispute_later', 'Dispute later'], ['ignored', 'Ignore']].map(([status, label]) => (
                      <button key={status} onClick={() => resolve(a.id, status)}
                        style={{ padding: '6px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: GOLDEN, border: '1px solid rgba(201,169,110,0.25)' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </AppLayout>
    </div>
  )
}
