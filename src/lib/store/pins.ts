import { z } from 'zod'

import { localCollection, newId } from './persist'

const pinSchema = z.object({
  id: z.string(),
  /** Exact tag or key name, prefix included (`soap:Body`). */
  tag: z.string(),
  createdAt: z.number(),
})

// Global across files, synced across browser tabs like the highlights.
export const pinsCollection = localCollection('pins', pinSchema)

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
