import { notify } from './notice-store'
import { setRestorePreview } from './ui-store'
import { editorStore, getText } from '#/components/editor/editor-store'
import { createBackup, parseBackup, restoreBackup } from '#/lib/store/backup'
import { isStorageFull } from '#/lib/store/files'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'
import type { Backup } from '#/lib/store/backup'

/** Downloads every file, profile and rule as one JSON file. */
export function downloadBackup() {
  // The editor holds edits that may not be saved yet, or failed to save.
  const { fileId } = editorStore.state
  const content = new Map<string, string>()
  if (fileId) content.set(fileId, getText())
  const backup = createBackup(content)
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = m.backup_file_name({ date: backup.exportedAt.slice(0, 10) })
  link.click()
  URL.revokeObjectURL(url)
  notify.success(m.backup_downloaded())
}

/** Asks for a backup file, then shows what it holds before replacing anything. */
export function pickBackup() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) void readBackup(file)
  })
  input.click()
}

export async function readBackup(file: File) {
  const { name } = file
  let text: string
  try {
    text = await file.text()
  } catch (error) {
    notify.error(m.backup_read_failed({ name }), {
      detail: error instanceof Error ? error.message : undefined,
    })
    return
  }
  const result = parseBackup(text)
  if (result.ok) {
    const date = new Date(result.backup.exportedAt).toLocaleString(
      getLocale(),
      { dateStyle: 'medium', timeStyle: 'short' },
    )
    setRestorePreview({ backup: result.backup, date })
    return
  }
  notify.error(
    result.reason === 'newer'
      ? m.backup_newer({ name })
      : m.backup_invalid({ name }),
  )
}

/** Keeps a copy of the current workspace, then replaces it with `backup`. */
export async function replaceWorkspace(backup: Backup) {
  try {
    downloadBackup()
    await restoreBackup(backup)
    notify.success(m.restore_done())
  } catch (error) {
    notify.error(m.restore_failed(), {
      detail: error instanceof Error ? error.message : undefined,
    })
  }
}

/** Error notice for a write the browser refused, with a way to keep the data. */
export function reportSaveFailed(error: unknown) {
  const full = isStorageFull(error)
  notify.error(full ? m.save_failed_full() : m.save_failed(), {
    detail: full || !(error instanceof Error) ? undefined : error.message,
    action: { label: m.backup_create(), run: downloadBackup },
  })
}
