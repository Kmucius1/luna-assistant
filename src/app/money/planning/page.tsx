'use client'
import { useState, useMemo } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
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
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.42)',
}

interface VarCategory {
  label: string
  amount: number
}

interface PlanState {
  month: string
  expected_income: number
  savings_goal: number
  var_spending: VarCategory[]
}

const FIXED_BILLS = [
  { label: 'AT&T', amount: 340 },
  { label: 'Spectrum', amount: 40 },
]
const SUBS_TOTAL = 225.27

const DEFAULT_PLAN: PlanState = {
  month: new Date().toISOString().slice(0, 7),
  expected_income: 0,
  savings_goal: 500,
  var_spending: [
    { label: 'Groceries',   amount: 0 },
    { label: 'Gas',         amount: 0 },
    { label: 'Dining Out',  amount: 0 },
    { label: 'Shopping',    amount: 0 },
    { label: 'Self-Care',   amount: 0 },
    { label: 'Other',       amount: 0 },
  ],
}

const JOURNAL_PROMPTS = [
  'What is my most impulsive spending habit? What emotion drives it?',
  'If I had an extra $500 this month, where would I put it first?',
  'What\'s one subscription I\'ve been meaning to cancel for 3+ months?',
]

export default function PlanningPage() {
  const [plan, setPlan] = useState<PlanState>(DEFAULT_PLAN)
  const [editingIncome, setEditingIncome] = useState(false)
  const [activePrompt, setActivePrompt] = useState<string | null>(null)

  const fixed_total = FIXED_BILLS.reduce((s, b) => s + b.amount, 0)
  const var_total = plan.var_spending.reduce((s, c) => s + (c.amount || 0), 0)

  const { remaining, safe_per_day } = useMemo(() => {
    const all_fixed = fixed_total + SUBS_TOTAL
    const total_committed = all_fixed + var_total + plan.savings_goal
    const rem = plan.expected_income - total_committed
    const safe = Math.max(0, rem) / 30
    return { remaining: rem, safe_per_day: safe }
  }, [fixed_total, var_total, plan.savings_goal, plan.expected_income])

  function updateVarAmount(idx: number, value: number) {
    setPlan(prev => ({
      ...prev,
      var_spending: prev.var_spending.map((c, i) => i === idx ? { ...c, amount: value } : c),
    }))
  }

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>

          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>Monthly Planning</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Build your plan before the month builds itself</p>
          </div>

          {/* Month selector */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <p style={{ ...LABEL_STYLE, marginBottom: 0 }}>Month</p>
            <input
              type="month"
              value={plan.month}
              onChange={e => setPlan(prev => ({ ...prev, month: e.target.value }))}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none',
              }}
            />
          </div>

          {/* Expected Income */}
          <div style={{ ...CARD, padding: 18, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingIncome ? 12 : 0 }}>
              <div>
                <p style={{ ...LABEL_STYLE, marginBottom: 3 }}>Expected Income</p>
                {!editingIncome && (
                  <p style={{ fontSize: 26, fontWeight: 700, color: GREEN }}>{formatCurrency(plan.expected_income)}</p>
                )}
              </div>
              <button onClick={() => setEditingIncome(v => !v)}
                style={{ background: 'none', border: `1px solid rgba(255,255,255,0.2)`, borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                {editingIncome ? 'Done' : 'Edit'}
              </button>
            </div>
            {editingIncome && (
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Enter your expected total income for the month</p>
                <input
                  type="number"
                  value={plan.expected_income || ''}
                  onChange={e => setPlan(prev => ({ ...prev, expected_income: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  style={{
                    width: '100%', height: 44, borderRadius: 10, border: '1px solid rgba(201,169,110,0.4)',
                    background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 18, fontWeight: 700,
                    padding: '0 14px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>

          {/* Fixed Commitments */}
          <div style={{ ...CARD, padding: 18, marginBottom: 14 }}>
            <p style={{ ...LABEL_STYLE, marginBottom: 14 }}>Fixed Commitments</p>
            {FIXED_BILLS.map(bill => (
              <div key={bill.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{bill.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: AMBER }}>{formatCurrency(bill.amount)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Subscriptions (19)</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: GOLDEN }}>{formatCurrency(SUBS_TOTAL)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Fixed Total</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: RED }}>{formatCurrency(fixed_total + SUBS_TOTAL)}</span>
            </div>
          </div>

          {/* Variable Spending Budget */}
          <div style={{ ...CARD, padding: 18, marginBottom: 14 }}>
            <p style={{ ...LABEL_STYLE, marginBottom: 14 }}>Variable Budget</p>
            {plan.var_spending.map((cat, idx) => (
              <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', flex: 1 }}>{cat.label}</span>
                <div style={{ position: 'relative', width: 100 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>$</span>
                  <input
                    type="number"
                    value={cat.amount || ''}
                    onChange={e => updateVarAmount(idx, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    style={{
                      width: '100%', height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 13, fontWeight: 600,
                      paddingLeft: 22, paddingRight: 8, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Variable Total</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: GOLDEN }}>{formatCurrency(var_total)}</span>
            </div>
          </div>

          {/* Savings Goal */}
          <div style={{ ...CARD, padding: 18, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 0 }}>Savings Goal</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>{formatCurrency(plan.savings_goal)}</p>
            </div>
            <input
              type="range"
              min={0} max={2000} step={50}
              value={plan.savings_goal}
              onChange={e => setPlan(prev => ({ ...prev, savings_goal: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: GREEN }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>$0</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>$2,000</span>
            </div>
          </div>

          {/* Output Panel */}
          <div style={{
            ...CARD,
            padding: 20,
            marginBottom: 18,
            border: remaining >= 0 ? `1px solid rgba(90,138,106,0.35)` : `1px solid rgba(201,107,90,0.35)`,
            background: remaining >= 0 ? 'rgba(90,138,106,0.07)' : 'rgba(201,107,90,0.07)',
          }}>
            <p style={{ ...LABEL_STYLE, marginBottom: 14, color: remaining >= 0 ? GREEN : RED }}>Plan Summary</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Expected Income</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>{formatCurrency(plan.expected_income)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Total Committed</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: AMBER }}>{formatCurrency(fixed_total + SUBS_TOTAL + var_total + plan.savings_goal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Remaining</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: remaining >= 0 ? GREEN : RED }}>{formatCurrency(remaining)}</span>
            </div>
            <div style={{ padding: 14, borderRadius: 12, background: remaining >= 0 ? 'rgba(90,138,106,0.12)' : 'rgba(201,107,90,0.12)', border: `1px solid ${remaining >= 0 ? GREEN : RED}33`, textAlign: 'center' }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 4, color: remaining >= 0 ? GREEN : RED }}>Safe to Spend / Day</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: remaining >= 0 ? GREEN : RED }}>{formatCurrency(safe_per_day)}</p>
              {remaining < 0 && (
                <p style={{ fontSize: 12, color: RED, marginTop: 6 }}>Your plan is over budget by {formatCurrency(Math.abs(remaining))}. Reduce variable spending or lower savings goal.</p>
              )}
            </div>
          </div>

          {/* Journal Prompts */}
          <div style={{ ...CARD, padding: 18, marginBottom: 14 }}>
            <p style={{ ...LABEL_STYLE, marginBottom: 14 }}>Reflection Prompts</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>Answer one before you finalize your plan.</p>
            {JOURNAL_PROMPTS.map(prompt => (
              <div
                key={prompt}
                onClick={() => setActivePrompt(activePrompt === prompt ? null : prompt)}
                style={{
                  padding: '12px 14px',
                  borderLeft: `3px solid ${GOLDEN}`,
                  background: activePrompt === prompt ? 'rgba(201,169,110,0.08)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '0 10px 10px 0',
                  marginBottom: 8,
                  cursor: 'pointer',
                }}>
                <p style={{ fontSize: 13, color: activePrompt === prompt ? GOLDEN : 'rgba(255,255,255,0.7)', lineHeight: 1.55 }}>{prompt}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.65 }}>
            Plans protect you when willpower fades. Set it once, protect it all month.
          </p>

        </div>
      </AppLayout>
    </div>
  )
}
