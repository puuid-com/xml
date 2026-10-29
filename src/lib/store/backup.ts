import { createTransaction } from '@tanstack/react-db'
import { z } from 'zod'

import { defaultValueSchema, defaultsCollection } from './defaults'
import { fileSchema, filesCollection, settleContentSave } from './files'
import { highlightSchema, highlightsCollection } from './highlights'
import { newId, settleWrites } from './persist'
import { pinSchema, pinsCollection } from './pins'
import { profileSchema, profilesCollection } from './profiles'
import { claimWriter } from './session'
import { variableSchema, variablesCollection } from './variables'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Collection, IndexedDBCollectionUtils } from '@tanstack/react-db'

// One JSON file with everything the editor keeps in IndexedDB, so a
// workspace can move to another browser. Session state (active tab,
// collapsed nodes) stays out: it belongs to a browser tab, not the workspace.

export const BACKUP_APP = 'xml-editor'
export const BACKUP_VERSION = 1

const uniqueIds = <T extends { id: string }>(items: ReadonlyArray<T>) =>
  new Set(items.map((item) => item.id)).size === items.length

const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.iso.datetime(),
  files: z.array(fileSchema).refine(uniqueIds),
  profiles: z.array(profileSchema).min(1).refine(uniqueIds),
  highlights: z.array(highlightSchema).refine(uniqueIds),
  pins: z.array(pinSchema).refine(uniqueIds),
  defaults: z.array(defaultValueSchema).refine(uniqueIds),
  // Files made before variables were backed up have none.
  variables: z.array(variableSchema).refine(uniqueIds).default([]),
})

export type Backup = z.output<typeof backupSchema>

export type ParsedBackup =
  { ok: true; backup: Backup } | { ok: false; reason: 'invalid' | 'newer' }

// Parsing through the schemas also drops the rows' virtual `$` props.
const rows = <T>(schema: z.ZodType<T>, items: Iterable<unknown>) =>
  [...items].map((item) => schema.parse(item))

/**
 * A snapshot of the workspace. `content` overrides the stored text of some
 * files, such as edits the editor holds that are not saved yet.
 */
export function createBackup(
  content: ReadonlyMap<string, string> = new Map(),
): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    files: rows(fileSchema, filesCollection.values()).map((file) => ({
      ...file,
      content: content.get(file.id) ?? file.content,
    })),
    profiles: rows(profileSchema, profilesCollection.values()),
    highlights: rows(highlightSchema, highlightsCollection.values()),
    pins: rows(pinSchema, pinsCollection.values()),
    defaults: rows(defaultValueSchema, defaultsCollection.values()),
    variables: rows(variableSchema, variablesCollection.values()),
  }
}

/** Reads a backup file, rejecting other JSON and backups from a newer app. */
export function parseBackup(text: string): ParsedBackup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  const header = z
    .object({ app: z.literal(BACKUP_APP), version: z.number().int() })
    .safeParse(json)
  if (!header.success) return { ok: false, reason: 'invalid' }
  if (header.data.version > BACKUP_VERSION) {
    return { ok: false, reason: 'newer' }
  }
  const backup = backupSchema.safeParse(json)
  return backup.success
    ? { ok: true, backup: backup.data }
    : { ok: false, reason: 'invalid' }
}

export function backupCounts(backup: Backup) {
  const open = backup.files.filter((file) => file.deletedAt === null).length
  return {
    open,
    archived: backup.files.length - open,
    profiles: backup.profiles.length,
    highlights: backup.highlights.length,
    pins: backup.pins.length,
    defaults: backup.defaults.length,
    variables: backup.variables.length,
  }
}

type WorkspaceCollection<
  T extends { id: string },
  TSchema extends StandardSchemaV1,
  TInput extends object,
> = Collection<T, string, IndexedDBCollectionUtils<T>, TSchema, TInput>

/** Makes `collection` hold exactly `items`, in one storage write. */
async function replaceAll<
  T extends { id: string },
  TSchema extends StandardSchemaV1,
  TInput extends object,
>(
  collection: WorkspaceCollection<T, TSchema, TInput>,
  items: Array<T & TInput>,
) {
  const keep = new Set(items.map((item) => item.id))
  const stale = [...collection.values()]
    .map((item) => item.id)
    .filter((id) => !keep.has(id))
  const updated = items.filter((item) => collection.has(item.id))
  const added = items.filter((item) => !collection.has(item.id))
  if (!stale.length && !updated.length && !added.length) return
  const transaction = createTransaction({
    mutationFn: async ({ transaction: tx }) => {
      await collection.utils.acceptMutations(tx)
    },
  })
  transaction.mutate(() => {
    if (stale.length) collection.delete(stale)
    if (updated.length) {
      collection.update(
        updated.map((item) => item.id),
        (drafts) => {
          // Drafts come in the order of the ids.
          drafts.forEach((draft, i) => Object.assign(draft, updated[i]))
        },
      )
    }
    if (added.length) collection.insert(added)
  })
  await transaction.isPersisted.promise
}

/**
 * One collection's part of a restore: the write, and a way to put back the
 * rows it held before.
 */
function replacement<
  T extends { id: string },
  TSchema extends StandardSchemaV1,
  TInput extends object,
>(
  collection: WorkspaceCollection<T, TSchema, TInput>,
  items: Array<T & TInput>,
  /** Prepares a row being put back. */
  revert: (row: T & TInput) => T & TInput = (row) => row,
) {
  let saved: Array<T & TInput> | null = null
  return {
    write: async () => {
      saved = (await collection.utils.exportData()) as Array<T & TInput>
      await replaceAll(collection, items)
    },
    rollBack: async () => {
      if (saved) await replaceAll(collection, saved.map(revert))
    },
  }
}

/**
 * Replaces the whole workspace with `backup`. Ids are kept, so a restore in
 * the browser that made the backup updates the same tabs in place. All or
 * nothing: if any write fails, every collection it touched gets its old rows
 * back and the error is rethrown.
 */
export async function restoreBackup(backup: Backup) {
  // A paced save still in flight would write old content back afterwards.
  await settleContentSave()
  // The rows to put back on failure have to include every earlier change.
  await settleWrites()
  // A new writer makes open editors take the restored text, as an edit this
  // page can undo.
  const writer = claimWriter(newId())
  // Only variables of restored profiles, so none points at a missing one.
  const profileIds = new Set(backup.profiles.map((p) => p.id))
  const writes = [
    replacement(profilesCollection, backup.profiles),
    replacement(highlightsCollection, backup.highlights),
    replacement(pinsCollection, backup.pins),
    replacement(defaultsCollection, backup.defaults),
    replacement(
      variablesCollection,
      backup.variables.filter((v) => profileIds.has(v.profileId)),
    ),
    replacement(
      filesCollection,
      backup.files.map((file) => ({ ...file, writer })),
      // Again a new writer, so open editors take the old text back too.
      (file) => ({ ...file, writer: claimWriter(newId()) }),
    ),
  ]
  const done: typeof writes = []
  try {
    // One at a time, so the first failure stops the writes after it.
    for (const entry of writes) {
      done.push(entry)
      // react-doctor-disable-next-line react-doctor/async-await-in-loop
      await entry.write()
    }
  } catch (error) {
    // Newest first, and on through failures to put back what can be.
    for (const entry of done.reverse()) {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop
      await entry.rollBack().catch(() => undefined)
    }
    throw error
  }
}
