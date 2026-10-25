import {
  createCollection,
  localStorageCollectionOptions,
} from '@tanstack/react-db'
import { z } from 'zod'

import { newId } from './files'
import { singleton } from './singleton'

export const pinSchema = z.object({
  id: z.string(),
  /** Exact tag or key name, prefix included (`soap:Body`). */
  tag: z.string(),
  createdAt: z.number(),
})

export type Pin = z.infer<typeof pinSchema>

// Global across files, synced across browser tabs like the highlights.
export const pinsCollection = singleton('pins', () =>
  createCollection(
    localStorageCollectionOptions({
      id: 'pins',
      storageKey: 'xml-editor:pins',
      getKey: (pin) => pin.id,
      schema: pinSchema,
    }),
  ),
)

export function findPin(tag: string) {
  return [...pinsCollection.values()].find((p) => p.tag === tag)
}

export function pinTag(tag: string) {
  if (findPin(tag)) return
  pinsCollection.insert({ id: newId(), tag, createdAt: Date.now() })
}

export function unpinTag(tag: string) {
  const pin = findPin(tag)
  if (pin) pinsCollection.delete(pin.id)
}

export function togglePin(tag: string) {
  if (findPin(tag)) unpinTag(tag)
  else pinTag(tag)
}
