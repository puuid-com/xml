import {
  createCollection,
  createIndexedDB,
  indexedDBCollectionOptions,
} from '@tanstack/react-db'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  closeFile,
  archivedFiles,
  ARCHIVE_LIMIT,
  createFile,
  filesCollection,
  isStorageFull,
  onSaveFailed,
  reorderFile,
  restoreFile,
  saveContent,
  uniqueName,
} from './files'
import {
  defaultsCollection,
  enabledDefaults,
  findDefault,
  setDefault,
  toggleDefault,
} from './defaults'
import {
  findHighlight,
  groupByColor,
  highlightCss,
  highlightsCollection,
  nextPreset,
  recolorGroup,
  setGroupEnabled,
  setHighlight,
} from './highlights'
import {
  findPin,
  pinTag,
  pinsCollection,
  reorderPins,
  togglePin,
  unpinTag,
} from './pins'
import {
  findVariable,
  removeVariable,
  setVariable,
  variableSchema,
  variableValues,
  variablesCollection,
} from './variables'
import { workspaceReady } from './workspace'

beforeAll(() => workspaceReady())

/** What IndexedDB holds for a collection, as JSON to search. */
async function stored(collection: {
  utils: { exportData: () => Promise<Array<unknown>> }
}) {
  return JSON.stringify(await collection.utils.exportData())
}

/** Makes every IndexedDB write fail as on a full disk, until restored. */
function refuseWrites() {
  return vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError')
  })
}

function openOrder() {
  return [...filesCollection.values()]
    .filter((file) => file.deletedAt === null)
    .sort((a, b) => a.order - b.order)
    .map((f) => f.name)
}

describe('files', () => {
  beforeEach(() => {
    for (const file of [...filesCollection.values()]) {
      filesCollection.delete(file.id)
    }
  })

  it('gives new files unique names', () => {
    createFile('untitled.xml')
    createFile('untitled.xml')
    expect(uniqueName('untitled.xml')).toBe('untitled-3.xml')
    expect(openOrder()).toEqual(['untitled.xml', 'untitled-2.xml'])
  })

  it('archives the file when its tab closes, including its contents', async () => {
    const a = createFile('a.xml', '<a/>')
    createFile('b.xml')
    await closeFile(a.id)
    expect(openOrder()).toEqual(['b.xml'])
    expect(archivedFiles()).toEqual([
      expect.objectContaining({ id: a.id, name: 'a.xml', content: '<a/>' }),
    ])
    expect(await stored(filesCollection)).toContain('a.xml')
  })

  it('retains only the last ten deleted files, even with equal clock times', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    try {
      for (let i = 0; i < 12; i++) {
        const file = createFile(`file-${i}.xml`, `<root>${i}</root>`)
        await closeFile(file.id)
      }
      expect(archivedFiles()).toHaveLength(ARCHIVE_LIMIT)
      expect(archivedFiles().map((file) => file.name)).toEqual(
        Array.from({ length: 10 }, (_, i) => `file-${11 - i}.xml`),
      )
      expect(filesCollection.size).toBe(10)
      expect(await stored(filesCollection)).not.toContain('file-0.xml')
    } finally {
      now.mockRestore()
    }
  })

  it('restores at the end, preserves contents, and resolves open-name collisions', async () => {
    const original = createFile('a.json', '{"value":42}')
    await closeFile(original.id)
    createFile('a.json', '{}')
    createFile('b.xml', '<b/>')
    expect(await restoreFile(original.id)).toBe(original.id)
    expect(openOrder()).toEqual(['a.json', 'b.xml', 'a-2.json'])
    expect(filesCollection.get(original.id)?.content).toBe('{"value":42}')
    expect(archivedFiles()).toHaveLength(0)
    expect(await restoreFile(original.id)).toBeUndefined()
    await closeFile(original.id)
    expect(archivedFiles()[0].name).toBe('a-2.json')
  })

  it('keeps the latest edit when closing before the debounced save completes', async () => {
    const file = createFile('typing.xml', '<old/>')
    const pending = saveContent({ id: file.id, content: '<latest/>' })
    await closeFile(file.id)
    await pending.isPersisted.promise
    expect(openOrder()).toEqual([])
    expect(archivedFiles()[0].content).toBe('<latest/>')
    expect(await stored(filesCollection)).toContain('<latest/>')
  })

  it('reports a content save the browser refuses, once', async () => {
    const file = createFile('full.xml', '<old/>')
    const failed = vi.fn()
    const stop = onSaveFailed(failed)
    const write = refuseWrites()
    try {
      saveContent({ id: file.id, content: '<a/>' })
      const pending = saveContent({ id: file.id, content: '<ab/>' })
      await expect(pending.isPersisted.promise).rejects.toThrow()
      await Promise.resolve()
      expect(failed).toHaveBeenCalledTimes(1)
      expect(isStorageFull(failed.mock.calls[0][0])).toBe(true)
    } finally {
      write.mockRestore()
      stop()
    }
  })

  it('reports refused writes from any collection, once until one succeeds', async () => {
    const failed = vi.fn()
    const stop = onSaveFailed(failed)
    const written = (tag: string) =>
      vi.waitFor(async () =>
        expect(await stored(highlightsCollection)).toContain(`"${tag}"`),
      )
    try {
      setHighlight('ok')
      await written('ok')
      let write = refuseWrites()
      setHighlight('a')
      togglePin('b')
      await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(1))
      expect(isStorageFull(failed.mock.calls[0][0])).toBe(true)
      write.mockRestore()
      setHighlight('c')
      await written('c')
      write = refuseWrites()
      setHighlight('d')
      await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(2))
      write.mockRestore()
    } finally {
      stop()
    }
  })

  it('rolls back archival and eviction if storage is full', async () => {
    for (let i = 0; i < 10; i++) {
      const file = createFile(`archived-${i}.xml`)
      await closeFile(file.id)
    }
    const file = createFile('keep-open.xml', '<keep/>')
    await vi.waitFor(async () =>
      expect(await stored(filesCollection)).toContain('keep-open.xml'),
    )
    const before = archivedFiles().map((entry) => entry.id)
    const write = refuseWrites()
    try {
      await expect(closeFile(file.id)).rejects.toThrow()
      expect(openOrder()).toEqual(['keep-open.xml'])
      expect(archivedFiles().map((entry) => entry.id)).toEqual(before)
    } finally {
      write.mockRestore()
    }
  })

  it('reorders tabs', () => {
    const a = createFile('a.xml')
    const b = createFile('b.xml')
    const c = createFile('c.xml')
    reorderFile(c.id, a.id)
    expect(openOrder()).toEqual(['c.xml', 'a.xml', 'b.xml'])
    reorderFile(c.id, null)
    expect(openOrder()).toEqual(['a.xml', 'b.xml', 'c.xml'])
    expect(b.id).toBeTruthy()
  })

  it('persists to IndexedDB', async () => {
    createFile('saved.xml', '<a/>')
    await vi.waitFor(async () =>
      expect(await stored(filesCollection)).toContain('saved.xml'),
    )
  })
})

describe('highlights', () => {
  beforeEach(() => {
    for (const rule of [...highlightsCollection.values()]) {
      highlightsCollection.delete(rule.id)
    }
  })

  it('assigns distinct presets and recolours existing rules', () => {
    setHighlight('item')
    setHighlight('name')
    expect(findHighlight('item')?.color).toBe('blue')
    expect(findHighlight('name')?.color).toBe('purple')
    setHighlight('item', '#ff0000')
    expect(findHighlight('item')?.color).toBe('#ff0000')
    expect(nextPreset()).toBe('blue')
  })

  it('names rules without the tag prefix', () => {
    setHighlight('soap:Body')
    setHighlight('s:Body', 'red')
    expect([...highlightsCollection.values()]).toMatchObject([
      { tag: 'Body', color: 'red' },
    ])
    expect(findHighlight('Body')).toBeDefined()
  })

  it('groups rules by colour in order of first appearance', () => {
    const rules = [
      { tag: 'a', color: 'red' },
      { tag: 'b', color: '#ABCDEF' },
      { tag: 'c', color: 'red' },
      { tag: 'd', color: '#abcdef' },
    ]
    expect(groupByColor(rules).map((g) => g.map((r) => r.tag))).toEqual([
      ['a', 'c'],
      ['b', 'd'],
    ])
  })

  it('recolours and toggles a whole colour group', () => {
    setHighlight('a', 'red')
    setHighlight('b', 'red')
    setHighlight('c', 'teal')
    setGroupEnabled('red', false)
    expect(findHighlight('a')?.enabled).toBe(false)
    expect(findHighlight('b')?.enabled).toBe(false)
    expect(findHighlight('c')?.enabled).toBe(true)
    recolorGroup('red', 'green')
    expect(findHighlight('a')?.color).toBe('green')
    expect(findHighlight('b')?.color).toBe('green')
    expect(findHighlight('c')?.color).toBe('teal')
  })

  it('resolves preset and custom colours to CSS', () => {
    expect(highlightCss('teal')).toBe('var(--hl-teal)')
    expect(highlightCss('#123456')).toBe('#123456')
  })
})

describe('defaults', () => {
  beforeEach(() => {
    for (const rule of [...defaultsCollection.values()]) {
      defaultsCollection.delete(rule.id)
    }
  })

  it('adds one rule per key and updates its value', () => {
    setDefault('id', '1')
    setDefault('id', '2')
    expect([...defaultsCollection.values()]).toHaveLength(1)
    expect(findDefault('id')?.value).toBe('2')
  })

  it('keys rules without the tag prefix', () => {
    setDefault('ns:id', '1')
    setDefault('@xsi:type', 't')
    setDefault('id', '2')
    expect([...defaultsCollection.values()].map((r) => r.key)).toEqual([
      'id',
      '@type',
    ])
    expect(findDefault('a:id')?.value).toBe('2')
  })

  it('only returns enabled rules', () => {
    setDefault('a', '1')
    setDefault('b', '2')
    toggleDefault(findDefault('a')!.id)
    expect(enabledDefaults().map((r) => r.key)).toEqual(['b'])
  })
})

describe('pins', () => {
  beforeEach(() => {
    for (const pin of [...pinsCollection.values()]) {
      pinsCollection.delete(pin.id)
    }
  })

  it('pins each tag once and unpins it', () => {
    pinTag('amount')
    pinTag('amount')
    expect([...pinsCollection.values()]).toHaveLength(1)
    unpinTag('amount')
    expect(findPin('amount')).toBeUndefined()
  })

  it('pins a tag whatever its prefix', () => {
    pinTag('ns:amount')
    pinTag('amount')
    expect([...pinsCollection.values()]).toMatchObject([{ tag: 'amount' }])
    unpinTag('other:amount')
    expect([...pinsCollection.values()]).toHaveLength(0)
  })

  it('toggles a pin', () => {
    togglePin('currency')
    expect(findPin('currency')).toBeDefined()
    togglePin('currency')
    expect(findPin('currency')).toBeUndefined()
  })

  it('saves a new order and keeps later pins last', () => {
    for (const tag of ['a', 'b', 'c']) pinTag(tag)
    const id = (tag: string) => findPin(tag)!.id
    reorderPins([id('c'), id('a'), id('b')])
    pinTag('d')
    const sorted = [...pinsCollection.values()].sort(
      (x, y) => (x.order ?? x.createdAt) - (y.order ?? y.createdAt),
    )
    expect(sorted.map((p) => p.tag)).toEqual(['c', 'a', 'b', 'd'])
  })
})

describe('variables', () => {
  beforeEach(() => {
    for (const variable of [...variablesCollection.values()]) {
      variablesCollection.delete(variable.id)
    }
  })

  it('keeps one value per name and updates it', async () => {
    setVariable('host', 'dev')
    setVariable('host', 'prod')
    expect([...variablesCollection.values()]).toHaveLength(1)
    expect(variableValues()).toEqual(new Map([['host', 'prod']]))
    await vi.waitFor(async () =>
      expect(await stored(variablesCollection)).toContain('prod'),
    )
  })

  it('rejects names a variable can’t have', () => {
    setVariable('$guid', 'x')
    setVariable('has space', 'x')
    setVariable('', 'x')
    expect(variablesCollection.size).toBe(0)
  })

  it('removes a variable', () => {
    setVariable('token', 'abc')
    removeVariable(findVariable('token')!.id)
    expect(findVariable('token')).toBeUndefined()
  })
  it('loads a value another tab wrote', async () => {
    // Another tab: its own connection and collection on the same database.
    const db = await createIndexedDB({
      name: 'xml-editor',
      version: 1,
      stores: ['variables'],
    })
    const other = createCollection(
      indexedDBCollectionOptions({
        db,
        name: 'variables',
        id: 'other-tab-variables',
        schema: variableSchema,
        getKey: (item) => item.id,
      }),
    )
    await other.preload()
    await other.insert({
      id: 'v1',
      name: 'host',
      value: 'dev',
      createdAt: 1,
      profileId: 'default',
    }).isPersisted.promise
    await vi.waitFor(() => expect(findVariable('host')?.value).toBe('dev'))
    await other.cleanup()
    db.close()
  })
})
