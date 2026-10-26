import { describe, expect, it } from 'vitest'

import { appendNames, documentNames, moveItem } from './sort-order'
import { parseXml } from './xml/parse'

describe('sort order', () => {
  it('moves an item', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b', 'c'], 1, 9)).toEqual(['a', 'c', 'b'])
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })

  it('appends new names once, trimmed', () => {
    expect(appendNames(['a'], [' b ', 'a', '', 'b', 'c'])).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('appends names without their prefix', () => {
    expect(
      appendNames(['Body'], ['soap:Body', 'ns:Header', '@xsi:type']),
    ).toEqual(['Body', 'Header', '@type'])
  })

  it('lists unprefixed names', () => {
    const doc = parseXml('<s:r xsi:type="t"><a:b/><b/></s:r>')
    expect(documentNames(doc.nodes)).toEqual(['r', '@type', 'b'])
  })

  it('lists names in the order they first appear', () => {
    const doc = parseXml('<r id="1"><b k="x"/><a/><b k="y" id="2"/></r>')
    expect(documentNames(doc.nodes)).toEqual(['r', '@id', 'b', '@k', 'a'])
  })
})
