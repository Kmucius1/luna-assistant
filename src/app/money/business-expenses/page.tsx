'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/money'
import { createClient } from '@/lib/supabase/client'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)'
const GOLDEN = '#C9A96E'
const GREEN = '#5A8A6A'

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
  notes: string | null
}

type FilterType = 'all' | 'dryp' | 'content' | 'marketing' | 'personal'

function isDryp(txn: Transaction): boolean {
  const name = (txn.merchant_name ?? txn.name ?? '').toLowerCase()
  return name.includes('canva') || name.includes('adobe') || name.includes('squarespace') || name.includes('mailchimp') || name.includes('claude') || name.includes('chatgpt') || name.includes('autods')
}

function isContent(txn: Transaction): boolean {
  const name = (txn.merchant_name ?? txn.name ?? '').toLowerCase()
  return name.includes('opus') || name.includes('capcut') || name.includes('descript') || name.includes('loom') || name.includes('frame.io')
}

function isMarketing(txn: Transaction): boolean {
  const name = (txn.merchant_name ?? txn.name ?? '').toLowerCase()
  return name.includes('facebook') || name.includes('meta') || name.includes('google ads') || name.includes('instagram') || name.includes('linkedin') || name.includes('siteseeker')
}

function getProjectTag(txn: Transaction): string {
  if (isDryp(txn)) return 'DRYP Digital'
  if (isContent(txn)) return 'Content'
  if (isMarketing(txn)) return 'Marketing'
  return 'DRYP General'
}

function TransactionRow({ txn, deductible, onToggleDeductible, projectTag, onProjectTagChange }: {
  txn: Transaction
  deductible: boolean
  onToggleDeductible: () => void
  projectTag: string
  onProjectTagChange: (v: string) => void
}) {
  const displayName = txn.merchant_name ?? txn.name ?? 'Unknown'
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{txn.transaction_date}</span>
            {txn.category_primary && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{txn.category_primary}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: GOLDEN }}>{formatCurrency(txn.amount)}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Deductible toggle */}
        <button onClick={onToggleDeductible} style={{
          height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
          background: deductible ? `rgba(90,138,106,0.25)` : 'rgba(255,255,255,0.07)',
          color: deductible ? GREEN : 'rgba(255,255,255,0.45)',
        }}>
          {deductible ? '✓ Deductible' : 'Not Deductible'}
        </button>
        {/* Project tag input */}
        <input
          type="text"
          value={projectTag}
          onChange={e => onProjectTagChange(e.target.value)}
          style={{
            height: 28, paddingLeft: 8, paddingRight: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)', fontSize: 11, outline: 'none',
            minWidth: 100,
          }}
        />
      </div>
    </div>
  )
}

export default function BusinessExpensesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [deductible, setDeductible] = useState<Record<string, boolean>>({})
  const [projectTags, setProjectTags] = useState<Record<string, string>>({})
  const supabase = createClient()

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('money_transactions')
        .select('*')
        .eq('is_business_expense', true)
        .order('transaction_date', { ascending: false })
        .limit(100)
      const txns = (data ?? []) as Transaction[]
      setTransactions(txns)
      const initDeductible: Record<string, boolean> = {}
      const initTags: Record<string, string> = {}
      txns.forEach(t => {
        initDeductible[t.id] = true
        initTags[t.id] = getProjectTag(t)
      })
      setDeductible(initDeductible)
      setProjectTags(initTags)
    } catch {
      console.error('Failed to load business expenses')
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  function toggleDeductible(id: string) {
    setDeductible(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function filteredTxns(): Transaction[] {
    if (filter === 'all') return transactions
    if (filter === 'dryp') return transactions.filter(isDryp)
    if (filter === 'content') return transactions.filter(isContent)
    if (filter === 'marketing') return transactions.filter(isMarketing)
    if (filter === 'personal') return transactions.filter(t => !isDryp(t) && !isContent(t) && !isMarketing(t))
    return transactions
  }

  const shown = filteredTxns()
  const total = shown.reduce((s, t) => s + t.amount, 0)
  const deductibleTotal = shown.filter(t => deductible[t.id]).reduce((s, t) => s + t.amount, 0)

  const FILTER_TABS: { id: FilterType; label: string }[] = [
    { id: 'all',       label: 'All' },
    { id: 'dryp',      label: 'DRYP' },
    { id: 'content',   label: 'Content' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'personal',  label: 'Other' },
  ]

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>

          <div style={{ marginBottom: 18 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>Business Expenses</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Every legitimate expense = less taxes owed</p>
          </div>

          {/* Summary */}
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 18, paddingBottom: 4 }}>
            <div style={{ ...CARD, minWidth: 130, padding: 14, flexShrink: 0 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 5 }}>Expenses</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: GOLDEN }}>{formatCurrency(total)}</p>
            </div>
            <div style={{ ...CARD, minWidth: 150, padding: 14, flexShrink: 0 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 5 }}>Deductible</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>{formatCurrency(deductibleTotal)}</p>
            </div>
            <div style={{ ...CARD, minWidth: 120, padding: 14, flexShrink: 0 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 5 }}>Count</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{shown.length}</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
            {FILTER_TABS.map(tab => (
              <button key={tab.id} onClick={() => setFilter(tab.id)}
                style={{
                  height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 10, border: filter === tab.id ? `1px solid rgba(201,169,110,0.4)` : 'none',
                  background: filter === tab.id ? 'rgba(201,169,110,0.18)' : 'rgba(255,255,255,0.06)',
                  color: filter === tab.id ? GOLDEN : 'rgba(255,255,255,0.55)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Transaction list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.4)' }} className="animate-spin mx-auto" />
            </div>
          ) : shown.length === 0 ? (
            <div style={{ ...CARD, padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                {transactions.length === 0
                  ? 'No business expenses detected yet. Connect your bank and LUNA will identify them automatically.'
                  : 'No expenses match this filter.'}
              </p>
            </div>
          ) : (
            <div style={{ ...CARD, padding: '4px 18px', marginBottom: 14 }}>
              {shown.map(txn => (
                <TransactionRow
                  key={txn.id}
                  txn={txn}
                  deductible={deductible[txn.id] ?? true}
                  onToggleDeductible={() => toggleDeductible(txn.id)}
                  projectTag={projectTags[txn.id] ?? getProjectTag(txn)}
                  onProjectTagChange={v => setProjectTags(prev => ({ ...prev, [txn.id]: v }))}
                />
              ))}
            </div>
          )}

          <div style={{ ...CARD, padding: 18, border: `1px solid rgba(201,169,110,0.15)`, background: 'rgba(201,169,110,0.04)' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
              <span style={{ color: GOLDEN, fontWeight: 700 }}>Tax tip:</span> Export this list at year-end. Every deductible dollar reduces your taxable income dollar-for-dollar. Consult your accountant before filing.
            </p>
          </div>

        </div>
      </AppLayout>
    </div>
  )
}
