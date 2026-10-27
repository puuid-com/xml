import { describe, expect, it } from 'vitest'

import {
  MAX_DECODED_BYTES,
  MAX_LINK_LENGTH,
  ShareError,
  decodeShare,
  deflateToBase64Url,
  encodeShare,
} from './share'

async function deflate(text: string) {
  return '#share=' + (await deflateToBase64Url(new TextEncoder().encode(text)))
}

describe('share links', () => {
  it('round-trips a file', async () => {
    const file = { name: 'order.xml', content: '<a>é ✓ "x"</a>\n' }
    const hash = await encodeShare(file)
    expect(hash).toMatch(/^#share=[\w-]+$/)
    await expect(decodeShare(hash)).resolves.toEqual(file)
  })

  it('carries a profile, and still opens links without one', async () => {
    const profile = {
      id: 'p1',
      name: 'Work',
      color: '#00aa88',
      format: {
        formatOnSave: false,
        removeEmptyLines: true,
        trimVars: false,
        stripPrefixes: false,
        sort: 'custom' as const,
        customOrder: ['b', '@a'],
        highlightedFirst: false,
        shortenValues: true,
        shortenAt: 200,
        zplTags: ['label'],
      },
      highlights: [{ tag: 'b', color: 'red', enabled: true }],
      pins: ['c'],
      defaults: [{ key: '@a', value: '1', enabled: false }],
      variables: [{ name: 'host', value: 'x' }],
    }
    const file = { name: 'a.xml', content: '<a/>', profile }
    await expect(decodeShare(await encodeShare(file))).resolves.toEqual(file)
    const old = await deflate(JSON.stringify({ name: 'a.xml', content: '' }))
    await expect(decodeShare(old)).resolves.toEqual({
      name: 'a.xml',
      content: '',
    })
    const bad = await deflate(
      JSON.stringify({ ...file, profile: { ...profile, color: 'url(x)' } }),
    )
    await expect(decodeShare(bad)).rejects.toMatchObject({ reason: 'invalid' })
  })

  it('rejects malformed links', async () => {
    await expect(decodeShare('#share=not*base64')).rejects.toBeInstanceOf(
      ShareError,
    )
    await expect(decodeShare('#share=AAAA')).rejects.toMatchObject({
      reason: 'invalid',
    })
    await expect(decodeShare('#other')).rejects.toMatchObject({
      reason: 'invalid',
    })
  })

  it('rejects payloads that fail validation', async () => {
    const hash = await deflate(JSON.stringify({ name: '', content: 1 }))
    await expect(decodeShare(hash)).rejects.toMatchObject({ reason: 'invalid' })
  })

  it('rejects links over the length limit', async () => {
    const hash = '#share=' + 'A'.repeat(MAX_LINK_LENGTH)
    await expect(decodeShare(hash)).rejects.toMatchObject({
      reason: 'too-long',
    })
  })

  it('stops decompressing past the size cap', async () => {
    const bomb = await deflate(
      JSON.stringify({ name: 'a', content: 'x'.repeat(MAX_DECODED_BYTES * 2) }),
    )
    expect(bomb.length).toBeLessThan(MAX_LINK_LENGTH)
    await expect(decodeShare(bomb)).rejects.toMatchObject({
      reason: 'too-long',
    })
  })

  it('refuses to encode a file too large to share', async () => {
    const content = Array.from({ length: 200_000 }, () =>
      Math.random().toString(36),
    ).join('')
    await expect(
      encodeShare({ name: 'big.xml', content }),
    ).rejects.toMatchObject({
      reason: 'too-long',
    })
  })
})
