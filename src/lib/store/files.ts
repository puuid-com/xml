import {
  createPacedMutations,
  createTransaction,
  debounceStrategy,
} from '@tanstack/react-db'
import { z } from 'zod'

import {
  DEFAULT_PROFILE_ID,
  localCollection,
  newId,
  withDefaultProfile,
} from './persist'
import { writerId } from './session'

export const fileSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  /** Tab order. */
  order: z.number(),
  /** Browser tab that wrote the content last, to tell remote edits apart. */
  writer: z.string(),
  /** Null while open; otherwise retained in the deleted-file archive. */
  deletedAt: z.number().nullable().default(null),
  /** Profile whose settings apply while this file is open. */
  profileId: z.string().default(DEFAULT_PROFILE_ID),
})

export type XmlFile = z.infer<typeof fileSchema>
export const ARCHIVE_LIMIT = 10

export const filesCollection = localCollection('files', fileSchema, {
  // Closed tabs of the oldest versions were dropped rather than archived.
  upgrade: (row) => (row.open === false ? null : withDefaultProfile(row)),
})

export function archivedFiles() {
  return [...filesCollection.values()]
    .filter((file) => file.deletedAt !== null)
    .sort((a, b) => b.deletedAt! - a.deletedAt! || a.id.localeCompare(b.id))
}

function nextOrder() {
  let max = 0
  for (const file of filesCollection.values()) {
    max = Math.max(max, file.order)
  }
  return max + 1
}

/** Picks `untitled.xml`, `untitled-2.xml`… avoiding names of open tabs. */
export function uniqueName(base: string) {
  const taken = new Set(
    [...filesCollection.values()]
      .filter((file) => file.deletedAt === null)
      .map((file) => file.name),
  )
  if (!taken.has(base)) return base
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot) : ''
  for (let i = 2; ; i++) {
    const candidate = `${stem}-${i}${ext}`
    if (!taken.has(candidate)) return candidate
  }
}

export function createFile(
  name: string,
  content = '',
  profileId = DEFAULT_PROFILE_ID,
): XmlFile {
  const file: XmlFile = {
    id: newId(),
    name: uniqueName(name),
    content,
    order: nextOrder(),
    writer: writerId,
    deletedAt: null,
    profileId,
  }
  filesCollection.insert(file)
  return file
}

/** Archive and evict in one storage write, so failure rolls back both changes. */
export async function closeFile(id: string) {
  // A paced save carries a full record snapshot. Let it settle first so it
  // cannot overwrite deletedAt and reopen this file after the archive write.
  await drainContentSaves()
  const file = filesCollection.get(id)
  if (!file || file.deletedAt !== null) return
  const archived = archivedFiles()
  // Keep deletion order stable even for multiple closes in the same millisecond.
  const deletedAt = Math.max(Date.now(), (archived[0]?.deletedAt ?? 0) + 1)
  const archiveTransaction = createTransaction({
    mutationFn: async ({ transaction }) => {
      await filesCollection.utils.acceptMutations(transaction)
    },
  })
  archiveTransaction.mutate(() => {
    filesCollection.update(id, (draft) => {
      draft.deletedAt = deletedAt
    })
    const expired = archived.slice(ARCHIVE_LIMIT - 1).map((entry) => entry.id)
    if (expired.length) filesCollection.delete(expired)
  })
  await archiveTransaction.isPersisted.promise
}

/** Restore at the end of the open tabs without overwriting an existing name. */
export async function restoreFile(id: string) {
  const file = filesCollection.get(id)
  if (!file || file.deletedAt === null) return
  const name = uniqueName(file.name)
  const order = nextOrder()
  await filesCollection.update(id, (draft) => {
    draft.name = name
    draft.order = order
    draft.deletedAt = null
    draft.writer = writerId
  }).isPersisted.promise
  return id
}

export function renameFile(id: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed || !filesCollection.has(id)) return
  return updateMetadata(() =>
    filesCollection.update(id, (draft) => {
      draft.name = trimmed
    }),
  )
}

/** Switches the profile, and so the settings, a file uses. */
export async function setFileProfile(id: string, profileId: string) {
  // Like closeFile: a pending content save would write the old profile back.
  await drainContentSaves()
  const file = filesCollection.get(id)
  if (!file || file.profileId === profileId) return
  await filesCollection.update(id, (draft) => {
    draft.profileId = profileId
  }).isPersisted.promise
}

/** Moves every file of one profile, archived ones included, to another. */
export async function reassignProfile(fromId: string, toId: string) {
  await drainContentSaves()
  const ids = [...filesCollection.values()]
    .filter((file) => file.profileId === fromId)
    .map((file) => file.id)
  if (ids.length === 0) return
  await filesCollection.update(ids, (drafts) => {
    for (const draft of drafts) draft.profileId = toId
  }).isPersisted.promise
}

/** Moves a tab to sit before `beforeId`, or last when `null`. */
export function reorderFile(id: string, beforeId: string | null) {
  const open = [...filesCollection.values()]
    .filter((f) => f.id !== id && f.deletedAt === null)
    .sort((a, b) => a.order - b.order)
  const index = beforeId ? open.findIndex((f) => f.id === beforeId) : -1
  const moving = filesCollection.get(id)
  if (!moving || moving.deletedAt !== null) return
  open.splice(index < 0 ? open.length : index, 0, moving)
  return updateMetadata(() =>
    filesCollection.update(
      open.map((f) => f.id),
      (drafts) => {
        drafts.forEach((draft, i) => {
          draft.order = i + 1
        })
      },
    ),
  )
}

/**
 * Debounced file edits: metadata changes join any pending content save, so
 * its full-record snapshot cannot undo a rename or tab reorder.
 */
const pacedSaveFile = createPacedMutations<() => void>({
  onMutate: (mutate) => mutate(),
  mutationFn: async ({ transaction }) => {
    await filesCollection.utils.acceptMutations(transaction)
  },
  strategy: debounceStrategy({ wait: 400 }),
})

let pendingContentSave: Promise<unknown> | undefined

/** New edits can queue another paced transaction while an earlier one writes. */
async function drainContentSaves(ignoreFailures = false) {
  while (pendingContentSave) {
    // react-doctor-disable-next-line react-doctor/async-await-in-loop
    await pendingContentSave.catch((error: unknown) => {
      if (!ignoreFailures) throw error
    })
  }
}

/** Resolves once every pending file edit has finished or failed. */
export function settleContentSave() {
  return drainContentSaves(true)
}

/** Whether a failed write hit the browser's storage quota. */
export function isStorageFull(error: unknown): boolean {
  if (!(error instanceof Error) && !(error instanceof DOMException)) {
    return false
  }
  // Transactions may wrap the browser's error, keeping its name in the message.
  return (
    error.name === 'QuotaExceededError' ||
    error.message.includes('QuotaExceededError') ||
    isStorageFull((error as Error).cause)
  )
}

/** Calls `listener` when a save fails, such as on a full storage quota. */
export { onSaveFailed } from './persist'

function saveFile(mutate: () => void) {
  const transaction = pacedSaveFile(mutate)
  const pending = transaction.isPersisted.promise
  pendingContentSave = pending
  const clear = () => {
    if (pendingContentSave === pending) pendingContentSave = undefined
  }
  // Failures reach `onSaveFailed` through the collection's storage.
  void pending.then(clear, clear)
  return transaction
}

/** Metadata still persists immediately when there is no paced save to join. */
function updateMetadata(
  mutate: () => ReturnType<typeof filesCollection.update>,
) {
  return pendingContentSave ? saveFile(mutate) : mutate()
}

export function saveContent({ id, content }: { id: string; content: string }) {
  return saveFile(() => {
    if (filesCollection.get(id)?.deletedAt !== null) return
    filesCollection.update(id, (draft) => {
      draft.content = content
      draft.writer = writerId
    })
  })
}
