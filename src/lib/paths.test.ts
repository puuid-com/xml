import { describe, expect, it } from 'vitest'

import { parseJson } from './json/parse'
import { formatPath, pathFormats } from './paths'
import { elementByPath } from './xml/locate'
import { parseXml } from './xml/parse'
import type { PathFormat } from './paths'
import type { XmlDocument } from './xml/model'

function pathOf(doc: XmlDocument, path: string, format: PathFormat) {
  const el = elementByPath(doc.nodes, path)
  if (!el) throw new Error(`No element at ${path}`)
  return formatPath(doc.nodes, el, format)
}

describe('xpath', () => {
  const doc = parseXml(
    '<root><item><name>a</name></item><item><name>b</name><id/></item></root>',
  )

  it('adds a position only when siblings share the name', () => {
    expect(pathOf(doc, '/root[1]', 'xpath')).toBe('/root')
    expect(pathOf(doc, '/root[1]/item[2]/name[1]', 'xpath')).toBe(
      '/root/item[2]/name',
    )
    expect(pathOf(doc, '/root[1]/item[2]/id[1]', 'xpath')).toBe(
      '/root/item[2]/id',
    )
  })

  it('selects names in a default namespace by local name', () => {
    const ns = parseXml(
      '<p:root xmlns="urn:a" xmlns:p="urn:p"><a/><a/><p:b/></p:root>',
    )
    expect(pathOf(ns, '/p:root[1]/a[2]', 'xpath')).toBe(
      "/p:root/*[local-name()='a'][2]",
    )
    expect(pathOf(ns, '/p:root[1]/p:b[1]', 'xpath')).toBe('/p:root/p:b')
    const reset = parseXml('<r xmlns="urn:a"><s xmlns=""><t/></s></r>')
    expect(pathOf(reset, '/r[1]/s[1]/t[1]', 'xpath')).toBe(
      "/*[local-name()='r']/s/t",
    )
  })

  it('is the only format for XML', () => {
    expect(pathFormats(doc.root!)).toEqual(['xpath'])
  })
})

describe('json paths', () => {
  const doc = parseJson(
    '{"store": {"book": [{"title": "x"}], "a/b~c": 1, "it\'s \\\\ ok": 2, "1st": 3}}',
  )

  it('builds JSON Pointers with ~0 and ~1 escapes', () => {
    expect(pathOf(doc, '/store[1]/book[1]/0[1]/title[1]', 'json-pointer')).toBe(
      '/store/book/0/title',
    )
    expect(pathOf(doc, '/store[1]/a%2Fb~c[1]', 'json-pointer')).toBe(
      '/store/a~1b~0c',
    )
  })

  it('builds JSONPath queries, bracketing keys the shorthand cannot hold', () => {
    expect(pathOf(doc, '/store[1]/book[1]/0[1]/title[1]', 'jsonpath')).toBe(
      '$.store.book[0].title',
    )
    expect(pathOf(doc, '/store[1]/a%2Fb~c[1]', 'jsonpath')).toBe(
      "$.store['a/b~c']",
    )
    expect(pathOf(doc, "/store[1]/it's \\ ok[1]", 'jsonpath')).toBe(
      "$.store['it\\'s \\\\ ok']",
    )
    expect(pathOf(doc, '/store[1]/1st[1]', 'jsonpath')).toBe("$.store['1st']")
  })

  it('escapes control characters in JSONPath strings', () => {
    const tabs = parseJson('{"a\\tb\\u0001": 1}')
    expect(pathOf(tabs, '/a\tb\u0001[1]', 'jsonpath')).toBe("$['a\\tb\\u0001']")
  })

  it('offers JSONPath and JSON Pointer for JSON', () => {
    const store = elementByPath(doc.nodes, '/store[1]')!
    expect(pathFormats(store)).toEqual(['jsonpath', 'json-pointer'])
  })
})
