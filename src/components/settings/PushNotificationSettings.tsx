'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing } from 'lucide-react'

type PushState = 'unsupported' | 'not-ios-installed' | 'denied' | 'off' | 'on' | 'busy'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalonePWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}

export function PushNotificationSettings() {
  const [state, setState] = useState<PushState>('busy')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setState('unsupported'); return }
    if (isIOS() && !isStandalonePWA()) { setState('not-ios-installed'); return }
    if (Notification.permission === 'denied') { setState('denied'); return }

    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      setState(sub ? 'on' : 'off')
    }).catch(() => setState('off'))
  }, [])

  async function enable() {
    setState('busy')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState('denied'); return }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
      })

      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
      setState('on')
    } catch (err) {
      console.error('[push] subscribe failed:', err)
      setState('off')
    }
  }

  async function disable() {
    setState('busy')
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState('off')
    } catch (err) {
      console.error('[push] unsubscribe failed:', err)
      setState('off')
    }
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, height: 38, borderRadius: 12,
    border: '1px solid rgba(201,169,110,0.4)', background: 'rgba(201,169,110,0.1)',
    color: '#5C4530', fontSize: 12, fontWeight: 700, padding: '0 16px', cursor: 'pointer',
  }

  return (
    <>
      <p style={{ fontSize: 13, color: '#32284A', lineHeight: 1.6, marginBottom: 14 }}>
        Get real push notifications on your phone — morning briefing, your daily reading, your top task when work starts, and an evening wind-down nudge.
      </p>

      {state === 'not-ios-installed' && (
        <p style={{ fontSize: 12, color: '#8A6D3B', lineHeight: 1.5, background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 12, padding: '10px 14px' }}>
          On iPhone, push notifications only work once LUNA is added to your Home Screen. Tap the Share button in Safari → &ldquo;Add to Home Screen&rdquo; → open LUNA from there, then come back to this page.
        </p>
      )}

      {state === 'unsupported' && (
        <p style={{ fontSize: 12, color: '#5E5474' }}>This browser doesn&apos;t support push notifications.</p>
      )}

      {state === 'denied' && (
        <p style={{ fontSize: 12, color: '#5E5474' }}>Notifications are blocked for LUNA in your phone&apos;s settings. Enable them in Settings → Notifications → LUNA, then reload this page.</p>
      )}

      {state === 'busy' && <p style={{ fontSize: 12, color: '#5E5474' }}>Checking…</p>}

      {state === 'off' && (
        <button type="button" onClick={enable} style={rowStyle}>
          <Bell size={15} /> Enable Push Notifications
        </button>
      )}

      {state === 'on' && (
        <button type="button" onClick={disable} style={{ ...rowStyle, background: 'rgba(90,160,90,0.12)', border: '1px solid rgba(90,160,90,0.3)', color: '#3f7a3f' }}>
          <BellRing size={15} /> Notifications On — Tap to Turn Off
        </button>
      )}
    </>
  )
}
