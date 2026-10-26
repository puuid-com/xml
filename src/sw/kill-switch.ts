// Retires a broken worker. Built into /sw.js instead of `worker.ts` when
// VITE_SW_KILL_SWITCH is set (see README, "Offline and install"). Browsers
// fetch /sw.js on every navigation, find this one, install it at once, and it
// removes itself, its caches and the old worker, then reloads open tabs from
// the network. It has no fetch handler, so nothing is served from a cache.
import { isWorkerCache } from './protocol'

declare const self: ServiceWorkerGlobalScope

self.addEventListener('install', () => {
  void self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()
      const names = await caches.keys()
      await Promise.all(
        names.filter(isWorkerCache).map((n) => caches.delete(n)),
      )
      await self.registration.unregister()
      const windows = await self.clients.matchAll({ type: 'window' })
      await Promise.all(
        windows.map((client) => client.navigate(client.url).catch(() => null)),
      )
    })(),
  )
})
