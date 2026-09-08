'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  FileText,
  ShieldCheck,
  Trash2,
  Upload,
  WalletCards,
} from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'

interface PlaidItem { id: string; institution_name: string | null; status: string; last_synced_at: string | null }

const BG = 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)'
const CARD: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.7), rgba(255,255,255,0.55))',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 24,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 12px 32px rgba(60,46,24,0.1)',
}

function ActionCard({ href, icon: Icon, title, text, color }: {
  href: string
  icon: React.ElementType
  title: string
  text: string
  color: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ ...CARD, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 50, height: 50, borderRadius: 17, display: 'grid', placeItems: 'center', background: `${color}18`, border: `1px solid ${color}32`, flexShrink: 0 }}>
          <Icon style={{ width: 23, height: 23, color }} strokeWidth={1.6} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#100C1E' }}>{title}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: '#5E5474' }}>{text}</p>
        </div>
        <ArrowRight style={{ width: 17, height: 17, color: '#5E5474', flexShrink: 0 }} />
      </div>
    </Link>
  )
}

export default function ConnectBankPage() {
  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plaid/items').then(r => r.json()).then(d => setPlaidItems(d.items ?? [])).catch(() => {})
  }, [])

  async function disconnect(id: string) {
    setRemovingId(id)
    try {
      await fetch('/api/plaid/items', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      setPlaidItems(items => items.filter(i => i.id !== id))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad>
        <div style={{ padding: '82px 20px 140px', maxWidth: 520, margin: '0 auto' }}>
          <Link href="/money" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(245,239,227,0.72)', textDecoration: 'none', fontSize: 12.5, marginBottom: 18 }}>
            <ArrowLeft style={{ width: 15, height: 15 }} /> Back to Money
          </Link>

          <section style={{ ...CARD, position: 'relative', overflow: 'hidden', padding: '24px 22px', marginBottom: 14, background: 'linear-gradient(135deg, rgba(240,228,200,0.9), rgba(240,233,218,0.92))' }}>
            <div style={{ position: 'absolute', width: 190, height: 190, borderRadius: '50%', right: -65, top: -85, background: 'radial-gradient(circle, rgba(201,169,110,0.25), transparent 70%)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ width: 58, height: 58, borderRadius: 19, display: 'grid', placeItems: 'center', background: 'rgba(180,150,100,0.12)', border: '1px solid rgba(180,150,100,0.22)', marginBottom: 16 }}>
                <WalletCards style={{ width: 28, height: 28, color: '#5C4530' }} strokeWidth={1.5} />
              </div>
              <h1 style={{ margin: 0, fontSize: 25, lineHeight: 1.1, fontWeight: 850, color: '#100C1E' }}>Update LUNA without linking your bank</h1>
              <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.65, color: '#32284A' }}>
                LUNA now uses statement imports and manual account updates. This keeps the Money section focused and avoids a bank connection that was creating errors.
              </p>
            </div>
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ActionCard href="/money/import" icon={Upload} title="Import a bank statement" text="Upload a PDF, CSV, or screenshot. LUNA checks subscriptions, bills, duplicates, and spending patterns." color="#5C4530" />
            <ActionCard href="/money/accounts" icon={CreditCard} title="Update account balances" text="Keep only the institution, nickname, last four digits, and current balance." color="#8fd6a3" />
          </div>

          {plaidItems.length > 0 && (
            <section style={{ ...CARD, padding: 18, marginTop: 14 }}>
              <p style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 800, color: '#100C1E' }}>Connected bank accounts</p>
              {plaidItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#100C1E' }}>{item.institution_name ?? 'Bank account'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#5E5474' }}>{item.status}{item.last_synced_at ? ` · last synced ${new Date(item.last_synced_at).toLocaleDateString()}` : ''}</p>
                  </div>
                  <button onClick={() => disconnect(item.id)} disabled={removingId === item.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 12, border: '1px solid rgba(224,94,94,0.3)', background: 'rgba(224,94,94,0.08)', color: '#B23B3B', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: removingId === item.id ? 0.5 : 1 }}>
                    <Trash2 style={{ width: 13, height: 13 }} /> {removingId === item.id ? 'Removing…' : 'Disconnect'}
                  </button>
                </div>
              ))}
            </section>
          )}

          <section style={{ ...CARD, padding: 18, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(143,214,163,0.12)', border: '1px solid rgba(143,214,163,0.24)', flexShrink: 0 }}>
                <ShieldCheck style={{ width: 20, height: 20, color: '#8fd6a3' }} strokeWidth={1.6} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#100C1E' }}>Private by design</p>
                <p style={{ margin: '5px 0 0', fontSize: 12, lineHeight: 1.6, color: '#5E5474' }}>
                  Do not add bank passwords or complete account numbers. Statements should be stored in private app storage and tied only to your signed-in account.
                </p>
              </div>
            </div>
          </section>

          <Link href="/money" style={{ textDecoration: 'none' }}>
            <div style={{ marginTop: 14, minHeight: 50, borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #5C4530, #B8903A)', boxShadow: '0 12px 28px rgba(160,120,40,0.25)', color: '#F5EFE3', fontSize: 13.5, fontWeight: 800 }}>
              <FileText style={{ width: 17, height: 17 }} /> Open Money dashboard
            </div>
          </Link>
        </div>
      </AppLayout>
    </div>
  )
}
