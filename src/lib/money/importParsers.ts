import Groq from 'groq-sdk'
import { PDFParse } from 'pdf-parse'

export interface RawTransactionRow {
  date: string | null
  merchant: string
  amount: number
  direction: 'inflow' | 'outflow'
  status: 'pending' | 'posted'
}

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  return _groq
}

// ── CSV ──────────────────────────────────────────────────────────────────
// Flexible header matching — banks export wildly different column names.
const HEADER_ALIASES = {
  date: ['date', 'transaction date', 'posted date', 'posting date'],
  merchant: ['description', 'merchant', 'name', 'payee', 'details'],
  amount: ['amount', 'transaction amount'],
  debit: ['debit', 'withdrawal', 'amount debit'],
  credit: ['credit', 'deposit', 'amount credit'],
  status: ['status'],
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { cells.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  cells.push(cur.trim())
  return cells
}

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex(h => aliases.includes(h.toLowerCase().trim()))
}

export function parseCsv(content: string): RawTransactionRow[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase())

  const dateIdx = findColumn(headers, HEADER_ALIASES.date)
  const merchantIdx = findColumn(headers, HEADER_ALIASES.merchant)
  const amountIdx = findColumn(headers, HEADER_ALIASES.amount)
  const debitIdx = findColumn(headers, HEADER_ALIASES.debit)
  const creditIdx = findColumn(headers, HEADER_ALIASES.credit)
  const statusIdx = findColumn(headers, HEADER_ALIASES.status)

  const rows: RawTransactionRow[] = []
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const merchant = merchantIdx >= 0 ? cells[merchantIdx] : ''
    if (!merchant) continue
    const date = dateIdx >= 0 ? normalizeDate(cells[dateIdx]) : null

    let amount = 0, direction: 'inflow' | 'outflow' = 'outflow'
    if (amountIdx >= 0) {
      const raw = parseFloat((cells[amountIdx] || '0').replace(/[^0-9.-]/g, ''))
      amount = Math.abs(raw)
      direction = raw < 0 ? 'outflow' : 'inflow'
    } else if (debitIdx >= 0 || creditIdx >= 0) {
      const debit = parseFloat((cells[debitIdx] || '0').replace(/[^0-9.-]/g, '')) || 0
      const credit = parseFloat((cells[creditIdx] || '0').replace(/[^0-9.-]/g, '')) || 0
      if (debit > 0) { amount = debit; direction = 'outflow' }
      else { amount = credit; direction = 'inflow' }
    }
    if (!amount) continue

    const statusRaw = statusIdx >= 0 ? cells[statusIdx]?.toLowerCase() : ''
    rows.push({ date, merchant, amount, direction, status: statusRaw?.includes('pending') ? 'pending' : 'posted' })
  }
  return rows
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0]
}

// ── AI extraction (image screenshots and PDF-extracted text) ──────────────
const EXTRACT_PROMPT = `Extract every transaction from this bank/credit-card statement content. For each,
determine the date, the merchant/description exactly as shown, the amount (a positive number), whether
it is money leaving the account ("outflow") or arriving ("inflow"), and whether it's marked pending.
Return ONLY a valid JSON array, no markdown, no prose: [{"date":"YYYY-MM-DD or null","merchant":"...","amount":0,"direction":"outflow","status":"posted"}]`

export async function extractTransactionsFromImage(imageDataUrl: string): Promise<RawTransactionRow[]> {
  const completion = await getGroq().chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: EXTRACT_PROMPT },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    }],
  })
  return parseExtractedJson(completion.choices[0]?.message?.content ?? '')
}

export async function extractTransactionsFromPdf(buffer: Buffer): Promise<RawTransactionRow[]> {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()
  const text = result.text.slice(0, 12_000) // keep well within token limits

  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 3000,
    messages: [
      { role: 'system', content: EXTRACT_PROMPT },
      { role: 'user', content: text },
    ],
  })
  return parseExtractedJson(completion.choices[0]?.message?.content ?? '')
}

function parseExtractedJson(raw: string): RawTransactionRow[] {
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0]) as Array<Partial<RawTransactionRow>>
    return parsed
      .filter(r => r.merchant && typeof r.amount === 'number')
      .map(r => ({
        date: r.date ? normalizeDate(r.date) : null,
        merchant: r.merchant!,
        amount: Math.abs(r.amount!),
        direction: r.direction === 'inflow' ? 'inflow' : 'outflow',
        status: r.status === 'pending' ? 'pending' : 'posted',
      }))
  } catch {
    return []
  }
}
