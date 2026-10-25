import { describe, expect, it } from 'vitest'

import {
  defaultChanges,
  defaultKeys,
  defaultMatches,
  defaultSummary,
} from './defaults'
import { parseJson } from '#/lib/json/parse'
import { parseXml } from './parse'
import type { TextChange } from './edit'
import type { DefaultRule } from './defaults'

function apply(text: string, changes: Array<TextChange>) {
  return [...changes]
    .sort((a, b) => b.from - a.from)
    .reduce((acc, c) => acc.slice(0, c.from) + c.insert + acc.slice(c.to), text)
}

function run(text: string, rules: Array<DefaultRule>) {
  return apply(text, defaultChanges(parseXml(text).nodes, rules))
}

describe('defaults', () => {
  it('sets every matching leaf element', () => {
    const text = '<r><id>1</id><x><id>2</id></x><id/></r>'
    expect(run(text, [{ key: 'id', value: '<<id>>' }])).toBe(
      '<r><id><<id>></id><x><id><<id>></id></x><id><<id>></id></r>',
    )
  })

  it('leaves elements with children alone', () => {
    const text = '<r><a><b>1</b></a></r>'
    expect(run(text, [{ key: 'a', value: 'x' }])).toBe(text)
  })

  it('sets attributes with @name and escapes values', () => {
    const text = `<r><a v="1"/><b v='2' w="3"/></r>`
    expect(run(text, [{ key: '@v', value: 'a&"b' }])).toBe(
      `<r><a v="a&amp;&quot;b"/><b v='a&amp;"b' w="3"/></r>`,
    )
  })

  it('applies element and attribute rules together', () => {
    const text = '<r><a v="1">old</a></r>'
    expect(
      run(text, [
        { key: 'a', value: 'new' },
        { key: '@v', value: '2' },
      ]),
    ).toBe('<r><a v="2">new</a></r>')
  })

  it('returns no changes when values already match', () => {
    const text = '<r><a v="2">new</a></r>'
    const rules = [
      { key: 'a', value: 'new' },
      { key: '@v', value: '2' },
    ]
    expect(defaultChanges(parseXml(text).nodes, rules)).toEqual([])
  })

  it('summarizes how many values each rule changes', () => {
    const text = '<r v="1"><a>x</a><a>y</a><a/><b>z</b></r>'
    const summary = defaultSummary(parseXml(text).nodes, [
      { key: 'a', value: 'x' },
      { key: 'b', value: 'z' },
      { key: '@v', value: '2' },
    ])
    expect(summary).toEqual([
      { key: 'a', value: 'x', count: 2 },
      { key: '@v', value: '2', count: 1 },
    ])
  })

  it('lists leaf names and attributes as keys', () => {
    const text = '<r id="1"><a/><b x="1">t</b></r>'
    expect(defaultKeys(parseXml(text).nodes)).toEqual(['@id', '@x', 'a', 'b'])
  })

  it('finds values that already match their default', () => {
    const text = '<r v="1" w="2"><a>x</a><a>y</a><b><a>x</a></b></r>'
    const matches = defaultMatches(parseXml(text).nodes, [
      { key: 'a', value: 'x' },
      { key: 'b', value: 'x' },
      { key: '@v', value: '1' },
    ])
    expect(
      matches.map((m) => [m.key, text.slice(m.from, m.to), m.differs]),
    ).toEqual([
      ['@v', '1', false],
      ['a', 'x', false],
      ['a', 'y', true],
      ['a', 'x', false],
    ])
  })

  it('flags values that differ from their default', () => {
    const text = '<r v="2"><a>y</a><c v="1"/></r>'
    const matches = defaultMatches(parseXml(text).nodes, [
      { key: 'a', value: 'x' },
      { key: '@v', value: '1' },
    ])
    expect(
      matches.map((m) => [m.key, text.slice(m.from, m.to), m.differs]),
    ).toEqual([
      ['@v', '2', true],
      ['a', 'y', true],
      ['@v', '1', false],
    ])
  })

  it('skips empty values and marks JSON strings without quotes', () => {
    expect(
      defaultMatches(parseXml('<r><a/><a></a></r>').nodes, [
        { key: 'a', value: '' },
      ]),
    ).toEqual([])
    const json = '{"a": "x", "n": 1, "l": ["x"]}'
    const matches = defaultMatches(parseJson(json).nodes, [
      { key: 'a', value: 'x' },
      { key: 'n', value: '1' },
    ])
    expect(matches.map((m) => json.slice(m.from, m.to))).toEqual(['x', '1'])
  })
})
