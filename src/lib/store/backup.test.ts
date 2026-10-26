import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
import { pinTag, pinsCollection } from './pins'
import { createProfile, profilesCollection } from './profiles'

function clearAll() {
  for (const collection of [
    filesCollection,
    highlightsCollection,
    pinsCollection,
    defaultsCollection,
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

const stored = () =>
  Object.fromEntries(
    Object.keys(localStorage)
      .filter((key) => key.startsWith('xml-editor:'))
      .map((key) => [key, localStorage.getItem(key)]),
  )

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
    const staging = createProfile({ name: 'Staging' })
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
      'soap:Body',
    ])
    expect([...pinsCollection.values()].map((p) => p.tag)).toEqual(['id'])
    expect([...defaultsCollection.values()].map((r) => r.value)).toEqual([
      'Jane',
    ])
    expect(localStorage.getItem('xml-editor:files')).not.toContain('other.xml')
  })

  it('leaves the workspace as it was when a write fails partway', async () => {
    createProfile({ name: 'Staging' })
    setHighlight('soap:Body', 'blue')
    pinTag('id')
    setDefault('name', 'Jane')
    const backup = createBackup()

    clearAll()
    localStorage.removeItem('xml-editor:pins')
    const file = createFile('kept.xml', '<kept/>')
    setHighlight('item', 'green')
    const before = stored()
    expect(before['xml-editor:pins']).toBeUndefined()
    const rowsBefore = workspace()

    const setItem = Storage.prototype.setItem
    let writes = 0
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (++writes === 4) throw new DOMException('full', 'QuotaExceededError')
      setItem.call(this, key, value)
    })
    await expect(restoreBackup(backup)).rejects.toThrow('full')
    vi.restoreAllMocks()

    expect(writes).toBeGreaterThanOrEqual(4)
    expect(stored()).toEqual(before)
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
