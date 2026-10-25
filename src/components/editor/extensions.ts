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
import { Compartment, Facet, StateField } from '@codemirror/state'
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
  // Same treatment as tag highlights, in the variable colour.
  '.cm-var': {
    color: 'var(--syntax-var)',
    backgroundColor: 'color-mix(in oklch, var(--syntax-var) 20%, transparent)',
    boxShadow: 'inset 0 -1.5px 0 var(--syntax-var)',
    borderRadius: '3px',
  },
  '.cm-tag-hl': {
    backgroundColor: 'color-mix(in oklch, var(--hl) 20%, transparent)',
    boxShadow: 'inset 0 -1.5px 0 var(--hl)',
    borderRadius: '3px',
  },
  '.cm-line.cm-tag-hl-line': {
    boxShadow: 'inset 2px 0 0 var(--hl)',
    backgroundColor: 'color-mix(in oklch, var(--hl) 5%, transparent)',
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
      class: 'cm-var',
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

function buildTagHighlights(view: EditorView): DecorationSet {
  const rules = view.state.facet(tagHighlightsFacet)
  if (rules.size === 0) return Decoration.none
  const doc = view.state.doc
  const tree = syntaxTree(view.state)
  const decos: Array<Range<Decoration>> = []
  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter(node) {
        if (node.name !== 'TagName') return
        const parent = node.node.parent?.name
        if (
          parent !== 'OpenTag' &&
          parent !== 'CloseTag' &&
          parent !== 'SelfClosingTag'
        ) {
          return
        }
        const color = rules.get(doc.sliceString(node.from, node.to))
        if (!color) return
        const style = `--hl: ${color}`
        decos.push(
          Decoration.mark({ class: 'cm-tag-hl', attributes: { style } }).range(
            node.from,
            node.to,
          ),
        )
        // Mark the element's lines once, from its open tag.
        if (parent === 'CloseTag') return
        const element = node.node.parent?.parent
        if (!element) return
        const first = doc.lineAt(Math.max(element.from, from)).number
        const last = doc.lineAt(Math.min(element.to, to)).number
        for (let n = first; n <= last; n++) {
          decos.push(
            Decoration.line({
              class: 'cm-tag-hl-line',
              attributes: { style },
            }).range(doc.line(n).from),
          )
        }
      },
    })
  }
  return Decoration.set(decos, true)
}

const tagHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildTagHighlights(view)
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state) ||
        update.startState.facet(tagHighlightsFacet) !==
          update.state.facet(tagHighlightsFacet)
      ) {
        this.decorations = buildTagHighlights(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations },
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
