# Tasks

Follow-ups from the 2026-10-26 fix run, which shipped variables in backups, sticky update notices, all-or-nothing restore, reporting every failed save, offline pages and a browser check of the merged features. The editor stays local-first and simple: no accounts, no server storage, everything stays in the browser.

**Order:** what to do first. Fixes that lose or hide data come before polish.

**Reasoning** uses the Claude Code effort scale: low, medium, high, xhigh, max.

| #   | Task                                      | Reasoning | In one line                                                            |
| --- | ----------------------------------------- | --------- | ---------------------------------------------------------------------- |
| 1   | Apply the first edit from another tab     | medium    | A newly opened tab drops the first content edit made elsewhere.        |
| 2   | Roll back the editor on failed restore    | low       | The open editor keeps the backup's text after a restore rolls back.    |
| 3   | Show notices on phones                    | low       | On mobile the notice text is hidden and its buttons cover the profile. |
| 4   | Don't confirm refused variable saves      | low       | "Value saved" shows when storage refused the value.                    |
| 5   | Clear the remaining React Doctor warnings | low       | The commit hook still warns on 17 pre-existing issues.                 |
| 6   | Make the browser checks rerunnable        | medium    | The headless Chrome checks live in `/tmp` and need hand-made builds.   |

---

## 1. Apply the first edit from another tab

Open the editor in two tabs of the same browser and type in the first one: the second tab's editor keeps the old text. The edit reaches localStorage, and the second tab's tab strip, highlights and variables update. The next content edit does reach the editor and brings it up to date. A rename made before the first edit also makes it work. Reloading the second tab brings the problem back.

**Why do it**

- The second tab shows stale text with no sign that it is stale. Typing there saves over the first tab's edit.
- Cross-tab sync is a promised feature: the welcome text says files "sync across tabs".

**Why not**

- It only loses the first edit after a tab opens, and the next edit corrects it.

**Reasoning: medium.** The cause isn't known yet. The data reaches storage and the collection, so the gap is between the collection's change events and the editor.

**Approach**

- Start in the `filesCollection.subscribeChanges` handler in `src/components/editor/CodeEditor.tsx`. Log the first change a new tab gets: whether it arrives, its type (`update` or not), and whether `view.state.field(fileIdField)` matches. Suspects: the first storage event is delivered as something other than `update`, or the active file's state isn't set up yet when it arrives.
- A test with two collections sharing one storage, which opens the second one, then writes from the first.

**Done when** the first edit typed in one tab shows up in a second tab that was just opened.

---

## 2. Roll back the editor on failed restore

When a restore fails partway, storage, the highlights, variables and profiles go back to how they were, as the all-or-nothing restore wanted. The open editor doesn't: it keeps showing the backup's text. In the test, a backup whose file didn't fit the quota left the editor showing that file. A reload brings back the right text.

**Why do it**

- The editor looks restored when nothing was. Typing there saves the backup's text over the real file once there is room.

**Why not**

- It only happens on a failed restore, which is rare, and the error notice is up.

**Reasoning: low.** The cause is clear. `restoreBackup` in `src/lib/store/backup.ts` writes the files with a new `writer`, so the editor takes the new text as a remote edit before the write fails. The rollback puts back rows whose `writer` is this tab's `writerId`, and `CodeEditor.tsx` skips changes from its own writer, so the editor never takes the old text back.

**Approach**

- In `rollBack`, put back the files row with a fresh `writer`, or have the editor take a change from its own writer when it differs from what it shows. The first is smaller.
- Test: a restore that fails on the files write leaves the editor showing the old text.

**Done when** a restore that fails on its last write leaves the open editor's text as it was, without a reload.

---

## 3. Show notices on phones

On a 390 px wide screen the status notice gets no width. The message is cut off completely, so "Not saved: browser storage is full", "This share link is broken." and "A new version is available" can't be read. Its icon and the Dismiss and action buttons still draw, on top of the profile button.

**Why do it**

- Save errors and the update prompt are the notices that matter most, and on a phone they can't be seen.
- The overlapping Dismiss button sits on the profile button, so a tap can hit the wrong one.

**Why not**

- The editor is mostly used on desktops.

**Reasoning: low.** Layout only. The footer in `src/components/app/StatusBar.tsx` gives the notice `max-w-[min(32rem,50%)]` with `shrink`, and the profile and tool buttons take all the room.

**Approach**

- Below `md`, show the notice in its own row above the footer, or in place of the highlight bar and tools while it's up. Check the mobile layout in light and dark mode with an error that has an action, such as the save error.

**Done when** on a 390 px screen the save error shows its full message and its "Back up workspace" and Dismiss buttons, and nothing overlaps.

---

## 4. Don't confirm refused variable saves

With storage full, saving a value from "Set value…" shows "Value saved for <<host>>". The value is rolled back and the save error only shows after that success notice times out. Reporting every failed save made the error show, but this success notice comes first and covers it.

**Why do it**

- The notice says the value was saved when it wasn't.

**Why not**

- The error does show 2.5 seconds later.

**Reasoning: low.** `VariableValueForm` in `src/components/app/Dialogs.tsx` calls `notify.success` right after `setVariable`, without waiting for the write.

**Approach**

- Have `setVariable` return the transaction, and only show the success notice once `isPersisted` resolves. Check the other places that confirm a write the same way, such as "Save value as default".
- Test: a refused write shows only the save error.

**Done when** saving a variable with storage full shows only "Not saved: browser storage is full".

---

## 5. Clear the remaining React Doctor warnings

A full `bunx react-doctor` scan still reports 17 issues in files the parallel run didn't touch, so the commit hook warns whenever one of them is staged. Eager CodeMirror loads and the deliberate one-at-a-time restore writes are already silenced in `doctor.config.json` and `src/lib/store/backup.ts`.

**Why do it**

- A hook that always warns trains people to ignore it.

**Why not**

- Most are false positives for this codebase: shadcn files export variants next to components, and the editor's helpers live beside it on purpose.

**Reasoning: low.**

**Approach**

- `react-hooks-js/todo` (3 errors) in `ArchiveDialog.tsx`, `Dialogs.tsx` and `ProfileDialogs.tsx`: rewrite the syntax the React Compiler skips, so those components get compiled.
- Hoist the `Intl` formatter in `ArchiveDialog.tsx:86`, and use stable keys in `VarText.tsx`.
- Turn off `only-export-components` and `prefer-tag-over-role` for `src/components/ui/**` (generated by shadcn) in `doctor.config.json`. Fix or split the other three files.

**Done when** `bunx react-doctor` reports no issues.

---

## 6. Make the browser checks rerunnable

The headless Chrome scripts that verified offline support and the merged features live in `/tmp/sw-verify/` (`verify.mjs`, `verify-kill.mjs`, `verify-pages.mjs`, and `bc/features.mjs`, `bc/notices.mjs`, `bc/share-compare.mjs`). They are lost on reboot. They weren't moved into the repo: they hard-code paths and a Chrome location, depend on builds made by hand (`v1`–`v3`, `bc/v2`), and overwrite `dist/` while running.

**Why do it**

- The service worker update flow is the riskiest part of the app and has no automated check once these go.

**Why not**

- Playwright end-to-end tests are a new dependency and a slower CI.

**Reasoning: medium.**

**Approach**

- Copy them out of `/tmp` first. Then move them under `scripts/e2e/`, have each build its own versions into a temp directory (changing the build id between builds), and use `playwright-core` with its own browser instead of a fixed Chrome path.
- Add a `bun run e2e` script. Keep it out of CI until it's stable.

**Done when** `bun run e2e` passes on a clean checkout with no files outside the repo.

---

## Considered, not picked

- **XPath and JSONPath queries.** Useful, but tree search, highlights and pins cover most of it, and mapping results back to source positions is the hard part.
- **XML ⇄ JSON conversion.** No standard mapping for attributes, mixed content or one-item lists, so the output is wrong for someone.
- **Editing files on disk** (File System Access API). The read-write pickers are Chromium-only, and it adds a second source of truth next to localStorage.
- **Schema validation** (XSD, JSON Schema). XSD needs a large WebAssembly build of libxml2. Heavy for a simple site.
- **Minify and sample files.** Removed on purpose earlier.
