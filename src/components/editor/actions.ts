import { redo, redoDepth, undo, undoDepth } from '@codemirror/commands'

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
  setVarsPreview,
} from '#/components/app/ui-store'
import type { VarsPreview } from '#/components/app/ui-store'
import { sameName } from '#/lib/names'
import { encodeShare, ShareError } from '#/lib/share'
import { filesCollection } from '#/lib/store/files'
import { enabledDefaults } from '#/lib/store/defaults'
import { profileHighlights } from '#/lib/store/highlights'
import {
  activeFormat,
  profilesList,
  resolveProfile,
} from '#/lib/store/profiles'
import { snapshotProfile } from '#/lib/store/shared-profile'
import { variableValues } from '#/lib/store/variables'
import {
  MIME_TYPES,
  documentDefaults,
  formatDocument,
  languageOf,
} from '#/lib/document'
import { defaultSummary } from '#/lib/xml/defaults'
import { resolveVars } from '#/lib/xml/dynamic-vars'
import { diffChange } from '#/lib/xml/edit'
import { allElements, elementAt } from '#/lib/xml/locate'
import { hasName, isLeaf, leafValue } from '#/lib/xml/model'
import { convertVars, varStyleOf, writeVar } from '#/lib/xml/vars'
import type { VarStyle } from '#/lib/xml/vars'
import { m } from '#/paraglide/messages'
import type { EditorView } from '@codemirror/view'

// Commands return `true` so CodeMirror keymaps treat the key as handled.

/** Undoes the active file's last change, such as a tree edit or a format. */
export function undoActive() {
  const view = getView()
  if (view) undo(view)
}

export function redoActive() {
  const view = getView()
  if (view) redo(view)
}

/** How many steps the active file can undo and redo. */
export function historyDepth() {
  const view = getView()
  return view
    ? { undo: undoDepth(view.state), redo: redoDepth(view.state) }
    : { undo: 0, redo: 0 }
}

export function formatActive() {
  const view = getView()
  if (!view) return true
  const {
    removeEmptyLines,
    trimVars,
    stripPrefixes,
    sort,
    customOrder,
    highlightedFirst,
  } = activeFormat()
  const first = highlightedFirst
    ? profileHighlights()
        .filter((r) => r.enabled)
        .map((r) => r.tag)
    : []
  const text = view.state.doc.toString()
  const result = formatDocument(text, activeLanguage(), {
    removeEmptyLines,
    trimVars,
    stripPrefixes,
    sort,
    order: customOrder,
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
 * Fills in the active file's variables: plain ones from the file's profile,
 * dynamic ones such as `<<$randomInt>>` with generated values. Asks to
 * confirm before the file is changed.
 */
export function resolveVarsActive() {
  if (!getView()) return true
  // Faker is large and only needed here, so it loads on first use.
  void import('@faker-js/faker').then(({ faker }) => {
    const { fileId } = editorStore.state
    const file = fileId ? filesCollection.get(fileId) : undefined
    if (!getView() || !file) return
    // Only errors the values brought in are worth a warning.
    const wasValid = parseActive().errors.length === 0
    const result = resolveVars(getText(), {
      faker,
      now: new Date(),
      values: variableValues(file.profileId),
    })
    if (result.count === 0) {
      notify.info(
        result.unresolved > 0
          ? m.vars_resolve_none_set({ count: result.unresolved })
          : m.vars_resolve_none(),
      )
      return
    }
    setVarsPreview({ fileId: file.id, wasValid, ...result })
  })
  return true
}

/** Writes the confirmed values into the file, as one undo step. */
export function commitVarsPreview({
  fileId,
  text,
  count,
  unresolved,
  wasValid,
}: VarsPreview) {
  const view = getView()
  // The preview was made from this file's text, so it only applies there.
  if (!view || editorStore.state.fileId !== fileId) return
  const current = view.state.doc.toString()
  const change = diffChange(current, text)
  if (change) view.dispatch({ changes: change, userEvent: 'input.vars' })
  // Values are written as is, so one with `<` or `&` can break the markup.
  const error = wasValid ? parseActive(text).errors.at(0) : undefined
  const message =
    unresolved > 0
      ? m.vars_resolved_partly({ count, unresolved })
      : m.vars_resolved({ count })
  if (error) {
    notify.error(m.vars_resolved_invalid({ message }), {
      detail: error.message,
      action: {
        label: m.notice_go_to(),
        run: () => {
          if (editorStore.state.fileId === fileId)
            revealRange(error.from, error.to)
        },
      },
    })
    return
  }
  notify.success(message)
}

/** Rewrites every variable in the active file in `style`, as one undo step. */
export function convertVarsActive(style: VarStyle) {
  const view = getView()
  if (!view) return
  const text = view.state.doc.toString()
  const result = convertVars(text, style)
  if (result.count === 0) {
    notify.info(m.vars_convert_none())
    return
  }
  const change = diffChange(text, result.text)
  if (change) view.dispatch({ changes: change, userEvent: 'input.vars' })
  notify.success(m.vars_converted({ count: result.count }))
}

/**
 * Copies `name` as a variable, in the bracket style the active file already
 * uses, `{{name}}` when it has none.
 */
export function copyVar(name: string) {
  const text = getView()?.state.doc.toString() ?? ''
  const value = writeVar(name, varStyleOf(text) ?? 'curly')
  void navigator.clipboard.writeText(value)
  notify.success(m.copied(), { detail: value })
}

/** Leaf element at `pos` with its current text, if any. */
export function leafAt(pos: number) {
  const el = elementAt(editorStore.state.doc.nodes, pos)
  return el && isLeaf(el) && hasName(el)
    ? { name: el.name, value: leafValue(el) }
    : null
}

export function downloadFile(id: string) {
  const file = filesCollection.get(id)
  if (!file) return
  // The editor holds edits that may not be saved yet.
  const active = editorStore.state.fileId === id && getView() !== null
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

/** Elements named `tag`, prefixes aside, in document order. */
function tagMatches(tag: string) {
  return allElements(editorStore.state.doc.nodes).filter(
    (el) => hasName(el) && sameName(el.name, tag),
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

/**
 * Copies a link that carries the active file, compressed, in its fragment,
 * with its profile unless left out. Resolves to whether it was copied.
 */
export async function copyShareLink({
  profile = true,
  variables = true,
}: { profile?: boolean; variables?: boolean } = {}) {
  const { fileId } = editorStore.state
  const file = fileId ? filesCollection.get(fileId) : undefined
  if (!getView() || !file) return false
  const shared = profile
    ? snapshotProfile(
        resolveProfile(profilesList(), file.profileId)?.id ?? '',
        {
          variables,
        },
      )
    : undefined
  try {
    const hash = await encodeShare({
      name: file.name,
      content: getText(),
      profile: shared,
    })
    const { origin, pathname } = window.location
    await navigator.clipboard.writeText(origin + pathname + hash)
    notify.success(m.share_copied(), {
      detail: shared
        ? m.share_copied_profile_detail({ name: shared.name })
        : m.share_copied_detail(),
    })
    return true
  } catch (error) {
    notify.error(
      error instanceof ShareError ? m.share_too_large() : m.share_failed(),
    )
    return false
  }
}
