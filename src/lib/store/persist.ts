import {
  createCollection,
  localStorageCollectionOptions,
} from '@tanstack/react-db'
import { Store } from '@tanstack/store'

import { singleton } from './singleton'
import type { z } from 'zod'

/** Prefix of every key the editor writes to browser storage. */
const STORAGE_PREFIX = 'xml-editor:'

export function newId() {
  return crypto.randomUUID()
}

/**
 * A collection kept in localStorage under `xml-editor:<name>`. Storage events
 * keep every browser tab of the site in sync. `prepare` runs once, before the
 * collection first reads storage.
 */
export function localCollection<
  TSchema extends z.ZodObject<{ id: z.ZodString }>,
>(name: string, schema: TSchema, prepare?: (storageKey: string) => void) {
  return singleton(name, () => {
    const storageKey = STORAGE_PREFIX + name
    prepare?.(storageKey)
    return createCollection(
      localStorageCollectionOptions({
        id: name,
        storageKey,
        getKey: (item) => item.id,
        schema,
      }),
    )
  })
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
