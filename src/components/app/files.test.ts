import { describe, expect, it } from 'vitest'

import { survivor } from './files'

describe('survivor', () => {
  const open = ['a', 'b', 'c', 'd', 'e']

  it('prefers the nearest tab to the right that stays open', () => {
    expect(survivor(open, new Set(['b', 'c']), 'b')).toBe('d')
  })

  it('falls back to the left when everything to the right closes', () => {
    expect(survivor(open, new Set(['c', 'd', 'e']), 'd')).toBe('b')
  })

  it('returns nothing when every tab closes', () => {
    expect(survivor(open, new Set(open), 'c')).toBeUndefined()
  })
})
