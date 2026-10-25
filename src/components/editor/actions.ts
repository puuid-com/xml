import {
  activeLanguage,
  editorStore,
  getText,
  getView,
  parseActive,
  revealElement,
  revealRange,
} from './editor-store'
import { tagNameNear } from './syntax'
import { notify } from '#/components/app/notice-store'
import {
  setDefaultsPreview,
  setQuickHighlight,
} from '#/components/app/ui-store'
import { filesCollection } from '#/lib/store/files'
import { enabledDefaults } from '#/lib/store/defaults'
import { profileHighlights } from '#/lib/store/highlights'
import { activeFormat } from '#/lib/store/profiles'
import {
  MIME_TYPES,
  documentDefaults,
  formatDocument,
  languageOf,
} from '#/lib/document'
import { defaultSummary } from '#/lib/xml/defaults'
import { resolveDynamicVars } from '#/lib/xml/dynamic-vars'
import { diffChange } from '#/lib/xml/edit'
import { allElements, elementAt } from '#/lib/xml/locate'
import { hasName, isLeaf, leafValue } from '#/lib/xml/model'
import { m } from '#/paraglide/messages'
import type { EditorView } from '@codemirror/view'

// Commands return `true` so CodeMirror keymaps treat the key as handled.

export function formatActive() {
  const view = getView()
  if (!view) return true
  const { removeEmptyLines, trimVars, sort, highlightedFirst } = activeFormat()
  const first = highlightedFirst
    ? profileHighlights()
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
    const error = result.errors.at(0)
    const { fileId } = editorStore.state
    notify.error(m.format_failed(), {
      detail: error?.message,
      action: error && {
        label: m.notice_go_to(),
        // The offsets only make sense in the file that failed.
        run: () => {
          if (editorStore.state.fileId === fileId)
            revealRange(error.from, error.to)
        },
      },
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
    notify.info(m.defaults_none())
    return true
  }
  const doc = parseActive()
  const summary = defaultSummary(doc.nodes, rules)
  if (summary.length === 0) {
    notify.info(m.defaults_unchanged())
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
  notify.success(m.defaults_applied({ count: changes.length }))
}

/**
 * Swaps dynamic variables such as `<<$randomInt>>` for generated values, as
 * one undo step. Only the selection is touched when there is one.
 */
export function resolveVarsActive() {
  if (!getView()) return true
  // Faker is large and only needed here, so it loads on first use.
  void import('@faker-js/faker').then(({ faker }) => {
    const view = getView()
    if (!view) return
    const { main } = view.state.selection
    const range = main.empty ? undefined : { from: main.from, to: main.to }
    const changes = resolveDynamicVars(
      view.state.doc.toString(),
      { faker, now: new Date() },
      range,
    )
    if (changes.length === 0) {
      notify.info(
        range ? m.vars_resolve_none_selection() : m.vars_resolve_none(),
      )
      return
    }
    view.dispatch({ changes, userEvent: 'input.vars' })
    notify.success(m.vars_resolved({ count: changes.length }))
  })
  return true
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
  if (activeFormat().formatOnSave) formatActive()
  notify.success(m.saved_locally())
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
  notify.success(m.copied())
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
    notify.info(m.highlight_no_tag())
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
