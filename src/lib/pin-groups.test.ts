import { describe, expect, it } from 'vitest'

import { groupPins } from './pin-groups'

describe('groupPins', () => {
  const colors: Record<string, string | undefined> = {
    a: 'var(--hl-blue)',
    b: '#FF0000',
    c: 'var(--hl-blue)',
    d: undefined,
    e: '#ff0000',
  }
  const colorOf = (tag: string) => colors[tag]

  it('groups by colour in order of first appearance, uncoloured last', () => {
    expect(groupPins(['d', 'b', 'a', 'e', 'c'], colorOf)).toEqual([
      ['b', 'e'],
      ['a', 'c'],
      ['d'],
    ])
  })

  it('keeps pin order inside a group', () => {
    expect(groupPins(['c', 'a'], colorOf)).toEqual([['c', 'a']])
  })

  it('returns no groups for no pins', () => {
    expect(groupPins([], colorOf)).toEqual([])
  })
})
