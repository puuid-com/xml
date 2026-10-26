# Tasks

Follow-ups from the five features merged on 2026-10-25: backup and restore, profile variables, share links, compare, and offline. The editor stays local-first and simple: no accounts, no server storage, everything stays in the browser.

**Order:** what to do first. Fixes that lose or hide data come before polish.

**Reasoning** uses the Claude Code effort scale: low, medium, high, xhigh, max.

| #   | Task                                   | Reasoning | In one line                                                            |
| --- | -------------------------------------- | --------- | ---------------------------------------------------------------------- |
| 1   | Include variables in backups           | low       | Backups miss profile variables, and a restore can orphan them.         |
| 2   | Keep the update notice from being lost | medium    | Any later notice replaces "A new version is available" for good.       |
| 3   | Make restore all-or-nothing            | medium    | A failure halfway through leaves the workspace half restored.          |
| 4   | Report every failed save               | low       | Only file content saves show an error; other writes fail silently.     |
| 5   | Cache every page for offline use       | high      | Only `/` and `/fr/` open offline.                                      |
| 6   | Check the merged features in a browser | medium    | Four of the five features were only checked by tests and the build.    |
| 7   | Clean up after the parallel run        | low       | Old branches, worktrees, scratch scripts and lint warnings.            |
| 8   | Apply the first edit from another tab  | medium    | A newly opened tab drops the first content edit made elsewhere.        |
| 9   | Roll back the editor on failed restore | low       | The open editor keeps the backup's text after a restore rolls back.    |
| 10  | Show notices on phones                 | low       | On mobile the notice text is hidden and its buttons cover the profile. |
| 11  | Don't confirm refused variable saves   | low       | "Value saved" shows when storage refused the value.                    |

---

## 1. Include variables in backups

Add the profile variables to the backup file, to restore and to the counts in the restore dialog.

**Why do it**

- The backup feature was built before variables existed, so `src/lib/store/backup.ts` never writes them. Restoring in a new browser loses every variable.
- A restore replaces the profiles but keeps the current variables. Their `profileId` can then point at a profile that no longer exists, leaving hidden rows in localStorage.
- No backup files exist outside development yet, so changing the format now costs nothing. Later it would need a migration.

**Why not**

- Variables often hold tokens and passwords. Putting them in a backup spreads them to wherever that file goes.

**Reasoning: low.** The other collections already show the pattern: schema, export, replace, count.

**Approach**

- Add `variables` to the backup schema and to `replaceWorkspace`. Restore replaces them like highlights and pins.
- Read version 1 files that have no `variables` as an empty list, so files made during development still restore. Keep `version: 1`.
- Add a "Variables" row to the restore dialog counts.
- Say in the backup copy that the file holds everything typed into the workspace, variables included, unencrypted.
- Tests: round trip with variables, a file without `variables` restores, restored variables belong to restored profiles.

**Done when** a backup with variables restores them under the right profiles in another browser, and no variable is left pointing at a missing profile.

---

## 2. Keep the update notice from being lost

The status bar shows one notice at a time. The sticky "A new version is available" notice is replaced by the next notice of any kind, such as "Share link copied", and never comes back. The save-failed error competes for the same slot.

**Why do it**

- Missing the reload prompt keeps people on an old version until they happen to reload.
- A save-failed error that gets replaced is worse: the user believes their work is saved.

**Why not**

- A queue or stack of notices adds UI to a deliberately small status bar.

**Reasoning: medium.** Small code, but it needs a rule for which notice wins.

**Approach**

- In `src/components/app/notice-store.ts`, keep sticky notices and errors underneath short-lived ones: when an info or success notice times out, show the sticky one again instead of clearing.
- An error replaces a sticky notice while it's up, and the sticky one comes back when the error is dismissed.
- Tests: an update notice survives a "copied" notice, a save error and an update notice both stay reachable.

**Done when** the update notice is still there after copying a share link, and a save error can't be silently replaced.

---

## 3. Make restore all-or-nothing

Restore writes six collections one after another. If one write fails, for example on a full storage quota, the workspace is left half old and half restored.

**Why do it**

- Restore exists to recover data. A half restore is the worst result it can have.
- Storage-full is the likeliest reason to need a restore in the first place.

**Why not**

- localStorage has no transactions, so this needs a snapshot and rollback by hand.
- The backup of the old data downloaded just before restoring already gives a way back.

**Reasoning: medium.** The rollback has to restore the exact old values, including keys that didn't exist before.

**Approach**

- Before writing, read the raw localStorage value of every key restore touches.
- Write the new values. On any failure, write the saved raw values back (removing keys that were absent) and show the existing restore-failed error.
- Tests: a write that throws partway leaves every key as it was.

**Done when** a restore that fails on its fourth write leaves the workspace exactly as it was before.

---

## 4. Report every failed save

Only file content saves report a refused write. Adding a highlight, pinning a field, renaming a file or setting a variable still fails silently when storage is full.

**Why do it**

- The same quota problem the backup feature fixed for content still hides here. The change looks saved until the next reload.

**Why not**

- Many small writes failing at once could flood the status bar. It needs one notice, not one per write.

**Reasoning: low.** `onSaveFailed` in `src/lib/store/files.ts` already does this for content; reuse it.

**Approach**

- Route every collection's localStorage write through one helper that catches the error and calls the existing save-failed handler.
- Report once until a write succeeds again, as content saves already do.

**Done when** filling storage and then adding a highlight shows "Not saved: browser storage is full".

---

## 5. Cache every page for offline use

The service worker caches the HTML for `/` and `/fr/` only. Opening any other page directly with no network fails, for example `/about`. Moving to it from inside the app still works because the router loads it on the client.

**Why do it**

- An installed app or a bookmark to another page opens to the browser's offline error.

**Why not**

- Every cached page is one more shell that must match its build's assets. The worker already never refreshes cached pages on purpose, because a newer page in an older cache breaks the app.
- Few people open those pages directly.

**Reasoning: high.** It touches the same cache lifecycle that makes service worker bugs stick on users' devices.

**Approach**

- Simplest: for navigations to a page that isn't cached, serve the locale's cached shell and let the router render the page on the client. Check that TanStack Start hydrates a different route from that shell without errors.
- Otherwise, add each route from `site.sitemapPaths` to the precache list in `plugins/service-worker.ts`.
- Test with the production build and preview, as the original verification did.

**Done when** `/about` and `/fr/about` open with the network off after one visit.

---

## 6. Check the merged features in a browser

Each feature passed the checks on its own and after merging, but only offline support was tried in a real browser.

**Why do it**

- Layout, colours, dialogs and focus can't be checked by type checks and unit tests.
- The features now meet each other: the compare view's code loads on first use, so it has to be in the offline cache, and share links have to work when the app opens offline.

**Reasoning: medium.** Mostly clicking through, with a few combinations to think about.

**Checklist**

- **Backup:** restore in a second browser gives the same tabs, archive and profiles. Filling storage shows the save-failed error with its backup action.
- **Variables:** chips show values in tooltips and look muted without one. "Set value…" works from a right-click. The Variables tab adds, edits and removes. Completion after `<<` shows values. ⇧⌥V fills them into a new file.
- **Share link:** a copied link opens in a fresh browser after confirming. Broken and oversized links show an error. Reloading doesn't ask again.
- **Compare:** diff colours in light and dark mode, the mobile layout, Esc to close, and "Ignore formatting" on files that contain `<<variables>>`.
- **Together:** in a production build, open the compare view and a share link with the network off.

**Done when** every item above works, or has its own task here.

**Result (2026-10-26):** checked against the production build in headless Chrome. Everything on the list works except what tasks 8 to 11 describe. The scripts are in `/tmp/sw-verify/bc/`.

---

## 7. Clean up after the parallel run

**What's left**

- Five `feat/*` branches, five `t3/*` branches and five worktrees under `~/.t3/worktrees/xml/`. All five features are merged.
- The service worker verification scripts in `/tmp/sw-verify/` (`verify.mjs`, `verify-kill.mjs`). They'll be lost on reboot. Move them into the repo, under `scripts/`, if they're worth rerunning before a deploy.
- React Doctor warnings: CodeMirror loads eagerly in the editor files (this was already the case before the features) and the skip link in `src/routes/__root.tsx`. Fix them or turn those rules off, so the commit hook stops reporting them.

**Reasoning: low.**

**Done when** `git branch` and `git worktree list` show only `main`, and the commit hook has no warnings.

---

## 8. Apply the first edit from another tab

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

## 9. Roll back the editor on failed restore

When a restore fails partway, storage, the highlights, variables and profiles go back to how they were, as task 3 wanted. The open editor doesn't: it keeps showing the backup's text. In the test, a backup whose file didn't fit the quota left the editor showing that file. A reload brings back the right text.

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

## 10. Show notices on phones

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

## 11. Don't confirm refused variable saves

With storage full, saving a value from "Set value…" shows "Value saved for <<host>>". The value is rolled back and the save error only shows after that success notice times out. Task 4 made the error show, but this success notice comes first and covers it.

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

## Considered, not picked

- **XPath and JSONPath queries.** Useful, but tree search, highlights and pins cover most of it, and mapping results back to source positions is the hard part.
- **XML ⇄ JSON conversion.** No standard mapping for attributes, mixed content or one-item lists, so the output is wrong for someone.
- **Editing files on disk** (File System Access API). The read-write pickers are Chromium-only, and it adds a second source of truth next to localStorage.
- **Schema validation** (XSD, JSON Schema). XSD needs a large WebAssembly build of libxml2. Heavy for a simple site.
- **Minify and sample files.** Removed on purpose earlier.
