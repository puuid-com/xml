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

## Versioning

- Every commit bumps `version` in `package.json` and adds an entry at the top of `CHANGELOG.md` in the same commit: `## [x.y.z] - YYYY-MM-DD`, then `### Added`, `### Changed` or `### Fixed` with short user-facing bullets.
- Major for breaking changes to stored data, share links or file formats; minor for new features and visible behavior changes; patch for fixes, refactors, docs and tooling.
- If several commits go out together, each still gets its own version and entry.
- `src/lib/version.test.ts` fails if the newest changelog entry doesn't match `package.json`.

## Checks

Before committing, run `bun run check`, `bun run lint`, `bun run typecheck` and `bun run test`. CI runs the same checks plus `bun run build`.

## Git

After each task, commit and push to `main` without waiting to be asked. Pushing `main` runs the versioned `.githooks/pre-push` hook (installed by `bun install`), which runs the CI checks and then deploys with `bun run deploy`; if either fails the push is aborted, so fix the failure and push again. Don't use `--no-verify` unless told to.
