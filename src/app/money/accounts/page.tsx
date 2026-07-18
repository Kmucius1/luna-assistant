'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, Link as LinkIcon, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/money/format'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  padding: 18, marginBottom: 12,
}
const GOLDEN = '#C9A96E'

const ACCOUNT_TYPES = ['checking', 'savings', 'credit_card', 'cash', 'business_checking', 'business_credit_card', 'loan']
const TYPE_ICONS: Record<string, string> = {
  checking: '🏦', savings: '🐖', credit_card: '💳', cash: '💵',
  business_checking: '🏢', business_credit_card: '💼', loan: '📋',
}

interface Account {
  id: string; nickname: string; institution_name: string | null; account_type: string
  last_four: string | null; ownership_type: string; current_balance: number | null
  available_balance: number | null; credit_limit: number | null; statement_balance: number | null
  minimum_payment: number | null; payment_due_date: string | null
  include_in_safe_to_spend: boolean; plaid_account_id: string | null
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nickname: '', institution_name: '', account_type: 'checking', last_four: '', ownership_type: 'personal', current_balance: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/money/accounts', { cache: 'no-store' })
      const data = await res.json()
      setAccounts(data.accounts ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addAccount() {
    if (!form.nickname.trim()) return
    setSaving(true)
    try {
      await fetch('/api/money/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, current_balance: form.current_balance ? parseFloat(form.current_balance) : null }),
      })
      setForm({ nickname: '', institution_name: '', account_type: 'checking', last_four: '', ownership_type: 'personal', current_balance: '' })
      setShowAdd(false)
      await load()
    } catch { /* ignore */ }
    setSaving(false)
  }

  async function toggleIncluded(acct: Account) {
    await fetch('/api/money/accounts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: acct.id, include_in_safe_to_spend: !acct.include_in_safe_to_spend }),
    })
    setAccounts(prev => prev.map(a => a.id === acct.id ? { ...a, include_in_safe_to_spend: !a.include_in_safe_to_spend } : a))
  }

  const totalBalance = accounts.filter(a => a.account_type !== 'credit_card' && a.account_type !== 'business_credit_card' && a.account_type !== 'loan')
    .reduce((s, a) => s + (a.current_balance ?? 0), 0)

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 2 }}>Accounts</h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Checking, savings, cards, cash, and loans</p>
            </div>
            <button onClick={load} style={{ padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div style={{ ...CARD, background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.2)', textAlign: 'center', padding: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLDEN, marginBottom: 8 }}>Total Balance</p>
            <p style={{ fontSize: 36, fontWeight: 700, color: GOLDEN }}>{formatCurrency(totalBalance)}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ ...CARD, textAlign: 'center', padding: 32 }}>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>No accounts yet.</p>
            </div>
          ) : (
            accounts.map(acct => (
              <div key={acct.id} style={CARD}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 26 }}>{TYPE_ICONS[acct.account_type] ?? '💰'}</div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 2 }}>{acct.nickname}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>
                        {acct.account_type.replace('_', ' ')}{acct.last_four ? ` · ···${acct.last_four}` : ''} · {acct.ownership_type}
                        {acct.plaid_account_id && ' · linked'}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: GOLDEN }}>{formatCurrency(acct.current_balance ?? 0)}</p>
                  </div>
                </div>
                {(acct.account_type === 'credit_card' || acct.account_type === 'business_credit_card') && acct.credit_limit && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    Limit {formatCurrency(acct.credit_limit)}{acct.minimum_payment ? ` · Min payment ${formatCurrency(acct.minimum_payment)}` : ''}{acct.payment_due_date ? ` · Due ${acct.payment_due_date}` : ''}
                  </div>
                )}
                <button onClick={() => toggleIncluded(acct)}
                  style={{ marginTop: 10, fontSize: 11, color: acct.include_in_safe_to_spend ? GOLDEN : 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {acct.include_in_safe_to_spend ? '✓ Counted in Safe to Spend' : 'Not counted in Safe to Spend'}
                </button>
              </div>
            ))
          )}

          {showAdd ? (
            <div style={CARD}>
              <input value={form.nickname} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))} placeholder="Nickname (e.g. Chase Total Checking)"
                style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, color: 'white', outline: 'none', marginBottom: 10, boxSizing: 'border-box', colorScheme: 'dark' }} />
              <input value={form.institution_name} onChange={e => setForm(p => ({ ...p, institution_name: e.target.value }))} placeholder="Institution (e.g. Chase)"
                style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, color: 'white', outline: 'none', marginBottom: 10, boxSizing: 'border-box', colorScheme: 'dark' }} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select value={form.account_type} onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 8px', fontSize: 12.5, color: 'white' }}>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
                <select value={form.ownership_type} onChange={e => setForm(p => ({ ...p, ownership_type: e.target.value }))}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 8px', fontSize: 12.5, color: 'white' }}>
                  <option value="personal">personal</option>
                  <option value="business">business</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input value={form.last_four} onChange={e => setForm(p => ({ ...p, last_four: e.target.value }))} placeholder="Last 4"
                  style={{ width: 90, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, color: 'white', outline: 'none', colorScheme: 'dark' }} />
                <input value={form.current_balance} onChange={e => setForm(p => ({ ...p, current_balance: e.target.value }))} placeholder="Current balance" type="number"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, color: 'white', outline: 'none', colorScheme: 'dark' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addAccount} disabled={saving || !form.nickname.trim()}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'linear-gradient(135deg, #C9A96E, #B8903A)', color: '#1A1240', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save account'}
                </button>
                <button onClick={() => setShowAdd(false)} style={{ padding: '11px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 14, background: 'transparent', border: '1.5px dashed rgba(201,169,110,0.25)', color: GOLDEN, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4 }}>
              <Plus className="h-4 w-4" /> Add account manually
            </button>
          )}

          <a href="/money/connect" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 14, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', color: GOLDEN, fontSize: 13, fontWeight: 600, textDecoration: 'none', marginTop: 10 }}>
            <LinkIcon className="h-4 w-4" /> Connect a bank via Plaid
          </a>
        </div>
      </AppLayout>
    </div>
  )
}
