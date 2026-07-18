'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  FileText,
  ShieldCheck,
  Upload,
  WalletCards,
} from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'

const BG = 'linear-gradient(180deg, #1A1240 0%, #100C30 38%, #08061D 100%)'
const CARD: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(29,19,65,0.82), rgba(12,8,35,0.88))',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 24,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 18px 42px rgba(0,0,0,0.22)',
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
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'white' }}>{title}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.44)' }}>{text}</p>
        </div>
        <ArrowRight style={{ width: 17, height: 17, color: 'rgba(255,255,255,0.32)', flexShrink: 0 }} />
      </div>
    </Link>
  )
}

export default function ConnectBankPage() {
  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad>
        <div style={{ padding: '82px 20px 140px', maxWidth: 520, margin: '0 auto' }}>
          <Link href="/money" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.48)', textDecoration: 'none', fontSize: 12.5, marginBottom: 18 }}>
            <ArrowLeft style={{ width: 15, height: 15 }} /> Back to Money
          </Link>

          <section style={{ ...CARD, position: 'relative', overflow: 'hidden', padding: '24px 22px', marginBottom: 14, background: 'linear-gradient(135deg, rgba(73,40,139,0.84), rgba(15,9,43,0.94))' }}>
            <div style={{ position: 'absolute', width: 190, height: 190, borderRadius: '50%', right: -65, top: -85, background: 'radial-gradient(circle, rgba(190,139,255,0.33), transparent 70%)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ width: 58, height: 58, borderRadius: 19, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', marginBottom: 16 }}>
                <WalletCards style={{ width: 28, height: 28, color: '#d1b1ff' }} strokeWidth={1.5} />
              </div>
              <h1 style={{ margin: 0, fontSize: 25, lineHeight: 1.1, fontWeight: 850, color: 'white' }}>Update LUNA without linking your bank</h1>
              <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.55)' }}>
                LUNA now uses statement imports and manual account updates. This keeps the Money section focused and avoids a bank connection that was creating errors.
              </p>
            </div>
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ActionCard href="/money/import" icon={Upload} title="Import a bank statement" text="Upload a PDF, CSV, or screenshot. LUNA checks subscriptions, bills, duplicates, and spending patterns." color="#b98bff" />
            <ActionCard href="/money/accounts" icon={CreditCard} title="Update account balances" text="Keep only the institution, nickname, last four digits, and current balance." color="#8fd6a3" />
          </div>

          <section style={{ ...CARD, padding: 18, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(143,214,163,0.12)', border: '1px solid rgba(143,214,163,0.24)', flexShrink: 0 }}>
                <ShieldCheck style={{ width: 20, height: 20, color: '#8fd6a3' }} strokeWidth={1.6} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'white' }}>Private by design</p>
                <p style={{ margin: '5px 0 0', fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.43)' }}>
                  Do not add bank passwords or complete account numbers. Statements should be stored in private app storage and tied only to your signed-in account.
                </p>
              </div>
            </div>
          </section>

          <Link href="/money" style={{ textDecoration: 'none' }}>
            <div style={{ marginTop: 14, minHeight: 50, borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #6b3dff, #9258ff)', boxShadow: '0 12px 28px rgba(107,61,255,0.3)', color: 'white', fontSize: 13.5, fontWeight: 800 }}>
              <FileText style={{ width: 17, height: 17 }} /> Open Money dashboard
            </div>
          </Link>
        </div>
      </AppLayout>
    </div>
  )
}
