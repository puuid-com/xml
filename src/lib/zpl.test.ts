import { describe, expect, it } from 'vitest'

import { isZplTag, zplViewerUrl } from './zpl'

describe('zpl', () => {
  it('matches tags without their prefix', () => {
    expect(isZplTag(['Label'], 'ns:Label')).toBe(true)
    expect(isZplTag(['Label'], 'Other')).toBe(false)
  })

  it('links a label through the base64 query parameter', () => {
    expect(zplViewerUrl(' XlhB\n XkZE+/= ')).toBe(
      'https://zpl.puuid.com/?base64=XlhBXkZE%2B%2F%3D',
    )
    expect(zplViewerUrl(' \n')).toBeNull()
  })
})
