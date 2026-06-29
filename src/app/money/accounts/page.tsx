'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, Link as LinkIcon, EyeOff, Eye } from 'lucide-react'
import { formatCurrency } from '@/lib/money'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)'
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  padding: 18,
  marginBottom: 12,
}
const GOLDEN = '#C9A96E'

interface Account {
  id: string
  plaid_account_id: string
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  mask: string | null
  current_balance: number | null
  available_balance: number | null
  iso_currency_code: string
  hidden: boolean
  last_balance_update: string | null
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/money/summary')
      const data = await res.json()
      setAccounts(data.accounts ?? [])
    } catch {
      console.error('Failed to load accounts')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const handleSync = async () => {
    setSyncing(true)
    await loadAccounts()
    setSyncing(false)
  }

  const totalAvailable = accounts.reduce((s, a) => s + (a.available_balance ?? 0), 0)

  const TYPE_ICONS: Record<string, string> = {
    depository: '🏦',
    credit: '💳',
    investment: '📈',
    loan: '📋',
    other: '💰',
  }

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 16px 180px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', fontFamily: 'var(--font-display, sans-serif)', marginBottom: 2 }}>Accounts</h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Connected bank accounts</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSync} disabled={syncing}
                style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Sync
              </button>
            </div>
          </div>

          {/* Total */}
          <div style={{ ...CARD, background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.2)', textAlign: 'center', padding: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLDEN, marginBottom: 8 }}>Total Available</p>
            <p style={{ fontSize: 36, fontWeight: 700, color: GOLDEN, fontFamily: 'var(--font-display, sans-serif)' }}>{formatCurrency(totalAvailable)}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
              <p style={{ fontSize: 13 }}>Loading accounts…</p>
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ ...CARD, textAlign: 'center', padding: 32 }}>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>No accounts connected yet.</p>
              <a href="/money" style={{ color: GOLDEN, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                <LinkIcon className="h-4 w-4" /> Connect a bank
              </a>
            </div>
          ) : (
            <div>
              {accounts.map(acct => (
                <div key={acct.id} style={CARD}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 28 }}>{TYPE_ICONS[acct.type] ?? '💰'}</div>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 2 }}>{acct.name}</p>
                        {acct.official_name && acct.official_name !== acct.name && (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{acct.official_name}</p>
                        )}
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>
                          {acct.type}{acct.subtype ? ` · ${acct.subtype}` : ''}{acct.mask ? ` · ···${acct.mask}` : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: GOLDEN }}>{formatCurrency(acct.available_balance ?? acct.current_balance ?? 0)}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                        {acct.available_balance !== null ? 'available' : 'current'}
                      </p>
                    </div>
                  </div>
                  {acct.available_balance !== null && acct.current_balance !== null && acct.available_balance !== acct.current_balance && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Current</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{formatCurrency(acct.current_balance)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Available</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{formatCurrency(acct.available_balance)}</p>
                      </div>
                    </div>
                  )}
                  {acct.last_balance_update && (
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
                      Updated {new Date(acct.last_balance_update).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Connect more */}
          <a href="/money" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 14, background: 'transparent', border: '1.5px dashed rgba(201,169,110,0.25)', color: GOLDEN, fontSize: 13, fontWeight: 600, textDecoration: 'none', marginTop: 8 }}>
            <LinkIcon className="h-4 w-4" /> Connect another bank
          </a>
        </div>
      </AppLayout>
    </div>
  )
}
