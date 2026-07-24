'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatCurrency } from '@/lib/money/format'
import {
  Sparkles, Upload, Settings, Car, Smartphone, TriangleAlert, Mic, Info, ChevronLeft,
} from 'lucide-react'
import styles from './money.module.css'

interface SafeToSpend {
  safeToSpend: number; dailySpendingAmount: number | null; daysUntilNextConfirmedIncome: number | null
  postedBalances: number; confirmedIncome: number; billsDue: number; subscriptionsDue: number
  groceryReserve: number; gasReserve: number; necessityReserve: number
  safetyBuffer: number; minimumDebtPayments: number; plannedSavings: number
}
interface BillPreview { id: string; name: string; due_date: string; expected_amount: number | null; minimum_amount: number | null; autopay_status: string }
interface AlertPreview { id: string; kind: 'duplicate' | 'subscription'; reason: string; severity: string }
interface SavingsPreview { id: string; name: string; goal_type: string; current_amount: number; target_amount: number }
interface DashboardData {
  safe_to_spend: SafeToSpend
  bills_due_this_week: unknown[]
  bills_due_this_month: unknown[]
  bills_preview: BillPreview[]
  alerts_preview: AlertPreview[]
  alerts_total_count: number
  savings_preview: SavingsPreview[]
  savings_total: number
}

const SEVERITY_COLOR: Record<string, string> = { high: '#C96B5A', medium: '#C9A96E', low: '#8A8098' }

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86_400_000)
}

function dueLabel(days: number): string {
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due in 1 day'
  if (days <= 7) return `Due in ${days} days`
  return 'Due next week'
}

export default function MoneyDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lunaMessage, setLunaMessage] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/money/dashboard', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Could not load your Money dashboard.'))
      .finally(() => setLoading(false))
    fetch('/api/money/summary', { cache: 'no-store' }).then(r => r.json()).then(d => setLunaMessage(d.message ?? null)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const sts = data?.safe_to_spend
  const totalAvailable = sts ? sts.postedBalances + sts.confirmedIncome : 0
  const percentAvailable = sts && totalAvailable > 0 ? Math.max(0, Math.min(100, Math.round((sts.safeToSpend / totalAvailable) * 100))) : 0
  const ringCircumference = 2 * Math.PI * 32

  return (
    <div className={styles.page}>
      <AppLayout noPad>
        <div className={styles.topRow}>
          <Link href="/work-home" className={styles.iconButton} aria-label="Back"><ChevronLeft size={18} /></Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/money/import" className={styles.iconButton} aria-label="Import"><Upload size={17} /></Link>
            <Link href="/money/settings" className={styles.iconButton} aria-label="Settings"><Settings size={17} /></Link>
          </div>
        </div>

        <div className={styles.heroWrap}>
          <div className={styles.heroPhoto}><Image src="/images/rooms/money-hero.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" priority /></div>
          <div className={styles.heroFade} />
          <div className={styles.heroContent}>
            <h1>Money</h1>
            <p>Know what&apos;s covered. Know what&apos;s yours.</p>
          </div>
        </div>

        {loading ? (
          <p className={styles.loadingText}>Loading your money picture…</p>
        ) : error ? (
          <div className={styles.stsCard}>
            <p style={{ fontSize: 13, color: '#C96B5A', textAlign: 'center' }}>{error}</p>
          </div>
        ) : sts ? (
          <>
            <div className={styles.stsCard}>
              <div className={styles.stsTop}>
                <div style={{ flex: 1 }}>
                  <div className={styles.stsLabel}><Info size={11} /> Safe to Spend</div>
                  <p className={styles.stsNumber}>{formatCurrency(sts.safeToSpend)}<span>available</span></p>
                  {sts.dailySpendingAmount != null && sts.daysUntilNextConfirmedIncome != null ? (
                    <p className={styles.stsPerDay}>{formatCurrency(sts.dailySpendingAmount)} per day until your next confirmed income</p>
                  ) : (
                    <p className={styles.stsPerDay}>No confirmed upcoming income on file yet</p>
                  )}
                </div>
                <div className={styles.ring}>
                  <svg viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={36} cy={36} r={32} fill="none" stroke="rgba(180,150,100,0.16)" strokeWidth={6} />
                    <circle cx={36} cy={36} r={32} fill="none" stroke="#C9A96E" strokeWidth={6} strokeLinecap="round"
                      strokeDasharray={ringCircumference} strokeDashoffset={ringCircumference * (1 - percentAvailable / 100)} />
                  </svg>
                  <div className={styles.ringLabel}><strong>{percentAvailable}%</strong><span>of available funds</span></div>
                </div>
              </div>

              <div className={styles.breakdown}>
                <div className={styles.breakdownRow}><span className={styles.dot} style={{ background: '#5A8A6A' }} /><span>Available Cash</span><strong>{formatCurrency(sts.postedBalances)}</strong></div>
                <div className={styles.breakdownRow}><span className={styles.dot} style={{ background: '#C9A96E' }} /><span>Bills Reserved</span><strong>-{formatCurrency(sts.billsDue)}</strong></div>
                <div className={styles.breakdownRow}><span className={styles.dot} style={{ background: '#C9A96E' }} /><span>Subscriptions Reserved</span><strong>-{formatCurrency(sts.subscriptionsDue)}</strong></div>
                <div className={styles.breakdownRow}><span className={styles.dot} style={{ background: '#D9A85C' }} /><span>Gas &amp; Groceries Reserved</span><strong>-{formatCurrency(sts.groceryReserve + sts.gasReserve)}</strong></div>
                <div className={styles.breakdownRow}><span className={styles.dot} style={{ background: '#C96B5A' }} /><span>Debt Minimums Reserved</span><strong>-{formatCurrency(sts.minimumDebtPayments)}</strong></div>
                <div className={styles.breakdownRow}><span className={styles.dot} style={{ background: '#8A8098' }} /><span>Required Savings</span><strong>-{formatCurrency(sts.plannedSavings)}</strong></div>
                <div className={styles.breakdownRow}><span className={styles.dot} style={{ background: '#5E5474' }} /><span>Safety Buffer</span><strong>-{formatCurrency(sts.safetyBuffer)}</strong></div>
              </div>
            </div>

            <div className={styles.lunaCard}>
              <div style={{ flex: 1 }}>
                <div className={styles.lunaLabel}><Sparkles size={11} /> Luna&apos;s Message</div>
                <p className={styles.lunaText}>{lunaMessage ?? 'Luna is putting today\'s money picture together…'}</p>
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.gridCard}>
                <div className={styles.gridHeader}><span>Upcoming Bills</span><Link href="/money/bills">View all</Link></div>
                {data!.bills_preview.length === 0 ? <p className={styles.emptyText}>Nothing due soon.</p> : data!.bills_preview.map(b => {
                  const d = daysUntil(b.due_date)
                  return (
                    <div key={b.id} className={styles.billRow}>
                      <div className={styles.billIcon}>{b.name.toLowerCase().includes('insurance') ? <Car size={13} /> : b.name.toLowerCase().includes('phone') ? <Smartphone size={13} /> : <TriangleAlert size={13} />}</div>
                      <div className={styles.billInfo}><strong>{b.name}</strong><span>{dueLabel(d)}</span></div>
                      <span className={styles.billAmount}>{formatCurrency(b.expected_amount ?? b.minimum_amount ?? 0)}</span>
                    </div>
                  )
                })}
              </div>

              <div className={styles.gridCard}>
                <div className={styles.gridHeader}><span>Money Alerts</span><Link href="/money/duplicates">View all</Link></div>
                {data!.alerts_preview.length === 0 ? <p className={styles.emptyText}>Nothing needs review.</p> : data!.alerts_preview.map(a => (
                  <div key={a.id} className={styles.alertRow}>
                    <span className={styles.alertDot} style={{ background: SEVERITY_COLOR[a.severity] ?? '#8A8098' }} />
                    <span>{a.reason}</span>
                    <Link href={a.kind === 'duplicate' ? '/money/duplicates' : '/money/subscriptions'} className={styles.alertReview}>Review</Link>
                  </div>
                ))}
              </div>

              <div className={styles.gridCard}>
                <div className={styles.gridHeader}><span>Savings Progress</span><Link href="/money/savings">View all</Link></div>
                {data!.savings_preview.length === 0 ? (
                  <p className={styles.emptyText}>No savings goals yet.</p>
                ) : data!.savings_preview.map(g => {
                  const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0
                  return (
                    <div key={g.id} className={styles.savingsRow}>
                      <div className={styles.savingsTop}>
                        <div className={styles.savingsIcon}>{g.goal_type === 'travel' ? '✈️' : g.goal_type === 'emergency_fund' ? '🌳' : '💰'}</div>
                        <strong>{g.name}</strong>
                        <span>{pct}%</span>
                      </div>
                      <div className={styles.savingsTrack}><div className={styles.savingsFill} style={{ width: `${pct}%` }} /></div>
                    </div>
                  )
                })}
              </div>

              <div className={`${styles.gridCard} ${styles.askCard}`}>
                <div>
                  <div className={styles.gridHeader} style={{ marginBottom: 4 }}><span>Ask Luna</span></div>
                  <p>What&apos;s on your mind? Ask anything about your money.</p>
                </div>
                <Link href="/luna?tab=chat&prompt=Can I afford to spend money right now?" className={styles.askButton}><Mic size={13} /> Ask</Link>
              </div>
            </div>
          </>
        ) : null}
      </AppLayout>
    </div>
  )
}
