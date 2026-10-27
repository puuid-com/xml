import { sameName } from '#/lib/names'

// Tags a profile marks as holding a ZPL label, base64-encoded, open in the
// ZPL editor at zpl.puuid.com, which decodes a `base64` query parameter.

export const ZPL_VIEWER_URL = 'https://zpl.puuid.com/'

/** Whether `name` is one of the tags marked as ZPL labels. */
export function isZplTag(tags: ReadonlyArray<string>, name: string) {
  return tags.some((tag) => sameName(tag, name))
}

/** Link that opens a base64 ZPL label in the viewer, or null when empty. */
export function zplViewerUrl(base64: string) {
  // Base64 wrapped over several lines still decodes once joined.
  const data = base64.replace(/\s+/g, '')
  if (!data) return null
  const url = new URL(ZPL_VIEWER_URL)
  url.searchParams.set('base64', data)
  return url.toString()
}

/** Opens a base64 ZPL label in the viewer in a new tab. */
export function openZplLabel(base64: string) {
  const url = zplViewerUrl(base64)
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}
