import {
  createCollection,
  localStorageCollectionOptions,
} from '@tanstack/react-db'
import { z } from 'zod'

import { newId } from './files'
import { singleton } from './singleton'

export const defaultValueSchema = z.object({
  id: z.string(),
  /** Tag name (`soap:Body`), or `@name` for an attribute. */
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
  createdAt: z.number(),
})

export type DefaultValue = z.infer<typeof defaultValueSchema>

// Global across files, synced across browser tabs like the highlights.
export const defaultsCollection = singleton('defaults', () =>
  createCollection(
    localStorageCollectionOptions({
      id: 'defaults',
      storageKey: 'xml-editor:defaults',
      getKey: (rule) => rule.id,
      schema: defaultValueSchema,
    }),
  ),
)

export function findDefault(key: string) {
  return [...defaultsCollection.values()].find((r) => r.key === key)
}

export function enabledDefaults() {
  return [...defaultsCollection.values()].filter((r) => r.enabled)
}

/** Adds the rule for `key`, or updates its value. */
export function setDefault(key: string, value: string) {
  const existing = findDefault(key)
  if (existing) {
    defaultsCollection.update(existing.id, (draft) => {
      draft.value = value
      draft.enabled = true
    })
    return
  }
  defaultsCollection.insert({
    id: newId(),
    key,
    value,
    enabled: true,
    createdAt: Date.now(),
  })
}

export function updateDefaultValue(id: string, value: string) {
  defaultsCollection.update(id, (draft) => {
    draft.value = value
  })
}

export function toggleDefault(id: string) {
  defaultsCollection.update(id, (draft) => {
    draft.enabled = !draft.enabled
  })
}

export function removeDefault(id: string) {
  if (defaultsCollection.has(id)) defaultsCollection.delete(id)
}
