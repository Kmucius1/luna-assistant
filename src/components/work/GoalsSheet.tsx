'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Minus, Plus, Trophy } from 'lucide-react'

import { BottomSheet } from '@/components/ui/BottomSheet'
import styles from './WorkViews.module.css'

interface Goal { id: string; title: string; notes?: string; target_date?: string; progress_percent: number; status: string }

interface GoalsSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function GoalsSheet({ isOpen, onClose }: GoalsSheetProps) {
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    fetch('/api/work/goals', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setGoals(data.goals ?? []))
      .catch(() => setGoals([]))
  }, [])

  useEffect(() => { if (isOpen) load() }, [isOpen, load])

  async function addGoal() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/work/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), target_date: targetDate || undefined }),
      })
      if (res.ok) { setTitle(''); setTargetDate(''); load() }
    } finally {
      setSaving(false)
    }
  }

  async function step(goal: Goal, delta: number) {
    const next = Math.max(0, Math.min(100, goal.progress_percent + delta))
    setGoals(gs => gs?.map(g => g.id === goal.id ? { ...g, progress_percent: next } : g) ?? gs)
    fetch(`/api/work/goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress_percent: next }),
    }).catch(() => {})
  }

  async function complete(goal: Goal) {
    setGoals(gs => gs?.map(g => g.id === goal.id ? { ...g, status: 'completed', progress_percent: 100 } : g) ?? gs)
    fetch(`/api/work/goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', progress_percent: 100 }),
    }).catch(() => {})
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Goals" subtitle="Track progress on what matters" height="80vh">
      <label className={styles.sheetLabel}>New goal</label>
      <input className={styles.sheetInput} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sign 3 new clients this quarter" />
      <label className={styles.sheetLabel}>Target date (optional)</label>
      <input className={styles.sheetInput} type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
      <button type="button" className={styles.sheetSubmit} onClick={addGoal} disabled={saving || !title.trim()}>
        <Trophy size={13} /> {saving ? 'Adding…' : 'Add Goal'}
      </button>

      <label className={styles.sheetLabel} style={{ marginTop: 18 }}>Your goals</label>
      {goals === null ? (
        <p className={styles.sheetMsg}>Loading…</p>
      ) : goals.length === 0 ? (
        <p className={styles.sheetMsg}>No goals yet — add your first one above.</p>
      ) : (
        goals.map(g => (
          <div key={g.id} className={styles.goalCard}>
            <div className={styles.goalTop}>
              <span className={`${styles.goalTitle} ${g.status === 'completed' ? styles.goalTitleDone : ''}`}>{g.title}</span>
              {g.target_date && <span className={styles.goalDue}>{new Date(`${g.target_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            </div>
            <div className={styles.goalBar}><div className={styles.goalBarFill} style={{ width: `${g.progress_percent}%` }} /></div>
            {g.status !== 'completed' && (
              <div className={styles.goalControls}>
                <button type="button" className={styles.goalStepButton} onClick={() => step(g, -10)} aria-label="Decrease progress"><Minus size={13} /></button>
                <span className={styles.goalPercent}>{g.progress_percent}%</span>
                <button type="button" className={styles.goalStepButton} onClick={() => step(g, 10)} aria-label="Increase progress"><Plus size={13} /></button>
                <button type="button" className={styles.goalCompleteButton} onClick={() => complete(g)}><Check size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Mark complete</button>
              </div>
            )}
          </div>
        ))
      )}
    </BottomSheet>
  )
}
