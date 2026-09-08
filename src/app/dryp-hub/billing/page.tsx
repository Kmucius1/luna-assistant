'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ArrowLeft, Plus, DollarSign } from 'lucide-react'
import Link from 'next/link'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const STATUS_OPTIONS = ['draft', 'ready_to_invoice', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'disputed', 'cancelled'] as const
type Status = typeof STATUS_OPTIONS[number]

const STATUS_STYLES: Record<Status, { bg: string; color: string; label: string }> = {
  draft:            { bg: 'rgba(180,150,100,0.14)', color: '#5E5474', label: 'Draft' },
  ready_to_invoice: { bg: 'rgba(90,138,164,0.14)',  color: '#4A7A96', label: 'Ready to invoice' },
  sent:             { bg: 'rgba(90,138,164,0.18)',  color: '#4A7A96', label: 'Sent' },
  viewed:           { bg: 'rgba(201,169,110,0.18)', color: '#8A6F2A', label: 'Viewed' },
  partially_paid:   { bg: 'rgba(201,169,110,0.22)', color: '#8A6F2A', label: 'Partially paid' },
  paid:             { bg: 'rgba(90,180,90,0.16)',   color: '#4A8A4A', label: 'Paid' },
  overdue:          { bg: 'rgba(224,94,94,0.16)',   color: '#B23B3B', label: 'Overdue' },
  disputed:         { bg: 'rgba(224,94,94,0.12)',   color: '#B23B3B', label: 'Disputed' },
  cancelled:        { bg: 'rgba(180,150,100,0.10)', color: '#5E5474', label: 'Cancelled' },
}

interface Account { id: string; business_name: string }
interface BillingProfile {
  id: string; dryp_account_id: string; client_name: string
  billing_type: 'retainer' | 'one_time' | 'mixed'
  retainer_amount: number | null; recurring_billing_day: number | null; payment_method: string | null
}
interface Invoice {
  id: string; dryp_account_id: string; client_name: string; invoice_number: string | null
  amount: number; deposit_required: number | null; deposit_paid: number | null
  invoice_date: string | null; due_date: string | null; paid_date: string | null
  status: Status; last_follow_up: string | null; next_follow_up: string | null
  remainingBalance: number; daysOutstanding: number | null; isOverdue: boolean
}

export default function DrypBillingPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [profiles, setProfiles] = useState<BillingProfile[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [accountsReceivable, setAccountsReceivable] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'ar' | 'clients'>('ar')

  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [newAccountId, setNewAccountId] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newStatus, setNewStatus] = useState<Status>('draft')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [accRes, billRes, invRes] = await Promise.all([
      fetch('/api/dryp/accounts').then(r => r.json()).catch(() => ({ accounts: [] })),
      fetch('/api/dryp/billing').then(r => r.json()).catch(() => ({ profiles: [] })),
      fetch('/api/dryp/invoices').then(r => r.json()).catch(() => ({ invoices: [], accountsReceivable: [] })),
    ])
    setAccounts((accRes.accounts ?? []).map((a: { id: string; business_name: string }) => ({ id: a.id, business_name: a.business_name })))
    setProfiles(billRes.profiles ?? [])
    setInvoices(invRes.invoices ?? [])
    setAccountsReceivable(invRes.accountsReceivable ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createInvoice() {
    const account = accounts.find(a => a.id === newAccountId)
    if (!account || !newAmount) return
    setCreating(true)
    try {
      await fetch('/api/dryp/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryp_account_id: account.id, client_name: account.business_name,
          amount: Number(newAmount), due_date: newDueDate || null, status: newStatus,
        }),
      })
      setNewAccountId(''); setNewAmount(''); setNewDueDate(''); setNewStatus('draft'); setShowNewInvoice(false)
      await load()
    } finally {
      setCreating(false)
    }
  }

  async function updateInvoiceStatus(id: string, status: Status) {
    setInvoices(prev => prev.map(i => (i.id === id ? { ...i, status } : i)))
    await fetch(`/api/dryp/invoices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    load()
  }

  async function saveBillingProfile(accountId: string, businessName: string, updates: Partial<BillingProfile>) {
    const existing = profiles.find(p => p.dryp_account_id === accountId)
    await fetch('/api/dryp/billing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dryp_account_id: accountId, client_name: businessName,
        billing_type: updates.billing_type ?? existing?.billing_type ?? 'one_time',
        retainer_amount: updates.retainer_amount ?? existing?.retainer_amount ?? null,
        recurring_billing_day: updates.recurring_billing_day ?? existing?.recurring_billing_day ?? null,
        payment_method: updates.payment_method ?? existing?.payment_method ?? null,
      }),
    })
    load()
  }

  const totalOutstanding = accountsReceivable.reduce((s, i) => s + i.remainingBalance, 0)
  const overdueCount = accountsReceivable.filter(i => i.isOverdue).length

  return (
    <div style={{ background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)', minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">
          <Link href="/dryp-hub" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5E5474', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
            <ArrowLeft className="h-3.5 w-3.5" /> DRYP Hub
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display, serif)', fontSize: 24, fontWeight: 700, color: '#100C1E', marginBottom: 4 }}>Billing &amp; Invoices</h1>
          <p style={{ fontSize: 13, color: '#5E5474', marginBottom: 16 }}>Client billing terms, invoices, and accounts receivable.</p>

          <div style={{ ...GLASS, padding: 18, marginBottom: 16, display: 'flex', gap: 24 }}>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#100C1E' }}>${totalOutstanding.toFixed(0)}</p>
              <p style={{ fontSize: 11, color: '#5E5474' }}>Outstanding</p>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: overdueCount > 0 ? '#B23B3B' : '#100C1E' }}>{overdueCount}</p>
              <p style={{ fontSize: 11, color: '#5E5474' }}>Overdue</p>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#100C1E' }}>{invoices.length}</p>
              <p style={{ fontSize: 11, color: '#5E5474' }}>Total invoices</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {([['ar', 'Accounts Receivable'], ['clients', 'Client Billing']] as [typeof tab, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setTab(v)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === v ? '#5C4530' : 'rgba(255,255,255,0.5)', color: tab === v ? 'white' : '#5E5474' }}>
                {label}
              </button>
            ))}
          </div>

          {loading && <div style={{ ...GLASS, height: 100, marginBottom: 12 }} />}

          {!loading && tab === 'ar' && (
            <>
              <button onClick={() => setShowNewInvoice(v => !v)} style={{ width: '100%', padding: '12px 0', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #5C4530, #B8934A)', color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12, cursor: 'pointer' }}>
                <Plus className="h-4 w-4" /> New Invoice
              </button>

              {showNewInvoice && (
                <div style={{ ...GLASS, padding: 16, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <select value={newAccountId} onChange={e => setNewAccountId(e.target.value)} style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', fontSize: 13, background: 'white' }}>
                    <option value="">Select client…</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.business_name}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" placeholder="Amount ($)" value={newAmount} onChange={e => setNewAmount(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', fontSize: 13 }} />
                    <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', fontSize: 13 }} />
                  </div>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value as Status)} style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', fontSize: 13, background: 'white' }}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
                  </select>
                  <button onClick={createInvoice} disabled={creating || !newAccountId || !newAmount} style={{ padding: '11px 0', borderRadius: 12, border: 'none', background: '#5C4530', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (creating || !newAccountId || !newAmount) ? 0.5 : 1 }}>
                    {creating ? 'Creating…' : 'Create Invoice'}
                  </button>
                </div>
              )}

              {accountsReceivable.length === 0 ? (
                <div style={{ ...GLASS, padding: 24, textAlign: 'center' }}>
                  <DollarSign className="h-5 w-5 mx-auto mb-2" style={{ color: '#5E5474' }} />
                  <p style={{ fontSize: 13, color: '#5E5474' }}>Nothing outstanding right now.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {accountsReceivable.map(inv => (
                    <div key={inv.id} style={{ ...GLASS, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E' }}>{inv.client_name}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: STATUS_STYLES[inv.status].bg, color: STATUS_STYLES[inv.status].color }}>
                          {STATUS_STYLES[inv.status].label}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#5E5474', marginBottom: 8 }}>
                        ${inv.remainingBalance.toFixed(0)} remaining of ${inv.amount.toFixed(0)}
                        {inv.due_date && ` · due ${inv.due_date}`}
                        {inv.daysOutstanding != null && ` · ${inv.daysOutstanding}d outstanding`}
                      </p>
                      <select value={inv.status} onChange={e => updateInvoiceStatus(inv.id, e.target.value as Status)} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(180,150,100,0.2)', fontSize: 12, background: 'white' }}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && tab === 'clients' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {accounts.map(a => {
                const profile = profiles.find(p => p.dryp_account_id === a.id)
                return (
                  <div key={a.id} style={{ ...GLASS, padding: 14 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E', marginBottom: 8 }}>{a.business_name}</p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <select
                        defaultValue={profile?.billing_type ?? 'one_time'}
                        onChange={e => saveBillingProfile(a.id, a.business_name, { billing_type: e.target.value as BillingProfile['billing_type'] })}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(180,150,100,0.2)', fontSize: 12, background: 'white' }}
                      >
                        <option value="one_time">One-time</option>
                        <option value="retainer">Retainer</option>
                        <option value="mixed">Mixed</option>
                      </select>
                      <input
                        type="number" placeholder="Retainer $/mo" defaultValue={profile?.retainer_amount ?? ''}
                        onBlur={e => saveBillingProfile(a.id, a.business_name, { retainer_amount: e.target.value ? Number(e.target.value) : null })}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(180,150,100,0.2)', fontSize: 12 }}
                      />
                    </div>
                    <input
                      placeholder="Payment method" defaultValue={profile?.payment_method ?? ''}
                      onBlur={e => saveBillingProfile(a.id, a.business_name, { payment_method: e.target.value || null })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(180,150,100,0.2)', fontSize: 12 }}
                    />
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
