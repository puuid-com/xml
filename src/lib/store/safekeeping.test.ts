import { describe, expect, it } from 'vitest'

import {
  BACKUP_REMINDER_MS,
  backupReminderDue,
  daysSinceBackup,
} from './safekeeping'

const DAY = 24 * 60 * 60 * 1000
const state = (
  firstUseAt: number | null,
  lastBackupAt: number | null = null,
  lastReminderAt: number | null = null,
) => ({ firstUseAt, lastBackupAt, lastReminderAt })

describe('backup reminders', () => {
  it('waits two weeks after first use when there is no backup', () => {
    expect(backupReminderDue(state(null), 100 * DAY)).toBe(false)
    expect(backupReminderDue(state(0), 13 * DAY)).toBe(false)
    expect(backupReminderDue(state(0), BACKUP_REMINDER_MS)).toBe(true)
  })

  it('counts from the last backup', () => {
    expect(backupReminderDue(state(0, 10 * DAY), 20 * DAY)).toBe(false)
    expect(backupReminderDue(state(0, 10 * DAY), 24 * DAY)).toBe(true)
  })

  it('reminds at most every two weeks', () => {
    expect(backupReminderDue(state(0, null, 20 * DAY), 30 * DAY)).toBe(false)
    expect(backupReminderDue(state(0, null, 20 * DAY), 34 * DAY)).toBe(true)
  })

  it('counts whole days since the last backup', () => {
    expect(daysSinceBackup(state(0), 5 * DAY)).toBeNull()
    expect(daysSinceBackup(state(0, DAY), 16.5 * DAY)).toBe(15)
  })
})
