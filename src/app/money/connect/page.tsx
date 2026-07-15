'use client'
import { useState, useCallback, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useRouter } from 'next/navigation'
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { Building2, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)'
const GOLDEN = '#C9A96E'
const GREEN  = '#5A8A6A'

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  padding: 20,
}

export default function ConnectBankPage() {
  const router = useRouter()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [status, setStatus]   = useState<'idle' | 'loading-token' | 'importing' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [imported, setImported] = useState(0)

  const fetchLinkToken = useCallback(async () => {
    setStatus('loading-token')
    setMessage('Preparing bank connection…')
    try {
      const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
      const data = await res.json() as { link_token?: string; error?: string }
      if (!res.ok || !data.link_token) throw new Error(data.error ?? 'Could not start the connection')
      setLinkToken(data.link_token)
      setStatus('idle')
      setMessage('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }, [])

  useEffect(() => { fetchLinkToken() }, [fetchLinkToken])

  const onSuccess = useCallback(async (public_token: string, metadata: PlaidLinkOnSuccessMetadata) => {
    setStatus('importing')
    setMessage(`Importing ${metadata.institution?.name ?? 'your account'}…`)
    try {
      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token,
          institution_id: metadata.institution?.institution_id ?? null,
          institution_name: metadata.institution?.name ?? null,
        }),
      })
      const data = await res.json() as { imported?: number; institution_name?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setImported(data.imported ?? 0)
      setStatus('done')
      setMessage(`${data.imported ?? 0} transactions imported successfully`)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err) => {
      if (err) { setStatus('error'); setMessage(err.error_message || 'Connection was cancelled.') }
    },
  })

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad>
        <div style={{ padding: '80px 20px 140px', maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
              background: 'radial-gradient(circle, rgba(201,169,110,0.2) 0%, transparent 70%)',
              border: '1.5px solid rgba(201,169,110,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 style={{ width: 32, height: 32, color: GOLDEN }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 6 }}>Connect Your Bank</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              Securely link your bank account through Plaid. Your credentials are never stored — only read-only access.
            </p>
          </div>

          {/* Status */}
          {status === 'done' ? (
            <div style={{ ...CARD, background: 'rgba(90,138,90,0.1)', border: '1px solid rgba(90,138,90,0.3)', textAlign: 'center', padding: 28 }}>
              <CheckCircle style={{ width: 36, height: 36, color: GREEN, margin: '0 auto 12px' }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 6 }}>Connected!</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{imported} transactions imported</p>
              <button
                onClick={() => router.push('/money')}
                style={{ marginTop: 16, width: '100%', height: 44, borderRadius: 12, border: 'none', background: GOLDEN, color: '#1A1240', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                View Money Dashboard →
              </button>
            </div>
          ) : status === 'error' ? (
            <div style={{ ...CARD, background: 'rgba(201,107,90,0.08)', border: '1px solid rgba(201,107,90,0.25)', textAlign: 'center', padding: 24 }}>
              <AlertTriangle style={{ width: 28, height: 28, color: '#C96B5A', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 14 }}>{message}</p>
              <button onClick={() => { setStatus('idle'); fetchLinkToken() }} style={{ fontSize: 13, color: GOLDEN, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Info cards */}
              {[
                { icon: '🔒', title: 'Bank-level security', desc: 'Powered by Plaid — used by Venmo, Betterment, and thousands of banking apps' },
                { icon: '👁️', title: 'Read-only access', desc: 'LUNA can only read your transactions. It cannot move money or make changes' },
                { icon: '⚡', title: 'Instant import', desc: 'Recent transactions imported automatically after you connect' },
              ].map(item => (
                <div key={item.title} style={{ ...CARD, display: 'flex', gap: 14, padding: 16 }}>
                  <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 3 }}>{item.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}

              {message && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{message}</p>
              )}

              <button
                onClick={() => open()}
                disabled={!ready || status === 'loading-token' || status === 'importing'}
                style={{
                  width: '100%', height: 52, borderRadius: 16, border: 'none',
                  background: (!ready || status !== 'idle') ? 'rgba(201,169,110,0.4)' : 'linear-gradient(135deg, #C9A96E 0%, #B8903A 100%)',
                  color: '#1A1240', fontSize: 16, fontWeight: 800, cursor: (!ready || status !== 'idle') ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {status === 'loading-token' || status === 'importing'
                  ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> {message || 'Loading…'}</>
                  : 'Connect Bank Account'}
              </button>
            </>
          )}
        </div>
      </AppLayout>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
