# Web Template

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
  components/
    layout/               SiteHeader, SiteFooter
    ui/                   shadcn components (added by the CLI)
  lib/
    seo.ts                seo() head helper: title, OG, canonical, hreflang
    theme.ts              Pre-paint script that follows the system theme
messages/                 Translations, one JSON file per locale
public/                   Static files served as is
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

## Deploy

```bash
bunx wrangler login
bun run deploy
```

## Design

The UI follows Vercel's [design guidelines](https://vercel.com/design.md): Geist type, a monochrome palette, minimal motion and a theme that follows the system setting.
