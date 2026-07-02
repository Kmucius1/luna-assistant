'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using LUNA at mylunaguide.online, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.',
  },
  {
    title: '2. Description of Service',
    body: 'LUNA is a personal AI assistant that provides: AI email triage via Gmail, Google Calendar integration, daily spiritual & astrology guidance, financial tracking via CSV import, conversational AI (Groq/Llama), task management, and business workflow tools.',
  },
  {
    title: '3. Authorized Use',
    body: 'LUNA is a private application for its owner and authorized users only. Unauthorized access is strictly prohibited.',
  },
  {
    title: '4. Google Account Integration',
    body: 'When you connect Google, you authorize LUNA to access Gmail and Calendar via OAuth 2.0. Access is limited to stated scopes and may be revoked anytime via LUNA Settings or myaccount.google.com/permissions. Your data is never used for advertising or model training.',
  },
  {
    title: '5. AI-Generated Content',
    body: 'AI content (email summaries, astrology, financial insights, daily briefs) is for informational and personal guidance only. It does not constitute professional financial, medical, legal, or psychological advice.',
  },
  {
    title: '6. Financial Data',
    body: 'Financial data imported via CSV is stored in your private database for personal use only. LUNA does not execute transactions or share financial data with third parties beyond operating the Service.',
  },
  {
    title: '7. Intellectual Property',
    body: 'The LUNA app, design, code, and AI systems are the intellectual property of Zoe Taylor / DRYP Digital. No copying, redistribution, or reverse-engineering without written permission.',
  },
  {
    title: '8. Disclaimer of Warranties',
    body: 'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. USE AT YOUR OWN RISK.',
  },
  {
    title: '9. Limitation of Liability',
    body: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, LUNA SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM USE OF THE SERVICE.',
  },
  {
    title: '10. Third-Party Services',
    body: 'LUNA integrates with Google, Supabase, Groq, Plaid, and Vercel. Your use of these integrations is also subject to their respective terms.',
  },
  {
    title: '11. Changes to Terms',
    body: 'Terms may be updated periodically. Continued use after updates constitutes acceptance. Check the "Last updated" date at the top for changes.',
  },
  {
    title: '12. Governing Law',
    body: 'These Terms are governed by the laws of the Commonwealth of Pennsylvania, United States.',
  },
  {
    title: '13. Contact',
    body: 'Questions? Contact Zoe Taylor at info@drypdigital.com — DRYP Digital / Ad-Vantage Media Agency.',
  },
]

function AccordionSection({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', gap: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#C9A96E', lineHeight: 1.3 }}>{title}</span>
        {open
          ? <ChevronUp style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
          : <ChevronDown style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
        }
      </button>
      {open && (
        <p style={{ fontSize: 12, lineHeight: 1.7, color: 'rgba(255,255,255,0.65)', paddingBottom: 12, margin: 0 }}>
          {body}
        </p>
      )}
    </div>
  )
}

export default function TermsPage() {
  const [accepted, setAccepted] = useState(false)
  const router = useRouter()

  function handleAccept() {
    setAccepted(true)
    localStorage.setItem('luna_terms_accepted', '1')
    setTimeout(() => router.push('/'), 800)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)',
      color: 'rgba(255,255,255,0.88)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      paddingBottom: 120,
    }}>
      {/* Sticky header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(10,8,28,0.96)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #8B6FB8, #6A4F9B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 12 }}>☽</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.16em', color: 'white' }}>LUNA</span>
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>/</span>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Terms of Service</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 4, letterSpacing: '-0.01em' }}>
          Terms of Service
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 20 }}>
          Effective: June 23, 2026 · Last updated: June 23, 2026
        </p>

        {/* Summary card */}
        <div style={{
          background: 'rgba(139,111,184,0.12)', border: '1px solid rgba(139,111,184,0.25)',
          borderRadius: 14, padding: '12px 14px', marginBottom: 20,
        }}>
          <p style={{ fontSize: 12, color: 'rgba(196,169,232,0.85)', lineHeight: 1.6, margin: 0 }}>
            By using LUNA, you agree to these terms. Tap each section below to read the details, then accept at the bottom.
          </p>
        </div>

        {/* Accordion sections */}
        <div style={{ background: 'rgba(20,12,50,0.60)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '0 14px' }}>
          {SECTIONS.map(s => (
            <AccordionSection key={s.title} title={s.title} body={s.body} />
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 14 }}>
          <Link href="/privacy" style={{ color: '#8B9FD4', fontSize: 12, textDecoration: 'none' }}>Privacy Policy →</Link>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecoration: 'none' }}>← Back to LUNA</Link>
        </div>
      </div>

      {/* Sticky accept bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(10,8,28,0.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.09)',
        padding: '14px 20px',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
      }}>
        <button
          onClick={handleAccept}
          disabled={accepted}
          style={{
            width: '100%', padding: '14px', borderRadius: 16, border: 'none',
            background: accepted
              ? 'rgba(90,180,90,0.25)'
              : 'linear-gradient(135deg, #8B6FB8, #6A4F9B)',
            color: 'white', fontSize: 15, fontWeight: 700, cursor: accepted ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: accepted ? 'none' : '0 4px 24px rgba(139,111,184,0.40)',
            transition: 'all 0.3s',
          }}
        >
          {accepted
            ? <><Check style={{ width: 18, height: 18 }} /> Accepted — returning to LUNA…</>
            : 'I Accept the Terms of Service'
          }
        </button>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 8 }}>
          By accepting, you confirm you are an authorized user of LUNA.
        </p>
      </div>
    </div>
  )
}
