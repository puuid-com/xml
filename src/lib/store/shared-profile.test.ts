import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { defaultsCollection, profileDefaults, setDefault } from './defaults'
import { createFile, filesCollection } from './files'
import {
  highlightsCollection,
  profileHighlights,
  setHighlight,
} from './highlights'
import { pinTag, pinsCollection } from './pins'
import { createProfile, profilesCollection, setFormatSetting } from './profiles'
import { deleteProfile } from './profile-actions'
import { setActive } from './session'
import {
  importSharedProfile,
  matchSharedProfile,
  snapshotProfile,
  updateFromShared,
} from './shared-profile'
import { profileVariables, setVariable, variablesCollection } from './variables'
import { decodeShare, encodeShare } from '#/lib/share'
import type { SharedProfile } from '#/lib/share'
import { workspaceReady } from './workspace'

beforeAll(() => workspaceReady())

function clearAll() {
  for (const collection of [
    filesCollection,
    highlightsCollection,
    pinsCollection,
    defaultsCollection,
    variablesCollection,
  ]) {
    const ids = [...collection.values()].map((item) => item.id)
    if (ids.length) collection.delete(ids)
  }
  const extra = [...profilesCollection.values()]
    .map((p) => p.id)
    .filter((id) => id !== 'default')
  if (extra.length) profilesCollection.delete(extra)
}

/** A profile with one of each rule, active through a file of its own. */
async function workProfile() {
  const profile = await createProfile({ name: 'Work', color: 'green' })
  setActive(createFile('a.xml', '', profile.id).id)
  setHighlight('price', 'red')
  pinTag('total')
  setDefault('currency', 'CAD')
  setVariable('host', 'example.test')
  setFormatSetting('sort', 'custom')
  setFormatSetting('customOrder', ['id', '@type'])
  return profile
}

/** The snapshot as it reads after a trip through a link. */
async function throughLink(shared: SharedProfile) {
  const hash = await encodeShare({
    name: 'a.xml',
    content: '<a/>',
    profile: shared,
  })
  return (await decodeShare(hash)).profile!
}

beforeEach(clearAll)

describe('shared profiles', () => {
  it('packs a profile and its rules into a link', async () => {
    const profile = await workProfile()
    const shared = await throughLink(snapshotProfile(profile.id)!)
    expect(shared).toMatchObject({
      id: profile.id,
      name: 'Work',
      color: 'green',
      format: { sort: 'custom', customOrder: ['id', '@type'] },
      highlights: [{ tag: 'price', color: 'red', enabled: true }],
      pins: ['total'],
      defaults: [{ key: 'currency', value: 'CAD', enabled: true }],
      variables: [{ name: 'host', value: 'example.test' }],
    })
    const without = snapshotProfile(profile.id, { variables: false })!
    expect((await throughLink(without)).variables).toBeUndefined()
  })

  it('recognises the profile a link came from', async () => {
    const profile = await workProfile()
    const shared = await throughLink(snapshotProfile(profile.id)!)
    expect(matchSharedProfile(shared)).toMatchObject({ kind: 'same' })
    setHighlight('price', 'blue')
    expect(matchSharedProfile(shared)).toMatchObject({ kind: 'changed' })
    // Leaving variables out makes local ones not count.
    setHighlight('price', 'red')
    setVariable('host', 'other.test')
    expect(
      matchSharedProfile({ ...shared, variables: undefined }),
    ).toMatchObject({ kind: 'same' })
    profilesCollection.delete(profile.id)
    expect(matchSharedProfile(shared)).toEqual({ kind: 'none' })
  })

  it("doesn't match every browser's default profile", () => {
    const shared = snapshotProfile('default')!
    expect(matchSharedProfile(shared)).toMatchObject({ kind: 'same' })
    expect(matchSharedProfile({ ...shared, pins: ['x'] })).toEqual({
      kind: 'none',
    })
  })

  it('imports a profile under its own id when free', async () => {
    const source = await workProfile()
    const shared = snapshotProfile(source.id)!
    await deleteProfile(source.id)
    const imported = importSharedProfile(shared)
    expect(imported).toMatchObject({ id: source.id, name: 'Work' })
    expect(matchSharedProfile(shared)).toMatchObject({ kind: 'same' })

    // A second copy gets a new id and a name that tells it apart.
    const again = importSharedProfile(shared)
    expect(again.id).not.toBe(source.id)
    expect(again.name).toBe('Work (shared)')
    expect(profileHighlights(again.id).map((r) => r.tag)).toEqual(['price'])
    expect(profileVariables(again.id).map((v) => v.value)).toEqual([
      'example.test',
    ])
  })

  it('updates a profile from a link, keeping variables it leaves out', async () => {
    const profile = await workProfile()
    const shared: SharedProfile = {
      ...snapshotProfile(profile.id, { variables: false })!,
      name: 'Work 2',
      highlights: [
        { tag: 'qty', color: 'teal', enabled: false },
        { tag: 'qty', color: 'red', enabled: true },
      ],
      defaults: [],
    }
    updateFromShared(profile.id, shared)
    expect(profilesCollection.get(profile.id)?.name).toBe('Work 2')
    expect(profileHighlights(profile.id)).toMatchObject([
      { tag: 'qty', color: 'teal', enabled: false },
    ])
    expect(profileDefaults(profile.id)).toEqual([])
    expect(profileVariables(profile.id).map((v) => v.name)).toEqual(['host'])
  })
})
