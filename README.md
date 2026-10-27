# xml

Starting point for websites built with TanStack Start, deployed to Cloudflare Workers.

## Stack

- [TanStack Start](https://tanstack.com/start) and [Router](https://tanstack.com/router), with file-based routes in `src/routes`
- [TanStack Query](https://tanstack.com/query), Form, Table, Store and DB
- [shadcn/ui](https://ui.shadcn.com) (radix-lyra style, Tabler icons) and Tailwind CSS v4
- [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) for i18n (English and French, locale in the URL)
- Cloudflare Workers through the Cloudflare Vite plugin
- Vitest and Testing Library, ESLint, Prettier, GitHub Actions
- React Compiler and Geist fonts

## Start a new site

1. On GitHub, click **Use this template**, or clone this repo.
2. Install dependencies. This also compiles messages and generates Cloudflare types.

   ```bash
   bun install
   ```

3. Fill in the site's name, description and production URL:

   ```bash
   bun run init
   ```

4. Start the dev server on http://localhost:3000:

   ```bash
   bun run dev
   ```

## Scripts

| Script                 | What it does                                                  |
| ---------------------- | ------------------------------------------------------------- |
| `bun run dev`          | Dev server with devtools                                      |
| `bun run build`        | Production build                                              |
| `bun run preview`      | Serve the production build locally                            |
| `bun run deploy`       | Build and deploy to Cloudflare Workers                        |
| `bun run test`         | Run tests once (`test:watch` to keep watching)                |
| `bun run typecheck`    | TypeScript check                                              |
| `bun run lint`         | ESLint                                                        |
| `bun run format`       | Prettier and ESLint fixes                                     |
| `bun run check`        | Prettier check (used by CI)                                   |
| `bun run cf-typegen`   | Regenerate `worker-configuration.d.ts` after editing wrangler |
| `bun run i18n:compile` | Recompile messages without running the dev server             |
| `bun run icons`        | Render the PNG app icons from `public/favicon.svg`            |

## Project layout

```
src/
  site.ts                 Site name, description, URL, OG image, sitemap paths
  env.server.ts           Validated server env (secrets and vars)
  server.ts               Worker entry: runs Paraglide middleware around Start
  router.tsx              Router, locale URL rewrites, error and 404 defaults
  routes/
    __root.tsx            <html> shell, head defaults, header and footer
    index.tsx, about.tsx  Example pages
    sitemap[.]xml.ts      Generated from site.sitemapPaths
    robots[.]txt.ts
    site[.]webmanifest.ts
  sw/                     Service worker, kill switch and their shared protocol
  components/
    layout/               SiteHeader, SiteFooter
    ui/                   shadcn components (added by the CLI)
  lib/
    seo.ts                seo() head helper: title, OG, canonical, hreflang
    theme.ts              Pre-paint script that follows the system theme
    service-worker.ts     Registers /sw.js and shows the update notice
plugins/
  service-worker.ts       Vite plugin that builds /sw.js with the precache list
messages/                 Translations, one JSON file per locale
public/                   Static files served as is, all precached
```

## Common tasks

### Add a page

Create `src/routes/pricing.tsx`. The dev server regenerates `routeTree.gen.ts`.

```tsx
import { createFileRoute } from '@tanstack/react-router'

import { seo } from '#/lib/seo'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/pricing')({
  head: () => seo({ title: m.pricing_title(), path: '/pricing' }),
  component: Pricing,
})
```

Then add its messages to every file in `messages/`, its link to `SiteHeader`, and its path to `site.sitemapPaths`.

### Add a UI component

```bash
bunx shadcn@latest add dialog
```

### Add a locale

Add it to `locales` in `project.inlang/settings.json`, create `messages/<locale>.json`, and add its name to `LocaleSwitcher`.

### Add a secret or binding

- Secrets and vars: declare them in the schema in `src/env.server.ts`. Put local values in `.dev.vars` (copy `.dev.vars.example`) and set production values with `wrangler secret put NAME`.
- KV, D1, R2 and other bindings: add them to `wrangler.jsonc`, run `bun run cf-typegen`, and read them from `import { env } from 'cloudflare:workers'`.

## Offline and install

Production builds ship a service worker at `/sw.js` so the app opens without a network after one visit, and the web manifest has what browsers need to install it.

- **Precache.** `plugins/service-worker.ts` lists the client build output and `public/`, hashes them into a version, and bundles `src/sw/worker.ts` with that list. Each build gets its own cache; old ones are deleted when the new worker activates.
- **Strategies.** Build files are cache-first (hashed names never change content). Each locale's HTML shell (`/`, `/fr/`) and the manifest are network-first, falling back to the copy cached at install after 3 seconds, on a network error or on a 5xx. Everything else goes to the network.
- **Updates.** Open tabs check for a new worker every hour. When one is waiting and the page runs an older build, the status bar shows "A new version is available" with a Reload action. A page that already loaded the new build from the network switches quietly.
- **Dev.** The worker only registers in production builds, so `bun run dev` never sees it. Test it with `bun run build && bun run preview`, then reload with the network off in DevTools (Application → Service workers).
- **Icons.** After replacing `public/favicon.svg`, run `bun run icons` and commit the PNGs.

### Retire a broken worker

A bad worker keeps serving its cache, and users can't fix that themselves. Ship the kill switch:

```bash
VITE_SW_KILL_SWITCH=1 bun run deploy
```

The build then serves `src/sw/kill-switch.ts` as `/sw.js` and stops registering. Browsers fetch `/sw.js` on every navigation and on the hourly check, bypassing the old worker, so the kill switch installs at once, deletes the caches, unregisters itself and reloads open tabs from the network. Leave it deployed while you fix the problem (a day or more reaches most users), then deploy normally to turn offline support back on.

## Deploy

```bash
bunx wrangler login
bun run deploy
```

## Design

The UI follows Vercel's [design guidelines](https://vercel.com/design.md): Geist type, a monochrome palette, minimal motion and a theme that follows the system setting.
