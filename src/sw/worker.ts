// The service worker, served from /sw.js so its scope covers every route.
// `plugins/service-worker.ts` bundles it and fills in __WORKER_BUILD__.
import { cacheName, isWorkerCache } from './protocol'
import type { WorkerBuild, WorkerMessage } from './protocol'

declare const self: ServiceWorkerGlobalScope
declare const __WORKER_BUILD__: WorkerBuild

const build = __WORKER_BUILD__
const CACHE = cacheName(build.version)
const assets = new Set(build.assets)
const pages = new Set(build.pages)
/** Longest first, so `/fr/about` picks `/fr/` over `/`. */
const shells = [...build.shells].sort((a, b) => b.length - a.length)

/** How long a page request waits for the network before the cached copy is used. */
const NETWORK_TIMEOUT_MS = 3000

self.addEventListener('install', (event) => {
  // `no-cache` revalidates with the server, so nothing stale comes from the
  // HTTP cache, while unchanged files cost a 304. One failure fails the
  // install and the current worker stays in charge.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          [...assets, ...pages].map(
            (path) => new Request(path, { cache: 'no-cache' }),
          ),
        ),
      ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => isWorkerCache(name) && name !== CACHE)
          .map((name) => caches.delete(name)),
      )
      // Take over pages opened before the first install, so their lazy
      // chunks also come from the cache.
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  const message = event.data as WorkerMessage | null
  if (message?.type === 'skip-waiting') void self.skipWaiting()
  if (message?.type === 'has-assets') {
    event.ports[0]?.postMessage(message.paths.every((p) => assets.has(p)))
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (assets.has(url.pathname)) {
    event.respondWith(cacheFirst(request, url.pathname))
  } else if (pages.has(url.pathname)) {
    event.respondWith(networkFirst(request, url.pathname))
  } else if (request.mode === 'navigate' && pages.has(`${url.pathname}/`)) {
    // `/fr` redirects to `/fr/`. Offline, send the same redirect.
    event.respondWith(networkFirst(request, `${url.pathname}/`, true))
  } else if (request.mode === 'navigate') {
    // Any other page, such as `/about`: offline, serve its locale's shell
    // and let the router render the page on the client. Only this build's
    // shells are ever served, so the HTML always matches the cached assets.
    const shell = shells.find((path) => url.pathname.startsWith(path))
    if (shell) event.respondWith(networkFirst(request, shell))
  }
  // Anything else goes to the network as if there were no worker.
})

const cached = (path: string) =>
  caches.open(CACHE).then((cache) => cache.match(path, { ignoreVary: true }))

async function cacheFirst(request: Request, path: string) {
  const hit = await cached(path)
  if (hit) return hit
  // Only reached if the browser evicted the entry: fetch and store it again.
  const response = await fetch(request)
  if (response.ok) {
    const copy = response.clone()
    void caches.open(CACHE).then((cache) => cache.put(path, copy))
  }
  return response
}

/**
 * Network first, then the copy precached at install. The network response
 * is never written back: the cached shell must reference this build's
 * assets, and a newer deploy's HTML would point at files this cache lacks.
 */
async function networkFirst(request: Request, page: string, alias = false) {
  const network = fetch(request)
  // Keep a late failure after a timeout from surfacing as unhandled.
  network.catch(() => undefined)
  const fallback = async () => {
    const hit = await cached(page)
    if (!hit || !alias) return hit
    return Response.redirect(new URL(page, self.location.origin).href)
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), NETWORK_TIMEOUT_MS)
  })
  try {
    const first = await Promise.race([network, timeout])
    if (first !== 'timeout' && first.status < 500) return first
    // Slow network or a server error: use the cached copy if there is one.
    return (await fallback()) ?? (await network)
  } catch (error) {
    // Offline.
    const response = await fallback()
    if (response) return response
    throw error
  } finally {
    clearTimeout(timer)
  }
}
