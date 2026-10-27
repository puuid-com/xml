import { describe, expect, it } from 'vitest'

import { HIGHLIGHT_PRESETS, swatchColors } from './colors'

describe('swatchColors', () => {
  it('lists the presets when nothing is used', () => {
    expect(swatchColors([])).toEqual([...HIGHLIGHT_PRESETS])
  })

  it('puts used colours first, then the remaining presets', () => {
    expect(swatchColors(['green', '#ABCDEF', 'green', '#abcdef'])).toEqual([
      'green',
      '#ABCDEF',
      ...HIGHLIGHT_PRESETS.filter((p) => p !== 'green'),
    ])
  })
})
