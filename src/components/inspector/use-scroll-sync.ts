import { useEffect, useLayoutEffect, useRef } from 'react'

import { getView } from '#/components/editor/editor-store'
import type { EditorView } from '@codemirror/view'
import type { TreeRow } from '#/lib/xml/locate'

// Keeps the editor and the structure tree scrolled to the same place. Rows
// map to the editor line where their element starts; positions between two
// rows are interpolated, so a collapsed subtree or a long text value scrolls
// smoothly instead of jumping.

type Pane = 'editor' | 'tree'

// Only the pane the person last scrolled or clicked drives the other, so a
// programmatic scroll (cursor reveal, following the other pane) never echoes.
const DRIVER_EVENTS = ['wheel', 'pointerdown', 'touchstart', 'keydown']

export function useScrollSync(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  rows: Array<TreeRow>,
  rowHeight: number,
  fileId: string | null,
  enabled = true,
) {
  const rowsRef = useRef(rows)
  useLayoutEffect(() => {
    rowsRef.current = rows
  }, [rows])
  const hasRows = rows.length > 0

  useEffect(() => {
    const tree = scrollRef.current
    const view = getView()
    if (!tree || !view || !fileId || !enabled) return
    const editor = view.scrollDOM
    let driver: Pane | null = null

    const padding = () => parseFloat(getComputedStyle(tree).paddingTop) || 0
    // scrollTop of the editor when the document's top edge is at its top.
    const editorOffset = () =>
      view.documentTop - editor.getBoundingClientRect().top + editor.scrollTop

    const onEditorScroll = () => {
      if (driver !== 'editor') return
      const list = rowsRef.current
      if (list.length === 0) return
      const y = editor.scrollTop - editorOffset()
      const index = lastRowAtOrAbove(view, list, y)
      const top = rowTop(view, list, index)
      const next = rowTop(view, list, index + 1)
      const frac = clamp01(next > top ? (y - top) / (next - top) : 0)
      tree.scrollTop = padding() + (index + frac) * rowHeight
    }

    const onTreeScroll = () => {
      if (driver !== 'tree') return
      const list = rowsRef.current
      if (list.length === 0) return
      const at = Math.max(0, (tree.scrollTop - padding()) / rowHeight)
      const index = Math.min(Math.floor(at), list.length - 1)
      const top = rowTop(view, list, index)
      const next = rowTop(view, list, index + 1)
      editor.scrollTop =
        editorOffset() + top + clamp01(at - index) * (next - top)
    }

    const driveFrom = (pane: Pane) => () => {
      driver = pane
    }
    const fromEditor = driveFrom('editor')
    const fromTree = driveFrom('tree')
    const controller = new AbortController()
    const options = { passive: true, signal: controller.signal }
    for (const type of DRIVER_EVENTS) {
      view.dom.addEventListener(type, fromEditor, options)
      tree.addEventListener(type, fromTree, options)
    }
    editor.addEventListener('scroll', onEditorScroll, options)
    tree.addEventListener('scroll', onTreeScroll, options)
    return () => controller.abort()
  }, [scrollRef, rowHeight, fileId, hasRows, enabled])
}

/** Document y of a row's first line; past the last row, the end of its element. */
function rowTop(view: EditorView, rows: Array<TreeRow>, index: number) {
  if (index < rows.length) return view.lineBlockAt(rows[index].el.from).top
  const last = rows[rows.length - 1].el
  return view.lineBlockAt(Math.min(last.to, view.state.doc.length)).bottom
}

/** Index of the last row starting at or above `y`, by binary search. */
function lastRowAtOrAbove(view: EditorView, rows: Array<TreeRow>, y: number) {
  let lo = 0
  let hi = rows.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (rowTop(view, rows, mid) <= y) lo = mid
    else hi = mid - 1
  }
  return lo
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}
