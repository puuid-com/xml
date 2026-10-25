import { childElements, isElement } from './model'
import type { XmlElement, XmlNode } from './model'

/** Deepest element whose range contains `pos`. */
export function elementAt(
  nodes: Array<XmlNode>,
  pos: number,
): XmlElement | null {
  let found: XmlElement | null = null
  let level = nodes
  for (;;) {
    // A cursor right after `</b>` belongs to `b` unless a sibling starts there.
    const hit =
      level.find(
        (node): node is XmlElement =>
          isElement(node) && node.from <= pos && pos < node.to,
      ) ??
      level.find(
        (node): node is XmlElement => isElement(node) && node.to === pos,
      )
    if (!hit) return found
    found = hit
    level = hit.children
  }
}

/** Finds an element by its path. */
export function elementByPath(
  nodes: Array<XmlNode>,
  path: string,
): XmlElement | null {
  let level = nodes
  for (;;) {
    const hit = level.find(
      (node): node is XmlElement =>
        isElement(node) &&
        (node.path === path || path.startsWith(node.path + '/')),
    )
    if (!hit) return null
    if (hit.path === path) return hit
    level = hit.children
  }
}

/** All ancestor paths of `path`, outermost first. */
export function ancestorPaths(path: string): Array<string> {
  const parts = path.split('/').filter(Boolean)
  return parts.slice(0, -1).map((_, i) => '/' + parts.slice(0, i + 1).join('/'))
}

export interface TreeRow {
  el: XmlElement
  depth: number
  hasChildren: boolean
  collapsed: boolean
}

/** Flattens the element tree into visible rows, skipping collapsed subtrees. */
export function flattenVisible(
  nodes: Array<XmlNode>,
  collapsed: ReadonlySet<string>,
): Array<TreeRow> {
  const rows: Array<TreeRow> = []
  const visit = (el: XmlElement, depth: number) => {
    const kids = childElements(el)
    const isCollapsed = collapsed.has(el.path)
    rows.push({
      el,
      depth,
      hasChildren: kids.length > 0,
      collapsed: isCollapsed,
    })
    if (!isCollapsed) for (const kid of kids) visit(kid, depth + 1)
  }
  for (const node of nodes) if (isElement(node)) visit(node, 0)
  return rows
}

/** Every element in document order. */
export function allElements(nodes: Array<XmlNode>): Array<XmlElement> {
  const out: Array<XmlElement> = []
  const visit = (node: XmlNode) => {
    if (!isElement(node)) return
    out.push(node)
    node.children.forEach(visit)
  }
  nodes.forEach(visit)
  return out
}

/** Path shown to people: `root › item[2] › name`, dropping `[1]`. */
export function displayPath(path: string): Array<string> {
  return path
    .split('/')
    .filter(Boolean)
    .map((part) => decodeSegment(part.replace(/\[1\]$/, '')))
}

/** JSON keys can hold `/`, so path segments escape it (and `%`). */
export function encodeSegment(name: string) {
  return name.replaceAll('%', '%25').replaceAll('/', '%2F')
}

function decodeSegment(segment: string) {
  return segment.replaceAll('%2F', '/').replaceAll('%25', '%')
}
