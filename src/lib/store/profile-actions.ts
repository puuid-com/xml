import { defaultsCollection } from './defaults'
import { reassignProfile } from './files'
import { highlightsCollection } from './highlights'
import { newId } from './persist'
import { pinsCollection } from './pins'
import {
  createProfile,
  profilesCollection,
  profilesList,
  resolveProfile,
} from './profiles'
import { variablesCollection } from './variables'
import type { Profile } from './profiles'

// Operations that span the profile and every collection of its rules.

/** A new profile with a copy of every setting and rule of `sourceId`. */
export function cloneProfile(
  sourceId: string,
  details: { name: string; color?: string },
): Profile | undefined {
  const source = profilesCollection.get(sourceId)
  if (!source) return
  const copy = createProfile({ ...details, format: source.format })
  const owned = <T extends { profileId: string }>(rules: Iterable<T>) =>
    [...rules].filter((rule) => rule.profileId === sourceId)
  // Fields are listed so the rows' virtual `$` props aren't copied.
  const highlights = owned(highlightsCollection.values()).map((r) => ({
    id: newId(),
    tag: r.tag,
    color: r.color,
    enabled: r.enabled,
    createdAt: r.createdAt,
    profileId: copy.id,
  }))
  const pins = owned(pinsCollection.values()).map((p) => ({
    id: newId(),
    tag: p.tag,
    createdAt: p.createdAt,
    order: p.order,
    profileId: copy.id,
  }))
  const defaults = owned(defaultsCollection.values()).map((r) => ({
    id: newId(),
    key: r.key,
    value: r.value,
    enabled: r.enabled,
    createdAt: r.createdAt,
    profileId: copy.id,
  }))
  const variables = owned(variablesCollection.values()).map((v) => ({
    id: newId(),
    name: v.name,
    value: v.value,
    createdAt: v.createdAt,
    profileId: copy.id,
  }))
  if (highlights.length) highlightsCollection.insert(highlights)
  if (pins.length) pinsCollection.insert(pins)
  if (defaults.length) defaultsCollection.insert(defaults)
  if (variables.length) variablesCollection.insert(variables)
  return copy
}

/**
 * Deletes a profile and its rules. Its files move to the next profile. The
 * last profile can't be deleted.
 */
export async function deleteProfile(id: string) {
  if (!profilesCollection.has(id)) return
  const rest = profilesList().filter((p) => p.id !== id)
  const fallback = resolveProfile(rest, null)
  if (!fallback) return
  await reassignProfile(id, fallback.id)
  for (const collection of [
    highlightsCollection,
    pinsCollection,
    defaultsCollection,
    variablesCollection,
  ]) {
    const ids = [...collection.values()]
      .filter((rule) => rule.profileId === id)
      .map((rule) => rule.id)
    if (ids.length) collection.delete(ids)
  }
  profilesCollection.delete(id)
  return fallback
}
