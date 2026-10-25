import { Store } from '@tanstack/store'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

import { elementAt, elementByPath } from '#/lib/xml/locate'
import { parseXml } from '#/lib/xml/parse'
import type { TextChange } from '#/lib/xml/edit'
import type { XmlDocument, XmlElement } from '#/lib/xml/model'

// Bridges the CodeMirror view and the rest of the app: the parsed document,
// the cursor, and which tree node is selected. The view itself lives outside
// React state; components reach it through the helpers below.

export interface EditorSnapshot {
  fileId: string | null
  /** Latest parse of the active document (error tolerant). */
  doc: XmlDocument
  /** Bumps on every parse so subscribers can cheaply detect changes. */
  revision: number
  pos: number
  line: number
  col: number
  /** Element under the cursor, selected in the tree. */
  selectedPath: string | null
}

const emptyDoc: XmlDocument = { nodes: [], root: null, errors: [] }

export const editorStore = new Store<EditorSnapshot>({
  fileId: null,
  doc: emptyDoc,
  revision: 0,
  pos: 0,
  line: 1,
  col: 1,
  selectedPath: null,
})

let currentView: EditorView | null = null

export function setView(view: EditorView | null) {
  currentView = view
}

export function getView() {
  return currentView
}

function pathAt(doc: XmlDocument, pos: number) {
  return elementAt(doc.nodes, pos)?.path ?? null
}

export function publishParse(fileId: string, doc: XmlDocument) {
  editorStore.setState((s) => ({
    ...s,
    fileId,
    doc,
    revision: s.revision + 1,
    selectedPath: pathAt(doc, s.pos),
  }))
}

export function publishCursor(pos: number, line: number, col: number) {
  editorStore.setState((s) =>
    s.pos === pos
      ? s
      : { ...s, pos, line, col, selectedPath: pathAt(s.doc, pos) },
  )
}

/** Applies structure-tree edits as one undoable transaction. */
export function applyChanges(changes: Array<TextChange>) {
  const view = currentView
  if (!view || changes.length === 0) return
  view.dispatch({ changes, userEvent: 'input.tree' })
}

/**
 * Edits the element at `path`. Positions are resolved against a fresh parse,
 * so rapid edits never act on a stale tree.
 */
export function editAtPath(
  path: string,
  build: (el: XmlElement, text: string) => Array<TextChange>,
) {
  const view = currentView
  if (!view) return
  const text = view.state.doc.toString()
  const el = elementByPath(parseXml(text).nodes, path)
  if (!el) return
  applyChanges(build(el, text))
  const fileId = editorStore.state.fileId
  if (fileId) publishParse(fileId, parseXml(view.state.doc.toString()))
}

/** Selects an element's open tag without stealing focus from the panel. */
export function revealElement(el: XmlElement, focus = false) {
  // Head at the start, so the cursor sits inside this element.
  revealRange(el.openTo, el.from, focus)
}

/** Moves the cursor to a range and scrolls it into view. */
export function revealRange(from: number, to = from, focus = true) {
  const view = currentView
  if (!view) return
  const max = view.state.doc.length
  view.dispatch({
    selection: EditorSelection.single(Math.min(from, max), Math.min(to, max)),
    scrollIntoView: true,
    userEvent: 'select.reveal',
  })
  if (focus) view.focus()
}

export function getText() {
  return currentView?.state.doc.toString() ?? ''
}
