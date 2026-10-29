import { splitVars } from './vars'

const NAMED = new Map([
  ['lt', '<'],
  ['gt', '>'],
  ['amp', '&'],
  ['quot', '"'],
  ['apos', "'"],
])

/** Decodes the five predefined entities and character references. */
export function decodeEntities(raw: string): string {
  if (!raw.includes('&')) return raw
  return raw.replace(
    /&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z_][\w.-]*);/g,
    (whole, ref: string) => {
      if (ref.startsWith('#x'))
        return safeCodePoint(parseInt(ref.slice(2), 16), whole)
      if (ref.startsWith('#'))
        return safeCodePoint(parseInt(ref.slice(1), 10), whole)
      return NAMED.get(ref) ?? whole
    },
  )
}

function safeCodePoint(code: number, fallback: string) {
  try {
    return String.fromCodePoint(code)
  } catch {
    return fallback
  }
}

/** Escapes text content, leaving `<<var>>` placeholders untouched. */
export function escapeText(value: string): string {
  return splitVars(value)
    .map((part) =>
      part.kind === 'var'
        ? part.value
        : part.value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;'),
    )
    .join('')
}

/** Escapes an attribute value for the given quote character. */
export function escapeAttr(value: string, quote: '"' | "'" = '"'): string {
  return splitVars(value)
    .map((part) => {
      if (part.kind === 'var') return part.value
      const escaped = part.value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
      return quote === '"'
        ? escaped.replaceAll('"', '&quot;')
        : escaped.replaceAll("'", '&apos;')
    })
    .join('')
}
