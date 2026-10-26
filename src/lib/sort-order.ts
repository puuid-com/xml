import { localName } from './names'
import { allElements } from './xml/locate'
import { hasName } from './xml/model'
import type { XmlNode } from './xml/model'

// The custom sort lists tag names (or JSON keys), and `@name` for attributes,
// without namespace prefixes.

/** `list` with the item at `from` moved to `to`. */
export function moveItem<T>(list: ReadonlyArray<T>, from: number, to: number) {
  const out = [...list]
  if (from < 0 || from >= out.length) return out
  const [item] = out.splice(from, 1)
  out.splice(Math.max(0, Math.min(to, out.length)), 0, item)
  return out
}

/**
 * `list` followed by the names of `names` it lacks, trimmed, without prefix
 * and once each.
 */
export function appendNames(
  list: ReadonlyArray<string>,
  names: Iterable<string>,
) {
  const out = [...list]
  const seen = new Set(list.map(localName))
  for (const raw of names) {
    const name = localName(raw.trim())
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

/**
 * Names the custom sort can order, as they first appear: each element's name,
 * then its `@attributes`.
 */
export function documentNames(nodes: Array<XmlNode>): Array<string> {
  const names = new Set<string>()
  for (const el of allElements(nodes)) {
    if (hasName(el)) names.add(localName(el.name))
    for (const attr of el.attrs) names.add(`@${localName(attr.name)}`)
  }
  return [...names]
}
