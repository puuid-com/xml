import { Annotation, EditorState, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import {
  applyDefaultsActive,
  formatActive,
  highlightAtCursor,
  saveActive,
} from './actions'
import { publishCursor, publishParse, setView } from './editor-store'
import { TagContextMenu } from './TagContextMenu'
import {
  editorExtensions,
  fileIdField,
  tagHighlightsCompartment,
  tagHighlightsFacet,
} from './extensions'
import { useHighlightMap } from '#/hooks/use-highlights'
import { filesCollection, saveContent } from '#/lib/store/files'
import { writerId } from '#/lib/store/session'
import { diffChange } from '#/lib/xml/edit'
import { parseXml } from '#/lib/xml/parse'
import { m } from '#/paraglide/messages'
import type { Extension } from '@codemirror/state'
import type { ViewUpdate } from '@codemirror/view'

/** Marks changes that came from another browser tab, so they are not saved back. */
const remoteSync = Annotation.define<boolean>()

// One editor state per file, kept across tab switches so undo history,
// selection and scroll survive. Lives at module scope to outlive remounts.
const states = new Map<string, EditorState>()

function publishCursorFrom(state: EditorState) {
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)
  publishCursor(pos, line.number, pos - line.from + 1)
}

let extensions: Extension | null = null

function sharedExtensions(highlights: ReadonlyMap<string, string>) {
  extensions ??= editorExtensions(
    {
      onParse: (fileId, doc) => publishParse(fileId, doc),
      onChange: (fileId, update: ViewUpdate) => {
        if (update.transactions.some((tr) => tr.annotation(remoteSync))) return
        saveContent({ id: fileId, content: update.state.doc.toString() })
      },
      onCursor: (update) => publishCursorFrom(update.state),
      keys: [
        { key: 'Shift-Alt-f', run: formatActive, preventDefault: true },
        { key: 'Mod-s', run: saveActive, preventDefault: true },
        { key: 'Alt-h', run: highlightAtCursor, preventDefault: true },
        { key: 'Shift-Alt-d', run: applyDefaultsActive, preventDefault: true },
      ],
    },
    highlights,
  )
  return extensions
}

function stateFor(fileId: string, highlights: ReadonlyMap<string, string>) {
  const content = filesCollection.get(fileId)?.content ?? ''
  const cached = states.get(fileId)
  if (cached) {
    // Catch up with edits made elsewhere while this file was not shown.
    const change = diffChange(cached.doc.toString(), content)
    if (!change) return cached
    return cached.update({
      changes: change,
      annotations: [remoteSync.of(true), Transaction.addToHistory.of(false)],
    }).state
  }
  return EditorState.create({
    doc: content,
    extensions: [fileIdField.init(() => fileId), sharedExtensions(highlights)],
  })
}

export function CodeEditor({ fileId }: { fileId: string }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const highlights = useHighlightMap()
  const highlightsRef = useRef(highlights)

  useEffect(() => {
    const view = new EditorView({ parent: parentRef.current! })
    viewRef.current = view
    setView(view)

    // Apply edits from other browser tabs (they arrive via storage events).
    const subscription = filesCollection.subscribeChanges((changes) => {
      for (const change of changes) {
        if (change.type === 'delete') {
          states.delete(String(change.key))
          continue
        }
        if (change.type !== 'update' || change.value.writer === writerId) {
          continue
        }
        const file = change.value
        const active = view.state.field(fileIdField, false) === file.id
        const state = active ? view.state : states.get(file.id)
        if (!state) continue
        const diff = diffChange(state.doc.toString(), file.content)
        if (!diff) continue
        const spec = {
          changes: diff,
          annotations: [
            remoteSync.of(true),
            Transaction.addToHistory.of(false),
          ],
        }
        if (active) {
          view.dispatch(spec)
          toast(m.updated_elsewhere({ name: file.name }), { id: 'remote' })
        } else {
          states.set(file.id, state.update(spec).state)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      const id = view.state.field(fileIdField, false)
      if (id) states.set(id, view.state)
      view.destroy()
      viewRef.current = null
      setView(null)
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const previous = view.state.field(fileIdField, false)
    if (previous === fileId) return
    if (previous) states.set(previous, view.state)

    const state = stateFor(fileId, highlightsRef.current)
    view.setState(state)
    view.dispatch({
      effects: tagHighlightsCompartment.reconfigure(
        tagHighlightsFacet.of(highlightsRef.current),
      ),
    })
    publishCursorFrom(view.state)
    publishParse(fileId, parseXml(view.state.doc.toString()))
    view.focus()
  }, [fileId])

  useEffect(() => {
    highlightsRef.current = highlights
    viewRef.current?.dispatch({
      effects: tagHighlightsCompartment.reconfigure(
        tagHighlightsFacet.of(highlights),
      ),
    })
  }, [highlights])

  return (
    <TagContextMenu>
      <div ref={parentRef} className="h-full min-h-0 overflow-hidden" />
    </TagContextMenu>
  )
}

/** Forgets a file's editor state, e.g. after deleting it. */
export function dropEditorState(fileId: string) {
  states.delete(fileId)
}
