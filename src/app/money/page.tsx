'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatCurrency } from '@/lib/money/format'
import {
  AlertTriangle, RefreshCw, ArrowRight, Upload, Copy as DuplicateIcon,
  Building2, Wallet, TrendingUp, TrendingDown, HelpCircle, Loader2, Settings,
} from 'lucide-react'

const BG = 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)'
const GOLDEN = '#C9A96E'
const GREEN  = '#5A8A6A'
const RED    = '#C96B5A'

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(180,150,100,0.16)',
  borderRadius: 18,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#5E5474',
}

interface SafeToSpend {
  safeToSpend: number; dailySpendingAmount: number | null; daysUntilNextConfirmedIncome: number | null
  safetyBuffer: number; billsDue: number; groceryReserve: number; gasReserve: number; minimumDebtPayments: number
}
interface DashboardData {
  safe_to_spend: SafeToSpend
  bills_due_today: unknown[]
  bills_due_this_week: unknown[]
  bills_due_this_month: unknown[]
  subscription_alerts_count: number
  duplicate_charges_count: number
  personal_spending: number
  business_spending: number
  reimbursements_owed: number
  business_expenses_paid_personally: number
  savings_total: number
  debt_total: number
  unknown_transactions_count: number
}

function Card({ href, icon: Icon, label, value, sub, color }: {
  href: string; icon: React.ElementType; label: string; value: string; sub?: string; color?: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ ...CARD, padding: 16, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Icon style={{ width: 15, height: 15, color: color ?? GOLDEN }} />
          <span style={LABEL}>{label}</span>
        </div>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#100C1E', margin: 0 }}>{value}</p>
        {sub && <p style={{ fontSize: 12, color: '#5E5474', margin: '4px 0 0' }}>{sub}</p>}
      </div>
    </Link>
  )
}

export default function MoneyDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/money/dashboard', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Could not load your Money dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const sts = data?.safe_to_spend

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad>
        <div style={{ padding: '80px 18px 140px', maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#100C1E', margin: 0 }}>Money</h1>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/money/import" style={{ color: '#32284A' }}><Upload style={{ width: 19, height: 19 }} /></Link>
              <Link href="/money/settings" style={{ color: '#32284A' }}><Settings style={{ width: 19, height: 19 }} /></Link>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLDEN }} />
            </div>
          ) : error ? (
            <div style={{ ...CARD, padding: 20, textAlign: 'center' }}>
              <AlertTriangle style={{ width: 24, height: 24, color: RED, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: '#32284A' }}>{error}</p>
            </div>
          ) : sts ? (
            <>
              {/* Safe to Spend — the largest number, per spec */}
              <div style={{ ...CARD, padding: 24, textAlign: 'center', background: 'linear-gradient(135deg, rgba(201,169,110,0.12), rgba(90,138,106,0.08))', border: '1.5px solid rgba(201,169,110,0.25)' }}>
                <p style={LABEL}>Safe to Spend</p>
                <p style={{ fontSize: 44, fontWeight: 900, color: sts.safeToSpend >= 0 ? '#100C1E' : RED, margin: '6px 0' }}>
                  {formatCurrency(sts.safeToSpend)}
                </p>
                {sts.dailySpendingAmount != null && sts.daysUntilNextConfirmedIncome != null && (
                  <p style={{ fontSize: 13, color: '#32284A', margin: 0 }}>
                    {formatCurrency(sts.dailySpendingAmount)} per day for {sts.daysUntilNextConfirmedIncome} days
                  </p>
                )}
                <p style={{ fontSize: 11, color: '#5E5474', marginTop: 8 }}>
                  After bills, reserves, debt minimums &amp; a {formatCurrency(sts.safetyBuffer)} buffer
                </p>
              </div>

              {/* Grid of dashboard cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Card href="/money/bills" icon={AlertTriangle} label="Bills Due" value={String(data!.bills_due_this_week.length)} sub={`this week · ${data!.bills_due_this_month.length} this month`} color={data!.bills_due_this_week.length ? RED : GREEN} />
                <Card href="/money/subscriptions" icon={RefreshCw} label="Subscriptions" value={String(data!.subscription_alerts_count)} sub="need review" />
                <Card href="/money/duplicates" icon={DuplicateIcon} label="Duplicate Charges" value={String(data!.duplicate_charges_count)} sub="open alerts" color={data!.duplicate_charges_count ? RED : GREEN} />
                <Card href="/money/transactions?ownership=unknown" icon={HelpCircle} label="Unknown" value={String(data!.unknown_transactions_count)} sub="last 30 days" />
                <Card href="/money/transactions?ownership=personal" icon={Wallet} label="Personal Spending" value={formatCurrency(data!.personal_spending)} sub="last 30 days" />
                <Card href="/money/transactions?ownership=dryp_business" icon={Building2} label="Business Spending" value={formatCurrency(data!.business_spending)} sub="last 30 days" />
                <Card href="/money/transactions?reimbursable=true" icon={TrendingUp} label="Reimbursements Owed" value={formatCurrency(data!.reimbursements_owed)} sub={`${data!.business_expenses_paid_personally} biz on personal`} />
                <Card href="/money/debt" icon={TrendingDown} label="Debt" value={formatCurrency(data!.debt_total)} sub={`Savings ${formatCurrency(data!.savings_total)}`} />
              </div>

              <Link href="/money/accounts" style={{ textDecoration: 'none' }}>
                <div style={{ ...CARD, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#100C1E' }}>Accounts</span>
                  <ArrowRight style={{ width: 16, height: 16, color: '#5E5474' }} />
                </div>
              </Link>
            </>
          ) : null}
        </div>
      </AppLayout>
    </div>
  )
}
