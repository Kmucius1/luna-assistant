'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, Check, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/money'
import { createClient } from '@/lib/supabase/client'

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

interface Transaction {
  id: string
  merchant_name: string | null
  name: string | null
  amount: number
  transaction_date: string
  category_primary: string | null
  account_name: string | null
  pending: boolean | null
}

interface Toast { id: string; text: string; color: string }

const ACTIONS: Record<string, string> = {
  personal:     'Personal Expense',
  business:     'Business Expense',
  cancel_report:'Cancel / Report',
  subscription: 'Subscription',
  know:         'I Know This',
}

export default function ReviewPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState<Record<string, string>>({})
  const [noteVisible, setNoteVisible] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const [autoReviewing, setAutoReviewing] = useState(false)
  const supabase = createClient()

  function addToast(text: string, color: string) {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, text, color }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('money_transactions')
        .select('*')
        .eq('needs_review', true)
        .order('transaction_date', { ascending: false })
        .limit(50)
      setTransactions((data ?? []) as Transaction[])
    } catch {
      console.error('Failed to load review transactions')
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  async function handleAction(txnId: string, txnMerchant: string | null, txnAmount: number, action: string) {
    if (action === 'know') {
      setNoteVisible(prev => ({ ...prev, [txnId]: true }))
      setActions(prev => ({ ...prev, [txnId]: action }))
      return
    }

    setActions(prev => ({ ...prev, [txnId]: action }))

    const updates: Record<string, unknown> = { needs_review: false }
    if (action === 'personal') updates['expense_type'] = 'personal'
    if (action === 'business') { updates['is_business_expense'] = true; updates['expense_type'] = 'business' }
    if (action === 'subscription') { updates['is_subscription'] = true; updates['expense_type'] = 'subscription' }
    if (action === 'cancel_report') updates['expense_type'] = 'disputed'

    await supabase.from('money_transactions').update(updates).eq('id', txnId)

    const label = txnMerchant ?? 'Transaction'
    const color = action === 'personal' ? GOLDEN : action === 'business' ? '#6A8AE8' : action === 'subscription' ? GREEN : RED
    addToast(`${label}: marked as ${ACTIONS[action] ?? action}`, color)
  }

  async function submitNote(txnId: string, txnMerchant: string | null) {
    const note = notes[txnId] ?? ''
    await supabase.from('money_transactions').update({ needs_review: false, notes: note }).eq('id', txnId)
    addToast(`${txnMerchant ?? 'Transaction'}: note saved`, GREEN)
    setNoteVisible(prev => ({ ...prev, [txnId]: false }))
  }

  async function runAutoReview() {
    setAutoReviewing(true)
    try {
      await fetch('/api/money/daily-check', { method: 'POST' })
      addToast('LUNA finished auto-reviewing your transactions.', GOLDEN)
      await loadTransactions()
    } catch {
      addToast('Auto-review failed. Try again.', RED)
    }
    setAutoReviewing(false)
  }

  const unreviewed = transactions.filter(t => !actions[t.id])
  const reviewed = transactions.filter(t => !!actions[t.id])

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>

          {/* Toast area */}
          <div style={{ position: 'fixed', top: 72, right: 12, left: 12, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
            {toasts.map(t => (
              <div key={t.id} style={{
                background: 'rgba(22,16,56,0.97)',
                border: `1px solid ${t.color}`,
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 13,
                color: t.color,
                fontWeight: 600,
                pointerEvents: 'auto',
              }}>
                {t.text}
              </div>
            ))}
          </div>

          {/* Header */}
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>Review Charges</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Flag, categorize, or dismiss unknown transactions</p>
          </div>

          {/* Summary */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <div style={{ ...CARD, flex: 1, padding: 14 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 5 }}>Unreviewed</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: AMBER }}>{unreviewed.length}</p>
            </div>
            <div style={{ ...CARD, flex: 1, padding: 14 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 5 }}>Reviewed</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>{reviewed.length}</p>
            </div>
          </div>

          {/* Auto-review button */}
          <button
            onClick={() => { void runAutoReview() }}
            disabled={autoReviewing}
            style={{
              width: '100%', height: 44, borderRadius: 14, border: `1px solid rgba(201,169,110,0.4)`,
              background: 'rgba(201,169,110,0.08)', color: GOLDEN, fontSize: 13, fontWeight: 700,
              cursor: autoReviewing ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 20,
            }}>
            {autoReviewing
              ? <><RefreshCw style={{ width: 15, height: 15 }} className="animate-spin" /> LUNA is reviewing...</>
              : <><RefreshCw style={{ width: 15, height: 15 }} /> Auto-Review with LUNA</>
            }
          </button>

          {/* Transaction list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.4)' }} className="animate-spin mx-auto" />
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ ...CARD, padding: 40, textAlign: 'center' }}>
              <Check style={{ width: 32, height: 32, color: GREEN, margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, color: 'white', fontWeight: 600, marginBottom: 6 }}>All clear!</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>No transactions need review right now.</p>
            </div>
          ) : (
            <div>
              {unreviewed.length > 0 && (
                <div>
                  <p style={{ ...LABEL_STYLE, marginBottom: 12 }}>Needs Review</p>
                  {unreviewed.map(txn => {
                    const displayName = txn.merchant_name ?? txn.name ?? 'Unknown Charge'
                    return (
                      <div key={txn.id} style={{
                        ...CARD,
                        padding: 16,
                        marginBottom: 12,
                        border: `1px solid rgba(201,146,58,0.3)`,
                        background: 'rgba(201,146,58,0.06)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 3 }}>{displayName}</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{txn.transaction_date}</span>
                              {txn.account_name && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{txn.account_name}</span>}
                              {txn.category_primary && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{txn.category_primary}</span>}
                              {txn.pending && <span style={{ fontSize: 11, color: AMBER, fontWeight: 600 }}>PENDING</span>}
                            </div>
                          </div>
                          <p style={{ fontSize: 17, fontWeight: 700, color: AMBER, flexShrink: 0 }}>{formatCurrency(txn.amount)}</p>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: noteVisible[txn.id] ? 10 : 0 }}>
                          <button onClick={() => { void handleAction(txn.id, txn.merchant_name, txn.amount, 'personal') }}
                            style={{ flex: 1, minWidth: 90, height: 34, borderRadius: 8, border: `1px solid ${GOLDEN}55`, background: `rgba(201,169,110,0.1)`, color: GOLDEN, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Personal
                          </button>
                          <button onClick={() => { void handleAction(txn.id, txn.merchant_name, txn.amount, 'business') }}
                            style={{ flex: 1, minWidth: 90, height: 34, borderRadius: 8, border: `1px solid rgba(106,138,232,0.5)`, background: `rgba(106,138,232,0.1)`, color: '#6A8AE8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Business
                          </button>
                          <button onClick={() => { void handleAction(txn.id, txn.merchant_name, txn.amount, 'cancel_report') }}
                            style={{ flex: 1, minWidth: 90, height: 34, borderRadius: 8, border: `1px solid ${RED}55`, background: `rgba(201,107,90,0.1)`, color: RED, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Cancel/Report
                          </button>
                          <button onClick={() => { void handleAction(txn.id, txn.merchant_name, txn.amount, 'subscription') }}
                            style={{ flex: 1, minWidth: 90, height: 34, borderRadius: 8, border: `1px solid ${GREEN}55`, background: `rgba(90,138,106,0.1)`, color: GREEN, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Subscription
                          </button>
                          <button onClick={() => { void handleAction(txn.id, txn.merchant_name, txn.amount, 'know') }}
                            style={{ flex: 1, minWidth: 90, height: 34, borderRadius: 8, border: `1px solid rgba(255,255,255,0.2)`, background: `rgba(255,255,255,0.06)`, color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            I Know This
                          </button>
                        </div>

                        {/* Note input for "I Know This" */}
                        {noteVisible[txn.id] && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Add a note..."
                              value={notes[txn.id] ?? ''}
                              onChange={e => setNotes(prev => ({ ...prev, [txn.id]: e.target.value }))}
                              style={{
                                flex: 1, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)',
                                background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 12,
                                padding: '0 12px', outline: 'none',
                              }}
                            />
                            <button onClick={() => { void submitNote(txn.id, txn.merchant_name) }}
                              style={{ height: 36, paddingLeft: 14, paddingRight: 14, borderRadius: 8, border: 'none', background: GREEN, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {reviewed.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <p style={{ ...LABEL_STYLE, marginBottom: 12, color: 'rgba(255,255,255,0.25)' }}>Reviewed This Session</p>
                  {reviewed.map(txn => {
                    const action = actions[txn.id]
                    const displayName = txn.merchant_name ?? txn.name ?? 'Unknown'
                    const actionLabel = ACTIONS[action] ?? action
                    return (
                      <div key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div>
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{displayName}</p>
                          <p style={{ fontSize: 11, color: GREEN }}>{actionLabel}</p>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{formatCurrency(txn.amount)}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {transactions.length > 0 && unreviewed.length === 0 && (
            <div style={{ ...CARD, padding: 28, textAlign: 'center', marginTop: 16 }}>
              <AlertTriangle style={{ width: 22, height: 22, color: GREEN, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 4 }}>All reviewed!</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>You reviewed {reviewed.length} charge{reviewed.length !== 1 ? 's' : ''} this session.</p>
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  )
}
