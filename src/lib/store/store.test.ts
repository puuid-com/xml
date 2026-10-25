import { beforeEach, describe, expect, it } from 'vitest'

import {
  closeFile,
  createFile,
  filesCollection,
  openFile,
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

function openOrder() {
  return [...filesCollection.values()]
    .filter((f) => f.open)
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

  it('closes and reopens tabs at the end', () => {
    const a = createFile('a.xml')
    createFile('b.xml')
    closeFile(a.id)
    expect(openOrder()).toEqual(['b.xml'])
    openFile(a.id)
    expect(openOrder()).toEqual(['b.xml', 'a.xml'])
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
