'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, AlertTriangle, Check, X, Search, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/money'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)'
const GOLDEN = '#C9A96E'
const GREEN = '#5A8A6A'
const RED = '#C96B5A'
const AMBER = '#C9923A'
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

interface Subscription {
  id: string
  merchant_name: string | null
  amount_estimate: number | null
  frequency: string | null
  last_charge_date: string | null
  next_expected_charge: string | null
  category: string | null
  status: string
  cancel_url: string | null
  notes: string | null
}

type SubTab = 'all' | 'business' | 'personal'

const SEED_SUBS = [
  { merchant_name: 'ChatGPT',       amount_estimate: 20,   frequency: 'monthly', category: 'AI',      notes: 'personal' },
  { merchant_name: 'eDreams',       amount_estimate: 9.99, frequency: 'monthly', category: 'Travel',  notes: 'personal' },
  { merchant_name: 'Rocket Money',  amount_estimate: 10,   frequency: 'monthly', category: 'Finance', notes: 'personal' },
]

function monthly(sub: Subscription): number {
  const amt = sub.amount_estimate ?? 0
  if (sub.frequency === 'annual') return amt / 12
  if (sub.frequency === 'weekly') return amt * 4
  return amt
}

function avatar(name: string | null) { return (name ?? '?').charAt(0).toUpperCase() }

// ─── Add Subscription Modal ────────────────────────────────────────────────────
function AddSubModal({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    merchant_name: '', amount_estimate: '', frequency: 'monthly',
    category: '', notes: 'personal', cancel_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function save() {
    if (!form.merchant_name.trim()) { setError('Name is required'); return }
    if (!form.amount_estimate || isNaN(parseFloat(form.amount_estimate))) { setError('Valid amount is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/money/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount_estimate: parseFloat(form.amount_estimate) }),
      })
      if (!res.ok) throw new Error('Failed')
      onSave()
    } catch {
      setError('Failed to save. Try again.')
    }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 600,
        background: 'linear-gradient(180deg, #1E1540 0%, #12102E 100%)',
        border: '1px solid rgba(201,169,110,0.2)', borderRadius: '20px 20px 0 0',
        padding: '24px 20px 40px', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Add Subscription</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ ...LABEL, marginBottom: 5 }}>Service / App Name</p>
            <input style={INPUT} placeholder="e.g. Netflix, Adobe, Vercel" value={form.merchant_name} onChange={e => set('merchant_name', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <p style={{ ...LABEL, marginBottom: 5 }}>Amount ($)</p>
              <input style={INPUT} type="number" step="0.01" placeholder="0.00" value={form.amount_estimate} onChange={e => set('amount_estimate', e.target.value)} />
            </div>
            <div>
              <p style={{ ...LABEL, marginBottom: 5 }}>Billing Cycle</p>
              <select style={{ ...INPUT, appearance: 'none' }} value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <p style={{ ...LABEL, marginBottom: 5 }}>Category</p>
              <select style={{ ...INPUT, appearance: 'none' }} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Select…</option>
                <option value="AI">AI Tools</option>
                <option value="Software">Software</option>
                <option value="Hosting">Hosting / Dev</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Health">Health</option>
                <option value="Travel">Travel</option>
                <option value="Education">Education</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <p style={{ ...LABEL, marginBottom: 5 }}>Type</p>
              <div style={{ display: 'flex', gap: 6, height: 40 }}>
                {(['personal', 'business'] as const).map(t => (
                  <button key={t} onClick={() => set('notes', t)} style={{
                    flex: 1, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                    background: form.notes === t ? (t === 'business' ? 'rgba(106,138,232,0.2)' : 'rgba(90,138,106,0.2)') : 'rgba(255,255,255,0.05)',
                    borderColor: form.notes === t ? (t === 'business' ? 'rgba(106,138,232,0.5)' : 'rgba(90,138,106,0.5)') : 'rgba(255,255,255,0.1)',
                    color: form.notes === t ? (t === 'business' ? '#6A8AE8' : GREEN) : 'rgba(255,255,255,0.45)',
                    textTransform: 'capitalize',
                  }}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p style={{ ...LABEL, marginBottom: 5 }}>Cancel URL (optional)</p>
            <input style={INPUT} placeholder="https://..." value={form.cancel_url} onChange={e => set('cancel_url', e.target.value)} />
          </div>

          {error && <p style={{ fontSize: 12, color: RED, fontWeight: 600 }}>{error}</p>}

          <button onClick={save} disabled={saving} style={{
            height: 46, borderRadius: 12, background: `linear-gradient(135deg, rgba(201,169,110,0.3) 0%, rgba(201,169,110,0.15) 100%)`,
            border: `1px solid rgba(201,169,110,0.4)`, color: GOLDEN, fontSize: 14, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', marginTop: 4,
          }}>
            {saving ? 'Saving…' : 'Save Subscription'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SubCard ───────────────────────────────────────────────────────────────────
function SubCard({ sub, onRefresh }: { sub: Subscription; onRefresh: () => void }) {
  const [action, setAction] = useState<'keep' | 'cancel' | null>(null)
  const isBusiness = sub.notes === 'business'
  const typeColor = isBusiness ? '#6A8AE8' : GREEN
  const amt = monthly(sub)

  async function markCancel() {
    setAction('cancel')
    await fetch('/api/money/subscriptions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sub.id, status: 'cancelled' }),
    })
    onRefresh()
  }

  return (
    <div style={{ ...CARD, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(201,169,110,0.3) 0%, rgba(201,169,110,0.1) 100%)',
          border: '1.5px solid rgba(201,169,110,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: GOLDEN,
        }}>{avatar(sub.merchant_name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 4 }}>{sub.merchant_name ?? 'Unknown'}</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {sub.category && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.07)', padding: '2px 7px', borderRadius: 5 }}>{sub.category}</span>
            )}
            <span style={{ fontSize: 11, color: typeColor, background: `${typeColor}18`, padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>
              {isBusiness ? 'Business' : 'Personal'}
            </span>
            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, fontWeight: 600,
              color: sub.status === 'active' ? GREEN : RED,
              background: sub.status === 'active' ? `${GREEN}18` : `${RED}18`,
            }}>{sub.status}</span>
          </div>
          {sub.next_expected_charge && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              Next charge: {sub.next_expected_charge} · {sub.frequency ?? 'monthly'}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: GOLDEN }}>{formatCurrency(amt)}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>/mo</p>
          {sub.frequency === 'annual' && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{formatCurrency((sub.amount_estimate ?? 0))}/yr</p>
          )}
        </div>
      </div>

      {action ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check style={{ width: 13, height: 13, color: GREEN }} />
          <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>Marked to {action}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setAction('keep')}
            style={{ flex: 1, height: 30, borderRadius: 8, border: `1px solid ${GREEN}40`, background: `${GREEN}12`, color: GREEN, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ✓ Keep
          </button>
          <button onClick={markCancel}
            style={{ flex: 1, height: 30, borderRadius: 8, border: `1px solid ${RED}40`, background: `${RED}12`, color: RED, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          {sub.cancel_url && (
            <a href={sub.cancel_url} target="_blank" rel="noreferrer" style={{ width: 50, height: 30, borderRadius: 8, border: `1px solid ${AMBER}40`, background: `${AMBER}12`, color: AMBER, fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Link
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [tab, setTab] = useState<SubTab>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/money/subscriptions')
      const json = await res.json()
      setSubscriptions(json.subscriptions ?? [])
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-seed on first load if empty
  useEffect(() => {
    if (!loading && subscriptions.length === 0 && !seeding) {
      setSeeding(true)
      Promise.all(SEED_SUBS.map(s =>
        fetch('/api/money/subscriptions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(s),
        })
      )).then(() => load()).finally(() => setSeeding(false))
    }
  }, [loading, subscriptions.length, seeding, load])

  const active = subscriptions.filter(s => s.status === 'active')
  const cancelled = subscriptions.filter(s => s.status === 'cancelled')
  const biz = active.filter(s => s.notes === 'business')
  const personal = active.filter(s => s.notes !== 'business')

  const monthlyTotal = active.reduce((s, sub) => s + monthly(sub), 0)
  const annualTotal = monthlyTotal * 12
  const bizTotal = biz.reduce((s, sub) => s + monthly(sub), 0)
  const personalTotal = personal.reduce((s, sub) => s + monthly(sub), 0)

  function filterList(list: Subscription[]) {
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(s =>
      (s.merchant_name ?? '').toLowerCase().includes(q) ||
      (s.category ?? '').toLowerCase().includes(q)
    )
  }

  const showList = tab === 'business' ? filterList(biz)
    : tab === 'personal' ? filterList(personal)
    : filterList(active)

  const byCategory = showList.reduce((acc, sub) => {
    const cat = sub.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(sub)
    return acc
  }, {} as Record<string, Subscription[]>)

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 120px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>Subscriptions</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>What is actually useful?</p>
            </div>
            <button onClick={() => setShowAdd(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
              background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.35)',
              color: GOLDEN, fontSize: 13, fontWeight: 700,
            }}>
              <Plus style={{ width: 14, height: 14 }} /> Add
            </button>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
            {[
              { label: 'Active',    value: active.length.toString(),         color: 'white' },
              { label: 'Monthly',   value: formatCurrency(monthlyTotal),      color: GOLDEN },
              { label: 'Annual',    value: formatCurrency(annualTotal),       color: AMBER },
              { label: 'Business',  value: `${biz.length} · ${formatCurrency(bizTotal)}`,      color: '#6A8AE8' },
              { label: 'Personal',  value: `${personal.length} · ${formatCurrency(personalTotal)}`, color: GREEN },
            ].map(stat => (
              <div key={stat.label} style={{ ...CARD, minWidth: 120, padding: 14, flexShrink: 0 }}>
                <p style={{ ...LABEL, marginBottom: 5 }}>{stat.label}</p>
                <p style={{ fontSize: stat.label === 'Active' ? 22 : 16, fontWeight: 700, color: stat.color, lineHeight: 1.2 }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Monthly breakdown */}
          {active.length > 0 && (
            <div style={{ ...CARD, padding: 16, marginBottom: 18, border: '1px solid rgba(201,169,110,0.2)', background: 'rgba(201,169,110,0.04)' }}>
              <p style={{ ...LABEL, marginBottom: 10 }}>Monthly Breakdown</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(
                  active.reduce((acc, s) => {
                    const cat = s.category ?? 'Other'
                    acc[cat] = (acc[cat] ?? 0) + monthly(s)
                    return acc
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{cat}</p>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: GOLDEN, marginLeft: 10 }}>{formatCurrency(amt)}/mo</p>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Total</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: GOLDEN }}>{formatCurrency(monthlyTotal)}/mo</p>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div style={{ ...CARD, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Search style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
            <input type="text" placeholder="Search subscriptions…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: 'white' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.4)' }} /></button>}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {([['all','All'], ['business','Business'], ['personal','Personal']] as [SubTab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: tab === id ? 'rgba(201,169,110,0.18)' : 'rgba(255,255,255,0.06)',
                border: tab === id ? '1px solid rgba(201,169,110,0.35)' : '1px solid transparent',
                color: tab === id ? GOLDEN : 'rgba(255,255,255,0.5)',
              }}>{label}</button>
            ))}
          </div>

          {/* Loading */}
          {(loading || seeding) ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.4)' }} className="animate-spin mx-auto" />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>{seeding ? 'Setting up your subscriptions…' : 'Loading…'}</p>
            </div>
          ) : showList.length === 0 ? (
            <div style={{ ...CARD, padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>No {tab !== 'all' ? tab : ''} subscriptions yet</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Tap <strong>Add</strong> to enter your subscriptions and track your monthly spend.</p>
              <button onClick={() => setShowAdd(true)} style={{
                padding: '10px 20px', borderRadius: 12, background: 'rgba(201,169,110,0.15)',
                border: '1px solid rgba(201,169,110,0.3)', color: GOLDEN, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>+ Add Subscription</button>
            </div>
          ) : (
            Object.entries(byCategory).sort((a, b) => {
              const aTotal = a[1].reduce((s, sub) => s + monthly(sub), 0)
              const bTotal = b[1].reduce((s, sub) => s + monthly(sub), 0)
              return bTotal - aTotal
            }).map(([cat, subs]) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ ...LABEL }}>{cat}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: GOLDEN }}>
                    {formatCurrency(subs.reduce((s, sub) => s + monthly(sub), 0))}/mo
                  </p>
                </div>
                {subs.map(sub => <SubCard key={sub.id} sub={sub} onRefresh={load} />)}
              </div>
            ))
          )}

          {/* Cancelled subs */}
          {cancelled.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p style={{ ...LABEL, marginBottom: 10, color: `${RED}80` }}>Cancelled ({cancelled.length})</p>
              {cancelled.map(sub => (
                <div key={sub.id} style={{ ...CARD, padding: '12px 14px', marginBottom: 8, opacity: 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{sub.merchant_name}</p>
                    <p style={{ fontSize: 12, color: RED }}>{formatCurrency(monthly(sub))}/mo · cancelled</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Money Leaks alert */}
          {active.some(s => ['ChatGPT', 'Rocket Money', 'eDreams'].includes(s.merchant_name ?? '')) && (
            <div style={{ border: `1px solid rgba(201,169,110,0.35)`, background: 'rgba(201,169,110,0.07)', borderRadius: 16, padding: 16, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertTriangle style={{ width: 15, height: 15, color: GOLDEN }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: GOLDEN }}>Money Leaks — Review These</p>
              </div>
              {[
                { name: 'ChatGPT', note: 'Possible duplicate — you also have Claude. Do you use both?' },
                { name: 'eDreams', note: 'Travel subscription — still actively using this?' },
                { name: 'Rocket Money', note: 'LUNA already tracks your expenses for free.' },
              ].filter(l => active.some(s => s.merchant_name === l.name)).map(l => (
                <div key={l.name} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>{l.name}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{l.note}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ ...CARD, padding: 16, border: '1px solid rgba(201,169,110,0.12)', background: 'rgba(201,169,110,0.03)', marginTop: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
              &ldquo;Slow wealth starts with knowing where the slow leaks are.&rdquo;
            </p>
            <p style={{ fontSize: 11, color: GOLDEN, marginTop: 5 }}>Do a subscription audit every 90 days.</p>
          </div>

        </div>
      </AppLayout>

      {showAdd && <AddSubModal onSave={() => { setShowAdd(false); load() }} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
