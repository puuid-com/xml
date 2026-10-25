import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import {
  HighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language'
import { lintGutter, linter } from '@codemirror/lint'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, Facet, Prec, StateField } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

import { xmlSupport } from './xml-language'
import { parseXml } from '#/lib/xml/parse'
import { varRegExp } from '#/lib/xml/vars'
import { m } from '#/paraglide/messages'
import type { Extension, Range } from '@codemirror/state'
import type { DecorationSet, KeyBinding, ViewUpdate } from '@codemirror/view'
import type { XmlDocument } from '#/lib/xml/model'

/** The cached file this editor state belongs to. */
export const fileIdField = StateField.define<string>({
  create: () => '',
  update: (value) => value,
})

// Colours come from CSS tokens, so one theme serves light and dark.
const theme = EditorView.theme({
  '&': {
    height: '100%',
    // Keeps gutter and marker z-indexes from escaping above dialogs.
    isolation: 'isolate',
    fontSize: '13px',
    color: 'var(--foreground)',
    backgroundColor: 'var(--background)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.65',
  },
  '.cm-content': { caretColor: 'var(--foreground)', padding: '12px 0' },
  '.cm-line': { padding: '0 16px 0 8px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--foreground)' },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    { backgroundColor: 'var(--syntax-selection)' },
  '.cm-activeLine': { backgroundColor: 'var(--syntax-active-line)' },
  '.cm-gutters': {
    backgroundColor: 'var(--background)',
    color: 'var(--syntax-gutter)',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--foreground)',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 16px' },
  '.cm-foldGutter .cm-gutterElement': {
    color: 'var(--syntax-gutter)',
    cursor: 'pointer',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--muted)',
    border: 'none',
    color: 'var(--muted-foreground)',
    padding: '0 6px',
    borderRadius: '9999px',
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'var(--syntax-match)',
    outline: 'none',
  },
  '.cm-selectionMatch': { backgroundColor: 'var(--syntax-match)' },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in oklch, var(--hl-amber) 30%, transparent)',
    outline: '1px solid color-mix(in oklch, var(--hl-amber) 60%, transparent)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'color-mix(in oklch, var(--hl-amber) 55%, transparent)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--popover)',
    color: 'var(--popover-foreground)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '12px',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--secondary)',
    color: 'var(--foreground)',
  },
  '.cm-diagnostic': { padding: '6px 10px', borderLeftWidth: '3px' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--destructive)' },
  '.cm-lintRange-error': {
    backgroundImage: 'none',
    textDecoration: 'underline wavy var(--destructive)',
    textUnderlineOffset: '3px',
    textDecorationSkipInk: 'none',
  },
  '.cm-lint-marker-error': { content: 'none' },
  '.cm-panels': {
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
  },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border)' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--border)' },
  '.cm-panel.cm-search': {
    padding: '8px 12px',
    fontFamily: 'var(--font-sans)',
    fontSize: '12px',
  },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': {
    fontSize: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--input)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    backgroundImage: 'none',
  },
  // Ticks over the scrollbar track where highlighted tags open.
  '.cm-hl-markers': {
    position: 'absolute',
    top: '0',
    right: '0',
    bottom: '0',
    width: '6px',
    pointerEvents: 'none',
    zIndex: '201',
  },
  '.cm-hl-markers > div': {
    position: 'absolute',
    left: '0',
    right: '0',
    height: '2px',
  },
})

const highlightStyle = HighlightStyle.define([
  { tag: t.tagName, color: 'var(--syntax-tag)' },
  { tag: t.attributeName, color: 'var(--syntax-attr)' },
  { tag: t.attributeValue, color: 'var(--syntax-value)' },
  { tag: [t.angleBracket, t.definitionOperator], color: 'var(--syntax-punct)' },
  { tag: t.character, color: 'var(--syntax-entity)' },
  { tag: t.blockComment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  {
    tag: [t.processingInstruction, t.documentMeta, t.special(t.string)],
    color: 'var(--syntax-meta)',
  },
  { tag: t.invalid, color: 'var(--destructive)' },
])

const varDecorator = new MatchDecorator({
  regexp: varRegExp(),
  decoration: (match) =>
    Decoration.mark({
      class: 'cm-var var-chip',
      attributes: { title: m.var_tooltip({ name: match[1] }) },
    }),
})

const varHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = varDecorator.createDeco(view)
    }
    update(update: ViewUpdate) {
      this.decorations = varDecorator.updateDeco(update, this.decorations)
    }
  },
  { decorations: (v) => v.decorations },
)

/** Tag name → CSS colour, for user highlight rules. */
export const tagHighlightsFacet = Facet.define<
  ReadonlyMap<string, string>,
  ReadonlyMap<string, string>
>({
  combine: (values) => values.at(-1) ?? new Map(),
})

export const tagHighlightsCompartment = new Compartment()

const tagBrackets = new Set([
  'StartTag',
  'StartCloseTag',
  'EndTag',
  'SelfCloseEndTag',
])

interface TagHighlights {
  /** Wash over the whole tag, brackets and attributes included. */
  tags: DecorationSet
  /** Highlight-coloured text for the tag name and its brackets. */
  inks: DecorationSet
}

function buildTagHighlights(view: EditorView): TagHighlights {
  const rules = view.state.facet(tagHighlightsFacet)
  if (rules.size === 0) return { tags: Decoration.none, inks: Decoration.none }
  const doc = view.state.doc
  const tree = syntaxTree(view.state)
  const tags: Array<Range<Decoration>> = []
  const inks: Array<Range<Decoration>> = []
  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter(node) {
        if (node.name !== 'TagName') return
        const tag = node.node.parent
        if (
          !tag ||
          (tag.name !== 'OpenTag' &&
            tag.name !== 'CloseTag' &&
            tag.name !== 'SelfClosingTag')
        ) {
          return
        }
        const color = rules.get(doc.sliceString(node.from, node.to))
        if (!color) return
        const attributes = { style: `--hl: ${color}` }
        tags.push(
          Decoration.mark({ class: 'hl-tag', attributes }).range(
            tag.from,
            tag.to,
          ),
        )
        const ink = Decoration.mark({ class: 'hl-ink', attributes })
        inks.push(ink.range(node.from, node.to))
        for (let child = tag.firstChild; child; child = child.nextSibling) {
          if (tagBrackets.has(child.name) && child.to > child.from) {
            inks.push(ink.range(child.from, child.to))
          }
        }
      },
    })
  }
  return { tags: Decoration.set(tags, true), inks: Decoration.set(inks, true) }
}

const tagHighlighter = ViewPlugin.fromClass(
  class {
    highlights: TagHighlights
    constructor(view: EditorView) {
      this.highlights = buildTagHighlights(view)
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state) ||
        update.startState.facet(tagHighlightsFacet) !==
          update.state.facet(tagHighlightsFacet)
      ) {
        this.highlights = buildTagHighlights(update.view)
      }
    }
  },
  {
    provide: (plugin) => [
      // Lower-precedence marks wrap higher ones, so the lowest keeps each
      // wash one span around the syntax tokens instead of a box per token.
      Prec.lowest(
        EditorView.decorations.of(
          (view) => view.plugin(plugin)?.highlights.tags ?? Decoration.none,
        ),
      ),
      EditorView.decorations.of(
        (view) => view.plugin(plugin)?.highlights.inks ?? Decoration.none,
      ),
    ],
  },
)

interface Marker {
  /** Fraction of the document height. */
  top: number
  color: string
}

function collectMarkers(view: EditorView): Array<Marker> {
  const rules = view.state.facet(tagHighlightsFacet)
  if (rules.size === 0) return []
  if (view.contentHeight <= view.scrollDOM.clientHeight) return []
  const doc = view.state.doc
  const seen = new Set<string>()
  const markers: Array<Marker> = []
  syntaxTree(view.state).iterate({
    enter(node) {
      if (node.name !== 'TagName') return
      const parent = node.node.parent?.name
      if (parent !== 'OpenTag' && parent !== 'SelfClosingTag') return
      const color = rules.get(doc.sliceString(node.from, node.to))
      if (!color) return
      const top = view.lineBlockAt(node.from).top / view.contentHeight
      // Ticks closer than about a pixel would draw on top of each other.
      const key = `${Math.round(top * 1000)}:${color}`
      if (seen.has(key)) return
      seen.add(key)
      markers.push({ top, color })
    },
  })
  return markers
}

const highlightMarkers = ViewPlugin.fromClass(
  class {
    dom: HTMLElement
    constructor(readonly view: EditorView) {
      this.dom = document.createElement('div')
      this.dom.className = 'cm-hl-markers'
      this.dom.setAttribute('aria-hidden', 'true')
      view.dom.appendChild(this.dom)
      this.schedule()
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.geometryChanged ||
        update.heightChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state) ||
        update.startState.facet(tagHighlightsFacet) !==
          update.state.facet(tagHighlightsFacet)
      ) {
        this.schedule()
      }
    }
    schedule() {
      this.view.requestMeasure({
        key: this,
        read: collectMarkers,
        write: (markers) => {
          this.dom.replaceChildren(
            ...markers.map(({ top, color }) => {
              const tick = document.createElement('div')
              tick.style.top = `${top * 100}%`
              tick.style.backgroundColor = color
              return tick
            }),
          )
        },
      })
    }
    destroy() {
      this.dom.remove()
    }
  },
)

export interface EditorCallbacks {
  onParse: (fileId: string, doc: XmlDocument) => void
  onChange: (fileId: string, update: ViewUpdate) => void
  onCursor: (update: ViewUpdate) => void
  keys: ReadonlyArray<KeyBinding>
}

/** Everything an editor state needs; shared by all files. */
export function editorExtensions(
  callbacks: EditorCallbacks,
  highlights: ReadonlyMap<string, string>,
): Extension {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    foldGutter({
      markerDOM: (open) => {
        const el = document.createElement('span')
        el.textContent = open ? '▾' : '▸'
        return el
      },
    }),
    lintGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    indentUnit.of('  '),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    xmlSupport(),
    syntaxHighlighting(highlightStyle),
    theme,
    varHighlighter,
    tagHighlightsCompartment.of(tagHighlightsFacet.of(highlights)),
    tagHighlighter,
    highlightMarkers,
    // The linter doubles as the parse loop: it runs after typing pauses and
    // publishes the model the tree and status bar read.
    linter(
      (view) => {
        const fileId = view.state.field(fileIdField)
        const doc = parseXml(view.state.doc.toString())
        callbacks.onParse(fileId, doc)
        return doc.errors.map((error) => ({
          from: error.from,
          to: Math.min(error.to, view.state.doc.length),
          severity: 'error' as const,
          message: error.message,
        }))
      },
      { delay: 150 },
    ),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        callbacks.onChange(update.state.field(fileIdField), update)
      }
      if (update.docChanged || update.selectionSet) callbacks.onCursor(update)
    }),
    keymap.of([
      ...callbacks.keys,
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
  ]
}
