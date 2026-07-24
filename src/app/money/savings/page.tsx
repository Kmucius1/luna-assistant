'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/money/format'
import { AppLayout } from '@/components/layout/AppLayout'
import styles from '../money.module.css'

interface Goal { id: string; name: string; goal_type: string; target_amount: number; current_amount: number; target_date: string | null }

const GOAL_TYPES = ['emergency_fund', 'business_equipment', 'travel', 'home', 'taxes', 'car', 'custom']
const GOAL_ICON: Record<string, string> = { emergency_fund: '🌳', business_equipment: '💼', travel: '✈️', home: '🏡', taxes: '📄', car: '🚗', custom: '💰' }

export default function SavingsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', goal_type: 'custom', target_amount: '', current_amount: '', target_date: '' })

  function load() {
    setLoading(true)
    fetch('/api/money/goals', { cache: 'no-store' }).then(r => r.json()).then(d => setGoals(d.goals ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function saveGoal() {
    if (!form.name.trim() || !form.target_amount) return
    await fetch('/api/money/goals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), goal_type: form.goal_type, target_amount: Number(form.target_amount), current_amount: Number(form.current_amount) || 0, target_date: form.target_date || null }),
    })
    setForm({ name: '', goal_type: 'custom', target_amount: '', current_amount: '', target_date: '' })
    setAdding(false)
    load()
  }

  return (
    <div className={styles.page}>
    <AppLayout noPad>
      <div className={styles.topRow}>
        <Link href="/money" className={styles.iconButton} aria-label="Back"><ChevronLeft size={18} /></Link>
        <h1 style={{ fontFamily: 'var(--font-display-var, serif)', fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', margin: 0 }}>Savings</h1>
        <button type="button" onClick={() => setAdding(a => !a)} className={styles.iconButton}><Plus size={18} /></button>
      </div>

      {adding && (
        <div className={styles.stsCard}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Goal name (e.g. Travel: Italy 2025)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={{ minHeight: 42, borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', padding: '0 12px', fontSize: 13 }} />
            <select value={form.goal_type} onChange={e => setForm(f => ({ ...f, goal_type: e.target.value }))} style={{ minHeight: 42, borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', padding: '0 12px', fontSize: 13 }}>
              {GOAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <input placeholder="Target amount" type="number" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
              style={{ minHeight: 42, borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', padding: '0 12px', fontSize: 13 }} />
            <input placeholder="Current amount (optional)" type="number" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))}
              style={{ minHeight: 42, borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', padding: '0 12px', fontSize: 13 }} />
            <input placeholder="Target date (optional)" type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
              style={{ minHeight: 42, borderRadius: 12, border: '1px solid rgba(180,150,100,0.2)', padding: '0 12px', fontSize: 13 }} />
            <button type="button" onClick={saveGoal} disabled={!form.name.trim() || !form.target_amount}
              style={{ minHeight: 42, borderRadius: 12, border: 'none', background: 'var(--gold)', color: '#fff', fontWeight: 700, fontSize: 13 }}>Save Goal</button>
          </div>
        </div>
      )}

      {loading ? <p className={styles.loadingText}>Loading savings…</p> : goals.length === 0 ? (
        <div className={styles.stsCard} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>No savings goals yet. Add one to start tracking progress toward what you&apos;re building.</p>
        </div>
      ) : goals.map(g => {
        const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0
        return (
          <div key={g.id} className={styles.stsCard} style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div className={styles.savingsIcon} style={{ width: 36, height: 36, fontSize: 17 }}>{GOAL_ICON[g.goal_type] ?? '💰'}</div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: 14, color: 'var(--ink-1)' }}>{g.name}</strong>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}{g.target_date ? ` · by ${g.target_date}` : ''}</span>
              </div>
              <strong style={{ fontSize: 15, color: 'var(--gold)' }}>{pct}%</strong>
            </div>
            <div className={styles.savingsTrack} style={{ marginLeft: 0 }}><div className={styles.savingsFill} style={{ width: `${pct}%` }} /></div>
          </div>
        )
      })}
    </AppLayout>
    </div>
  )
}
