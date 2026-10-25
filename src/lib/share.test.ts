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
