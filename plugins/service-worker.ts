// Builds /sw.js for the client: lists the build output and public files to
// precache, names the cache after their content, and bundles
// src/sw/worker.ts with that list baked in. With VITE_SW_KILL_SWITCH set it
// bundles src/sw/kill-switch.ts instead. Runs on `vite build` only.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { build } from 'vite'
import type { Plugin } from 'vite'

import type { WorkerBuild } from '../src/sw/protocol.ts'

interface Options {
  /** Paraglide project folder. Each locale's HTML shell is precached. */
  project: string
  /** Other network-first URLs to precache, such as the web manifest. */
  pages?: ReadonlyArray<string>
}

export interface BuildFile {
  /** URL path, such as `/assets/index-a1b2c3.js`. */
  path: string
  source: string | Uint8Array
}

/** Dotfiles (`.assetsignore`, `.vite/`), source maps and the worker itself stay out. */
const isPrecached = (path: string) =>
  path !== '/sw.js' &&
  !path.endsWith('.map') &&
  !path.split('/').some((segment) => segment.startsWith('.'))

/** The precache list and its version. The version changes when any file or page does. */
export function workerBuild(
  files: ReadonlyArray<BuildFile>,
  pages: ReadonlyArray<string>,
): WorkerBuild {
  const kept = [
    ...new Map(
      files.filter((f) => isPrecached(f.path)).map((f) => [f.path, f]),
    ).values(),
  ].sort((a, b) => (a.path < b.path ? -1 : 1))
  const hash = createHash('sha256')
  for (const file of kept) hash.update(`${file.path}\0`).update(file.source)
  for (const page of pages) hash.update(`\0${page}`)
  return {
    version: hash.digest('hex').slice(0, 12),
    assets: kept.map((f) => f.path),
    pages: [...pages],
  }
}

/** `/` for the base locale and `/fr/` for the others, as Paraglide's URL strategy writes them. */
export function localeShells(project: string) {
  const settings = JSON.parse(
    readFileSync(join(project, 'settings.json'), 'utf8'),
  ) as { baseLocale: string; locales: ReadonlyArray<string> }
  return [
    '/',
    ...settings.locales
      .filter((locale) => locale !== settings.baseLocale)
      .map((locale) => `/${locale}/`),
  ]
}

function publicFiles(dir: string): Array<BuildFile> {
  if (!dir) return []
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const file = join(entry.parentPath, entry.name)
      return {
        path: `/${relative(dir, file).split(sep).join('/')}`,
        source: readFileSync(file),
      }
    })
}

async function bundleWorker(
  root: string,
  entry: string,
  define: Record<string, string>,
) {
  const result = await build({
    configFile: false,
    envDir: false,
    root,
    logLevel: 'warn',
    publicDir: false,
    define,
    build: {
      write: false,
      minify: true,
      rolldownOptions: { input: entry, output: { format: 'iife' } },
    },
  })
  for (const output of Array.isArray(result) ? result : [result]) {
    if (!('output' in output)) continue
    const chunk = output.output.find((o) => o.type === 'chunk')
    if (chunk) return chunk.code
  }
  throw new Error(`Bundling ${entry} produced no code`)
}

export function serviceWorker(options: Options): Plugin {
  return {
    name: 'app:service-worker',
    apply: 'build',
    generateBundle: {
      order: 'post',
      async handler(_, bundle) {
        if (this.environment.name !== 'client') return
        const { config } = this.environment
        const killSwitch = Boolean(config.env.VITE_SW_KILL_SWITCH)

        const files = [
          ...Object.values(bundle).map((output) => ({
            path: `/${output.fileName}`,
            source: output.type === 'chunk' ? output.code : output.source,
          })),
          ...publicFiles(config.publicDir),
        ]
        const pages = [
          ...localeShells(resolve(config.root, options.project)),
          ...(options.pages ?? []),
        ]
        const precache = workerBuild(files, pages)

        const entry = resolve(
          config.root,
          killSwitch ? 'src/sw/kill-switch.ts' : 'src/sw/worker.ts',
        )
        const code = await bundleWorker(config.root, entry, {
          __WORKER_BUILD__: JSON.stringify(precache),
        })
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: code })

        config.logger.info(
          killSwitch
            ? 'sw.js: kill switch, unregisters the service worker'
            : `sw.js: ${precache.assets.length} files and ${precache.pages.length} pages precached, version ${precache.version}`,
        )
      },
    },
  }
}
