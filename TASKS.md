# Follow-ups

The editor stays local-first: no accounts and no server-side document storage. Prioritize failures that hide or lose data over cosmetic cleanup.

## Mobile notices

The previous browser review found that a 390 px viewport leaves no room for the status message and lets action buttons overlap the profile controls. `StatusNotice.tsx` still caps its width inside the shared footer row.

Give notices their own row on narrow screens, or reserve the footer for the active notice. Verify an error with both a backup action and a dismiss button in light and dark mode. This needs browser layout validation.

## Reproducible browser checks

The earlier Chrome scripts lived under `/tmp/sw-verify/`, used fixed paths, and depended on manually prepared builds. They are not part of the repository or CI.

Create a repeatable harness with isolated temporary build output. Cover mobile notices, cross-tab editing, failed saves, and backup restore. Add a documented command once it runs on a clean checkout. Existing unit/component tests cover storage and editor-session behavior, but do not replace browser layout checks.

## Multi-collection profile operations

Profile creation, cloning, and deletion now wait for their writes, so callers can detect failure. These operations still span separate storage writes: a refused rule write can leave a partially cloned profile or partially deleted rules. Shared-profile import/update also use multiple optimistic writes.

Consider an atomic workspace transaction or explicit rollback before promising all-or-nothing profile changes. Cover failures at each collection boundary, including rollback failures and concurrent edits from another browser tab.

## Remaining React Doctor diagnostics

Review the current output of `bun run doctor`; do not use a historical issue count as the target. The cleanup extracted editor synchronization and pin-row calculations, reused date formatters, and removed unsupported async try/finally patterns from dialogs.

Remaining findings include shadcn export conventions, application helper exports, stateless text-segment keys, a test-only compiler diagnostic, and explicit focus handling. Inspect each finding before changing code or suppressing a rule. Normal formatting, lint, type checking, tests, and build remain the required checks.

## Completed in the cleanup

- The first remote edit reaches a newly subscribed editor. The subscription explicitly skips the initial snapshot while retaining subsequent updates and deletes.
- Editor-session tests cover remote edits through another database connection, cached files, undo history, language changes, and failed-restore rollback. The rollback writer fix was already present; it now has editor-level coverage.
- Variable/default saves wait for persistence before resetting forms or confirming success. Failed variable saves retain the entered draft.
- Profile dialogs wait for create, clone, update, and delete completion.
- Tree row rendering is separate from search, navigation, and virtualization.
- The README describes the actual editor and storage model.
