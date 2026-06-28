// Kill-switch service worker — clears all caches and unregisters
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  await clients.matchAll({ includeUncontrolled: true }).then(cs =>
    cs.forEach(c => c.postMessage({ type: 'SW_CLEARED' }))
  );
  await self.registration.unregister();
});
