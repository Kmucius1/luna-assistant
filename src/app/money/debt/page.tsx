'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/money/format'
import { AppLayout } from '@/components/layout/AppLayout'
import styles from '../money.module.css'

interface Debt { id: string; creditor: string; balance: number; minimum_payment: number | null; due_date: string | null; apr: number | null; credit_limit: number | null }

export default function DebtPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ creditor: '', balance: '', minimum_payment: '', apr: '', due_date: '' })

  function load() {
    setLoading(true)
    fetch('/api/money/debts', { cache: 'no-store' }).then(r => r.json()).then(d => setDebts(d.debts ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function saveDebt() {
    if (!form.creditor.trim() || !form.balance) return
    await fetch('/api/money/debts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creditor: form.creditor.trim(), balance: Number(form.balance), minimum_payment: form.minimum_payment ? Number(form.minimum_payment) : null, apr: form.apr ? Number(form.apr) : null, due_date: form.due_date || null }),
    })
    setForm({ creditor: '', balance: '', minimum_payment: '', apr: '', due_date: '' })
    setAdding(false)
    load()
  }

  const totalBalance = debts.reduce((s, d) => s + (d.balance ?? 0), 0)
  const totalMin = debts.reduce((s, d) => s + (d.minimum_payment ?? 0), 0)

  return (
    <div className={styles.page}>
      <AppLayout noPad>
        <div className={styles.topRow}>
          <Link href="/money" className={styles.iconButton} aria-label="Back"><ChevronLeft size={18} /></Link>
          <h1 style={{ fontFamily: 'var(--font-display-var, serif)', fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', margin: 0 }}>Debt</h1>
          <button type="button" onClick={() => setAdding(a => !a)} className={styles.iconButton}><Plus size={18} /></button>
        </div>

        {!loading && debts.length > 0 && (
          <div className={styles.stsCard}>
            <div className={styles.stsLabel}>Total Debt</div>
            <p className={styles.stsNumber} style={{ fontSize: 30 }}>{formatCurrency(totalBalance)}</p>
            <p className={styles.stsPerDay}>{formatCurrency(totalMin)}/mo in minimum payments</p>
          </div>
        )}

        {adding && (
          <div className={styles.stsCard}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="Creditor name" value={form.creditor} onChange={e => setForm(f => ({ ...f, creditor: e.target.value }))}
                style={{ minHeight: 42, borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', padding: '0 12px', fontSize: 13 }} />
              <input placeholder="Current balance" type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                style={{ minHeight: 42, borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', padding: '0 12px', fontSize: 13 }} />
              <input placeholder="Minimum payment (optional)" type="number" value={form.minimum_payment} onChange={e => setForm(f => ({ ...f, minimum_payment: e.target.value }))}
                style={{ minHeight: 42, borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', padding: '0 12px', fontSize: 13 }} />
              <input placeholder="APR % (optional)" type="number" value={form.apr} onChange={e => setForm(f => ({ ...f, apr: e.target.value }))}
                style={{ minHeight: 42, borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', padding: '0 12px', fontSize: 13 }} />
              <input placeholder="Next due date (optional)" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                style={{ minHeight: 42, borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', padding: '0 12px', fontSize: 13 }} />
              <button type="button" onClick={saveDebt} disabled={!form.creditor.trim() || !form.balance}
                style={{ minHeight: 42, borderRadius: 12, border: 'none', background: 'var(--gold)', color: '#fff', fontWeight: 700, fontSize: 13 }}>Save Debt</button>
            </div>
          </div>
        )}

        {loading ? <p className={styles.loadingText}>Loading debt…</p> : debts.length === 0 ? (
          <div className={styles.stsCard} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>No debt tracked. Add a credit card or loan to see minimum payments protected in your Safe to Spend.</p>
          </div>
        ) : debts.map(d => (
          <div key={d.id} className={styles.stsCard} style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <strong style={{ fontSize: 14, color: 'var(--ink-1)' }}>{d.creditor}</strong>
              <strong style={{ fontSize: 16, color: 'var(--ink-1)' }}>{formatCurrency(d.balance)}</strong>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-3)' }}>
              {d.minimum_payment != null && `Min. payment ${formatCurrency(d.minimum_payment)}`}
              {d.due_date && ` · Due ${d.due_date}`}
              {d.apr != null && ` · ${d.apr}% APR`}
            </p>
          </div>
        ))}
      </AppLayout>
    </div>
  )
}
