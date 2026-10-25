import { z } from 'zod'

import { DEFAULT_PROFILE_ID, backfill, localCollection, newId } from './persist'
import { activeProfileId } from './profiles'

const defaultValueSchema = z.object({
  id: z.string(),
  /** Tag name (`soap:Body`), or `@name` for an attribute. */
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
  createdAt: z.number(),
  profileId: z.string(),
})

export type DefaultValue = z.infer<typeof defaultValueSchema>

// Per profile, synced across browser tabs like the highlights.
export const defaultsCollection = localCollection(
  'defaults',
  defaultValueSchema,
  (storageKey) => backfill(storageKey, { profileId: DEFAULT_PROFILE_ID }),
)

/** A profile's rules; the active file's profile by default. */
export function profileDefaults(profileId = activeProfileId()) {
  return [...defaultsCollection.values()].filter(
    (r) => r.profileId === profileId,
  )
}

export function findDefault(key: string, profileId = activeProfileId()) {
  return profileDefaults(profileId).find((r) => r.key === key)
}

export function enabledDefaults(profileId = activeProfileId()) {
  return profileDefaults(profileId).filter((r) => r.enabled)
}

/** Adds the rule for `key` to the active profile, or updates its value. */
export function setDefault(key: string, value: string) {
  const profileId = activeProfileId()
  const existing = findDefault(key, profileId)
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
    profileId,
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
