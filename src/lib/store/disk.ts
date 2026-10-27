import { executeTransaction, getAll, openDatabase } from '@tanstack/react-db'
import { Store } from '@tanstack/store'

import { singleton } from './singleton'

// Tabs opened from a file on disk keep its handle, so ⌘S writes back to it.
// Only Chromium browsers hand out handles (File System Access API). Handles
// live in their own database: the workspace's holds rows a backup can carry,
// and a handle only means something in this browser.

/** A tab's file on disk. */
export interface DiskLink {
  handle: FileSystemFileHandle
  /** Text last read from or written to the file, to tell unsaved changes. */
  saved: string
  /** The file's last-modified time then, to notice changes made elsewhere. */
  modified: number
}

interface StoredLink extends DiskLink {
  id: string
}

const DATABASE_NAME = 'xml-editor-disk'
const STORE = 'links'

/** Links by file id. */
export const diskStore = singleton(
  'diskStore',
  () => new Store<Readonly<Partial<Record<string, DiskLink>>>>({}),
)

/** Whether this browser can write to a file the person picks. */
export function canWriteDisk() {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

function database() {
  return singleton('diskDatabase', () =>
    openDatabase(DATABASE_NAME, 1, (db) => {
      db.createObjectStore(STORE)
    }),
  )
}

/** Loads the stored links, dropping those whose file is gone. */
export async function loadDiskLinks(fileIds: ReadonlySet<string>) {
  if (typeof indexedDB === 'undefined') return
  try {
    const db = await database()
    const rows = await executeTransaction(db, STORE, 'readonly', (_, stores) =>
      getAll<StoredLink>(stores[STORE]),
    )
    const links: Record<string, DiskLink> = {}
    const stale: Array<string> = []
    for (const { id, ...link } of rows) {
      if (fileIds.has(id)) links[id] = link
      else stale.push(id)
    }
    diskStore.setState(() => links)
    if (stale.length) {
      await executeTransaction(db, STORE, 'readwrite', (_, stores) => {
        for (const id of stale) stores[STORE].delete(id)
      })
    }
  } catch (error) {
    // Tabs still open; they just save to the browser only.
    console.error('Could not load the links to files on disk', error)
  }
}

/** Links a tab to a file on disk, or updates what was last saved. */
export async function setDiskLink(id: string, link: DiskLink) {
  diskStore.setState((links) => ({ ...links, [id]: link }))
  try {
    const db = await database()
    await executeTransaction(db, STORE, 'readwrite', (_, stores) => {
      stores[STORE].put({ id, ...link } satisfies StoredLink, id)
    })
  } catch (error) {
    // The link works until the page reloads.
    console.error('Could not store the link to a file on disk', error)
  }
}
