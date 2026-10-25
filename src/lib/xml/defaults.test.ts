import { describe, expect, it } from 'vitest'

import { defaultChanges, defaultKeys } from './defaults'
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

  it('lists leaf names and attributes as keys', () => {
    const text = '<r id="1"><a/><b x="1">t</b></r>'
    expect(defaultKeys(parseXml(text).nodes)).toEqual(['@id', '@x', 'a', 'b'])
  })
})
