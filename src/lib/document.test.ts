import { describe, expect, it } from 'vitest'

import { detectLanguage, typedName, untypedName } from './document'

describe('detectLanguage', () => {
  it('reads XML, JSON and flat files from their content', () => {
    expect(detectLanguage('\n  <invoice/>')).toBe('xml')
    expect(detectLanguage(' {"a": 1}')).toBe('json')
    expect(detectLanguage('[1, 2]')).toBe('json')
  })

  it('gives up on content with nothing to go by', () => {
    expect(detectLanguage('hello')).toBeNull()
    expect(detectLanguage('')).toBeNull()
  })
})

describe('untypedName', () => {
  it('drops the extension that gives the type', () => {
    expect(untypedName('invoice.xml')).toBe('invoice')
    expect(untypedName('data.JSON')).toBe('data')
    expect(untypedName('records.txt')).toBe('records')
  })

  it('keeps names without a type extension', () => {
    expect(untypedName('untitled')).toBe('untitled')
    expect(untypedName('notes.md')).toBe('notes.md')
    expect(untypedName('.xml')).toBe('.xml')
  })
})

describe('typedName', () => {
  it('adds or swaps the extension for the type', () => {
    expect(typedName('untitled', 'xml')).toBe('untitled.xml')
    expect(typedName('invoice.xml', 'json')).toBe('invoice.json')
    expect(typedName('data.json', 'flat')).toBe('data.txt')
  })

  it('keeps an extension that already reads as the type', () => {
    expect(typedName('icon.svg', 'xml')).toBe('icon.svg')
    expect(typedName('site.webmanifest', 'json')).toBe('site.webmanifest')
    expect(typedName('batch.dat', 'flat')).toBe('batch.dat')
  })
})
