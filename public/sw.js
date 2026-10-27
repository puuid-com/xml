// The app used to ship an offline service worker at /sw.js. Browsers that
// installed it still check this URL for updates, so this replacement cleans
// up: it deletes the old caches, unregisters itself and reloads open tabs
// from the network. Safe to delete once old installs have had time to update.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((n) => n.startsWith('offline-'))
          .map((n) => caches.delete(n)),
      )
      await self.registration.unregister()
      const windows = await self.clients.matchAll({ type: 'window' })
      await Promise.all(
        windows.map((client) => client.navigate(client.url).catch(() => null)),
      )
    })(),
  )
})
