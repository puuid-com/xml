import { diff } from '@codemirror/merge'
import { describe, expect, it } from 'vitest'

import { DIFF_CONFIG, compareTexts, lineDiff } from './compare'
import type { Change } from '@codemirror/merge'

const options = { removeEmptyLines: true, sort: 'none' as const }

function records(count: number, change = (i: number) => String(i)) {
  const rows = Array.from(
    { length: count },
    (_, i) =>
      `  <record id="${i}">\n    <name>Item ${change(i)}</name>\n    <qty>${i % 7}</qty>\n  </record>`,
  )
  return `<records>\n${rows.join('\n')}\n</records>\n`
}

describe('compareTexts', () => {
  it('keeps both sides as written by default', () => {
    const a = { name: 'a.xml', content: '<r><a>1</a></r>' }
    const b = { name: 'b.xml', content: '<r>\n  <a>1</a>\n</r>' }
    expect(compareTexts(a, b, false, options)).toEqual({
      a: a.content,
      b: b.content,
      formatted: false,
      unparsed: null,
    })
  })

  it('shows no differences for the same XML formatted differently', () => {
    const a = { name: 'a.xml', content: '<r><a  x="1"/><b>t</b></r>' }
    const b = {
      name: 'b.xml',
      content: '<r>\n\n    <a x="1" />\n\t<b>t</b>\n</r>\n',
    }
    const result = compareTexts(a, b, true, options)
    expect(result.formatted).toBe(true)
    expect(result.a).toBe(result.b)
    expect(diff(result.a, result.b)).toEqual([])
  })

  it('shows no differences for the same JSON formatted differently', () => {
    const a = { name: 'a.json', content: '{"a":1,"b":[1,2]}' }
    const b = { name: 'b.json', content: '{\n "a" : 1,\n "b" : [ 1, 2 ]\n}' }
    const result = compareTexts(a, b, true, options)
    expect(result.a).toBe(result.b)
  })

  it('still marks real changes once formatted', () => {
    const a = { name: 'a.xml', content: '<r><a>1</a><b>2</b></r>' }
    const b = { name: 'b.xml', content: '<r>\n  <a>1</a>\n  <b>3</b>\n</r>' }
    const result = compareTexts(a, b, true, options)
    const changes = diff(result.a, result.b)
    expect(changes).toHaveLength(1)
    const [change] = changes
    expect(result.a.slice(change.fromA, change.toA)).toBe('2')
    expect(result.b.slice(change.fromB, change.toB)).toBe('3')
  })

  it('formats with the given options', () => {
    const a = { name: 'a.xml', content: '<r><b>1</b><a>2</a></r>' }
    const b = { name: 'b.xml', content: '<r><a>2</a><b>1</b></r>' }
    expect(compareTexts(a, b, true, options).a).not.toBe(
      compareTexts(a, b, true, options).b,
    )
    const sorted = compareTexts(a, b, true, { ...options, sort: 'asc' })
    expect(sorted.a).toBe(sorted.b)
  })

  it('falls back to the raw texts when a side does not parse', () => {
    const a = { name: 'a.xml', content: '<r><a>1</a></r>' }
    const b = { name: 'broken.xml', content: '<r><a>1</r>' }
    expect(compareTexts(a, b, true, options)).toEqual({
      a: a.content,
      b: b.content,
      formatted: false,
      unparsed: 'broken.xml',
    })
  })
})

/** Rebuilds `b` from `a` and the changes, to check they are consistent. */
function apply(a: string, b: string, changes: ReadonlyArray<Change>) {
  let out = ''
  let pos = 0
  for (const c of changes) {
    out += a.slice(pos, c.fromA) + b.slice(c.fromB, c.toB)
    pos = c.toA
  }
  return out + a.slice(pos)
}

describe('lineDiff', () => {
  it('marks the changed characters inside changed lines', () => {
    const a = '<r>\n  <a>one</a>\n  <b>2</b>\n</r>'
    const b = '<r>\n  <a>two</a>\n  <b>2</b>\n  <c/>\n</r>'
    const changes = lineDiff(a, b)
    expect(apply(a, b, changes)).toBe(b)
    expect(
      changes.map((c) => [a.slice(c.fromA, c.toA), b.slice(c.fromB, c.toB)]),
    ).toEqual([
      ['', 'tw'],
      ['ne', ''],
      ['', '  <c/>\n'],
    ])
  })

  it('handles empty sides and a missing final newline', () => {
    for (const [a, b] of [
      ['', '<r/>'],
      ['<r/>', ''],
      ['<r>\n</r>', '<r>\n</r>\n'],
    ]) {
      expect(apply(a, b, lineDiff(a, b))).toBe(b)
    }
  })
})

describe('diffing large files', () => {
  it('finds a few changes in a large file quickly', () => {
    const a = records(20_000)
    const b = records(20_000, (i) =>
      i % 5000 === 0 ? `${i} (edited)` : `${i}`,
    )
    expect(a.length).toBeGreaterThan(1_500_000)
    const start = performance.now()
    const changes = diff(a, b, DIFF_CONFIG)
    expect(performance.now() - start).toBeLessThan(1000)
    expect(changes).toHaveLength(4)
    expect(apply(a, b, changes)).toBe(b)
  })

  it('keeps many small edits apart', () => {
    const a = records(20_000)
    const b = records(20_000, (i) => (i % 50 === 0 ? `${i}x` : `${i}`))
    const changes = diff(a, b, DIFF_CONFIG)
    expect(changes).toHaveLength(400)
    expect(apply(a, b, changes)).toBe(b)
  })

  it('gives up on precision instead of stalling on very different files', () => {
    const a = records(20_000)
    const b = records(20_000, (i) => `${(i * 7919) % 20_000}`)
    const start = performance.now()
    const changes = diff(a, b, DIFF_CONFIG)
    expect(performance.now() - start).toBeLessThan(2000)
    expect(apply(a, b, changes)).toBe(b)
  })
})
