'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatCurrency } from '@/lib/money/format'
import { Upload, CheckCircle, AlertCircle, ArrowLeft, FileText, Camera, PenLine } from 'lucide-react'
import Link from 'next/link'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)'
const GOLDEN = '#C9A96E'
const GREEN = '#5A8A6A'
const RED = '#C96B5A'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
}
const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
}

interface Account { id: string; nickname: string }
interface ImportReport {
  transactionsImported: number; transactionsSkippedDuplicate: number
  recurringChargesFound: number; possibleDuplicateCharges: number
  businessExpensesPaidPersonally: number; transactionsNeedReview: number; safeToSpend: number
}

type SourceType = 'csv' | 'pdf' | 'image' | 'manual'

export default function ImportPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('csv')
  const [importing, setImporting] = useState(false)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [manual, setManual] = useState({ date: new Date().toISOString().split('T')[0], merchant: '', amount: '', direction: 'outflow' as 'inflow' | 'outflow' })

  useEffect(() => {
    fetch('/api/money/accounts').then(r => r.json()).then(d => {
      setAccounts(d.accounts ?? [])
      if (d.accounts?.length) setAccountId(d.accounts[0].id)
    }).catch(() => {})
  }, [])

  const runImport = useCallback(async (body: Record<string, unknown>) => {
    if (!accountId) { setError('Add an account first.'); return }
    setImporting(true); setError(null); setReport(null)
    try {
      const res = await fetch('/api/money/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, source_type: sourceType, ...body }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Import failed')
      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }, [accountId, sourceType])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      if (sourceType === 'csv') runImport({ filename: file.name, csv_content: reader.result as string })
      else runImport({ filename: file.name, file_data_url: reader.result as string })
    }
    if (sourceType === 'csv') reader.readAsText(file)
    else reader.readAsDataURL(file)
  }

  function submitManual() {
    if (!manual.merchant.trim() || !manual.amount) return
    runImport({ manual_transaction: { ...manual, amount: parseFloat(manual.amount) } })
  }

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad>
        <div style={{ padding: '80px 20px 140px' }}>
          <Link href="/money" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, marginBottom: 16 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Money
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 6 }}>Import Transactions</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.6 }}>
            CSV, PDF statement, a screenshot of a statement, or type one in manually.
          </p>

          {accounts.length === 0 ? (
            <div style={{ ...CARD, padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Add an account first — <Link href="/money/accounts" style={{ color: GOLDEN }}>go to Accounts</Link>.</p>
            </div>
          ) : (
            <>
              <select value={accountId} onChange={e => setAccountId(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, color: 'white', marginBottom: 14 }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
              </select>

              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {([['csv', FileText, 'CSV'], ['pdf', FileText, 'PDF'], ['image', Camera, 'Screenshot'], ['manual', PenLine, 'Manual']] as const).map(([type, Icon, label]) => (
                  <button key={type} onClick={() => { setSourceType(type); setReport(null); setError(null) }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                      background: sourceType === type ? 'rgba(201,169,110,0.18)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${sourceType === type ? 'rgba(201,169,110,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: sourceType === type ? GOLDEN : 'rgba(255,255,255,0.5)' }}>
                    <Icon style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700 }}>{label}</span>
                  </button>
                ))}
              </div>

              {report && (
                <div style={{ ...CARD, padding: 22, border: '1px solid rgba(90,138,106,0.4)', background: 'rgba(90,138,106,0.08)', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <CheckCircle style={{ width: 24, height: 24, color: GREEN }} />
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Import complete</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                    <p>{report.transactionsImported} transactions imported{report.transactionsSkippedDuplicate ? ` (${report.transactionsSkippedDuplicate} already had this exact charge)` : ''}</p>
                    <p>{report.recurringChargesFound} recurring charges found</p>
                    <p>{report.possibleDuplicateCharges} possible duplicate charges</p>
                    <p>{report.businessExpensesPaidPersonally} business expenses paid personally</p>
                    <p>{report.transactionsNeedReview} transactions need review</p>
                    <p style={{ fontWeight: 700, color: GOLDEN, marginTop: 4 }}>{formatCurrency(report.safeToSpend)} safe to spend</p>
                  </div>
                  <Link href="/money/transactions" style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none', background: `linear-gradient(135deg, ${GOLDEN}, #B8903A)`, color: '#1A1240', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                    View Transactions
                  </Link>
                </div>
              )}

              {error && (
                <div style={{ ...CARD, padding: '12px 16px', border: '1px solid rgba(201,107,90,0.4)', background: 'rgba(201,107,90,0.08)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle style={{ width: 16, height: 16, color: RED, flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: RED }}>{error}</p>
                </div>
              )}

              {sourceType === 'manual' ? (
                <div style={CARD}>
                  <div style={{ padding: 18 }}>
                    <input type="date" value={manual.date} onChange={e => setManual(p => ({ ...p, date: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, color: 'white', marginBottom: 10, colorScheme: 'dark' }} />
                    <input value={manual.merchant} onChange={e => setManual(p => ({ ...p, merchant: e.target.value }))} placeholder="Merchant"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, color: 'white', marginBottom: 10, boxSizing: 'border-box', colorScheme: 'dark' }} />
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <input value={manual.amount} onChange={e => setManual(p => ({ ...p, amount: e.target.value }))} placeholder="Amount" type="number"
                        style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, color: 'white', colorScheme: 'dark' }} />
                      <select value={manual.direction} onChange={e => setManual(p => ({ ...p, direction: e.target.value as 'inflow' | 'outflow' }))}
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 8px', fontSize: 13, color: 'white' }}>
                        <option value="outflow">spent</option>
                        <option value="inflow">received</option>
                      </select>
                    </div>
                    <button onClick={submitManual} disabled={importing || !manual.merchant.trim() || !manual.amount}
                      style={{ width: '100%', height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLDEN}, #B8903A)`, color: '#1A1240', fontSize: 14, fontWeight: 800, opacity: importing ? 0.6 : 1 }}>
                      {importing ? 'Saving…' : 'Save transaction'}
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()}
                  style={{ ...CARD, padding: '44px 24px', textAlign: 'center', cursor: importing ? 'wait' : 'pointer', border: '2px dashed rgba(255,255,255,0.18)' }}>
                  <Upload style={{ width: 36, height: 36, color: GOLDEN, margin: '0 auto 14px' }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 6 }}>
                    {importing ? `Reading ${fileName}…` : `Tap to choose a ${sourceType === 'csv' ? 'CSV' : sourceType === 'pdf' ? 'PDF statement' : 'screenshot'}`}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {sourceType === 'csv' ? 'Exported from your bank’s website' : sourceType === 'pdf' ? 'A downloaded statement PDF' : 'A photo or screenshot of a statement page'}
                  </p>
                  <input ref={fileRef} type="file"
                    accept={sourceType === 'csv' ? '.csv,.txt' : sourceType === 'pdf' ? '.pdf' : 'image/*'}
                    onChange={handleFile} style={{ display: 'none' }} disabled={importing} />
                </div>
              )}

              <p style={{ ...LABEL, marginTop: 20, marginBottom: 8 }}>Idempotent</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                Uploading the same statement twice won&apos;t create duplicate transactions — each one is fingerprinted by account, date, merchant, and amount.
              </p>
            </>
          )}
        </div>
      </AppLayout>
    </div>
  )
}
