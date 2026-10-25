import type { TreeRow } from '#/lib/xml/locate'

// Keyboard model for the structure tree, following the WAI-ARIA tree view
// pattern: arrows move between visible rows, Right/Left expand, collapse or
// step into a child or out to the parent.

export type TreeKeyAction =
  | { type: 'focus'; index: number }
  | { type: 'expand'; index: number }
  | { type: 'collapse'; index: number }
  | { type: 'reveal'; index: number }
  | { type: 'edit'; index: number }

export function treeKeyAction(
  rows: Array<TreeRow>,
  index: number,
  key: string,
): TreeKeyAction | null {
  const row = rows.at(index)
  if (!row) return null
  const focus = (to: number): TreeKeyAction | null =>
    to === index ? null : { type: 'focus', index: to }

  switch (key) {
    case 'ArrowDown':
      return focus(Math.min(index + 1, rows.length - 1))
    case 'ArrowUp':
      return focus(Math.max(index - 1, 0))
    case 'Home':
      return focus(0)
    case 'End':
      return focus(rows.length - 1)
    case 'ArrowRight':
      if (!row.hasChildren) return null
      return row.collapsed ? { type: 'expand', index } : focus(index + 1)
    case 'ArrowLeft':
      if (row.hasChildren && !row.collapsed) return { type: 'collapse', index }
      return focus(parentIndex(rows, index))
    case 'Enter':
      return { type: 'reveal', index }
    case 'F2':
      return { type: 'edit', index }
    default:
      return null
  }
}

/** Index of the nearest row above at a shallower depth, or `index` at the root. */
function parentIndex(rows: Array<TreeRow>, index: number) {
  const depth = rows[index].depth
  for (let i = index - 1; i >= 0; i--) {
    if (rows[i].depth < depth) return i
  }
  return index
}
