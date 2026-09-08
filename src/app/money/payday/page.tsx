'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { ArrowLeft, Plus, Trash2, TrendingUp } from 'lucide-react'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const PAYDAY_CATEGORIES = [
  ['bills', 'Bills'], ['business_expenses', 'Business expenses'], ['savings', 'Savings'], ['debt', 'Debt'],
  ['groceries', 'Groceries'], ['gas_car', 'Gas / car'], ['personal_necessities', 'Personal necessities'],
  ['beauty_self_care', 'Beauty / self-care necessities'], ['clothing_work_necessities', 'Clothing / work necessities'],
  ['fun_spending', 'Fun spending'], ['buffer', 'Keep as buffer'],
] as const

const WISHLIST_CATEGORIES = [
  ['need_now', 'Need Now'], ['makes_life_easier', 'Makes Life Easier'], ['feel_good_upgrade', 'Feel-Good Upgrade'], ['can_wait', 'Can Wait'],
] as const

interface WishlistItem { id: string; name: string; expected_price: number | null; category: string; why_wanted: string | null; affordableNow?: boolean }
interface Allocation { id: string; pay_date: string; total_amount: number; allocations: Record<string, number> }
interface ForecastWindow { days: number; confirmed: { moneyIn: number; moneyOut: number }; expected: { moneyIn: number }; possible: { moneyIn: number }; projectedBalance: number }

export default function PaydayPage() {
  const [tab, setTab] = useState<'payday' | 'wishlist' | 'forecast'>('payday')

  const [totalAmount, setTotalAmount] = useState('')
  const [allocInputs, setAllocInputs] = useState<Record<string, string>>({})
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [saving, setSaving] = useState(false)

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [safeToSpend, setSafeToSpend] = useState(0)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState<string>('need_now')
  const [adding, setAdding] = useState(false)

  const [forecast, setForecast] = useState<ForecastWindow[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)

  const loadPayday = useCallback(() => {
    fetch('/api/money/payday').then(r => r.json()).then(d => setAllocations(d.allocations ?? [])).catch(() => {})
  }, [])
  const loadWishlist = useCallback(() => {
    fetch('/api/money/wishlist').then(r => r.json()).then(d => { setItems(d.items ?? []); setSafeToSpend(d.safeToSpend ?? 0) }).catch(() => {})
  }, [])
  const loadForecast = useCallback(() => {
    fetch('/api/money/cash-flow-forecast').then(r => r.json()).then(d => { setForecast(d.forecast ?? []); setCurrentBalance(d.currentBalance ?? 0) }).catch(() => {})
  }, [])

  useEffect(() => { loadPayday(); loadWishlist(); loadForecast() }, [loadPayday, loadWishlist, loadForecast])

  const allocatedTotal = Object.values(allocInputs).reduce((s, v) => s + (Number(v) || 0), 0)
  const totalNum = Number(totalAmount) || 0

  async function savePayday() {
    if (!totalNum) return
    setSaving(true)
    try {
      const allocations: Record<string, number> = {}
      for (const [key] of PAYDAY_CATEGORIES) if (allocInputs[key]) allocations[key] = Number(allocInputs[key])
      await fetch('/api/money/payday', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_amount: totalNum, allocations }),
      })
      setTotalAmount(''); setAllocInputs({})
      loadPayday()
    } finally {
      setSaving(false)
    }
  }

  async function addWishlistItem() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await fetch('/api/money/wishlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), expected_price: newPrice ? Number(newPrice) : null, category: newCategory }),
      })
      setNewName(''); setNewPrice('')
      loadWishlist()
    } finally {
      setAdding(false)
    }
  }

  async function markPurchased(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/money/wishlist/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purchased: true }),
    }).catch(() => loadWishlist())
  }

  async function removeWishlistItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/money/wishlist/${id}`, { method: 'DELETE' }).catch(() => loadWishlist())
  }

  return (
    <div style={{ background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)', minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">
          <Link href="/money" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5E5474', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Money
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display, serif)', fontSize: 24, fontWeight: 700, color: '#100C1E', marginBottom: 4 }}>Payday &amp; Wishlist</h1>
          <p style={{ fontSize: 13, color: '#5E5474', marginBottom: 16 }}>Allocate what comes in, track what you want, know what&apos;s realistic.</p>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {([['payday', 'Payday Reset'], ['wishlist', 'When I Get Paid'], ['forecast', 'Cash Flow Forecast']] as [typeof tab, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setTab(v)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === v ? '#5C4530' : 'rgba(255,255,255,0.5)', color: tab === v ? 'white' : '#5E5474' }}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'payday' && (
            <>
              <div style={{ ...GLASS, padding: 16, marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#5E5474', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>How do we need to allocate this payment?</p>
                <input type="number" placeholder="Amount received ($)" value={totalAmount} onChange={e => setTotalAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', fontSize: 14, fontWeight: 700, marginBottom: 12 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {PAYDAY_CATEGORIES.map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 12.5, color: '#32284A' }}>{label}</span>
                      <input type="number" placeholder="$0" value={allocInputs[key] ?? ''} onChange={e => setAllocInputs(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ width: 90, padding: '6px 8px', borderRadius: 9, border: '1px solid rgba(180,150,100,0.2)', fontSize: 12, textAlign: 'right' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(180,150,100,0.15)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#5E5474' }}>Allocated / Total</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: allocatedTotal > totalNum ? '#B23B3B' : '#100C1E' }}>${allocatedTotal.toFixed(0)} / ${totalNum.toFixed(0)}</span>
                </div>
                <button onClick={savePayday} disabled={saving || !totalNum} style={{ width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 12, border: 'none', background: '#5C4530', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (saving || !totalNum) ? 0.5 : 1 }}>
                  {saving ? 'Saving…' : 'Save allocation'}
                </button>
              </div>

              {allocations.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#5E5474', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Past allocations</p>
                  {allocations.map(a => (
                    <div key={a.id} style={{ ...GLASS, padding: 12 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: '#100C1E' }}>${a.total_amount.toFixed(0)} — {a.pay_date}</p>
                      <p style={{ fontSize: 11, color: '#5E5474', marginTop: 2 }}>
                        {Object.entries(a.allocations).map(([k, v]) => `${PAYDAY_CATEGORIES.find(c => c[0] === k)?.[1] ?? k}: $${v}`).join(' · ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'wishlist' && (
            <>
              <div style={{ ...GLASS, padding: 14, marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: '#5E5474' }}>Safe to spend right now: <strong style={{ color: '#100C1E' }}>${safeToSpend.toFixed(0)}</strong></p>
              </div>

              <div style={{ ...GLASS, padding: 16, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input placeholder="Item name" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid rgba(180,150,100,0.2)', fontSize: 13 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" placeholder="Expected price ($)" value={newPrice} onChange={e => setNewPrice(e.target.value)} style={{ flex: 1, padding: '9px 11px', borderRadius: 10, border: '1px solid rgba(180,150,100,0.2)', fontSize: 13 }} />
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ flex: 1, padding: '9px 11px', borderRadius: 10, border: '1px solid rgba(180,150,100,0.2)', fontSize: 13, background: 'white' }}>
                    {WISHLIST_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <button onClick={addWishlistItem} disabled={adding || !newName.trim()} style={{ padding: '10px 0', borderRadius: 10, border: 'none', background: '#5C4530', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (adding || !newName.trim()) ? 0.5 : 1 }}>
                  <Plus className="h-4 w-4" /> {adding ? 'Adding…' : 'Add to list'}
                </button>
              </div>

              {WISHLIST_CATEGORIES.map(([catKey, catLabel]) => {
                const catItems = items.filter(i => i.category === catKey)
                if (catItems.length === 0) return null
                return (
                  <div key={catKey} style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#5E5474', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{catLabel}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {catItems.map(item => (
                        <div key={item.id} style={{ ...GLASS, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#100C1E' }}>{item.name}</p>
                            <p style={{ fontSize: 11, color: item.affordableNow ? '#4A8A4A' : '#5E5474' }}>
                              {item.expected_price ? `$${item.expected_price.toFixed(0)}` : 'No price set'}{item.affordableNow ? ' · Realistic now' : ''}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => markPurchased(item.id)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 9, border: '1px solid rgba(90,180,90,0.3)', color: '#4A8A4A', background: 'transparent', cursor: 'pointer' }}>Bought it</button>
                            <button onClick={() => removeWishlistItem(item.id)} aria-label="Remove" style={{ padding: '5px 7px', borderRadius: 9, border: 'none', background: 'transparent', color: '#5E5474', cursor: 'pointer' }}><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {items.length === 0 && <div style={{ ...GLASS, padding: 24, textAlign: 'center' }}><p style={{ fontSize: 13, color: '#5E5474' }}>Nothing on your wishlist yet.</p></div>}
            </>
          )}

          {tab === 'forecast' && (
            <>
              <div style={{ ...GLASS, padding: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp className="h-4 w-4" style={{ color: '#5C4530' }} />
                <p style={{ fontSize: 12, color: '#5E5474' }}>Current balance: <strong style={{ color: '#100C1E' }}>${currentBalance.toFixed(0)}</strong></p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {forecast.map(w => (
                  <div key={w.days} style={{ ...GLASS, padding: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#100C1E', marginBottom: 8 }}>Next {w.days} days</p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
                      <div><p style={{ fontSize: 15, fontWeight: 800, color: '#4A8A4A' }}>${w.confirmed.moneyIn.toFixed(0)}</p><p style={{ fontSize: 9.5, color: '#5E5474' }}>Confirmed in</p></div>
                      <div><p style={{ fontSize: 15, fontWeight: 800, color: '#B23B3B' }}>${w.confirmed.moneyOut.toFixed(0)}</p><p style={{ fontSize: 9.5, color: '#5E5474' }}>Required out</p></div>
                      <div><p style={{ fontSize: 15, fontWeight: 800, color: '#8A6F2A' }}>${w.expected.moneyIn.toFixed(0)}</p><p style={{ fontSize: 9.5, color: '#5E5474' }}>Expected in</p></div>
                      <div><p style={{ fontSize: 15, fontWeight: 800, color: '#A38A5C' }}>${w.possible.moneyIn.toFixed(0)}</p><p style={{ fontSize: 9.5, color: '#5E5474' }}>Possible (pipeline)</p></div>
                    </div>
                    <p style={{ fontSize: 11, color: '#5E5474' }}>Projected balance (confirmed only): <strong style={{ color: w.projectedBalance >= 0 ? '#100C1E' : '#B23B3B' }}>${w.projectedBalance.toFixed(0)}</strong></p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </div>
  )
}
