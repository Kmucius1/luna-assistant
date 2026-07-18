'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LunaShell } from '@/components/luna/LunaShell'
import { Moon } from 'lucide-react'

interface GuidanceData {
  horoscope?: string; energy?: string; affirmation?: string
  shadow_question?: string; moon_note?: string; crystal?: string
}
interface MoonPreviewData { phase?: { name: string; emoji?: string }; sign?: { name: string; emoji?: string } }
interface MoneyPreviewData { bills_due_soon?: unknown[]; has_transactions?: boolean; spending_this_week?: number }

const G: React.CSSProperties = {
  background: 'var(--luna-panel)',
  border: '1px solid var(--luna-border-soft)',
  borderRadius: 22,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
}

const LBL: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'white',
  display: 'flex', alignItems: 'center', gap: 5,
  marginBottom: 8, flexShrink: 0,
}

function Row({ label, icon, href, linkText, children }: {
  label: string; icon: React.ReactNode; href: string; linkText: string; children: React.ReactNode
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'flex' }}>
      <div style={{ ...G, padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={LBL}>{icon}{label}</div>
        {children}
        <span style={{ fontSize: 11, color: 'white', fontWeight: 600, marginTop: 8, flexShrink: 0 }}>{linkText} →</span>
      </div>
    </Link>
  )
}

export default function DailyGlancePage() {
  const [guidance, setGuidance] = useState<GuidanceData | null>(null)
  const [moonData, setMoonData] = useState<MoonPreviewData | null>(null)
  const [moneyData, setMoneyData] = useState<MoneyPreviewData | null>(null)

  useEffect(() => {
    fetch('/api/astrology/daily-guidance').then(r => r.json()).then(setGuidance).catch(() => {})
    fetch(`/api/astrology/moon?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
      .then(r => r.json()).then(setMoonData).catch(() => {})
    fetch('/api/money/summary').then(r => r.json()).then(setMoneyData).catch(() => {})
  }, [])

  const astroHeadline = moonData?.sign?.name
    ? `${moonData.sign.name} Moon`
    : moonData?.phase?.name ?? 'Astrology'

  return (
    <LunaShell>
      <div className="flex flex-col gap-3" style={{ maxWidth: 720, margin: '0 auto', padding: '4px 2px 24px' }}>

        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 3px' }}>Today&apos;s Glance</h1>
          <p style={{ fontSize: 13, color: 'white', opacity: 0.7, margin: 0 }}>Astrology, money, and tonight — all at once.</p>
        </div>

        <Row label="Astrology Preview" icon={<Moon style={{ width: 9, height: 9 }} />} href="/astrology" linkText="Open Astrology">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/ui/crescent-preview.png" alt="" style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2 }}>{astroHeadline}</p>
              <p style={{ fontSize: 12, color: 'white', opacity: 0.75, margin: '3px 0 0', lineHeight: 1.4 }}>
                {guidance?.moon_note ?? 'Emotional clarity · intuition · home'}
              </p>
            </div>
          </div>
        </Row>

        <Row label="Money Preview" icon={
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 7, fontWeight: 800, color: 'white', lineHeight: 1 }}>$</span>
          </div>
        } href="/money/transactions" linkText="View">
          {moneyData?.has_transactions ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>
                {moneyData.bills_due_soon?.length ?? 0} bill{moneyData.bills_due_soon?.length === 1 ? '' : 's'} due this week
              </p>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 9.5, color: 'white', opacity: 0.7, margin: 0 }}>Spent this week</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: 'white', margin: 0 }}>${(moneyData.spending_this_week ?? 0).toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'white', opacity: 0.75, margin: 0, lineHeight: 1.4 }}>Connect your bank so LUNA can track bills and spending here.</p>
          )}
        </Row>

        <Row label="Night Preview" icon={<Moon style={{ width: 9, height: 9 }} />} href="/night" linkText="View">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/ui/night-cloud.png" alt="" style={{ width: 84, height: 50, objectFit: 'contain', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2 }}>Wind down tonight.</p>
              <p style={{ fontSize: 12, color: 'white', opacity: 0.75, margin: '3px 0 0' }}>Plan tomorrow, protect your rest.</p>
            </div>
          </div>
        </Row>

      </div>
    </LunaShell>
  )
}
