import { languageOf, parseDocument } from './document'
import { localName } from './names'
import { allElements } from './xml/locate'
import { hasName } from './xml/model'
import type { XmlError, XmlNode } from './xml/model'

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

/**
 * The custom order a template file sets: its names as they first appear,
 * without prefixes. XML or JSON, by `fileName` and content. Refuses files
 * with errors, since a partial parse would drop names.
 */
export function templateOrder(
  fileName: string,
  text: string,
): { ok: true; order: Array<string> } | { ok: false; errors: Array<XmlError> } {
  const doc = parseDocument(text, languageOf(fileName, text))
  if (doc.errors.length > 0) return { ok: false, errors: doc.errors }
  return { ok: true, order: documentNames(doc.nodes) }
}
