// Shared by the service worker, the kill switch, the page that registers them
// and the Vite plugin that builds them. Plain TypeScript: no DOM or worker types.

/** What the plugin bakes into the worker for one build. */
export interface WorkerBuild {
  /** Hash of every precached file. Names the cache, so each build gets its own. */
  version: string
  /** Build output and public files. Cache-first: hashed names never change content. */
  assets: ReadonlyArray<string>
  /** Locale shells and the manifest. Network-first, with the precached copy as fallback. */
  pages: ReadonlyArray<string>
  /**
   * The locale shells among `pages`, such as `/` and `/fr/`. A page that is
   * not precached falls back offline to the shell its path starts with, and
   * the router renders it on the client.
   */
  shells: ReadonlyArray<string>
}

/** Messages the page sends to a worker. */
export type WorkerMessage =
  | { type: 'skip-waiting' }
  /** Replies `true` on the transferred port when every path is precached. */
  | { type: 'has-assets'; paths: ReadonlyArray<string> }

const CACHE_PREFIX = 'offline-'

export const cacheName = (version: string) => `${CACHE_PREFIX}${version}`

/** True for caches made by any build of the worker, so old ones can be found and deleted. */
export const isWorkerCache = (name: string) => name.startsWith(CACHE_PREFIX)
