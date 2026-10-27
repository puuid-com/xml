import { downloadFile, formatActive } from './actions'
import { editorStore, getText } from './editor-store'
import { notify } from '#/components/app/notice-store'
import { canWriteDisk, diskStore, setDiskLink } from '#/lib/store/disk'
import { filesCollection, renameFile } from '#/lib/store/files'
import { activeFormat } from '#/lib/store/profiles'
import { m } from '#/paraglide/messages'

// Saving back to files on disk. Every tab also saves to the browser as you
// type; these write the same text to the file it came from or a new one.

/** The text to write: what the editor shows, for the file it shows. */
function textOf(id: string) {
  return editorStore.state.fileId === id
    ? getText()
    : (filesCollection.get(id)?.content ?? '')
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** Asks for write access if needed. Needs a click or key press to prompt. */
async function canWrite(handle: FileSystemFileHandle) {
  const mode = { mode: 'readwrite' } as const
  if ((await handle.queryPermission(mode)) === 'granted') return true
  return (await handle.requestPermission(mode)) === 'granted'
}

async function write(id: string, handle: FileSystemFileHandle) {
  const text = textOf(id)
  const stream = await handle.createWritable()
  await stream.write(text)
  await stream.close()
  const { lastModified } = await handle.getFile()
  await setDiskLink(id, { handle, saved: text, modified: lastModified })
  notify.success(m.saved_to_disk({ name: handle.name }))
}

/**
 * Writes a tab to the file on disk it is linked to. Unless `force`, it
 * stops when the file changed since it was last read or written here.
 */
export async function saveToDisk(id: string, force = false) {
  const link = diskStore.state[id]
  if (!link) return
  const { handle } = link
  try {
    if (!(await canWrite(handle))) {
      notify.error(m.disk_permission_denied({ name: handle.name }))
      return
    }
    if (!force && (await handle.getFile()).lastModified !== link.modified) {
      notify.error(m.disk_changed({ name: handle.name }), {
        action: {
          label: m.disk_overwrite(),
          run: () => void saveToDisk(id, true),
        },
      })
      return
    }
    await write(id, handle)
  } catch (error) {
    notify.error(m.disk_save_failed({ name: handle.name }), {
      detail: error instanceof Error ? error.message : undefined,
      action: { label: m.file_save_disk(), run: () => void saveAs(id) },
    })
  }
}

/**
 * Asks where to save a tab, then links it to that file. Browsers that can't
 * write to disk download it instead.
 */
export async function saveAs(id: string) {
  const file = filesCollection.get(id)
  if (!file) return
  if (!canWriteDisk()) {
    downloadFile(id)
    return
  }
  let handle: FileSystemFileHandle
  try {
    handle = await window.showSaveFilePicker({
      suggestedName: file.name,
      startIn: diskStore.state[id]?.handle,
    })
  } catch (error) {
    if (!isAbort(error)) {
      notify.error(m.disk_save_failed({ name: file.name }), {
        detail: error instanceof Error ? error.message : undefined,
      })
    }
    return
  }
  try {
    await write(id, handle)
    if (handle.name !== file.name) renameFile(id, handle.name)
  } catch (error) {
    notify.error(m.disk_save_failed({ name: handle.name }), {
      detail: error instanceof Error ? error.message : undefined,
    })
  }
}

/**
 * ⌘S. Tabs save to the browser as you type, so this formats when that
 * option is on, then writes to the tab's file on disk if it has one.
 */
export function saveActive() {
  if (activeFormat().formatOnSave) formatActive()
  const id = editorStore.state.fileId
  if (id && diskStore.state[id]) void saveToDisk(id)
  else notify.success(m.saved_locally())
  return true
}

/** ⇧⌘S: save the active tab to a file of the person's choice. */
export function saveActiveAs() {
  const id = editorStore.state.fileId
  if (id) {
    if (activeFormat().formatOnSave) formatActive()
    void saveAs(id)
  }
  return true
}
