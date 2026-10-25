# Tasks

Feature ideas that keep the editor local-first and simple: no accounts, no server storage, everything stays in the browser.

**Order:** what to build first. Value for the effort, with the riskiest last.

**Reasoning** uses the Claude Code effort scale: low, medium, high, xhigh, max.

| #   | Feature                            | Reasoning | In one line                                                       |
| --- | ---------------------------------- | --------- | ----------------------------------------------------------------- |
| 1   | Back up and restore the workspace  | medium    | Protects the only copy of the data before we add more to it.      |
| 2   | Variable values per profile        | medium    | Lets `<<name>>` be filled in, finishing the variables feature.    |
| 3   | Share a file as a link             | low       | Send a file to someone with no server, using the URL fragment.    |
| 4   | Compare two files                  | high      | Side-by-side diff of two tabs, optionally ignoring formatting.    |
| 5   | Work offline and install as an app | xhigh     | Service worker so the app opens without a network. Easy to break. |

---

## 1. Back up and restore the workspace

Export everything (open and archived files, profiles, highlights, pins, defaults) to one JSON file, and restore from it. Show an error when the browser refuses to save.

**Why do it**

- All data lives in one place: this browser's localStorage. Clearing site data, a new laptop or a different browser loses all of it. The archive only covers the last 10 closed tabs.
- Safari deletes a site's script-writable storage after 7 days of use without the user interacting with the site.
- Saves fail silently today. `saveContent` in `src/lib/store/files.ts` swallows the rejected write, so a full storage quota (about 5 MB) looks like a working save until the next reload.
- Stays local-first: a file goes out, a file comes in.

**Why not**

- Backups go stale and people forget to make them. It's insurance, not sync.
- The file format becomes a contract: it needs a version field and migrations as the schemas change.
- Merging is hard (the same ids and names in two browsers). Replace-only keeps it simple but can't combine two workspaces.
- A backup holds everything, including any secrets typed into files.

**Reasoning: medium.** Simple mechanics, with a few decisions to get right: replace or merge, validation, versioning, and what a failed save does.

**Approach**

- Backup file: `{ app: 'xml-editor', version: 1, exportedAt, files, profiles, highlights, pins, defaults }`. Leave out session state (active tab, collapsed nodes).
- Restore validates with the existing zod schemas, lists the counts in an AlertDialog, downloads a backup of the current data, then replaces it. Adding single files already works by drag and drop.
- Command menu: "Back up workspace" and "Restore from backup…".
- A failed write shows an error notice ("Not saved: browser storage is full") with a backup action.
- Tests: round trip, invalid file rejected, newer version rejected.

**Done when** a backup made in one browser restores the same tabs, archive and profiles in another, and a failed save shows an error.

---

## 2. Variable values per profile

Give plain `<<name>>` variables a value in each profile, so ⇧⌥V fills them in along with the dynamic `<<$…>>` ones. Profiles then work as environments (dev, staging, prod).

**Why do it**

- Finishes the app's signature feature. Plain variables are highlighted, but nothing fills them; only dynamic ones resolve today.
- Reuses what exists: profile scoping and clone/delete (`src/lib/store/profile-actions.ts`), the key/value UI of Defaults, the resolve-into-a-new-file action and the completion preview panel.
- Small data that fits in localStorage.

**Why not**

- Two similar key/value lists: Defaults set tag values, Variables fill placeholders. Easy to confuse without clear names and copy.
- Ties environments to profiles. SOAP formatting with staging values means cloning a profile. Fine with a few profiles, messy with many.
- People will paste tokens and passwords, which then sit in plain localStorage and in backups.
- Replacing text can break the document, for example a value containing `&` or `"`.

**Reasoning: medium.** The pattern already exists three times (highlights, pins, defaults). The real decisions are escaping and naming.

**Approach**

- `src/lib/store/variables.ts`: `{ id, name, value, createdAt, profileId }`, modelled on `defaults.ts`. Add it to `cloneProfile` and `deleteProfile`.
- A "Variables" tab in the Settings popover, next to Format and Defaults.
- Editor: the chip tooltip shows the value; variables without one look different; completion after `<<` lists the profile's variables with their values in the preview panel; right-clicking a chip offers "Set value…".
- Resolve replaces text as written, like Postman, then parses the result and warns if it now has errors. The notice says how many variables were left unresolved.
- Values are literal text in v1, with no `<<$guid>>` inside a value.

**Done when** a file with `<<host>>` resolves to different values under two profiles and the original file is unchanged.

---

## 3. Share a file as a link

"Copy share link" puts the file, compressed, in the URL fragment (`/#share=…`). Opening the link asks before adding it as a new tab.

**Why do it**

- Send a payload to a colleague with no server, account or upload. Browsers never send the fragment to the server, so the Worker never sees the content.
- Native APIs only: `CompressionStream('deflate-raw')` and base64url. No new dependency.
- Small and self-contained: one helper, one dialog, a few strings.

**Why not**

- Links get long. Chat apps and email clients may truncate them, so it only suits small files.
- The content goes wherever the link goes: chat logs, browser history, bookmarks. A payload with credentials leaks them.
- A link is a snapshot, not a live document. People may expect edits to sync.
- Untrusted input: a short link can inflate to gigabytes (a compression bomb).

**Reasoning: low.** Well scoped, and every risk is listed here. Follow the notes.

**Approach**

- `src/lib/share.ts`: `encodeShare({ name, content })` and `decodeShare(hash)`, with a round-trip test. Validate with zod, stop decompressing past a size cap (for example 1 MB), and refuse links over a set length.
- On load, the editor reads `#share=`, asks in an AlertDialog ("Open shared file {name}?"), creates the file with `createFile` on confirm, then clears the fragment with `history.replaceState` so a reload doesn't ask again.
- "Copy share link" in the command menu. The copy says the content travels inside the link.

**Done when** a copied link opens the same file in a fresh browser after confirmation, and a broken or oversized link shows an error.

---

## 4. Compare two files

Compare the active file with another tab, side by side, with an option to ignore formatting.

**Why do it**

- A common job with payloads: what changed between this request and that one, or before and after Apply defaults.
- `@codemirror/merge`, the official CodeMirror package, does the diff and both layouts.
- The formatter already normalizes both sides (`formatDocument`), so "ignore formatting" is cheap.

**Why not**

- A new mode in a layout built around one editor and a side panel. Mobile needs its own unified view.
- Diffing large documents on the main thread can stall the page.
- Read-only in v1 means you can't fix a difference in place. Editable means syncing two editors with the per-file undo history.
- Diff colours bend the monochrome design and need restraint.

**Reasoning: high.** Several systems meet: the per-file `EditorState` cache in `CodeEditor.tsx`, the resizable layout, theming, mobile and performance.

**Approach**

- Add `@codemirror/merge`. "Compare with…" in the command menu lists the open tabs.
- Desktop shows `MergeView` in place of the editor panel; mobile shows `unifiedMergeView`. Both read-only in v1, closed with a button or Esc.
- An "Ignore formatting" toggle formats both sides with the active profile's options when both parse.
- Mark inserted and deleted ranges with existing tokens (`--destructive`, `--hl-green`), not new colours. Test with a large file.

**Done when** two tabs holding the same data with different formatting show no differences with the toggle on, and real changes are marked.

---

## 5. Work offline and install as an app

A service worker caches the app so it opens without a network, and the manifest gets what browsers need to install it.

**Why do it**

- Makes local-first true at load time too. The data is local, but the app still needs a network to open: planes, VPNs, bad Wi-Fi.
- Installed, it gets its own window and dock or taskbar icon.
- Safari counts days of use separately for web apps added to the Home Screen, so installed users are far less exposed to the 7-day storage purge.

**Why not**

- The hardest feature here to keep simple. Service worker bugs stick: a bad cache keeps serving an old or broken app, and users can't fix it themselves.
- Needs an update flow ("New version available, reload") and a way to retire a bad worker.
- Dev and prod diverge because the worker only runs in production builds, so problems show up after a deploy.
- The Worker already serves the app quickly from Cloudflare's edge. Only worth it if people really work offline.

**Reasoning: xhigh.** TanStack Start, the Cloudflare Vite plugin, hashed Rolldown chunks, Paraglide's locale URLs (`/` and `/fr`) and the cache lifecycle all interact, and mistakes ship silently and stay on users' devices.

**Approach**

- Build the precache list from the client build output, with a small Vite plugin or a tool such as Serwist if it fits the Start build. Cache-first for hashed assets; network-first with a cache fallback for each locale's HTML shell.
- Name caches per build and delete old ones on `activate`. Serve the worker from `/sw.js` so it controls every route.
- When a new worker is waiting, show a status bar notice with a Reload action (notices already support actions).
- Keep a kill switch ready: a worker that unregisters itself.
- Manifest: add raster icons (192 and 512 px, maskable) and an `apple-touch-icon`.

**Done when** the app loads with the network off after one visit, a deploy shows the reload notice, and Chrome offers to install it.

---

## Considered, not picked

- **XPath and JSONPath queries.** Useful, but tree search, highlights and pins cover most of it, and mapping results back to source positions is the hard part.
- **XML ⇄ JSON conversion.** No standard mapping for attributes, mixed content or one-item lists, so the output is wrong for someone.
- **Editing files on disk** (File System Access API). The read-write pickers are Chromium-only, and it adds a second source of truth next to localStorage.
- **Schema validation** (XSD, JSON Schema). XSD needs a large WebAssembly build of libxml2. Heavy for a simple site.
- **Minify and sample files.** Removed on purpose earlier.
