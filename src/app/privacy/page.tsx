import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — LUNA',
  description: 'Privacy Policy for LUNA personal AI assistant at mylunaguide.online',
}

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)',
      color: '#32284A',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(180,150,100,0.16)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(255,252,248,0.92)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #5C4530, #B08D52)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 14 }}>☽</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.18em', color: '#100C1E' }}>LUNA</span>
        </Link>
        <span style={{ color: '#5E5474', fontSize: 14 }}>/</span>
        <span style={{ color: '#32284A', fontSize: 14 }}>Privacy Policy</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#100C1E', marginBottom: 8, letterSpacing: '-0.01em' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#5E5474', fontSize: 13, marginBottom: 48 }}>
          Effective date: June 23, 2026 &nbsp;·&nbsp; Last updated: June 23, 2026
        </p>

        <Section title="1. Overview">
          LUNA is a personal AI assistant application available at <strong>mylunaguide.online</strong>. It is operated by Zoe Taylor for personal productivity, spiritual guidance, and business management. This Privacy Policy explains what data LUNA collects, how it is used, and how it is protected.
        </Section>

        <Section title="2. Who This App Is For">
          LUNA is a private, single-user application. It is not a public consumer product. Access is restricted to authorized users only. If you are not an authorized user, please do not use this application.
        </Section>

        <Section title="3. Data We Collect">
          <p style={{ marginBottom: 12 }}>When you use LUNA, we may collect and process the following categories of data:</p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li><strong style={{ color: '#5C4530' }}>Google Account Data</strong> — When you connect your Gmail account via Google OAuth, LUNA accesses your email messages, labels, and Google Calendar events. This is used solely to surface your emails and calendar in the LUNA interface.</li>
            <li><strong style={{ color: '#5C4530' }}>Email Content</strong> — LUNA reads email subjects, senders, snippets, and body text to categorize and prioritize your inbox using AI. Email content is processed in-memory and stored only in your private Supabase database.</li>
            <li><strong style={{ color: '#5C4530' }}>Calendar Events</strong> — Event titles, times, and descriptions are read to show your schedule and surface time-sensitive tasks.</li>
            <li><strong style={{ color: '#5C4530' }}>Financial Data</strong> — If you import bank CSV files, transaction data (amounts, dates, merchant names) is stored in your private database for budgeting insights.</li>
            <li><strong style={{ color: '#5C4530' }}>Conversation History</strong> — Messages between you and LUNA are stored to maintain conversational context across sessions.</li>
            <li><strong style={{ color: '#5C4530' }}>Check-In Data</strong> — Morning routine responses, mood logs, and daily intentions are stored to help LUNA personalize guidance over time.</li>
            <li><strong style={{ color: '#5C4530' }}>Authentication Data</strong> — Email address and session tokens used to log you in securely via Supabase Auth.</li>
          </ul>
        </Section>

        <Section title="4. How We Use Your Data">
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li>To display your emails, calendar, and financial data within the LUNA interface</li>
            <li>To generate AI-powered summaries, guidance, and categorizations using Groq (Llama 3.3)</li>
            <li>To provide personalized spiritual and astrological guidance based on your birth data</li>
            <li>To maintain conversation history so LUNA can refer to prior context</li>
            <li>To power morning check-ins, daily briefs, and productivity features</li>
          </ul>
          <p style={{ marginTop: 12 }}>Your data is <strong>never sold, rented, or shared</strong> with third parties for advertising or marketing purposes.</p>
        </Section>

        <Section title="5. Third-Party Services">
          <p style={{ marginBottom: 12 }}>LUNA integrates with the following third-party services:</p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li><strong style={{ color: '#5C4530' }}>Google (Gmail &amp; Calendar API)</strong> — Used to read and display your emails and calendar events. Governed by <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#8B9FD4' }}>Google&apos;s Privacy Policy</a>.</li>
            <li><strong style={{ color: '#5C4530' }}>Supabase</strong> — Used as the database and authentication provider. Your data is stored in a private, encrypted Supabase project. Governed by <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#8B9FD4' }}>Supabase&apos;s Privacy Policy</a>.</li>
            <li><strong style={{ color: '#5C4530' }}>Groq</strong> — Used for AI language model inference (Llama 3.3-70B). Email content and personal messages may be sent to Groq for processing. Groq does not retain prompts for training. Governed by <a href="https://groq.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#8B9FD4' }}>Groq&apos;s Privacy Policy</a>.</li>
            <li><strong style={{ color: '#5C4530' }}>Vercel</strong> — Used to host and serve the application. Request logs may be retained per Vercel&apos;s standard logging practices.</li>
          </ul>
        </Section>

        <Section title="6. Google API Scopes">
          <p style={{ marginBottom: 12 }}>LUNA requests the following Google OAuth scopes:</p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><code style={{ background: 'rgba(180,150,100,0.12)', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>gmail.readonly</code> — Read email messages and labels</li>
            <li><code style={{ background: 'rgba(180,150,100,0.12)', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>gmail.send</code> — Send emails on your behalf (used for AI-drafted replies)</li>
            <li><code style={{ background: 'rgba(180,150,100,0.12)', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>gmail.modify</code> — Mark messages as read or starred</li>
            <li><code style={{ background: 'rgba(180,150,100,0.12)', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>calendar.readonly</code> — Read calendar events</li>
            <li><code style={{ background: 'rgba(180,150,100,0.12)', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>calendar.events</code> — Create and update calendar events</li>
            <li><code style={{ background: 'rgba(180,150,100,0.12)', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>userinfo.email</code> — Identify your Google account email</li>
          </ul>
          <p style={{ marginTop: 12 }}>LUNA&apos;s use of Google user data is limited to the purposes described above and complies with the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#8B9FD4' }}>Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
        </Section>

        <Section title="7. Data Storage and Security">
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li>All data is stored in a private Supabase project with Row Level Security (RLS) enforced — each record is scoped to your user ID</li>
            <li>Google OAuth tokens are stored server-side and never exposed to the browser</li>
            <li>HTTPS/TLS encryption is used for all data in transit</li>
            <li>Financial data and sensitive fields use additional encryption where applicable</li>
          </ul>
        </Section>

        <Section title="8. Data Retention">
          Data is retained for as long as you use the application. You may request deletion of your data at any time by contacting the application owner. Disconnecting your Google account via the Settings page removes your OAuth tokens immediately.
        </Section>

        <Section title="9. Your Rights">
          As the primary user of this application, you have full access to all data stored about you. You may:
          <ul style={{ paddingLeft: 20, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>View all stored data through the LUNA interface</li>
            <li>Disconnect Google accounts at any time via Settings</li>
            <li>Request deletion of all stored data</li>
            <li>Revoke Google OAuth access at any time via <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: '#8B9FD4' }}>myaccount.google.com/permissions</a></li>
          </ul>
        </Section>

        <Section title="10. Contact">
          For any questions or requests regarding this privacy policy or your data, contact:
          <br /><br />
          <strong>Zoe Taylor</strong><br />
          <a href="mailto:info@drypdigital.com" style={{ color: '#8B9FD4' }}>info@drypdigital.com</a><br />
          DRYP Digital
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(180,150,100,0.16)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ color: '#8B9FD4', fontSize: 13, textDecoration: 'none' }}>Terms of Service →</Link>
          <Link href="/" style={{ color: '#5E5474', fontSize: 13, textDecoration: 'none' }}>← Back to LUNA</Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#5C4530', marginBottom: 14, letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, lineHeight: 1.75, color: '#32284A' }}>
        {children}
      </div>
    </div>
  )
}
