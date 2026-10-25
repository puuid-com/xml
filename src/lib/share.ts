import { z } from 'zod'

/** Links longer than this are refused, both when copying and when opening. */
export const MAX_LINK_LENGTH = 64_000
/** Decompression stops past this many bytes, so a small link can't inflate unbounded. */
export const MAX_DECODED_BYTES = 1_000_000

const PREFIX = '#share='

const shareSchema = z.object({
  name: z.string().trim().min(1).max(255),
  content: z.string(),
})

export type SharedFile = z.infer<typeof shareSchema>

export class ShareError extends Error {
  constructor(readonly reason: 'too-long' | 'invalid') {
    super(`Share link ${reason}`)
  }
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string) {
  if (!/^[\w-]*$/.test(text)) throw new ShareError('invalid')
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function readAll(stream: ReadableStream<Uint8Array>, limit: number) {
  const reader = stream.getReader()
  const chunks: Array<Uint8Array> = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw new ShareError('too-long')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

function pipe(
  bytes: Uint8Array<ArrayBuffer>,
  transform: CompressionStream | DecompressionStream,
) {
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
  return source.pipeThrough(transform)
}

/** Returns the `#share=…` fragment for a file. Throws `ShareError('too-long')` past the link limit. */
/** Base64url of deflate-raw bytes, exported for tests that craft links. */
export async function deflateToBase64Url(bytes: Uint8Array<ArrayBuffer>) {
  const compressed = await readAll(
    pipe(bytes, new CompressionStream('deflate-raw')),
    Number.POSITIVE_INFINITY,
  )
  return toBase64Url(compressed)
}

export async function encodeShare(file: SharedFile) {
  const json = new TextEncoder().encode(JSON.stringify(shareSchema.parse(file)))
  if (json.byteLength > MAX_DECODED_BYTES) throw new ShareError('too-long')
  const hash = PREFIX + (await deflateToBase64Url(json))
  if (hash.length > MAX_LINK_LENGTH) throw new ShareError('too-long')
  return hash
}

/** True when the fragment carries a shared file. */
export function isShareHash(hash: string) {
  return hash.startsWith(PREFIX)
}

/** Reads a `#share=…` fragment. Throws `ShareError` for a broken or oversized link. */
export async function decodeShare(hash: string): Promise<SharedFile> {
  if (!isShareHash(hash)) throw new ShareError('invalid')
  if (hash.length > MAX_LINK_LENGTH) throw new ShareError('too-long')
  let json: unknown
  try {
    const bytes = await readAll(
      pipe(
        fromBase64Url(hash.slice(PREFIX.length)),
        new DecompressionStream('deflate-raw'),
      ),
      MAX_DECODED_BYTES,
    )
    json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch (error) {
    if (error instanceof ShareError) throw error
    throw new ShareError('invalid')
  }
  const parsed = shareSchema.safeParse(json)
  if (!parsed.success) throw new ShareError('invalid')
  return parsed.data
}
