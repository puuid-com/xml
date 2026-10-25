import { describe, expect, it } from 'vitest'

import { searchTree } from './tree-search'
import { parseDocument } from '#/lib/document'

const xml = parseDocument(
  '<catalog><item id="A1"><name>Tea &amp; coffee</name><price>12</price></item><item category="tools"><name>Hammer</name></item></catalog>',
  'xml',
)

describe('structure search', () => {
  it('matches decoded values without including unrelated siblings', () => {
    const result = searchTree(xml.nodes, ' TEA & ', new Set())
    expect(result.rows.map(({ el }) => el.name)).toEqual([
      'catalog',
      'item',
      'name',
    ])
    expect(result.matches.size).toBe(1)
    expect(result.rows.map((row) => row.hasChildren)).toEqual([
      true,
      true,
      false,
    ])
  })

  it('searches tag names, attribute names, and attribute values', () => {
    for (const query of ['category', 'TOOLS']) {
      const result = searchTree(xml.nodes, query, new Set())
      expect(result.rows.map(({ el }) => el.name)).toEqual(['catalog', 'item'])
      expect(result.matches.size).toBe(1)
      expect(result.rows[1].hasChildren).toBe(false)
    }
    expect(searchTree(xml.nodes, 'name', new Set()).matches.size).toBe(2)
  })

  it('keeps search collapse separate and restores the unfiltered tree', () => {
    const collapsed = new Set([xml.root!.path])
    expect(searchTree(xml.nodes, '', collapsed).rows).toHaveLength(1)
    expect(searchTree(xml.nodes, 'Hammer', new Set()).rows).toHaveLength(3)
    const filtered = searchTree(xml.nodes, 'Hammer', collapsed)
    expect(filtered.rows).toHaveLength(1)
    expect(filtered.matches.size).toBe(1)
    expect(searchTree(xml.nodes, '  ', collapsed).rows).toHaveLength(1)
  })

  it('handles JSON keys containing slashes, arrays, and scalar values', () => {
    const json = parseDocument(
      '{"a/b":{"items":[{"enabled":false},{"label":"Needle"}]}}',
      'json',
    )
    const result = searchTree(json.nodes, 'needle', new Set())
    expect(result.rows.some(({ el }) => el.name === 'a/b')).toBe(true)
    expect(result.rows.at(-1)?.el.name).toBe('label')
    expect(result.matches.size).toBe(1)
    expect(searchTree(json.nodes, 'false', new Set()).matches.size).toBe(1)
  })

  it('returns no rows for an unmatched query or empty document', () => {
    expect(searchTree(xml.nodes, 'missing', new Set()).rows).toEqual([])
    expect(searchTree([], 'anything', new Set()).matches.size).toBe(0)
  })

  it('retains the actively edited row after its value no longer matches', () => {
    const initial = searchTree(xml.nodes, 'Hammer', new Set())
    const editingPath = initial.rows.at(-1)!.el.path
    const changed = parseDocument(
      '<catalog><item id="A1"><name>Tea &amp; coffee</name><price>12</price></item><item category="tools"><name>Mallet</name></item></catalog>',
      'xml',
    )
    const editing = searchTree(changed.nodes, 'Hammer', new Set(), editingPath)
    expect(editing.rows.at(-1)?.el.path).toBe(editingPath)
    expect(editing.rows).toHaveLength(3)
    expect(editing.matches.size).toBe(0)
    expect(searchTree(changed.nodes, 'Hammer', new Set()).rows).toHaveLength(0)
  })
})
