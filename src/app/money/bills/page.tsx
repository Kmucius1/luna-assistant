'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, Check, AlertTriangle, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/money'
import { createClient } from '@/lib/supabase/client'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)'
const GOLDEN = '#C9A96E'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
}
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.42)',
}

interface Bill {
  id: string
  name: string | null
  merchant_name: string | null
  amount_estimate: number | null
  due_day: number | null
  due_date: string | null
  frequency: string | null
  category: string | null
  autopay: boolean | null
  status: string
  notes: string | null
}

interface BillStyle {
  bg: string
  border: string
  badge: string
  badgeColor: string
}

function getBillStyle(bill: Bill): BillStyle {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!bill.due_date) return { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.11)', badge: 'Upcoming', badgeColor: 'rgba(255,255,255,0.4)' }
  const due = new Date(bill.due_date)
  const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (bill.status === 'paid') return { bg: 'rgba(90,138,106,0.15)', border: '#5A8A6A', badge: 'Paid', badgeColor: '#5A8A6A' }
  if (bill.autopay) return { bg: 'rgba(65,105,225,0.15)', border: '#6A8AE8', badge: 'Autopay', badgeColor: '#6A8AE8' }
  if (days < 0) return { bg: 'rgba(255,0,0,0.13)', border: '#FF0000', badge: 'OVERDUE', badgeColor: '#FF4444' }
  if (days === 0) return { bg: 'rgba(201,107,90,0.13)', border: '#C96B5A', badge: 'DUE TODAY', badgeColor: '#C96B5A' }
  if (days <= 2) return { bg: 'rgba(224,94,34,0.13)', border: '#E05E22', badge: `Due in ${days}d`, badgeColor: '#E05E22' }
  if (days <= 6) return { bg: 'rgba(201,146,58,0.13)', border: '#C9923A', badge: `Due in ${days}d`, badgeColor: '#C9923A' }
  if (days <= 13) return { bg: 'rgba(201,169,110,0.13)', border: '#C9A96E', badge: `Due in ${days}d`, badgeColor: '#C9A96E' }
  return { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.11)', badge: `${days} days`, badgeColor: 'rgba(255,255,255,0.4)' }
}

function getLunaSuggestion(bill: Bill): string {
  if (bill.autopay) return 'Autopay is active — no action needed. Make sure funds are available on the due date.'
  if (bill.status === 'paid') return 'Paid this month. Stay consistent and you\'ll never pay a late fee.'
  return 'Set up autopay to avoid late fees and protect your credit score.'
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadBills = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('money_bills')
        .select('*')
        .order('due_date', { ascending: true })
      setBills((data ?? []) as Bill[])
    } catch {
      console.error('Failed to load bills')
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadBills() }, [loadBills])

  const markPaid = useCallback(async (id: string) => {
    await supabase.from('money_bills').update({ status: 'paid' }).eq('id', id)
    await loadBills()
  }, [supabase, loadBills])

  const activeBills = bills.filter(b => b.status !== 'cancelled')
  const totalMonthly = activeBills.reduce((s, b) => {
    const amt = b.amount_estimate ?? 0
    if (b.frequency === 'annual') return s + amt / 12
    return s + amt
  }, 0)
  const paidBills = bills.filter(b => b.status === 'paid')
  const paidTotal = paidBills.reduce((s, b) => s + (b.amount_estimate ?? 0), 0)
  const remaining = totalMonthly - paidTotal

  const sortedBills = [...activeBills].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  const nextDue = sortedBills.find(b => b.due_date && b.status !== 'paid')

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>Bills</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Know what&apos;s coming before it arrives</p>
          </div>

          {/* Summary row */}
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
              <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{nextDue?.due_date ?? '—'}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{nextDue?.name ?? nextDue?.merchant_name ?? ''}</p>
            </div>
          </div>

          {/* Calendar strip */}
          <div style={{ ...CARD, padding: '14px 10px', marginBottom: 18 }}>
            <p style={{ ...LABEL_STYLE, marginBottom: 10, paddingLeft: 4 }}>Due This Month</p>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                const hasBill = activeBills.some(b => b.due_day === day || (b.due_date && new Date(b.due_date).getDate() === day))
                const todayDay = new Date().getDate()
                const isToday = day === todayDay
                return (
                  <div key={day} style={{ minWidth: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isToday ? 'rgba(201,169,110,0.22)' : 'transparent',
                      border: isToday ? `1px solid rgba(201,169,110,0.5)` : '1px solid transparent',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? GOLDEN : 'rgba(255,255,255,0.5)' }}>{day}</span>
                    </div>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', marginTop: 3, background: hasBill ? GOLDEN : 'transparent' }} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bills list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.4)' }} className="animate-spin mx-auto" />
            </div>
          ) : sortedBills.length === 0 ? (
            <div style={{ ...CARD, padding: 32, textAlign: 'center' }}>
              <AlertTriangle style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.3)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No bills found.</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                LUNA auto-detects bills from your transactions, or add one manually below.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ ...LABEL_STYLE, marginBottom: 12 }}>All Bills</p>
              {sortedBills.map(bill => {
                const style = getBillStyle(bill)
                const displayName = bill.name ?? bill.merchant_name ?? 'Unknown'
                const suggestion = getLunaSuggestion(bill)
                return (
                  <div key={bill.id} style={{
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{displayName}</p>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: `${style.badgeColor}22`,
                            color: style.badgeColor,
                            border: `1px solid ${style.badgeColor}55`,
                          }}>{style.badge}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {bill.due_date && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Due {bill.due_date}</span>}
                          {bill.frequency && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'capitalize' }}>{bill.frequency}</span>}
                          {bill.category && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{bill.category}</span>}
                          {bill.autopay && (
                            <span style={{ fontSize: 11, color: '#6A8AE8', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Check style={{ width: 10, height: 10 }} /> Autopay
                            </span>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: 18, fontWeight: 700, color: style.badgeColor, flexShrink: 0, marginLeft: 12 }}>
                        {bill.amount_estimate ? formatCurrency(bill.amount_estimate) : '—'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <button
                        onClick={() => { void markPaid(bill.id) }}
                        disabled={bill.status === 'paid'}
                        style={{
                          flex: 1, height: 36, borderRadius: 10, border: `1px solid #5A8A6A`,
                          background: bill.status === 'paid' ? 'rgba(90,138,106,0.25)' : 'rgba(90,138,106,0.12)',
                          color: '#5A8A6A', fontSize: 12, fontWeight: 600, cursor: bill.status === 'paid' ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}>
                        <Check style={{ width: 12, height: 12 }} />
                        {bill.status === 'paid' ? 'Paid' : 'Mark Paid'}
                      </button>
                      <button style={{
                        flex: 1, height: 36, borderRadius: 10, border: `1px solid ${GOLDEN}`,
                        background: 'rgba(201,169,110,0.08)', color: GOLDEN, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>
                        Pay Early
                      </button>
                      <button style={{
                        width: 72, height: 36, borderRadius: 10, border: `1px solid rgba(201,107,90,0.5)`,
                        background: 'rgba(201,107,90,0.08)', color: '#C96B5A', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>
                        Dismiss
                      </button>
                    </div>

                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                      LUNA: {suggestion}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          <button style={{
            width: '100%', padding: '14px 0', borderRadius: 14,
            background: 'transparent', border: '1.5px dashed rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 8,
          }}>
            <Plus style={{ width: 16, height: 16 }} />
            Add bill manually
          </button>

        </div>
      </AppLayout>
    </div>
  )
}
