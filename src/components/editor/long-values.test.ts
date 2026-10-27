import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { languageExtension } from './language'
import { longValues } from './long-values'

function stateOf(doc: string, language: 'xml' | 'json' = 'xml') {
  return EditorState.create({ doc, extensions: languageExtension(language) })
}

describe('longValues', () => {
  it('finds XML text over the limit, without surrounding whitespace', () => {
    const long = 'x'.repeat(50)
    const doc = `<a>\n  <b>${long}</b>\n  <c>short</c>\n  <d>\n    ${long}\n  </d>\n</a>`
    const values = longValues(stateOf(doc), 40)
    expect(values.map((v) => v.text)).toEqual([long, long])
    for (const value of values) {
      expect(doc.slice(value.from, value.to)).toBe(long)
    }
  })

  it('finds JSON string values but not keys', () => {
    const long = 'y'.repeat(50)
    const doc = `{"${long}": "${long}\\n", "k": "v"}`
    const [value, ...rest] = longValues(stateOf(doc, 'json'), 40)
    expect(rest).toEqual([])
    expect(value.text).toBe(`${long}\n`)
    expect(doc.slice(value.from, value.to)).toBe(`${long}\\n`)
  })

  it('finds nothing when the limit is 0', () => {
    expect(longValues(stateOf(`<a>${'z'.repeat(500)}</a>`), 0)).toEqual([])
  })
})
