'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Loader2 } from 'lucide-react'

const BG = 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)'
const GOLDEN = '#C9A96E'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(180,150,100,0.16)',
  borderRadius: 18, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: 18,
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}
const INPUT: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(180,150,100,0.2)',
  borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#100C1E', outline: 'none', boxSizing: 'border-box', colorScheme: 'light',
}
const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#5E5474', marginBottom: 6, display: 'block' }

interface Prefs {
  checking_safety_buffer: number; weekly_grocery_target: number | null; weekly_gas_target: number | null
  weekly_personal_target: number | null; emergency_goal: number; store_switch_savings_threshold: number
  planning_cutoff_date: string | null
}

export default function MoneySettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>({
    checking_safety_buffer: 100, weekly_grocery_target: null, weekly_gas_target: null,
    weekly_personal_target: null, emergency_goal: 1000, store_switch_savings_threshold: 10, planning_cutoff_date: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/money/settings').then(r => r.json()).then(d => {
      if (d.preferences) setPrefs(d.preferences)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/money/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefs) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    setSaving(false)
  }

  const field = (key: keyof Prefs, label: string) => (
    <div style={{ marginBottom: 14 }}>
      <label style={LABEL}>{label}</label>
      <input type="number" value={prefs[key] ?? ''} onChange={e => setPrefs(p => ({ ...p, [key]: e.target.value ? parseFloat(e.target.value) : null }))} style={INPUT} />
    </div>
  )

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px', maxWidth: 480 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#100C1E', marginBottom: 4 }}>Money Settings</h1>
          <p style={{ fontSize: 13, color: '#32284A', marginBottom: 18 }}>What Safe to Spend reserves before showing your real number.</p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: '#5E5474' }} /></div>
          ) : (
            <div style={CARD}>
              {field('checking_safety_buffer', 'Safety buffer ($) — always stays untouched')}
              {field('weekly_grocery_target', 'Weekly grocery reserve ($)')}
              {field('weekly_gas_target', 'Weekly gas reserve ($)')}
              {field('weekly_personal_target', 'Weekly personal spending target ($)')}
              {field('emergency_goal', 'Emergency fund goal ($)')}
              {field('store_switch_savings_threshold', 'Minimum savings to suggest switching stores ($)')}
              <div style={{ marginBottom: 4 }}>
                <label style={LABEL}>Planning cutoff date (safe-to-spend looks ahead to this date)</label>
                <input type="date" value={prefs.planning_cutoff_date ?? ''} onChange={e => setPrefs(p => ({ ...p, planning_cutoff_date: e.target.value || null }))} style={INPUT} />
              </div>
              <button onClick={save} disabled={saving}
                style={{ width: '100%', height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', marginTop: 14,
                  background: saved ? '#5A8A6A' : `linear-gradient(135deg, ${GOLDEN}, #B8903A)`, color: '#100C1E', fontSize: 14, fontWeight: 800, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save settings'}
              </button>
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  )
}
