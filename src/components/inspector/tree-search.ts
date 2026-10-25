import { ancestorPaths, flattenVisible } from '#/lib/xml/locate'
import { childElements, leafValue } from '#/lib/xml/model'
import type { XmlNode } from '#/lib/xml/model'

/** The normalised form of a search query that values are matched against. */
export function searchNeedle(query: string) {
  return query.trim().toLocaleLowerCase()
}

/** `[from, to)` offsets of each non-overlapping `needle` in `text`, ignoring case. */
export function matchRanges(text: string, needle: string) {
  const ranges: Array<[number, number]> = []
  if (!needle) return ranges
  const haystack = text.toLocaleLowerCase()
  // Lowercasing can change the length (e.g. `İ`), so offsets would no longer
  // line up with the original text.
  if (haystack.length !== text.length) return ranges
  for (
    let from = haystack.indexOf(needle);
    from !== -1;
    from = haystack.indexOf(needle, from + needle.length)
  ) {
    ranges.push([from, from + needle.length])
  }
  return ranges
}

/** Match a node's own name, attributes and text, retaining ancestors for context. */
export function searchTree(
  nodes: Array<XmlNode>,
  query: string,
  collapsed: ReadonlySet<string>,
  editingPath: string | null = null,
) {
  const needle = searchNeedle(query)
  const matches = new Set<string>()
  if (!needle) return { rows: flattenVisible(nodes, collapsed), matches }

  const visible = new Set<string>()
  // Keep an in-progress edit mounted when its new value stops matching.
  if (editingPath) {
    visible.add(editingPath)
    for (const ancestor of ancestorPaths(editingPath)) visible.add(ancestor)
  }
  for (const { el } of flattenVisible(nodes, new Set())) {
    const values = [
      el.name,
      leafValue(el),
      ...el.attrs.flatMap((attr) => [attr.name, attr.value]),
    ]
    if (!values.some((value) => value.toLocaleLowerCase().includes(needle)))
      continue
    matches.add(el.path)
    visible.add(el.path)
    for (const ancestor of ancestorPaths(el.path)) visible.add(ancestor)
  }

  const rows = flattenVisible(nodes, collapsed)
    .filter(({ el }) => visible.has(el.path))
    .map((row) => ({
      ...row,
      hasChildren: childElements(row.el).some((child) =>
        visible.has(child.path),
      ),
    }))
  return { rows, matches }
}
