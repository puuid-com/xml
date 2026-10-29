import { defaultsCollection } from './defaults'
import { withDefaults } from './format-settings'
import { highlightsCollection } from './highlights'
import { DEFAULT_PROFILE_ID, newId } from './persist'
import { pinsCollection } from './pins'
import { profilesCollection, profilesList } from './profiles'
import { isVariableName, variablesCollection } from './variables'
import type { Profile } from './profiles'
import { m } from '#/paraglide/messages'
import type { SharedProfile } from '#/lib/share'

// A profile packed into a share link, and what opening the link does with it.

const byCreation = <T extends { createdAt: number; id: string }>(a: T, b: T) =>
  a.createdAt - b.createdAt || a.id.localeCompare(b.id)

function owned<T extends { profileId: string; createdAt: number; id: string }>(
  rows: Iterable<T>,
  profileId: string,
) {
  return [...rows].filter((r) => r.profileId === profileId).sort(byCreation)
}

/** A profile's settings and rules, ready to travel in a share link. */
export function snapshotProfile(
  profileId: string,
  { variables = true }: { variables?: boolean } = {},
): SharedProfile | undefined {
  const profile = profilesCollection.get(profileId)
  if (!profile) return
  return {
    id: profile.id,
    name: profile.name,
    color: profile.color,
    format: withDefaults(profile.format),
    highlights: owned(highlightsCollection.values(), profileId).map((r) => ({
      tag: r.tag,
      color: r.color,
      enabled: r.enabled,
    })),
    pins: owned(pinsCollection.values(), profileId).map((p) => p.tag),
    defaults: owned(defaultsCollection.values(), profileId).map((r) => ({
      key: r.key,
      value: r.value,
      enabled: r.enabled,
    })),
    variables: variables
      ? owned(variablesCollection.values(), profileId).map((v) => ({
          name: v.name,
          value: v.value,
        }))
      : undefined,
  }
}

export function sharedCounts(shared: SharedProfile) {
  return {
    highlights: shared.highlights.length,
    pins: shared.pins.length,
    defaults: shared.defaults.length,
    variables: shared.variables?.length ?? 0,
  }
}

/** Key order is fixed by the snapshot, so equal profiles stringify alike. */
function same(a: SharedProfile, b: SharedProfile) {
  const comparable = (p: SharedProfile, variables: boolean) =>
    JSON.stringify({ ...p, variables: variables ? p.variables : undefined })
  // Without variables in the link, the local ones don't count.
  const variables = b.variables !== undefined
  return comparable(a, variables) === comparable(b, variables)
}

export type SharedProfileMatch =
  { kind: 'none' } | { kind: 'same' | 'changed'; profile: Profile }

/** The local profile a link's profile came from or was imported as, if any. */
export function matchSharedProfile(shared: SharedProfile): SharedProfileMatch {
  const profile = profilesCollection.get(shared.id)
  if (!profile) return { kind: 'none' }
  const local = snapshotProfile(profile.id)
  if (local && same(local, shared)) return { kind: 'same', profile }
  // Every browser starts with this id, so sharing it doesn't mean it's the
  // same profile.
  if (profile.id === DEFAULT_PROFILE_ID) return { kind: 'none' }
  return { kind: 'changed', profile }
}

/** The first item for each key; a crafted link may repeat one. */
function unique<T>(items: ReadonlyArray<T>, key: (item: T) => string) {
  const seen = new Set<string>()
  return items.filter((item) => !seen.has(key(item)) && seen.add(key(item)))
}

/** Rows for `profileId` built from the link, numbered to keep their order. */
function sharedRows(shared: SharedProfile, profileId: string) {
  const base = Date.now()
  const row = (i: number) => ({ id: newId(), createdAt: base + i, profileId })
  const variables = (shared.variables ?? []).filter((v) =>
    isVariableName(v.name),
  )
  return {
    highlights: unique(shared.highlights, (r) => r.tag).map((r, i) => ({
      ...row(i),
      ...r,
    })),
    pins: unique(shared.pins, (tag) => tag).map((tag, i) => ({
      ...row(i),
      tag,
    })),
    defaults: unique(shared.defaults, (r) => r.key).map((r, i) => ({
      ...row(i),
      ...r,
    })),
    variables: unique(variables, (v) => v.name).map((v, i) => ({
      ...row(i),
      ...v,
    })),
  }
}

function insertRules(shared: SharedProfile, profileId: string) {
  const rows = sharedRows(shared, profileId)
  if (rows.highlights.length) highlightsCollection.insert(rows.highlights)
  if (rows.pins.length) pinsCollection.insert(rows.pins)
  if (rows.defaults.length) defaultsCollection.insert(rows.defaults)
  if (rows.variables.length) variablesCollection.insert(rows.variables)
}

/**
 * Adds the link's profile. It keeps the sender's id when that is free here,
 * so later links from the same profile are matched to it.
 */
export function importSharedProfile(shared: SharedProfile): Profile {
  const profile: Profile = {
    id: profilesCollection.has(shared.id) ? newId() : shared.id,
    name: profilesList().some((p) => p.name === shared.name)
      ? m.profile_shared_name({ name: shared.name })
      : shared.name,
    color: shared.color,
    createdAt: Math.max(
      Date.now(),
      (profilesList().at(-1)?.createdAt ?? 0) + 1,
    ),
    format: withDefaults(shared.format),
    samples: [],
  }
  profilesCollection.insert(profile)
  insertRules(shared, profile.id)
  return profile
}

/**
 * Gives a local profile the link's settings and rules. Its variables stay
 * when the link carries none.
 */
export function updateFromShared(profileId: string, shared: SharedProfile) {
  if (!profilesCollection.has(profileId)) return
  profilesCollection.update(profileId, (draft) => {
    draft.name = shared.name
    draft.color = shared.color
    draft.format = withDefaults(shared.format)
  })
  const replaced = shared.variables
    ? [
        highlightsCollection,
        pinsCollection,
        defaultsCollection,
        variablesCollection,
      ]
    : [highlightsCollection, pinsCollection, defaultsCollection]
  for (const collection of replaced) {
    const ids = [...collection.values()]
      .filter((rule) => rule.profileId === profileId)
      .map((rule) => rule.id)
    if (ids.length) collection.delete(ids)
  }
  insertRules(shared, profileId)
}
