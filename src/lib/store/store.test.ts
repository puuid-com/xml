import { beforeEach, describe, expect, it } from 'vitest'

import {
  closeFile,
  createFile,
  filesCollection,
  reorderFile,
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
  highlightCss,
  highlightsCollection,
  nextPreset,
  setHighlight,
} from './highlights'
import { findPin, pinTag, pinsCollection, togglePin, unpinTag } from './pins'

function openOrder() {
  return [...filesCollection.values()]
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

  it('deletes the file when its tab closes', () => {
    const a = createFile('a.xml', '<a/>')
    createFile('b.xml')
    closeFile(a.id)
    expect(openOrder()).toEqual(['b.xml'])
    expect(filesCollection.has(a.id)).toBe(false)
    expect(localStorage.getItem('xml-editor:files')).not.toContain('a.xml')
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

  it('persists to localStorage', () => {
    createFile('saved.xml', '<a/>')
    expect(localStorage.getItem('xml-editor:files')).toContain('saved.xml')
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

  it('toggles a pin', () => {
    togglePin('currency')
    expect(findPin('currency')).toBeDefined()
    togglePin('currency')
    expect(findPin('currency')).toBeUndefined()
  })
})
