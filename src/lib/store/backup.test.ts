import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  BACKUP_VERSION,
  backupCounts,
  createBackup,
  parseBackup,
  restoreBackup,
} from './backup'
import { defaultsCollection, setDefault } from './defaults'
import { closeFile, createFile, filesCollection } from './files'
import { highlightsCollection, setHighlight } from './highlights'
import { settleWrites } from './persist'
import { pinTag, pinsCollection } from './pins'
import { createProfile, profilesCollection } from './profiles'
import { setVariable, variablesCollection } from './variables'
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

const sorted = <T extends { id: string }>(items: Iterable<T>) =>
  [...items].sort((a, b) => a.id.localeCompare(b.id))

/** Every row IndexedDB holds, once pending writes are done, by store. */
async function stored() {
  await settleWrites()
  const collections = {
    files: filesCollection,
    profiles: profilesCollection,
    highlights: highlightsCollection,
    pins: pinsCollection,
    defaults: defaultsCollection,
    variables: variablesCollection,
  }
  const entries = await Promise.all(
    Object.entries(collections).map(async ([name, collection]) => [
      name,
      sorted<{ id: string }>(await collection.utils.exportData()),
    ]),
  )
  return Object.fromEntries(entries) as Record<string, Array<{ id: string }>>
}

// Every row without the virtual `$` props, which tell local and synced apart.
const workspace = () =>
  Object.fromEntries(
    Object.entries({
      files: filesCollection,
      profiles: profilesCollection,
      highlights: highlightsCollection,
      pins: pinsCollection,
      defaults: defaultsCollection,
    }).map(([name, collection]) => [
      name,
      sorted<{ id: string }>(collection.values()).map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(([key]) => !key.startsWith('$')),
        ),
      ),
    ]),
  )

describe('workspace backup', () => {
  beforeEach(clearAll)
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('restores the same files, archive, profiles and rules', async () => {
    const a = createFile('a.xml', '<a/>')
    const b = createFile('b.xml', '<b/>')
    await closeFile(b.id)
    const staging = await createProfile({ name: 'Staging' })
    setHighlight('soap:Body', 'blue')
    pinTag('id')
    setDefault('name', 'Jane')

    const text = JSON.stringify(createBackup(new Map([[a.id, '<a>new</a>']])))
    const before = parseBackup(text)
    expect(before.ok).toBe(true)
    if (!before.ok) return
    expect(backupCounts(before.backup)).toEqual({
      open: 1,
      archived: 1,
      profiles: 2,
      highlights: 1,
      pins: 1,
      defaults: 1,
      variables: 0,
    })

    clearAll()
    createFile('other.xml', '<other/>')
    await restoreBackup(before.backup)

    const files = sorted(filesCollection.values())
    expect(
      files.map((f) => [f.id, f.name, f.content, f.deletedAt === null]),
    ).toEqual(
      sorted([
        { id: a.id, name: 'a.xml', content: '<a>new</a>', open: true },
        { id: b.id, name: 'b.xml', content: '<b/>', open: false },
      ]).map((f) => [f.id, f.name, f.content, f.open]),
    )
    expect(profilesCollection.get(staging.id)?.name).toBe('Staging')
    expect([...highlightsCollection.values()].map((r) => r.tag)).toEqual([
      'Body',
    ])
    expect([...pinsCollection.values()].map((p) => p.tag)).toEqual(['id'])
    expect([...defaultsCollection.values()].map((r) => r.value)).toEqual([
      'Jane',
    ])
    expect(JSON.stringify((await stored()).files)).not.toContain('other.xml')
  })

  it('restores variables under their profiles', async () => {
    const staging = await createProfile({ name: 'Staging' })
    setVariable('host', 'example.com', 'default')
    setVariable('token', 'secret', staging.id)
    const parsed = parseBackup(JSON.stringify(createBackup()))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(backupCounts(parsed.backup).variables).toBe(2)

    clearAll()
    setVariable('stale', 'x', 'default')
    await restoreBackup(parsed.backup)

    const vars = [...variablesCollection.values()]
      .map((v) => [v.name, v.value, v.profileId])
      .sort()
    expect(vars).toEqual([
      ['host', 'example.com', 'default'],
      ['token', 'secret', staging.id],
    ])
  })

  it('restores a version 1 file without variables', async () => {
    setVariable('stale', 'x', 'default')
    const { variables: _, ...old } = createBackup()
    const parsed = parseBackup(JSON.stringify(old))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.backup.variables).toEqual([])
    await restoreBackup(parsed.backup)
    expect(variablesCollection.size).toBe(0)
  })

  it('leaves no variable pointing at a missing profile', async () => {
    const staging = await createProfile({ name: 'Staging' })
    setVariable('token', 'secret', staging.id)
    const backup = createBackup()
    const parsed = parseBackup(
      JSON.stringify({
        ...backup,
        profiles: backup.profiles.filter((p) => p.id !== staging.id),
      }),
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    await restoreBackup(parsed.backup)
    const profileIds = new Set(
      [...profilesCollection.values()].map((p) => p.id),
    )
    expect(
      [...variablesCollection.values()].every((v) =>
        profileIds.has(v.profileId),
      ),
    ).toBe(true)
    expect(variablesCollection.size).toBe(0)
  })

  it('leaves the workspace as it was when a write fails partway', async () => {
    await createProfile({ name: 'Staging' })
    setHighlight('soap:Body', 'blue')
    pinTag('id')
    setDefault('name', 'Jane')
    const backup = createBackup()

    clearAll()
    const file = createFile('kept.xml', '<kept/>')
    setHighlight('item', 'green')
    const before = await stored()
    expect(before.pins).toEqual([])
    const rowsBefore = workspace()

    // Profiles, highlights and pins are written; defaults, the fourth, fail.
    const put = IDBObjectStore.prototype.put
    let refused = 0
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      ...args
    ) {
      if (this.name === 'defaults' && refused++ === 0) {
        throw new DOMException('full', 'QuotaExceededError')
      }
      return put.apply(this, args)
    })
    await expect(restoreBackup(backup)).rejects.toThrow('full')
    vi.restoreAllMocks()

    expect(refused).toBeGreaterThan(0)
    expect(await stored()).toEqual(before)
    expect(filesCollection.get(file.id)?.content).toBe('<kept/>')
    expect(workspace()).toEqual(rowsBefore)
  })

  it('rejects files that are not a valid backup', () => {
    expect(parseBackup('not json')).toEqual({ ok: false, reason: 'invalid' })
    expect(parseBackup('{"files": []}')).toEqual({
      ok: false,
      reason: 'invalid',
    })
    const backup = createBackup()
    const broken = { ...backup, files: [{ id: 'x', name: 1 }] }
    expect(parseBackup(JSON.stringify(broken))).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(parseBackup(JSON.stringify({ ...backup, profiles: [] }))).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('rejects backups from a newer version', () => {
    const newer = { ...createBackup(), version: BACKUP_VERSION + 1 }
    expect(parseBackup(JSON.stringify(newer))).toEqual({
      ok: false,
      reason: 'newer',
    })
  })
})
