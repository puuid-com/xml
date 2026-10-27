import { persistedStore } from './persist'

// Keeping the workspace from being lost: browsers may clear site data under
// storage pressure unless asked to keep it, and a cleared browser loses
// everything that was never backed up.

/** How long to go without a backup before a reminder. */
export const BACKUP_REMINDER_MS = 14 * 24 * 60 * 60 * 1000

interface SafekeepingState {
  /** When the workspace first held a file in this browser. */
  firstUseAt: number | null
  lastBackupAt: number | null
  lastReminderAt: number | null
}

export const safekeepingStore = persistedStore<SafekeepingState>(
  'safekeeping',
  () => localStorage,
  { firstUseAt: null, lastBackupAt: null, lastReminderAt: null },
)

export function markBackedUp(now = Date.now()) {
  safekeepingStore.setState((s) => ({ ...s, lastBackupAt: now }))
}

/**
 * Whether to remind about backups now: two weeks after the last backup, or
 * after first use when there is none, and then at most every two weeks.
 */
export function backupReminderDue(state: SafekeepingState, now: number) {
  const since = state.lastBackupAt ?? state.firstUseAt
  if (since === null) return false
  const last = Math.max(since, state.lastReminderAt ?? 0)
  return now - last >= BACKUP_REMINDER_MS
}

/** Whole days since the last backup, or null when there never was one. */
export function daysSinceBackup(state: SafekeepingState, now: number) {
  return state.lastBackupAt === null
    ? null
    : Math.floor((now - state.lastBackupAt) / (24 * 60 * 60 * 1000))
}

/**
 * Asks the browser not to clear the workspace under storage pressure.
 * Chromium decides on its own; Firefox asks the person.
 */
export async function persistStorage() {
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    // No StorageManager, as in some embedded browsers.
    return false
  }
}

/**
 * Called once the workspace holds files: asks to keep them, and says
 * whether a backup reminder is due, counting it as shown.
 */
export function workspaceInUse(now = Date.now()) {
  if (safekeepingStore.state.firstUseAt === null) {
    safekeepingStore.setState((s) => ({ ...s, firstUseAt: now }))
  }
  void persistStorage()
  const state = safekeepingStore.state
  if (!backupReminderDue(state, now)) return null
  safekeepingStore.setState((s) => ({ ...s, lastReminderAt: now }))
  return { days: daysSinceBackup(state, now) }
}
