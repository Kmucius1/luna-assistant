'use client'
import { useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Upload, FileText, Check, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/money'

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

interface ParsedRow {
  merchant: string
  category: string
  amount: number
  frequency: string
}

interface ImportResult {
  matched: number
  new_subs: number
  total: number
  import_id: string
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n')
  const rows: ParsedRow[] = []
  // Skip header if it looks like one
  const startIdx = lines[0]?.toLowerCase().includes('merchant') ? 1 : 0
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    if (cols.length < 2) continue
    const merchant = cols[0] || ''
    const category = cols[1] || 'Other'
    const amount = parseFloat(cols[2] ?? '') || 0
    const frequency = cols[3] || 'monthly'
    if (merchant) rows.push({ merchant, category, amount, frequency })
  }
  return rows
}

function detectApril(text: string): boolean {
  return text.toLowerCase().includes('edreams') ||
    text.toLowerCase().includes('crunch fitness') ||
    text.toLowerCase().includes('south beach tanning')
}

export default function SubscriptionImportPage() {
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [aprilDetected, setAprilDetected] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    setResult(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      setPreview(rows)
      setAprilDetected(detectApril(text))
    }
    reader.readAsText(file)
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  async function doImport() {
    if (preview.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch('/api/money/subscriptions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview, source_period: aprilDetected ? 'April 2025' : 'Manual Import', file_name: fileName }),
      })
      if (res.ok) {
        const data = await res.json() as ImportResult
        setResult(data)
      } else {
        const err = await res.json() as { error?: string }
        setError(err.error ?? 'Import failed. Try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setImporting(false)
  }

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>

          <div style={{ marginBottom: 18 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>Import Subscriptions</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Upload a CSV to bulk-add your subscriptions</p>
          </div>

          {/* Format guide */}
          <div style={{ ...CARD, padding: 14, marginBottom: 18, background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.2)' }}>
            <p style={{ ...LABEL_STYLE, color: GOLDEN, marginBottom: 8 }}>Expected Format</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, fontFamily: 'monospace' }}>
              Merchant, Category, Amount, Frequency<br />
              Spotify, Entertainment, 14.00, monthly<br />
              Claude, AI/Business, 20.00, monthly
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              ...CARD,
              border: dragOver ? `2px dashed ${GOLDEN}` : `2px dashed rgba(255,255,255,0.18)`,
              background: dragOver ? 'rgba(201,169,110,0.08)' : 'rgba(255,255,255,0.03)',
              padding: '36px 20px',
              textAlign: 'center',
              marginBottom: 18,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => document.getElementById('csv-input')?.click()}>
            <Upload style={{ width: 28, height: 28, color: dragOver ? GOLDEN : 'rgba(255,255,255,0.35)', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 14, color: dragOver ? GOLDEN : 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 4 }}>
              {fileName ? fileName : 'Drop CSV here or tap to browse'}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Supports .csv files</p>
            <input id="csv-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={onFileInput} />
          </div>

          {/* April Detection Banner */}
          {aprilDetected && (
            <div style={{ ...CARD, padding: 14, marginBottom: 18, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle style={{ width: 15, height: 15, color: GOLDEN, flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: GOLDEN, fontWeight: 700 }}>April 2025 Subscriptions Detected</p>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 1.5 }}>
                LUNA recognized known subscriptions (eDreams, Crunch Fitness, South Beach Tanning). These will be matched to your April history.
              </p>
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && !result && (
            <div style={{ ...CARD, padding: 18, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ ...LABEL_STYLE }}>Preview ({preview.length} rows)</p>
                <FileText style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.35)' }} />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Merchant', 'Category', 'Amount', 'Frequency'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.42)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 20).map((row, i) => (
                      <tr key={i}>
                        <td style={{ padding: '7px 8px', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.merchant}</td>
                        <td style={{ padding: '7px 8px', color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.category}</td>
                        <td style={{ padding: '7px 8px', color: GOLDEN, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{formatCurrency(row.amount)}</td>
                        <td style={{ padding: '7px 8px', color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '8px 8px 0', textAlign: 'center' }}>
                    + {preview.length - 20} more rows
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ ...CARD, padding: 14, marginBottom: 14, border: '1px solid rgba(201,107,90,0.4)', background: 'rgba(201,107,90,0.08)' }}>
              <p style={{ fontSize: 13, color: '#C96B5A' }}>{error}</p>
            </div>
          )}

          {/* Import button */}
          {preview.length > 0 && !result && (
            <button
              onClick={() => { void doImport() }}
              disabled={importing}
              style={{
                width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: importing ? 'default' : 'pointer',
                background: importing ? 'rgba(201,169,110,0.35)' : `linear-gradient(135deg, #C9A96E 0%, #B8903A 100%)`,
                color: '#1A1240', fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', marginBottom: 14,
              }}>
              {importing ? 'Importing...' : `Import ${preview.length} Subscriptions`}
            </button>
          )}

          {/* Result card */}
          {result && (
            <div style={{ ...CARD, padding: 24, textAlign: 'center', border: '1px solid rgba(90,138,106,0.4)', background: 'rgba(90,138,106,0.08)' }}>
              <Check style={{ width: 32, height: 32, color: GREEN, margin: '0 auto 12px' }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 8 }}>Import Complete!</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 24, fontWeight: 700, color: GREEN }}>{result.matched}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>MATCHED</p>
                </div>
                <div>
                  <p style={{ fontSize: 24, fontWeight: 700, color: GOLDEN }}>{result.new_subs}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>NEW</p>
                </div>
                <div>
                  <p style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>{result.total}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>TOTAL</p>
                </div>
              </div>
              <a href="/money/subscriptions" style={{ display: 'block', marginTop: 16, color: GOLDEN, fontSize: 13, fontWeight: 600 }}>
                View Subscriptions →
              </a>
            </div>
          )}

        </div>
      </AppLayout>
    </div>
  )
}
