'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, Search, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { formatCurrency, CATEGORY_ICONS } from '@/lib/money'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)'
const GOLDEN = '#C9A96E'
const GREEN = '#5A8A6A'
const RED = '#C96B5A'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
}
const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
}
const INPUT: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
  padding: '10px 12px', fontSize: 14, color: 'white', outline: 'none',
  boxSizing: 'border-box',
}

type DateFilter = 'week' | 'month' | 'last_month' | 'all'

interface Transaction {
  id: string
  plaid_transaction_id: string
  merchant_name: string | null
  name: string
  amount: number
  transaction_date: string
  expense_type: string
  is_income: boolean
  account_name: string | null
  pending: boolean
  category_primary: string | null
  notes: string | null
  needs_review: boolean
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────
function AddTxnModal({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    merchant_name: '', amount: '', transaction_date: today,
    expense_type: 'shopping', is_income: false,
    account_name: '', notes: '', is_business_expense: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  async function save() {
    if (!form.merchant_name.trim()) { setError('Merchant name is required'); return }
    const amt = parseFloat(form.amount)
    if (!form.amount || isNaN(amt) || amt <= 0) { setError('Valid positive amount is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/money/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: amt }),
      })
      if (!res.ok) throw new Error('Failed')
      onSave()
    } catch {
      setError('Failed to save. Try again.')
    }
    setSaving(false)
  }

  const EXPENSE_TYPES = [
    ['shopping', 'Shopping'], ['food_drink', 'Food & Drink'], ['transport', 'Transport'],
    ['utilities', 'Utilities'], ['health', 'Health'], ['entertainment', 'Entertainment'],
    ['software', 'Software / AI'], ['travel', 'Travel'], ['business', 'Business'],
    ['income', 'Income / Payment'], ['transfer', 'Transfer'], ['other', 'Other'],
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 600,
        background: 'linear-gradient(180deg, #1E1540 0%, #12102E 100%)',
        border: '1px solid rgba(139,111,184,0.25)', borderRadius: '20px 20px 0 0',
        padding: '24px 20px 40px', zIndex: 1, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Add Transaction</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        {/* Income / Expense toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {([false, true] as const).map(isInc => (
            <button key={String(isInc)} onClick={() => set('is_income', isInc)} style={{
              flex: 1, height: 38, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: form.is_income === isInc ? (isInc ? `${GREEN}25` : `${RED}25`) : 'rgba(255,255,255,0.05)',
              border: `1px solid ${form.is_income === isInc ? (isInc ? GREEN : RED) : 'rgba(255,255,255,0.1)'}40`,
              color: form.is_income === isInc ? (isInc ? GREEN : RED) : 'rgba(255,255,255,0.4)',
            }}>{isInc ? '+ Income' : '− Expense'}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <p style={{ ...LABEL, marginBottom: 5 }}>Amount ($)</p>
              <input style={INPUT} type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div>
              <p style={{ ...LABEL, marginBottom: 5 }}>Date</p>
              <input style={INPUT} type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} />
            </div>
          </div>

          <div>
            <p style={{ ...LABEL, marginBottom: 5 }}>Merchant / Description</p>
            <input style={INPUT} placeholder="e.g. Whole Foods, Netflix, Client Payment" value={form.merchant_name} onChange={e => set('merchant_name', e.target.value)} />
          </div>

          <div>
            <p style={{ ...LABEL, marginBottom: 5 }}>Category</p>
            <select style={{ ...INPUT, appearance: 'none' }} value={form.expense_type} onChange={e => set('expense_type', e.target.value)}>
              {EXPENSE_TYPES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <p style={{ ...LABEL, marginBottom: 5 }}>Account (optional)</p>
              <input style={INPUT} placeholder="Chase Sapphire, etc." value={form.account_name} onChange={e => set('account_name', e.target.value)} />
            </div>
            <div>
              <p style={{ ...LABEL, marginBottom: 5 }}>Type</p>
              <button onClick={() => set('is_business_expense', !form.is_business_expense)} style={{
                width: '100%', height: 42, borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: form.is_business_expense ? 'rgba(106,138,232,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${form.is_business_expense ? 'rgba(106,138,232,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: form.is_business_expense ? '#6A8AE8' : 'rgba(255,255,255,0.4)',
              }}>{form.is_business_expense ? '💼 Business' : 'Personal'}</button>
            </div>
          </div>

          <div>
            <p style={{ ...LABEL, marginBottom: 5 }}>Notes (optional)</p>
            <input style={INPUT} placeholder="Any notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {error && <p style={{ fontSize: 12, color: RED, fontWeight: 600 }}>{error}</p>}

          <button onClick={save} disabled={saving} style={{
            height: 46, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(139,111,184,0.3) 0%, rgba(139,111,184,0.15) 100%)',
            border: '1px solid rgba(139,111,184,0.4)', color: 'rgba(196,169,232,0.9)',
            fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', marginTop: 4,
          }}>{saving ? 'Saving…' : 'Save Transaction'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function TransactionsContent() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'review' ? 'review' : 'all'

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [tab, setTab] = useState<'all' | 'review'>(defaultTab)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [totalSpent, setTotalSpent] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period: dateFilter === 'week' ? 'week' : dateFilter === 'last_month' ? 'last_month' : dateFilter === 'all' ? 'all' : 'month' })
      const res = await fetch(`/api/money/transactions?${params}`)
      const json = await res.json()
      let list: Transaction[] = json.transactions ?? []
      if (tab === 'review') list = list.filter(t => t.needs_review)
      setTransactions(list)
      setTotalSpent(json.total_spent ?? 0)
      setTotalIncome(json.total_income ?? 0)
    } catch { /* silent */ }
    setLoading(false)
  }, [dateFilter, tab])

  useEffect(() => { load() }, [load])

  const filtered = transactions.filter(t => {
    const matchSearch = !search || (t.merchant_name ?? t.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || t.expense_type === categoryFilter
    return matchSearch && matchCat
  })

  const net = totalIncome - totalSpent
  const categories = ['all', ...Array.from(new Set(transactions.map(t => t.expense_type).filter(Boolean)))]

  const spentByCategory = filtered
    .filter(t => !t.is_income)
    .reduce((acc, t) => {
      const cat = t.expense_type ?? 'other'
      acc[cat] = (acc[cat] ?? 0) + t.amount
      return acc
    }, {} as Record<string, number>)

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: 2 }}>Transactions</h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Every move tracked with clarity</p>
            </div>
            <button onClick={() => setShowAdd(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
              background: 'rgba(139,111,184,0.15)', border: '1px solid rgba(139,111,184,0.35)',
              color: 'rgba(196,169,232,0.9)', fontSize: 13, fontWeight: 700,
            }}><Plus style={{ width: 14, height: 14 }} /> Add</button>
          </div>

          {/* Summary stats */}
          {(totalSpent > 0 || totalIncome > 0) && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Spent', value: formatCurrency(totalSpent), color: RED },
                { label: 'Income', value: formatCurrency(totalIncome), color: GREEN },
                { label: 'Net', value: formatCurrency(net), color: net >= 0 ? GREEN : RED },
              ].map(s => (
                <div key={s.label} style={{ ...CARD, flex: 1, padding: '12px 14px' }}>
                  <p style={{ ...LABEL, marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Category breakdown */}
          {Object.keys(spentByCategory).length > 1 && (
            <div style={{ ...CARD, padding: 14, marginBottom: 18, border: '1px solid rgba(201,169,110,0.12)' }}>
              <p style={{ ...LABEL, marginBottom: 10 }}>Spending by Category</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(spentByCategory).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, amt]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[cat] ?? '💳'}</span>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', flex: 1, textTransform: 'capitalize' }}>{cat.replace('_', ' ')}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: GOLDEN }}>{formatCurrency(amt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['all', 'review'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: tab === t ? 'rgba(139,111,184,0.25)' : 'rgba(255,255,255,0.07)',
                color: tab === t ? 'rgba(196,169,232,0.9)' : 'rgba(255,255,255,0.5)',
                border: tab === t ? '1px solid rgba(139,111,184,0.3)' : '1px solid rgba(255,255,255,0.1)',
              }}>{t === 'all' ? 'All Transactions' : 'Needs Review'}</button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', width: 15, height: 15 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search merchants…"
              style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px 10px 36px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Date filters */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
            {(['week','month','last_month','all'] as DateFilter[]).map(f => (
              <button key={f} onClick={() => setDateFilter(f)} style={{
                padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: dateFilter === f ? 'rgba(201,169,110,0.2)' : 'rgba(255,255,255,0.06)',
                color: dateFilter === f ? GOLDEN : 'rgba(255,255,255,0.45)',
                border: dateFilter === f ? `1px solid rgba(201,169,110,0.3)` : '1px solid rgba(255,255,255,0.1)',
              }}>{f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : f === 'last_month' ? 'Last Month' : 'All Time'}</button>
            ))}
          </div>

          {/* Category filter chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                padding: '5px 10px', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: categoryFilter === cat ? 'rgba(139,111,184,0.2)' : 'rgba(255,255,255,0.05)',
                color: categoryFilter === cat ? 'rgba(196,169,232,0.9)' : 'rgba(255,255,255,0.4)',
                border: categoryFilter === cat ? '1px solid rgba(139,111,184,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}>{cat === 'all' ? 'All' : `${CATEGORY_ICONS[cat] ?? ''} ${cat.replace('_', ' ')}`}</button>
            ))}
          </div>

          {/* Transactions list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
              <p style={{ fontSize: 13, marginTop: 10 }}>Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ ...CARD, padding: 36, textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>No transactions yet</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, marginBottom: 18 }}>
                Tap <strong style={{ color: 'rgba(196,169,232,0.7)' }}>Add</strong> to log a transaction manually, or connect your bank to sync automatically.
              </p>
              <button onClick={() => setShowAdd(true)} style={{
                padding: '10px 20px', borderRadius: 12, background: 'rgba(139,111,184,0.15)',
                border: '1px solid rgba(139,111,184,0.3)', color: 'rgba(196,169,232,0.9)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>+ Add Transaction</button>
            </div>
          ) : (
            <div style={{ ...CARD, padding: '4px 16px 8px' }}>
              <p style={{ ...LABEL, padding: '12px 0 8px' }}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
              {filtered.map(txn => (
                <div key={txn.id}>
                  <button
                    onClick={() => setExpanded(expanded === txn.id ? null : txn.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{CATEGORY_ICONS[txn.expense_type] ?? '💳'}</span>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{txn.merchant_name ?? txn.name}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
                          {txn.transaction_date}{txn.account_name ? ` · ${txn.account_name}` : ''}{txn.pending ? ' · Pending' : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: txn.is_income ? GREEN : '#E05E5E' }}>
                        {txn.is_income ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                      {expanded === txn.id
                        ? <ChevronUp style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
                        : <ChevronDown style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />}
                    </div>
                  </button>

                  {expanded === txn.id && (
                    <div style={{ padding: '12px 0 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, margin: '4px 0 8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 12px' }}>
                        <div>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>Category</p>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', textTransform: 'capitalize' }}>{txn.expense_type?.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>Date</p>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{txn.transaction_date}</p>
                        </div>
                        {txn.account_name && (
                          <div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>Account</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{txn.account_name}</p>
                          </div>
                        )}
                        {txn.category_primary && (
                          <div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>Type</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{txn.category_primary}</p>
                          </div>
                        )}
                      </div>
                      {txn.notes && (
                        <div style={{ padding: '8px 12px 0' }}>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>{txn.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>

      {showAdd && <AddTxnModal onSave={() => { setShowAdd(false); load() }} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div style={{ background: 'linear-gradient(180deg, #1A1240 0%, #060418 100%)', minHeight: '100vh' }} />}>
      <TransactionsContent />
    </Suspense>
  )
}
