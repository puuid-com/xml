# Project conventions

Website template: TanStack Start on Cloudflare Workers, shadcn/ui, Tailwind v4, Paraglide i18n. Package manager is bun.

## Rules

- Use TanStack libraries (Router, Query, Form, Table, Store, DB) for what they cover, following their docs.
- UI uses shadcn/ui and Tailwind. Before building a component, check whether shadcn has it and install it with `bunx shadcn@latest add <name>`. Don't hand-write a replacement.
- Design follows https://vercel.com/design.md: Geist, monochrome tokens from `src/styles.css`, no decorative gradients or motion.
- Import from `src` with the `#/` alias (`#/lib/utils`, `#/components/ui/button`).
- Every user-facing string goes in `messages/en.json` and `messages/fr.json` and is used through `m.key()`. Don't hardcode copy.
- Every page route sets `head: () => seo({ title, path })`. Public pages also go in `site.sitemapPaths`.
- Server-only code lives in `*.server.ts` files. Read env through `#/env.server`.
- Don't edit generated files: `src/routeTree.gen.ts`, `src/paraglide/`, `worker-configuration.d.ts`.

## Checks

Before committing, run `bun run check`, `bun run lint`, `bun run typecheck` and `bun run test`. CI runs the same checks plus `bun run build`.
