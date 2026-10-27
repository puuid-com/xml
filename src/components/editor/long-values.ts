import { syntaxTree } from '@codemirror/language'
import { Compartment, Facet, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'

import { notify } from '#/components/app/notice-store'
import { decodeString } from '#/lib/json/parse'
import { m } from '#/paraglide/messages'
import type { EditorState, Extension, Range } from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'

// Values longer than the limit show only their two ends, with a chip in
// between that gives the size, expands the value and copies it. Display only:
// the document, search and save still see the full text.

/** Characters kept visible at each end of a shortened value. */
export const LONG_VALUE_EDGE = 16

/** Shortest value that is shortened, or 0 to show every value in full. */
const limitFacet = Facet.define<number, number>({
  combine: (values) => values.at(-1) ?? 0,
})

const limitCompartment = new Compartment()

/** Effect that changes the length limit; 0 turns shortening off. */
export function setLongValueLimit(limit: number) {
  return limitCompartment.reconfigure(limitFacet.of(limit))
}

/** Expands (true) or shortens again (false) the value starting at `from`. */
const toggleValue = StateEffect.define<{ from: number; open: boolean }>({
  map: (value, changes) => ({ ...value, from: changes.mapPos(value.from) }),
})

export interface LongValue {
  /** The value without surrounding whitespace, or the JSON string's quotes. */
  from: number
  to: number
  /** The text a copy puts on the clipboard. */
  text: string
}

/** Values in the document longer than `limit` characters. */
export function longValues(state: EditorState, limit: number) {
  const values: Array<LongValue> = []
  if (limit <= 0) return values
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === 'Text') {
        if (node.to - node.from <= limit) return false
        const raw = state.sliceDoc(node.from, node.to)
        const start = raw.length - raw.trimStart().length
        const text = raw.trim()
        if (text.length <= limit) return false
        const from = node.from + start
        values.push({ from, to: from + text.length, text })
        return false
      }
      if (node.name === 'String') {
        // JSON keys are PropertyName, so a String here is always a value.
        if (node.to - node.from - 2 <= limit) return false
        values.push({
          from: node.from + 1,
          to: node.to - 1,
          text: decodeString(state.sliceDoc(node.from, node.to)),
        })
        return false
      }
      return undefined
    },
  })
  return values
}

function formatSize(text: string) {
  const bytes = new TextEncoder().encode(text).length
  if (bytes < 1024) return m.long_value_bytes({ count: bytes })
  const kb = bytes / 1024
  if (kb < 1024) return m.long_value_kb({ size: kb.toFixed(1) })
  return m.long_value_mb({ size: (kb / 1024).toFixed(1) })
}

const COPY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z"/><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"/></svg>'

const COLLAPSE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6 -6l6 6"/></svg>'

function copyValue(text: string) {
  void navigator.clipboard.writeText(text)
  notify.success(m.copied(), { detail: formatSize(text) })
}

function button(className: string, title: string, onClick: () => void) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = className
  el.title = title
  el.setAttribute('aria-label', title)
  // Keep the editor from moving the cursor under the chip.
  el.addEventListener('mousedown', (event) => event.preventDefault())
  el.addEventListener('click', (event) => {
    event.preventDefault()
    onClick()
  })
  return el
}

/** The `… size [copy] …` chip that stands in for the middle of a value. */
class ShortenedWidget extends WidgetType {
  constructor(
    readonly value: LongValue,
    readonly size: string,
  ) {
    super()
  }

  eq(other: ShortenedWidget) {
    return (
      other.value.from === this.value.from &&
      other.value.to === this.value.to &&
      other.size === this.size
    )
  }

  toDOM(view: EditorView) {
    const chip = document.createElement('span')
    chip.className = 'cm-long-value'
    const expand = button('cm-long-value-size', m.long_value_expand(), () =>
      view.dispatch({
        effects: toggleValue.of({ from: this.value.from, open: true }),
      }),
    )
    expand.textContent = `… ${this.size} …`
    const copy = button('cm-long-value-copy', m.long_value_copy(), () =>
      copyValue(this.value.text),
    )
    copy.innerHTML = COPY_ICON
    chip.appendChild(expand)
    chip.appendChild(copy)
    return chip
  }

  ignoreEvent() {
    return true
  }
}

/** Sits after an expanded value, to copy it or shorten it again. */
class ExpandedWidget extends WidgetType {
  constructor(readonly value: LongValue) {
    super()
  }

  eq(other: ExpandedWidget) {
    return (
      other.value.from === this.value.from && other.value.to === this.value.to
    )
  }

  toDOM(view: EditorView) {
    const chip = document.createElement('span')
    chip.className = 'cm-long-value'
    const collapse = button('cm-long-value-size', m.long_value_collapse(), () =>
      view.dispatch({
        effects: toggleValue.of({ from: this.value.from, open: false }),
      }),
    )
    collapse.innerHTML = COLLAPSE_ICON
    const copy = button('cm-long-value-copy', m.long_value_copy(), () =>
      copyValue(this.value.text),
    )
    copy.innerHTML = COPY_ICON
    chip.appendChild(collapse)
    chip.appendChild(copy)
    return chip
  }

  ignoreEvent() {
    return true
  }
}

interface LongValueState {
  /** Start of each value the user expanded, mapped through edits. */
  open: ReadonlySet<number>
  values: Array<LongValue>
  decorations: DecorationSet
}

function hidden(value: LongValue) {
  return {
    from: value.from + LONG_VALUE_EDGE,
    to: value.to - LONG_VALUE_EDGE,
  }
}

function build(
  state: EditorState,
  open: ReadonlySet<number>,
): Omit<LongValueState, 'open'> {
  const values = longValues(state, state.facet(limitFacet))
  const ranges: Array<Range<Decoration>> = values.map((value) => {
    if (open.has(value.from)) {
      return Decoration.widget({
        widget: new ExpandedWidget(value),
        side: 1,
      }).range(value.to)
    }
    const { from, to } = hidden(value)
    return Decoration.replace({
      widget: new ShortenedWidget(value, formatSize(value.text)),
    }).range(from, to)
  })
  return { values, decorations: Decoration.set(ranges, true) }
}

/** Values the selection lands inside, e.g. after a search jump, open up. */
function openAtSelection(
  state: EditorState,
  values: ReadonlyArray<LongValue>,
  open: Set<number>,
) {
  let changed = false
  for (const range of state.selection.ranges) {
    for (const value of values) {
      if (open.has(value.from)) continue
      const { from, to } = hidden(value)
      // Inside one value, so select-all doesn't open every value.
      const inside = range.from >= value.from && range.to <= value.to
      if (inside && range.to > from && range.from < to) {
        open.add(value.from)
        changed = true
      }
    }
  }
  return changed
}

const longValueField = StateField.define<LongValueState>({
  create(state) {
    const open = new Set<number>()
    return { open, ...build(state, open) }
  },
  update(value, tr) {
    let open = value.open
    if (tr.docChanged && open.size > 0) {
      open = new Set([...open].map((pos) => tr.changes.mapPos(pos)))
    }
    for (const effect of tr.effects) {
      if (!effect.is(toggleValue)) continue
      const next = new Set(open)
      if (effect.value.open) next.add(effect.value.from)
      else next.delete(effect.value.from)
      open = next
    }
    const stale =
      open !== value.open ||
      tr.docChanged ||
      syntaxTree(tr.startState) !== syntaxTree(tr.state) ||
      tr.startState.facet(limitFacet) !== tr.state.facet(limitFacet)
    let built = stale ? build(tr.state, open) : value
    if (tr.selection) {
      const next = new Set(open)
      if (openAtSelection(tr.state, built.values, next)) {
        open = next
        built = build(tr.state, open)
      }
    }
    if (built === value) return value
    return { open, values: built.values, decorations: built.decorations }
  },
  provide: (field) => [
    EditorView.decorations.from(field, (value) => value.decorations),
    EditorView.atomicRanges.of((view) => view.state.field(field).decorations),
  ],
})

/** Shortens values longer than `limit` characters; 0 shows them in full. */
export function shortenLongValues(limit: number): Extension {
  return [limitCompartment.of(limitFacet.of(limit)), longValueField]
}
