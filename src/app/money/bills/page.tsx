'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, Check, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/money/format'

const BG = 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)'
const GOLDEN = '#C9A96E'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(180,150,100,0.16)',
  borderRadius: 18, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5474',
}

interface Bill {
  id: string; name: string; merchant_normalized: string | null
  expected_amount: number | null; minimum_amount: number | null
  due_date: string | null; date_is_confirmed: boolean
  autopay_status: string; amount_type: string; status: string
  ownership_type: string; notes: string | null; days_until: number | null
}

interface BillStyle { bg: string; border: string; badge: string; badgeColor: string }

function getBillStyle(bill: Bill): BillStyle {
  if (bill.status === 'paid') return { bg: 'rgba(90,138,106,0.15)', border: '#5A8A6A', badge: 'Paid', badgeColor: '#5A8A6A' }
  if (bill.status === 'late' || bill.status === 'failed') return { bg: 'rgba(255,0,0,0.13)', border: '#FF0000', badge: bill.status.toUpperCase(), badgeColor: '#FF4444' }
  if (bill.autopay_status === 'on') return { bg: 'rgba(65,105,225,0.15)', border: '#6A8AE8', badge: 'Autopay', badgeColor: '#6A8AE8' }
  const days = bill.days_until
  if (days == null) return { bg: 'rgba(180,150,100,0.08)', border: 'rgba(180,150,100,0.16)', badge: 'Upcoming', badgeColor: '#5E5474' }
  if (days < 0) return { bg: 'rgba(255,0,0,0.13)', border: '#FF0000', badge: 'OVERDUE', badgeColor: '#FF4444' }
  if (days === 0) return { bg: 'rgba(201,107,90,0.13)', border: '#C96B5A', badge: 'DUE TODAY', badgeColor: '#C96B5A' }
  if (days <= 2) return { bg: 'rgba(224,94,34,0.13)', border: '#E05E22', badge: `Due in ${days}d`, badgeColor: '#E05E22' }
  if (days <= 6) return { bg: 'rgba(201,146,58,0.13)', border: '#C9923A', badge: `Due in ${days}d`, badgeColor: '#C9923A' }
  if (days <= 13) return { bg: 'rgba(201,169,110,0.13)', border: '#C9A96E', badge: `Due in ${days}d`, badgeColor: '#C9A96E' }
  return { bg: 'rgba(180,150,100,0.08)', border: 'rgba(180,150,100,0.16)', badge: `${days} days`, badgeColor: '#5E5474' }
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/money/bills', { cache: 'no-store' })
      const data = await res.json()
      setBills(data.bills ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markPaid(id: string) {
    setBills(prev => prev.map(b => b.id === id ? { ...b, status: 'paid' } : b))
    await fetch('/api/money/bills', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'paid', last_paid_date: new Date().toISOString().split('T')[0] }) })
  }

  const totalMonthly = bills.reduce((s, b) => s + (b.expected_amount ?? b.minimum_amount ?? 0), 0)
  const paidBills = bills.filter(b => b.status === 'paid')
  const remaining = totalMonthly - paidBills.reduce((s, b) => s + (b.expected_amount ?? 0), 0)
  const nextDue = bills.filter(b => b.status !== 'paid' && b.due_date).sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1))[0]

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#100C1E', marginBottom: 4 }}>Bills</h1>
            <p style={{ fontSize: 13, color: '#32284A' }}>Know what&apos;s coming before it arrives</p>
          </div>

          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
            <div style={{ ...CARD, minWidth: 140, padding: 14, flexShrink: 0 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 5 }}>Total / Mo</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: GOLDEN }}>{formatCurrency(totalMonthly)}</p>
            </div>
            <div style={{ ...CARD, minWidth: 120, padding: 14, flexShrink: 0 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 5 }}>Paid</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#5A8A6A' }}>{paidBills.length}</p>
            </div>
            <div style={{ ...CARD, minWidth: 130, padding: 14, flexShrink: 0 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 5 }}>Remaining</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#C9923A' }}>{formatCurrency(remaining)}</p>
            </div>
            <div style={{ ...CARD, minWidth: 140, padding: 14, flexShrink: 0 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 5 }}>Next Due</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E' }}>{nextDue?.due_date ?? '—'}</p>
              <p style={{ fontSize: 11, color: '#5E5474' }}>{nextDue?.name ?? ''}</p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw style={{ width: 20, height: 20, color: '#5E5474' }} className="animate-spin mx-auto" />
            </div>
          ) : bills.length === 0 ? (
            <div style={{ ...CARD, padding: 32, textAlign: 'center' }}>
              <AlertTriangle style={{ width: 28, height: 28, color: '#5E5474', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, color: '#32284A', marginBottom: 6 }}>No bills found.</p>
              <p style={{ fontSize: 12, color: '#5E5474', lineHeight: 1.6 }}>
                Import statements to auto-detect bills from your real charges.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ ...LABEL_STYLE, marginBottom: 12 }}>All Bills</p>
              {bills.map(bill => {
                const style = getBillStyle(bill)
                return (
                  <div key={bill.id} style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#100C1E' }}>{bill.name}</p>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${style.badgeColor}22`, color: style.badgeColor, border: `1px solid ${style.badgeColor}55` }}>{style.badge}</span>
                          {!bill.date_is_confirmed && <span style={{ fontSize: 10, color: '#5E5474' }}>estimated date</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {bill.due_date && <span style={{ fontSize: 11, color: '#32284A' }}>Due {bill.due_date}</span>}
                          <span style={{ fontSize: 11, color: '#5E5474', textTransform: 'capitalize' }}>{bill.amount_type} · {bill.ownership_type}</span>
                          {bill.autopay_status === 'on' && <span style={{ fontSize: 11, color: '#6A8AE8', display: 'flex', alignItems: 'center', gap: 3 }}><Check style={{ width: 10, height: 10 }} /> Autopay</span>}
                        </div>
                      </div>
                      <p style={{ fontSize: 18, fontWeight: 700, color: style.badgeColor, flexShrink: 0, marginLeft: 12 }}>
                        {bill.expected_amount ? formatCurrency(bill.expected_amount) : bill.minimum_amount ? `min ${formatCurrency(bill.minimum_amount)}` : '—'}
                      </p>
                    </div>
                    <button onClick={() => markPaid(bill.id)} disabled={bill.status === 'paid'}
                      style={{ width: '100%', height: 36, borderRadius: 10, border: '1px solid #5A8A6A', background: bill.status === 'paid' ? 'rgba(90,138,106,0.25)' : 'rgba(90,138,106,0.12)', color: '#5A8A6A', fontSize: 12, fontWeight: 600, cursor: bill.status === 'paid' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Check style={{ width: 12, height: 12 }} /> {bill.status === 'paid' ? 'Paid' : 'Mark Paid'}
                    </button>
                    {bill.notes && <p style={{ fontSize: 11, color: '#5E5474', lineHeight: 1.5, marginTop: 8 }}>{bill.notes}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  )
}
