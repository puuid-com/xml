import { parseXml } from './parse'
import { varRegExp } from './vars'
import type { XmlAttr, XmlElement, XmlError, XmlNode } from './model'

export type FormatResult =
  { ok: true; text: string } | { ok: false; errors: Array<XmlError> }

export type SortOrder = 'none' | 'asc' | 'desc'

export interface FormatOptions {
  indent?: string
  /** Drop blank lines. When off, one blank line between elements is kept. */
  removeEmptyLines?: boolean
  /** Rewrite `<< name >>` as `<<name>>`. */
  trimVars?: boolean
  /** Order sibling elements by tag name and attributes by name. */
  sort?: SortOrder
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
  }: FormatOptions = {},
): FormatResult {
  const doc = parseXml(text)
  if (doc.errors.length > 0) return { ok: false, errors: doc.errors }

  const lines: Array<string> = []
  const compare = sort === 'none' ? null : byName(sort)

  const writeAll = (nodes: Array<XmlNode>, depth: number) => {
    const items = compare ? sortNodes(nodes, compare) : nodes
    let wrote = false
    let blank = false
    for (const node of items) {
      if (node.kind === 'text' && node.raw.trim() === '') {
        // Sorting moves nodes away from the gaps that separated them.
        if (!removeEmptyLines && !compare && wrote) {
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
    const open = openTag(node, compare)
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

function byName(order: 'asc' | 'desc') {
  const sign = order === 'asc' ? 1 : -1
  return (a: string, b: string) => sign * a.localeCompare(b)
}

/**
 * Sorts elements by tag name, stably. Comments and processing instructions
 * travel with the element that follows them.
 */
function sortNodes(
  nodes: Array<XmlNode>,
  compare: (a: string, b: string) => number,
): Array<XmlNode> {
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

function openTag(
  el: XmlElement,
  compare: ((a: string, b: string) => number) | null,
) {
  const attrs = compare
    ? [...el.attrs].sort((a, b) => compare(a.name, b.name))
    : el.attrs
  return `<${el.name}${attrs.map(attrSource).join('')}${el.selfClosing ? ' />' : '>'}`
}

function attrSource(attr: XmlAttr) {
  return ` ${attr.name}=${attr.quote}${attr.raw}${attr.quote}`
}
