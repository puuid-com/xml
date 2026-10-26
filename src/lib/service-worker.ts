// Registers /sw.js in production builds and runs the update flow: when a
// newer build is ready, a status bar notice offers to reload into it.
// The worker itself is `src/sw/worker.ts`.
import { notify } from '#/components/app/notice-store'
import { isWorkerCache } from '#/sw/protocol'
import type { WorkerMessage } from '#/sw/protocol'
import { m } from '#/paraglide/messages'

/** How often an open tab asks the server for a new worker. */
const UPDATE_CHECK_MS = 60 * 60 * 1000

let started = false

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  if (started) return
  started = true
  if (import.meta.env.VITE_SW_KILL_SWITCH) {
    void retire()
    return
  }
  // Wait for the page's own downloads before the worker fetches the precache.
  if (document.readyState === 'complete') void register()
  else window.addEventListener('load', () => void register(), { once: true })
}

async function register() {
  const registration = await navigator.serviceWorker
    .register('/sw.js')
    .catch(() => undefined)
  if (!registration) return

  // No active worker yet: this is the first install, not an update.
  const firstWorker = registration.active ? null : registration.installing
  const tracked = new WeakSet<ServiceWorker>()
  const track = (worker: ServiceWorker | null) => {
    if (!worker || tracked.has(worker)) return
    tracked.add(worker)
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') void checkForUpdate(registration)
      if (worker.state === 'activated' && worker === firstWorker) {
        notify.success(m.offline_ready())
      }
    })
  }

  track(registration.installing)
  registration.addEventListener('updatefound', () =>
    track(registration.installing),
  )
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    void checkForUpdate(registration, true)
  })
  setInterval(() => {
    registration.update().catch(() => undefined)
  }, UPDATE_CHECK_MS)
  void checkForUpdate(registration)
}

/**
 * Compares the build on screen with the worker's. Pages are network-first, so
 * after a deploy a page often runs a newer build than the active worker:
 * then the new worker is fetched and, once installed, takes over quietly.
 * The reload notice only shows when the worker holds a newer build than the
 * page: an update is waiting, or another tab switched to a newer worker.
 */
async function checkForUpdate(
  registration: ServiceWorkerRegistration,
  controllerChanged = false,
) {
  const { waiting, active } = registration
  if (waiting) {
    if (await holdsThisPage(waiting)) send(waiting, { type: 'skip-waiting' })
    else showUpdateNotice(registration)
  } else if (active && !(await holdsThisPage(active))) {
    if (controllerChanged) showUpdateNotice(registration)
    else registration.update().catch(() => undefined)
  }
}

function showUpdateNotice(registration: ServiceWorkerRegistration) {
  notify.info(m.update_available(), {
    sticky: true,
    action: { label: m.update_reload(), run: () => applyUpdate(registration) },
  })
}

function applyUpdate(registration: ServiceWorkerRegistration) {
  const waiting = registration.waiting
  if (!waiting) {
    window.location.reload()
    return
  }
  waiting.addEventListener('statechange', () => {
    if (waiting.state === 'activated' || waiting.state === 'redundant') {
      window.location.reload()
    }
  })
  send(waiting, { type: 'skip-waiting' })
}

/** Build files this page loaded, from resource timing (scripts, styles, fonts). */
function pageAssets() {
  return performance
    .getEntriesByType('resource')
    .map((entry) => new URL(entry.name))
    .filter(
      (url) =>
        url.origin === location.origin && url.pathname.startsWith('/assets/'),
    )
    .map((url) => url.pathname)
}

function holdsThisPage(worker: ServiceWorker) {
  const paths = pageAssets()
  // Nothing to compare: assume an update so the user can still reload.
  if (paths.length === 0) return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = (event) => resolve(event.data === true)
    send(worker, { type: 'has-assets', paths }, [channel.port2])
  })
}

function send(
  worker: ServiceWorker,
  message: WorkerMessage,
  transfer: Array<Transferable> = [],
) {
  worker.postMessage(message, transfer)
}

/** Kill switch build: remove every registration and cache this app made. */
async function retire() {
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((r) => r.unregister()))
  const names = await caches.keys()
  await Promise.all(names.filter(isWorkerCache).map((n) => caches.delete(n)))
}
