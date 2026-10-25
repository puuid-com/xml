import {
  createCollection,
  createPacedMutations,
  debounceStrategy,
  localStorageCollectionOptions,
} from '@tanstack/react-db'
import { z } from 'zod'

import { writerId } from './session'

export const fileSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  /** Shown as a tab. Closing a tab keeps the file in the cache. */
  open: z.boolean(),
  /** Tab order among open files. */
  order: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  /** Browser tab that wrote the content last, to tell remote edits apart. */
  writer: z.string(),
})

export type XmlFile = z.infer<typeof fileSchema>

// localStorage events keep every browser tab of the site in sync.
export const filesCollection = createCollection(
  localStorageCollectionOptions({
    id: 'files',
    storageKey: 'xml-editor:files',
    getKey: (file) => file.id,
    schema: fileSchema,
  }),
)

export function newId() {
  return crypto.randomUUID()
}

function nextOrder() {
  let max = 0
  for (const file of filesCollection.values()) {
    if (file.open) max = Math.max(max, file.order)
  }
  return max + 1
}

/** Picks `untitled.xml`, `untitled-2.xml`… avoiding names already cached. */
export function uniqueName(base: string) {
  const taken = new Set([...filesCollection.values()].map((f) => f.name))
  if (!taken.has(base)) return base
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot) : ''
  for (let i = 2; ; i++) {
    const candidate = `${stem}-${i}${ext}`
    if (!taken.has(candidate)) return candidate
  }
}

export function createFile(name: string, content = ''): XmlFile {
  const now = Date.now()
  const file: XmlFile = {
    id: newId(),
    name: uniqueName(name),
    content,
    open: true,
    order: nextOrder(),
    createdAt: now,
    updatedAt: now,
    writer: writerId,
  }
  filesCollection.insert(file)
  return file
}

export function openFile(id: string) {
  const file = filesCollection.get(id)
  if (!file || file.open) return
  const order = nextOrder()
  filesCollection.update(id, (draft) => {
    draft.open = true
    draft.order = order
  })
}

export function closeFile(id: string) {
  if (!filesCollection.has(id)) return
  filesCollection.update(id, (draft) => {
    draft.open = false
  })
}

export function renameFile(id: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed || !filesCollection.has(id)) return
  filesCollection.update(id, (draft) => {
    draft.name = trimmed
  })
}

export function deleteFile(id: string) {
  if (filesCollection.has(id)) filesCollection.delete(id)
}

/** Moves an open tab to sit before `beforeId`, or last when `null`. */
export function reorderFile(id: string, beforeId: string | null) {
  const open = [...filesCollection.values()]
    .filter((f) => f.open && f.id !== id)
    .sort((a, b) => a.order - b.order)
  const index = beforeId ? open.findIndex((f) => f.id === beforeId) : -1
  const moving = filesCollection.get(id)
  if (!moving) return
  open.splice(index < 0 ? open.length : index, 0, moving)
  filesCollection.update(
    open.map((f) => f.id),
    (drafts) => {
      drafts.forEach((draft, i) => {
        draft.order = i + 1
      })
    },
  )
}

/**
 * Debounced content save: the collection updates optimistically right away
 * and the write to localStorage happens once typing pauses.
 */
export const saveContent = createPacedMutations<{
  id: string
  content: string
}>({
  onMutate: ({ id, content }) => {
    if (!filesCollection.has(id)) return
    filesCollection.update(id, (draft) => {
      draft.content = content
      draft.updatedAt = Date.now()
      draft.writer = writerId
    })
  },
  mutationFn: async ({ transaction }) => {
    await filesCollection.utils.acceptMutations(transaction)
  },
  strategy: debounceStrategy({ wait: 400 }),
})

/** Approximate bytes used by the cache. */
export function cacheSize() {
  return filesCollection.utils.getStorageSize()
}
