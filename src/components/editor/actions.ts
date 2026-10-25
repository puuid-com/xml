import { toast } from 'sonner'

import {
  activeLanguage,
  editorStore,
  getText,
  getView,
  parseActive,
  revealElement,
} from './editor-store'
import { tagNameNear } from './syntax'
import {
  setDefaultsPreview,
  setQuickHighlight,
} from '#/components/app/ui-store'
import { filesCollection } from '#/lib/store/files'
import { enabledDefaults } from '#/lib/store/defaults'
import { formatSettingsStore } from '#/lib/store/format-settings'
import { highlightsCollection } from '#/lib/store/highlights'
import {
  MIME_TYPES,
  documentDefaults,
  formatDocument,
  languageOf,
} from '#/lib/document'
import { defaultSummary } from '#/lib/xml/defaults'
import { diffChange } from '#/lib/xml/edit'
import { allElements, elementAt } from '#/lib/xml/locate'
import { hasName, isLeaf, leafValue } from '#/lib/xml/model'
import { m } from '#/paraglide/messages'
import type { EditorView } from '@codemirror/view'

// Commands return `true` so CodeMirror keymaps treat the key as handled.

export function formatActive() {
  const view = getView()
  if (!view) return true
  const { removeEmptyLines, trimVars, sort, highlightedFirst } =
    formatSettingsStore.state
  const first = highlightedFirst
    ? [...highlightsCollection.values()]
        .filter((r) => r.enabled)
        .map((r) => r.tag)
    : []
  const text = view.state.doc.toString()
  const result = formatDocument(text, activeLanguage(), {
    removeEmptyLines,
    trimVars,
    sort,
    first,
  })
  if (!result.ok) {
    toast.error(m.format_failed(), {
      duration: 4000,
      description: result.errors[0]?.message,
    })
    return true
  }
  const change = diffChange(text, result.text)
  if (change) view.dispatch({ changes: change, userEvent: 'input.format' })
  return true
}

/** Asks to confirm the enabled default values that would change the active file. */
export function applyDefaultsActive() {
  const view = getView()
  if (!view) return true
  const rules = enabledDefaults()
  if (rules.length === 0) {
    toast(m.defaults_none(), { id: 'defaults' })
    return true
  }
  const doc = parseActive()
  const summary = defaultSummary(doc.nodes, rules)
  if (summary.length === 0) {
    toast(m.defaults_unchanged(), { id: 'defaults' })
    return true
  }
  setDefaultsPreview(summary)
  return true
}

/** Writes every enabled default value into the active file, as one undo step. */
export function commitDefaultsActive() {
  const view = getView()
  if (!view) return
  const changes = documentDefaults(parseActive(), enabledDefaults())
  if (changes.length === 0) return
  view.dispatch({ changes, userEvent: 'input.defaults' })
  toast.success(m.defaults_applied({ count: changes.length }), {
    id: 'defaults',
  })
}

/** Leaf element at `pos` with its current text, if any. */
export function leafAt(pos: number) {
  const el = elementAt(editorStore.state.doc.nodes, pos)
  return el && isLeaf(el) && hasName(el)
    ? { name: el.name, value: leafValue(el) }
    : null
}

/** Files save as you type; this only formats when that option is on. */
export function saveActive() {
  if (formatSettingsStore.state.formatOnSave) formatActive()
  toast.success(m.saved_locally(), { id: 'saved' })
  return true
}

export function downloadFile(id: string) {
  const file = filesCollection.get(id)
  if (!file) return
  // The editor holds edits that may not be saved yet.
  const active = editorStore.state.fileId === id
  const content = active ? getText() : file.content
  const language = active ? activeLanguage() : languageOf(file.name, content)
  const blob = new Blob([content], { type: MIME_TYPES[language] })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = /\.\w+$/.test(file.name)
    ? file.name
    : `${file.name}.${language}`
  link.click()
  URL.revokeObjectURL(url)
}

export async function copyActive() {
  if (!getView()) return
  await navigator.clipboard.writeText(getText())
  toast.success(m.copied())
}

/** Tag name or JSON key under the cursor, else the element the cursor is in. */
function tagAtCursor(view: EditorView) {
  const pos = view.state.selection.main.head
  const near = tagNameNear(view.state, pos)
  if (near) return near
  const el = elementAt(editorStore.state.doc.nodes, pos)
  return el && hasName(el) ? { name: el.name, at: pos } : null
}

/** Opens the colour picker for the tag at the cursor. */
export function highlightAtCursor() {
  const view = getView()
  if (!view) return true
  const tag = tagAtCursor(view)
  const coords = tag && view.coordsAtPos(tag.at)
  if (!tag || !coords) {
    toast(m.highlight_no_tag(), { id: 'highlight-no-tag' })
    return true
  }
  setQuickHighlight({ tag: tag.name, x: coords.left, y: coords.bottom })
  return true
}

/** Elements named `tag`, in document order. */
function tagMatches(tag: string) {
  return allElements(editorStore.state.doc.nodes).filter(
    (el) => hasName(el) && el.name === tag,
  )
}

/**
 * Steps through the elements named `tag`: starts at the first one, then each
 * call moves to the next, wrapping back to the first after the last.
 */
export function cycleTag(tag: string) {
  const matches = tagMatches(tag)
  if (matches.length === 0) return
  const i = matches.findIndex((el) => el.from === editorStore.state.pos)
  revealElement(matches[(i + 1) % matches.length], true)
}

/** Moves the cursor to the next (or previous) element named `tag`, wrapping. */
export function revealTag(tag: string, direction: 1 | -1) {
  const matches = tagMatches(tag)
  if (matches.length === 0) return
  const pos = editorStore.state.pos
  const target =
    direction === 1
      ? (matches.find((el) => el.from > pos) ?? matches[0])
      : ([...matches].reverse().find((el) => el.from < pos) ??
        matches[matches.length - 1])
  revealElement(target, true)
}
