import {
  createCollection,
  createIndexedDB,
  indexedDBCollectionOptions,
  localOnlyCollectionOptions,
} from '@tanstack/react-db'
import { Store } from '@tanstack/store'

import { singleton } from './singleton'
import type { z } from 'zod'

/** Prefix of every key the editor writes to browser storage. */
const STORAGE_PREFIX = 'xml-editor:'

/** The IndexedDB database holding the workspace, one store per collection. */
const DATABASE_NAME = 'xml-editor'
const STORES = [
  'files',
  'profiles',
  'highlights',
  'pins',
  'defaults',
  'variables',
] as const
type StoreName = (typeof STORES)[number]

// Opened before any collection exists, since a collection needs the open
// database. Server renders never read the workspace and get none.
const database =
  typeof indexedDB === 'undefined'
    ? null
    : await singleton('database', () =>
        createIndexedDB({ name: DATABASE_NAME, version: 1, stores: STORES }),
      )

export function newId() {
  return crypto.randomUUID()
}

/** The profile that data written before profiles existed belongs to. */
export const DEFAULT_PROFILE_ID = 'default'

/** Gives rows saved before profiles existed the default profile. */
export function withDefaultProfile(row: Record<string, unknown>) {
  return { profileId: DEFAULT_PROFILE_ID, ...row }
}

type SaveFailedListener = (error: unknown) => void
const saveFailedListeners = new Set<SaveFailedListener>()
// Many writes can fail together; report once until a write succeeds again.
let failing = false

/** Calls `listener` when a collection write fails, such as on a full quota. */
export function onSaveFailed(listener: SaveFailedListener) {
  saveFailedListeners.add(listener)
  return () => {
    saveFailedListeners.delete(listener)
  }
}

// Every write waits for the one before. A manual transaction's write would
// otherwise skip the collection's own queue and could land before an earlier
// insert, which would then overwrite it.
let writes: Promise<unknown> = Promise.resolve()

/** Resolves once every write started so far has finished or failed. */
export async function settleWrites() {
  await writes
}

/**
 * Runs `write` after every earlier one, and reports a refused write before
 * passing the error on, so the change rolls back.
 */
async function inOrder<T>(write: () => Promise<T>) {
  const result = writes.then(write)
  writes = result.catch(() => undefined)
  try {
    const value = await result
    failing = false
    return value
  } catch (error) {
    if (!failing) {
      failing = true
      for (const listener of saveFailedListeners) listener(error)
    }
    throw error
  }
}

type Row = Record<string, unknown>

interface LocalCollectionOptions<T> {
  /** Fixes a row an older version saved in localStorage before it moves. */
  upgrade?: (row: Row) => Row | null
  /** Rows an empty workspace starts with. */
  initial?: () => Array<T>
}

function createLocalCollection<
  TSchema extends z.ZodObject<{ id: z.ZodString }>,
>(name: StoreName, schema: TSchema) {
  if (!database) {
    // Same shape as the IndexedDB one, for server renders that never use it.
    return createCollection(
      localOnlyCollectionOptions({
        id: name,
        schema,
        getKey: (item) => item.id,
      }),
    ) as unknown as ReturnType<typeof createIndexedCollection<TSchema>>
  }
  return createIndexedCollection(name, schema)
}

function createIndexedCollection<
  TSchema extends z.ZodObject<{ id: z.ZodString }>,
>(name: StoreName, schema: TSchema) {
  const options = indexedDBCollectionOptions({
    db: database!,
    name,
    id: name,
    schema,
    getKey: (item) => item.id,
    startSync: true,
    // Reads outside React expect every row in memory at all times.
    gcTime: 0,
  })
  const { utils } = options
  const accept = utils.acceptMutations
  utils.acceptMutations = (transaction) => inOrder(() => accept(transaction))
  return createCollection({
    ...options,
    onInsert: (params) => inOrder(() => options.onInsert!(params)),
    onUpdate: (params) => inOrder(() => options.onUpdate!(params)),
    onDelete: (params) => inOrder(() => options.onDelete!(params)),
  })
}

interface Registered {
  name: StoreName
  schema: z.ZodType
  collection: ReturnType<typeof createIndexedCollection>
  options: LocalCollectionOptions<object>
}
const registered: Array<Registered> = []

/**
 * A collection kept in the workspace's IndexedDB store `name`. Changes reach
 * every browser tab of the site. Rows load asynchronously: await
 * `workspaceReady()` before reading them outside React.
 */
export function localCollection<
  TSchema extends z.ZodObject<{ id: z.ZodString }>,
>(
  name: StoreName,
  schema: TSchema,
  options: LocalCollectionOptions<z.output<TSchema>> = {},
) {
  return singleton(name, () => {
    const collection = createLocalCollection(name, schema)
    registered.push({ name, schema, collection, options })
    return collection
  })
}

/**
 * Resolves once every collection holds its stored rows. The first time, it
 * also moves what older versions kept in localStorage into IndexedDB, and
 * fills an empty workspace with its starting rows.
 */
export function workspaceReady() {
  return singleton('workspaceReady', async () => {
    await Promise.all(registered.map(({ collection }) => collection.preload()))
    if (!database) return
    // Two tabs opening at once would both move the same rows.
    await withLock(`${STORAGE_PREFIX}upgrade`, async () => {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop
      for (const entry of registered) await upgrade(entry)
    })
  })
}

async function withLock(name: string, run: () => Promise<void>) {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    await navigator.locks.request(name, run)
  } else {
    await run()
  }
}

/** Rows saved under `key` by the localStorage version of the editor. */
function legacyRows(key: string): Array<Row> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const stored = JSON.parse(raw) as Record<string, { data?: Row }>
    return Object.values(stored).flatMap((item) =>
      item.data ? [item.data] : [],
    )
  } catch {
    return null
  }
}

async function upgrade({ name, schema, collection, options }: Registered) {
  // What another tab may have written since this one loaded counts too.
  const stored = await collection.utils.exportData()
  if (stored.length) return
  const key = STORAGE_PREFIX + name
  const legacy = legacyRows(key)
  if (legacy) {
    const upgraded = options.upgrade
      ? legacy.flatMap((row) => options.upgrade!(row) ?? [])
      : legacy
    // One broken row shouldn't cost the others.
    const rows = upgraded.filter((row) => schema.safeParse(row).success)
    try {
      if (rows.length) await collection.utils.importData(rows)
      // Rows left behind stay in localStorage, so they aren't lost.
      if (rows.length === upgraded.length) localStorage.removeItem(key)
      else console.error(`Kept ${name} rows IndexedDB refused in ${key}`)
      if (rows.length) return
    } catch (error) {
      // Leave the old rows in place for the next load to try again.
      console.error(`Could not move ${name} to IndexedDB`, error)
    }
  }
  const initial = options.initial?.()
  if (initial?.length) {
    await collection.utils.importData(initial)
  }
}

/**
 * A store saved to `storage` under `xml-editor:<name>` on every change, and
 * restored from it on load. Stored fields override `initial`, so settings
 * added later get their default.
 */
export function persistedStore<T extends object>(
  name: string,
  storage: () => Storage,
  initial: T,
) {
  return singleton(name, () => {
    const key = STORAGE_PREFIX + name
    const store = new Store<T>(load(storage, key, initial))
    store.subscribe(() => {
      try {
        storage().setItem(key, JSON.stringify(store.state))
      } catch {
        // Ignore quota or unavailable storage.
      }
    })
    return store
  })
}

function load<T extends object>(
  storage: () => Storage,
  key: string,
  initial: T,
): T {
  try {
    const raw = storage().getItem(key)
    if (raw) return { ...initial, ...(JSON.parse(raw) as Partial<T>) }
  } catch {
    // No storage (SSR, private mode); start from `initial`.
  }
  return initial
}
