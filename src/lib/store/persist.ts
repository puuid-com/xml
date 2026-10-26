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

/** The profile that data written before profiles existed belongs to. */
export const DEFAULT_PROFILE_ID = 'default'

/** Fills fields added after a collection's items were stored. */
export function backfill(storageKey: string, fields: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    const stored = JSON.parse(raw) as Record<
      string,
      { data?: Record<string, unknown> }
    >
    let changed = false
    for (const item of Object.values(stored)) {
      if (!item.data) continue
      for (const [field, value] of Object.entries(fields)) {
        if (item.data[field] !== undefined) continue
        item.data[field] = value
        changed = true
      }
    }
    if (changed) localStorage.setItem(storageKey, JSON.stringify(stored))
  } catch {
    // No storage (SSR, private mode).
  }
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

// localStorage, reporting refused writes before passing the error on so the
// collection rolls back.
const reportingStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  removeItem: (key: string) => localStorage.removeItem(key),
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
      failing = false
    } catch (error) {
      if (!failing) {
        failing = true
        for (const listener of saveFailedListeners) listener(error)
      }
      throw error
    }
  },
}

/**
 * A collection kept in localStorage under `xml-editor:<name>`. Storage events
 * keep every browser tab of the site in sync. `prepare` runs once, before the
 * collection first reads storage. It loads right away, so plain reads outside
 * React (`collection.values()`) see stored items before any query mounts.
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
        storage:
          typeof localStorage === 'undefined' ? undefined : reportingStorage,
        getKey: (item) => item.id,
        schema,
        startSync: true,
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
