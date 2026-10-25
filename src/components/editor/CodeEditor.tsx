import { forceLinting } from '@codemirror/lint'
import { Annotation, EditorState, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef } from 'react'

import { notify } from '#/components/app/notice-store'
import {
  applyDefaultsActive,
  formatActive,
  highlightAtCursor,
  resolveVarsActive,
  saveActive,
} from './actions'
import {
  parseActive,
  publishCursor,
  publishParse,
  setView,
} from './editor-store'
import { docLanguage, languageCompartment, languageExtension } from './language'
import { editorExtensions, fileIdField, setDefaultRules } from './extensions'
import { setTagHighlights } from './tag-highlights'
import { TagContextMenu } from './TagContextMenu'
import { useEnabledDefaults } from '#/hooks/use-defaults'
import { useHighlightMap } from '#/hooks/use-highlights'
import { languageOf } from '#/lib/document'
import { shortcuts } from '#/lib/shortcuts'
import { filesCollection, saveContent } from '#/lib/store/files'
import { writerId } from '#/lib/store/session'
import { diffChange } from '#/lib/xml/edit'
import { m } from '#/paraglide/messages'
import type { Extension, TransactionSpec } from '@codemirror/state'
import type { DefaultRule } from '#/lib/xml/defaults'
import type { TextChange } from '#/lib/xml/edit'

/** Marks changes that came from another browser tab, so they are not saved back. */
const remoteSync = Annotation.define<boolean>()

/** Applies another tab's edit without saving it back or adding an undo step. */
function remoteChange(changes: TextChange): TransactionSpec {
  return {
    changes,
    annotations: [remoteSync.of(true), Transaction.addToHistory.of(false)],
  }
}

// One editor state per file, kept across tab switches so undo history,
// selection and scroll survive. Lives at module scope to outlive remounts.
const states = new Map<string, EditorState>()

function publishCursorFrom(state: EditorState) {
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)
  publishCursor(pos, line.number, pos - line.from + 1)
}

let extensions: Extension | null = null

function sharedExtensions(
  highlights: ReadonlyMap<string, string>,
  defaults: ReadonlyArray<DefaultRule>,
) {
  extensions ??= editorExtensions(
    {
      onParse: (fileId, doc) => publishParse(fileId, doc),
      onChange: (fileId, update) => {
        if (update.transactions.some((tr) => tr.annotation(remoteSync))) return
        saveContent({ id: fileId, content: update.state.doc.toString() })
      },
      onCursor: (update) => publishCursorFrom(update.state),
      keys: [
        { key: shortcuts.format.key, run: formatActive, preventDefault: true },
        { key: shortcuts.save.key, run: saveActive, preventDefault: true },
        {
          key: shortcuts.highlight.key,
          run: highlightAtCursor,
          preventDefault: true,
        },
        {
          key: shortcuts.applyDefaults.key,
          run: applyDefaultsActive,
          preventDefault: true,
        },
        {
          key: shortcuts.resolveVars.key,
          run: resolveVarsActive,
          preventDefault: true,
        },
      ],
    },
    highlights,
    defaults,
  )
  return extensions
}

function stateFor(
  fileId: string,
  highlights: ReadonlyMap<string, string>,
  defaults: ReadonlyArray<DefaultRule>,
) {
  const file = filesCollection.get(fileId)
  const content = file?.content ?? ''
  const cached = states.get(fileId)
  if (cached) {
    // Catch up with edits made elsewhere while this file was not shown.
    const change = diffChange(cached.doc.toString(), content)
    if (!change) return cached
    return cached.update(remoteChange(change)).state
  }
  return EditorState.create({
    doc: content,
    extensions: [
      fileIdField.init(() => fileId),
      languageCompartment.of(
        languageExtension(languageOf(file?.name ?? '', content)),
      ),
      sharedExtensions(highlights, defaults),
    ],
  })
}

/**
 * Switches the editor to the language the file's name calls for, e.g. after
 * a rename. Returns whether it changed.
 */
function syncLanguage(view: EditorView, name: string) {
  const language = languageOf(name, view.state.doc.toString())
  if (view.state.facet(docLanguage) === language) return false
  view.dispatch({
    effects: languageCompartment.reconfigure(languageExtension(language)),
  })
  forceLinting(view)
  return true
}

export function CodeEditor({ fileId }: { fileId: string }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const highlights = useHighlightMap()
  const highlightsRef = useRef(highlights)
  const defaults = useEnabledDefaults()
  const defaultsRef = useRef(defaults)
  const activeName = useRef<string | null>(null)

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
        if (change.type !== 'update') continue
        const file = change.value
        const active = view.state.field(fileIdField, false) === file.id
        if (active && file.name !== activeName.current) {
          activeName.current = file.name
          if (syncLanguage(view, file.name)) {
            publishParse(file.id, parseActive())
          }
        }
        if (file.writer === writerId) continue
        const state = active ? view.state : states.get(file.id)
        if (!state) continue
        const diff = diffChange(state.doc.toString(), file.content)
        if (!diff) continue
        const spec = remoteChange(diff)
        if (active) {
          view.dispatch(spec)
          notify.info(m.updated_elsewhere({ name: file.name }))
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

    const state = stateFor(fileId, highlightsRef.current, defaultsRef.current)
    view.setState(state)
    activeName.current = filesCollection.get(fileId)?.name ?? null
    // A cached state keeps the language it had; the file may since be renamed.
    if (activeName.current) syncLanguage(view, activeName.current)
    view.dispatch({
      effects: [
        setTagHighlights(highlightsRef.current),
        setDefaultRules(defaultsRef.current),
      ],
    })
    publishCursorFrom(view.state)
    publishParse(fileId, parseActive())
    view.focus()
  }, [fileId])

  useEffect(() => {
    highlightsRef.current = highlights
    viewRef.current?.dispatch({ effects: setTagHighlights(highlights) })
  }, [highlights])

  useEffect(() => {
    defaultsRef.current = defaults
    viewRef.current?.dispatch({ effects: setDefaultRules(defaults) })
  }, [defaults])

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
