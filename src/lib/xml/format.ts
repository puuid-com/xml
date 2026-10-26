import { parseXml } from './parse'
import { varRegExp } from './vars'
import type { XmlAttr, XmlElement, XmlError, XmlNode } from './model'

export type FormatResult =
  { ok: true; text: string } | { ok: false; errors: Array<XmlError> }

export type SortOrder = 'none' | 'asc' | 'desc' | 'custom'

export interface FormatOptions {
  indent?: string
  /** Drop blank lines. When off, one blank line between elements is kept. */
  removeEmptyLines?: boolean
  /** Rewrite `<< name >>` as `<<name>>`. */
  trimVars?: boolean
  /** Order sibling elements by tag name and attributes by name. */
  sort?: SortOrder
  /**
   * With `sort: 'custom'`, names in the order they go: tag names, and
   * `@name` for attributes. Unlisted ones follow, in document order.
   */
  order?: ReadonlyArray<string>
  /** Tag names moved ahead of their siblings, e.g. highlighted ones. */
  first?: Iterable<string>
}

/**
 * Pretty-prints XML. Elements holding only other elements are indented one per
 * line; anything with text (including mixed content) is kept as written so
 * whitespace that matters is never touched. Refuses documents with errors.
 */
export function formatXml(
  text: string,
  {
    indent = '  ',
    removeEmptyLines = true,
    trimVars = false,
    sort = 'none',
    order: custom = [],
    first = [],
  }: FormatOptions = {},
): FormatResult {
  const doc = parseXml(text)
  if (doc.errors.length > 0) return { ok: false, errors: doc.errors }

  const lines: Array<string> = []
  const compare = nameOrder(sort, custom, 'element')
  const attrCompare = nameOrder(sort, custom, 'attribute')
  const order = elementOrder(compare, new Set(first))

  const writeAll = (nodes: Array<XmlNode>, depth: number) => {
    const items = order ? sortNodes(nodes, order) : nodes
    let wrote = false
    let blank = false
    for (const node of items) {
      if (node.kind === 'text' && node.raw.trim() === '') {
        // Sorting moves nodes away from the gaps that separated them.
        if (!removeEmptyLines && !order && wrote) {
          blank ||= (node.raw.match(/\n/g)?.length ?? 0) > 1
        }
        continue
      }
      if (blank) lines.push('')
      blank = false
      write(node, depth)
      wrote = true
    }
  }

  const write = (node: XmlNode, depth: number) => {
    const pad = indent.repeat(depth)
    if (node.kind === 'text') {
      lines.push(pad + clean(node.raw.trim()))
      return
    }
    if (node.kind !== 'element') {
      lines.push(pad + node.raw)
      return
    }
    const open = openTag(node, attrCompare)
    if (node.selfClosing) {
      lines.push(pad + open)
      return
    }
    const close = `</${node.name}>`
    if (node.children.length === 0) {
      lines.push(pad + open + close)
      return
    }
    if (hasText(node)) {
      const inner = node.children.map((child) => {
        const raw = text.slice(child.from, child.to)
        return child.kind === 'text' ? clean(raw) : raw
      })
      lines.push(pad + open + inner.join('') + close)
      return
    }
    lines.push(pad + open)
    writeAll(node.children, depth + 1)
    lines.push(pad + close)
  }

  // Blank lines inside text content, which is otherwise kept as written.
  const clean = (raw: string) =>
    removeEmptyLines ? raw.replace(/\n[ \t]*(?=\r?\n)/g, '') : raw

  writeAll(doc.nodes, 0)
  let out = lines.join('\n') + '\n'
  if (trimVars)
    out = out.replace(varRegExp(), (_, name: string) => `<<${name}>>`)
  return { ok: true, text: out }
}

type Compare = (a: string, b: string) => number

/**
 * Compares names for `sort`, or `null` to keep document order. A custom
 * `order` ranks the names it lists and ties the rest, so a stable sort keeps
 * those in place after. In XML, `@name` entries rank attributes; JSON keys
 * match entries as written.
 */
export function nameOrder(
  sort: SortOrder,
  order: ReadonlyArray<string>,
  target: 'element' | 'attribute' | 'key' = 'key',
): Compare | null {
  if (sort === 'asc') return (a, b) => a.localeCompare(b)
  if (sort === 'desc') return (a, b) => b.localeCompare(a)
  if (sort === 'none') return null
  const rank = new Map<string, number>()
  for (const entry of order) {
    const attr = entry.startsWith('@')
    if (target === 'element' && attr) continue
    if (target === 'attribute' && !attr) continue
    const name = target === 'attribute' ? entry.slice(1) : entry
    if (!rank.has(name)) rank.set(name, rank.size)
  }
  if (rank.size === 0) return null
  const of = (name: string) => rank.get(name) ?? rank.size
  return (a, b) => of(a) - of(b)
}

/** Tags in `first` lead, then `compare` (or document order) decides. */
function elementOrder(compare: Compare | null, first: Set<string>) {
  if (first.size === 0) return compare
  return (a: string, b: string) =>
    Number(first.has(b)) - Number(first.has(a)) || (compare?.(a, b) ?? 0)
}

/**
 * Sorts elements by tag name, stably. Comments and processing instructions
 * travel with the element that follows them.
 */
function sortNodes(nodes: Array<XmlNode>, compare: Compare): Array<XmlNode> {
  const groups: Array<{ name: string | null; nodes: Array<XmlNode> }> = []
  let pending: Array<XmlNode> = []
  for (const node of nodes) {
    if (node.kind === 'text' && node.raw.trim() === '') continue
    pending.push(node)
    if (node.kind === 'element') {
      groups.push({ name: node.name, nodes: pending })
      pending = []
    }
  }
  const sorted = groups.sort((a, b) => compare(a.name ?? '', b.name ?? ''))
  return [...sorted.flatMap((g) => g.nodes), ...pending]
}

function hasText(el: XmlElement) {
  return el.children.some(
    (child) =>
      (child.kind === 'text' && child.raw.trim() !== '') ||
      child.kind === 'cdata',
  )
}

function openTag(el: XmlElement, compare: Compare | null) {
  const attrs = compare
    ? [...el.attrs].sort((a, b) => compare(a.name, b.name))
    : el.attrs
  return `<${el.name}${attrs.map(attrSource).join('')}${el.selfClosing ? ' />' : '>'}`
}

function attrSource(attr: XmlAttr) {
  return ` ${attr.name}=${attr.quote}${attr.raw}${attr.quote}`
}
