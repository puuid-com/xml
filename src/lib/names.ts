// Profile rules (highlights, pins, sort orders, default values) name tags
// without their namespace prefix, so a rule for `Body` covers `soap:Body`,
// `s:Body` and plain `Body` alike, whatever prefix a file happens to use.

/** A tag or `@attribute` name without its prefix: `soap:Body` → `Body`. */
export function localName(name: string): string {
  if (name.startsWith('@')) return `@${localName(name.slice(1))}`
  const colon = name.lastIndexOf(':')
  return colon > 0 && colon < name.length - 1 ? name.slice(colon + 1) : name
}

/** Whether two names match once their prefixes are dropped. */
export function sameName(a: string, b: string) {
  return localName(a) === localName(b)
}
