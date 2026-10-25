import { describe, expect, it } from 'vitest'

import { treeKeyAction } from './tree-keys'
import { flattenVisible } from '#/lib/xml/locate'
import { parseXml } from '#/lib/xml/parse'

const XML = '<a><b><c>1</c></b><d>2</d></a>'

function rowsOf(collapsed: Array<string> = []) {
  return flattenVisible(parseXml(XML).nodes, new Set(collapsed))
}

describe('treeKeyAction', () => {
  const rows = rowsOf()
  const names = rows.map((r) => r.el.name)
  const at = (name: string) => names.indexOf(name)

  it('moves between visible rows with Up, Down, Home and End', () => {
    expect(names).toEqual(['a', 'b', 'c', 'd'])
    expect(treeKeyAction(rows, at('b'), 'ArrowDown')).toEqual({
      type: 'focus',
      index: at('c'),
    })
    expect(treeKeyAction(rows, at('b'), 'ArrowUp')).toEqual({
      type: 'focus',
      index: at('a'),
    })
    expect(treeKeyAction(rows, at('c'), 'Home')).toEqual({
      type: 'focus',
      index: 0,
    })
    expect(treeKeyAction(rows, at('a'), 'End')).toEqual({
      type: 'focus',
      index: at('d'),
    })
  })

  it('stops at the ends', () => {
    expect(treeKeyAction(rows, 0, 'ArrowUp')).toBeNull()
    expect(treeKeyAction(rows, rows.length - 1, 'ArrowDown')).toBeNull()
  })

  it('expands a collapsed row, then steps into its first child', () => {
    const closed = rowsOf([rows[at('b')].el.path])
    expect(closed.map((r) => r.el.name)).toEqual(['a', 'b', 'd'])
    expect(treeKeyAction(closed, 1, 'ArrowRight')).toEqual({
      type: 'expand',
      index: 1,
    })
    expect(treeKeyAction(rows, at('b'), 'ArrowRight')).toEqual({
      type: 'focus',
      index: at('c'),
    })
    expect(treeKeyAction(rows, at('c'), 'ArrowRight')).toBeNull()
  })

  it('collapses an expanded row, otherwise moves to the parent', () => {
    expect(treeKeyAction(rows, at('b'), 'ArrowLeft')).toEqual({
      type: 'collapse',
      index: at('b'),
    })
    expect(treeKeyAction(rows, at('c'), 'ArrowLeft')).toEqual({
      type: 'focus',
      index: at('b'),
    })
    expect(treeKeyAction(rows, at('d'), 'ArrowLeft')).toEqual({
      type: 'focus',
      index: at('a'),
    })
    const closed = rowsOf([rows[0].el.path])
    expect(treeKeyAction(closed, 0, 'ArrowLeft')).toBeNull()
  })

  it('reveals on Enter and edits on F2', () => {
    expect(treeKeyAction(rows, at('c'), 'Enter')).toEqual({
      type: 'reveal',
      index: at('c'),
    })
    expect(treeKeyAction(rows, at('c'), 'F2')).toEqual({
      type: 'edit',
      index: at('c'),
    })
    expect(treeKeyAction(rows, at('c'), 'x')).toBeNull()
  })
})
