'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, Search } from 'lucide-react'
import { formatCurrency, CATEGORY_ICONS } from '@/lib/money/format'
import { CATEGORIES } from '@/lib/money/categories'

const BG = 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)'
const GOLDEN = '#5C4530'
const GREEN = '#5A8A6A'
const RED = '#C96B5A'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(180,150,100,0.16)',
  borderRadius: 18, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}
const INPUT: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(180,150,100,0.2)',
  borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#100C1E', outline: 'none', boxSizing: 'border-box',
}

const OWNERSHIP_TYPES = ['personal', 'dryp_business', 'client_expense', 'linkd_up_event', 'reimbursable', 'shared_expense', 'transfer', 'debt_payment', 'unknown']

interface Transaction {
  id: string; merchant_normalized: string | null; merchant_raw: string | null
  amount: number; direction: 'inflow' | 'outflow'; posted_date: string | null; transaction_date: string | null
  category: string | null; ownership_type: string; status: string; is_refund: boolean; review_status: string
}

function TransactionsInner() {
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState(searchParams.get('ownership') ?? '')
  const [totals, setTotals] = useState({ spent: 0, income: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (ownershipFilter) params.set('ownership', ownershipFilter)
      const res = await fetch(`/api/money/transactions?${params}`, { cache: 'no-store' })
      const data = await res.json()
      setTransactions(data.transactions ?? [])
      setTotals({ spent: data.total_spent ?? 0, income: data.total_income ?? 0 })
    } catch { /* ignore */ }
    setLoading(false)
  }, [search, ownershipFilter])

  useEffect(() => { load() }, [load])

  async function updateTransaction(id: string, updates: Partial<Transaction>) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    await fetch('/api/money/transactions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
  }

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#100C1E', marginBottom: 14 }}>Transactions</h1>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search style={{ position: 'absolute', left: 12, top: 12, width: 16, height: 16, color: '#5E5474' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search merchant…" style={{ ...INPUT, paddingLeft: 36 }} />
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
            {['', ...OWNERSHIP_TYPES].map(o => (
              <button key={o || 'all'} onClick={() => setOwnershipFilter(o)}
                style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: ownershipFilter === o ? 'rgba(201,169,110,0.3)' : 'rgba(255,255,255,0.5)', color: ownershipFilter === o ? GOLDEN : '#5E5474' }}>
                {o || 'All'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ ...CARD, padding: 14 }}>
              <p style={{ fontSize: 10, color: '#5E5474', textTransform: 'uppercase' }}>Spent</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: RED }}>{formatCurrency(totals.spent)}</p>
            </div>
            <div style={{ ...CARD, padding: 14 }}>
              <p style={{ fontSize: 10, color: '#5E5474', textTransform: 'uppercase' }}>Income</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: GREEN }}>{formatCurrency(totals.income)}</p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><RefreshCw className="h-5 w-5 animate-spin mx-auto" style={{ color: '#5E5474' }} /></div>
          ) : transactions.length === 0 ? (
            <div style={{ ...CARD, padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#5E5474' }}>No transactions yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.map(t => (
                <div key={t.id} style={{ ...CARD, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{CATEGORY_ICONS[t.category ?? 'unknown'] ?? '❓'}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: '#100C1E', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.merchant_normalized ?? t.merchant_raw}{t.is_refund && ' · refund'}
                        </p>
                        <p style={{ fontSize: 11, color: '#5E5474', margin: 0 }}>
                          {t.posted_date ?? t.transaction_date} · {t.status}{t.review_status === 'needs_review' ? ' · needs review' : ''}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: t.direction === 'inflow' ? GREEN : '#100C1E', flexShrink: 0, margin: 0 }}>
                      {t.direction === 'inflow' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                  </div>

                  {editingId === t.id ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <select value={t.ownership_type} onChange={e => updateTransaction(t.id, { ownership_type: e.target.value })}
                        style={{ ...INPUT, width: 'auto', flex: 1, padding: '6px 8px', fontSize: 11.5 }}>
                        {OWNERSHIP_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select value={t.category ?? 'unknown'} onChange={e => updateTransaction(t.id, { category: e.target.value })}
                        style={{ ...INPUT, width: 'auto', flex: 1, padding: '6px 8px', fontSize: 11.5 }}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={() => setEditingId(null)} style={{ fontSize: 11, color: GOLDEN, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Done</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingId(t.id)} style={{ marginTop: 8, fontSize: 10.5, color: '#5E5474', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {t.ownership_type} · {t.category ?? 'unknown'} — edit
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div style={{ background: BG, minHeight: '100vh' }} />}>
      <TransactionsInner />
    </Suspense>
  )
}
