import { z } from 'zod'

import { DEFAULT_PROFILE_ID, backfill, localCollection, newId } from './persist'
import { activeProfileId } from './profiles'
import { localName, sameName } from '#/lib/names'

export const pinSchema = z.object({
  id: z.string(),
  /** Tag or key name without its prefix (`Body` for `soap:Body`). */
  tag: z.string(),
  createdAt: z.number(),
  profileId: z.string(),
})

// Per profile, synced across browser tabs like the highlights.
export const pinsCollection = localCollection('pins', pinSchema, (key) =>
  backfill(key, { profileId: DEFAULT_PROFILE_ID }),
)

export function findPin(tag: string, profileId = activeProfileId()) {
  return [...pinsCollection.values()].find(
    (p) => sameName(p.tag, tag) && p.profileId === profileId,
  )
}

export function pinTag(tag: string) {
  const profileId = activeProfileId()
  if (findPin(tag, profileId)) return
  pinsCollection.insert({
    id: newId(),
    tag: localName(tag),
    createdAt: Date.now(),
    profileId,
  })
}

export function unpinTag(tag: string) {
  const pin = findPin(tag)
  if (pin) pinsCollection.delete(pin.id)
}

export function togglePin(tag: string) {
  if (findPin(tag)) unpinTag(tag)
  else pinTag(tag)
}
