// LUNA's push-notification service worker. Deliberately does NOT intercept
// fetch or cache anything — an earlier, more aggressive caching service
// worker caused stale-content bugs, which is why the app force-unregisters
// anything that isn't this file (see src/app/layout.tsx). Push + click
// handling only, so it's safe to keep registered indefinitely.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: 'Luna', body: event.data ? event.data.text() : '' } }

  const title = data.title || 'Luna'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/home' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/home'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      const existing = clientsArr.find(c => c.url.includes(self.location.origin))
      if (existing) return existing.focus().then(c => c.navigate ? c.navigate(url) : c)
      return self.clients.openWindow(url)
    })
  )
})
