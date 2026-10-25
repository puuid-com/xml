import { syntaxTree } from '@codemirror/language'
import { toast } from 'sonner'

import {
  activeLanguage,
  editorStore,
  getView,
  parseActive,
  revealElement,
} from './editor-store'
import { setQuickHighlight } from '#/components/app/ui-store'
import { filesCollection } from '#/lib/store/files'
import { enabledDefaults } from '#/lib/store/defaults'
import { formatSettingsStore } from '#/lib/store/format-settings'
import { highlightsCollection } from '#/lib/store/highlights'
import { MIME_TYPES, documentDefaults, formatDocument } from '#/lib/document'
import { decodeString } from '#/lib/json/parse'
import { diffChange } from '#/lib/xml/edit'
import { allElements, elementAt } from '#/lib/xml/locate'
import { isLeaf, leafValue } from '#/lib/xml/model'
import { m } from '#/paraglide/messages'
import type { EditorView } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import type { FormatResult } from '#/lib/xml/format'

function replaceDoc(next: string, userEvent: string) {
  const view = getView()
  if (!view) return
  const change = diffChange(view.state.doc.toString(), next)
  if (change) view.dispatch({ changes: change, userEvent })
}

function applyFormat(result: FormatResult, userEvent: string) {
  if (!result.ok) {
    toast.error(m.format_failed(), {
      duration: 4000,
      description: result.errors[0]?.message,
    })
    return
  }
  replaceDoc(result.text, userEvent)
}

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
  const result = formatDocument(view.state.doc.toString(), activeLanguage(), {
    removeEmptyLines,
    trimVars,
    sort,
    first,
  })
  applyFormat(result, 'input.format')
  return true
}

/** Writes every enabled default value into the active file, as one undo step. */
export function applyDefaultsActive() {
  const view = getView()
  if (!view) return true
  const rules = enabledDefaults()
  if (rules.length === 0) {
    toast(m.defaults_none(), { id: 'defaults' })
    return true
  }
  const changes = documentDefaults(
    parseActive(view.state.doc.toString()),
    rules,
  )
  if (changes.length === 0) {
    toast(m.defaults_unchanged(), { id: 'defaults' })
    return true
  }
  view.dispatch({ changes, userEvent: 'input.defaults' })
  toast.success(m.defaults_applied({ count: changes.length }), {
    id: 'defaults',
  })
  return true
}

/** Leaf element at `pos` with its current text, if any. */
export function leafAt(pos: number) {
  const el = elementAt(editorStore.state.doc.nodes, pos)
  return el && isLeaf(el) && !el.json?.item
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
  const view = getView()
  const content = view ? view.state.doc.toString() : file.content
  const language = activeLanguage()
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
  const view = getView()
  if (!view) return
  await navigator.clipboard.writeText(view.state.doc.toString())
  toast.success(m.copied())
}

const TAG_PARENTS = new Set(['OpenTag', 'CloseTag', 'SelfClosingTag'])

/** Tag name or JSON key under the cursor, else the element the cursor is in. */
function tagAtCursor(view: EditorView) {
  const pos = view.state.selection.main.head
  const tree = syntaxTree(view.state)
  for (const side of [-1, 1] as const) {
    const node = tree.resolveInner(pos, side)
    if (node.name === 'TagName' && TAG_PARENTS.has(node.parent?.name ?? '')) {
      return { name: view.state.sliceDoc(node.from, node.to), at: node.from }
    }
    if (node.name === 'PropertyName') {
      return { name: keyName(view, node), at: node.from }
    }
  }
  const el = elementAt(editorStore.state.doc.nodes, pos)
  return el && !el.json?.item ? { name: el.name, at: pos } : null
}

/**
 * Name of the tag (`<a …>`, `</a>`, `<a/>`) or JSON key that contains `pos`,
 * if any.
 */
export function tagAt(view: EditorView, pos: number) {
  let node: SyntaxNode | null = syntaxTree(view.state).resolveInner(pos, 1)
  for (; node; node = node.parent) {
    if (node.name === 'PropertyName') return keyName(view, node)
    if (!TAG_PARENTS.has(node.name)) continue
    const name = node.getChild('TagName')
    return name ? view.state.sliceDoc(name.from, name.to) : null
  }
  return null
}

function keyName(view: EditorView, node: SyntaxNode) {
  return decodeString(view.state.sliceDoc(node.from, node.to))
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
    (el) => el.name === tag && !el.json?.item,
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
