# XML Editor

A browser-based XML and JSON editor with a synchronized structure tree, file tabs, formatting, comparisons, and reusable profiles. Files and settings stay in the browser; there are no accounts or server-side document storage.

## Develop

```bash
bun install
bun run dev
```

Open http://localhost:3000. Installation compiles the English and French messages and generates Cloudflare binding types.

## Features

- Edit XML and JSON in CodeMirror, or edit values in the searchable structure tree.
- Open multiple files, retain undo history across tabs, and compare two files.
- Keep formatting settings, tag highlights, pinned fields, defaults, and variables in profiles.
- Open files from disk and save back where the browser supports file handles.
- Archive closed files, export workspace backups, and restore them later.
- Share a document and optional profile settings through a link.

## State and persistence

TanStack DB collections keep files, profiles, and rules in IndexedDB and synchronize changes across browser tabs. The route waits for `workspaceReady()` before mounting the editor. Older localStorage workspaces are migrated on startup.

TanStack Store holds UI and session state. CodeMirror owns the live document, selection, and undo history. `editor-session.ts` coordinates file switching, cached editor states, and collection updates; `editor-store.ts` exposes parsed documents and cursor state to the rest of the interface.

Content edits update optimistically and persist after a 400 ms typing pause. Collection mutators expose TanStack transactions when a caller needs to await `isPersisted.promise`; profile creation, cloning, and deletion return promises. Forms retain their drafts on failed writes and confirm saves only after persistence succeeds. Multi-collection operations are not a single atomic IndexedDB transaction; backup restore attempts to roll back completed writes on failure.

## Project layout

```text
src/
  components/
    app/                  Workspace layout, dialogs, commands, notices
    editor/               CodeMirror setup, sessions, actions, disk saves
    inspector/            Tree search/navigation and separate row rendering
    profiles/             Profile controls and dialogs
    compare/              Document comparisons
    ui/                   shadcn/ui components
  hooks/                  TanStack live queries and shared React hooks
  lib/
    store/                Collections, persistence, migration, backups
    xml/                  XML parsing, formatting, editing, variables
    json/                 JSON parsing, formatting, editing
    document.ts           Shared XML/JSON operations
  routes/                 Editor and public routes
  site.ts                 Site identity and SEO configuration
  server.ts               Paraglide middleware around TanStack Start
messages/                 English and French translations
public/                   Icons and static assets
```

## Checks and scripts

| Command                   | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `bun run dev`             | Development server on port 3000                             |
| `bun run build`           | Production build                                            |
| `bun run preview`         | Preview the production build                                |
| `bun run test`            | Vitest tests, including IndexedDB and component coverage    |
| `bun run test:watch`      | Watch tests                                                 |
| `bun run typecheck`       | TypeScript validation                                       |
| `bun run lint`            | ESLint                                                      |
| `bun run check`           | Prettier validation                                         |
| `bun run format`          | Apply Prettier and ESLint fixes                             |
| `bun run doctor`          | Additional React diagnostics; inspect findings individually |
| `bun run generate-routes` | Regenerate the TanStack route tree                          |
| `bun run i18n:compile`    | Regenerate translated message functions                     |
| `bun run cf-typegen`      | Regenerate Cloudflare binding types                         |
| `bun run icons`           | Render PNG app icons from `public/favicon.svg`              |

CI runs formatting, lint, type checking, tests, and the production build. Tests use `fake-indexeddb`; editor-session tests exercise independent database connections, remote edits, undo history, and restore rollback. Browser checks still need a reproducible harness; see [TASKS.md](TASKS.md).

## Conventions

Use the appropriate TanStack libraries, shadcn/ui, and Tailwind CSS. Follow [Vercel's design guidelines](https://vercel.com/design.md). Check for an existing shadcn component before adding UI; install new primitives with `bunx shadcn@latest add <component>`.

Import application code through `#/`. Add user-facing strings to both `messages/en.json` and `messages/fr.json`. Do not edit generated files in `src/paraglide/`, `src/routeTree.gen.ts`, or `worker-configuration.d.ts`.

Public routes set their SEO metadata through `seo()` and belong in `site.sitemapPaths`. To add a locale, update `project.inlang/settings.json`, add its messages, and update `localeNames` in `LocaleSwitcher.tsx`.

## Deploy

Set the production identity and URL in `src/site.ts`, and review `wrangler.jsonc` for the target Worker. Server environment variables are validated in `src/env.server.ts`; use `.dev.vars.example` for local configuration.

```bash
bunx wrangler login
bun run deploy
```

The inherited `bun run init` script rewrites site identity when creating a separate site; it is not required for normal development.

`public/sw.js` removes the old offline service worker and its caches. Keep it until older installs have had time to update.
