import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme'
import './globals.css'
import './luna-home-polish.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans-var',
  weight: ['300', '400', '500', '600', '700', '800'],
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display-var',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'LUNA',
  description: 'You are not behind. You are returning.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LUNA',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0D0B1E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable} h-full`} suppressHydrationWarning>
      {/* Inline script runs before paint — eliminates dark/light flash */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('luna-theme') || 'dark';
              document.documentElement.setAttribute('data-theme', t);
            } catch(e){
              document.documentElement.setAttribute('data-theme', 'dark');
            }
            // Old aggressive-caching service workers caused stale-content bugs,
            // so every registration used to get force-unregistered on every
            // load. That also kills the push-notification service worker
            // (/sw.js) before it can ever stay subscribed. It doesn't do any
            // fetch/cache interception, so it can't cause that bug — only
            // unregister anything that ISN'T it.
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(regs){
                regs.forEach(function(r){
                  var url = (r.active && r.active.scriptURL) || (r.installing && r.installing.scriptURL) || (r.waiting && r.waiting.scriptURL) || '';
                  if (url.indexOf('/sw.js') === -1) r.unregister();
                });
              });
            }
            if ('caches' in window) {
              caches.keys().then(function(names){
                names.forEach(function(n){ caches.delete(n); });
              });
            }
          })();
        `}} />
      </head>
      <body className="h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
