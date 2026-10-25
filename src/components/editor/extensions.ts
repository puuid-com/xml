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
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxTree,
} from '@codemirror/language'
import { lintGutter, linter } from '@codemirror/lint'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import {
  Compartment,
  Facet,
  Prec,
  StateEffect,
  StateField,
} from '@codemirror/state'
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

import { docLanguage } from './language'
import { namesParent, treeChanged } from './syntax'
import { tagHighlights } from './tag-highlights'
import { editorTheme } from './theme'
import { parseDocument } from '#/lib/document'
import { defaultMatches } from '#/lib/xml/defaults'
import { varRegExp } from '#/lib/xml/vars'
import { m } from '#/paraglide/messages'
import type { Extension, Range } from '@codemirror/state'
import type { DecorationSet, KeyBinding, ViewUpdate } from '@codemirror/view'
import type { DefaultMatch, DefaultRule } from '#/lib/xml/defaults'
import type { XmlDocument } from '#/lib/xml/model'

/** The cached file this editor state belongs to. */
export const fileIdField = StateField.define<string>({
  create: () => '',
  update: (value) => value,
})

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

const parentMark = Decoration.mark({ class: 'cm-tag-parent' })

function buildParentTags(view: EditorView): DecorationSet {
  const tree = syntaxTree(view.state)
  const marks: Array<Range<Decoration>> = []
  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter(node) {
        if (namesParent(node.node))
          marks.push(parentMark.range(node.from, node.to))
      },
    })
  }
  return Decoration.set(marks, true)
}

/** Sets container tags apart from leaf tags so the nesting reads at a glance. */
const parentTags = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildParentTags(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || treeChanged(update)) {
        this.decorations = buildParentTags(update.view)
      }
    }
  },
  {
    // Highest precedence keeps the mark innermost, inside the syntax span, so
    // its colour wins there while user highlight inks still wrap over it.
    provide: (plugin) =>
      Prec.highest(
        EditorView.decorations.of(
          (view) => view.plugin(plugin)?.decorations ?? Decoration.none,
        ),
      ),
  },
)

/** Enabled default-value rules, for marking values that already match. */
const defaultRulesFacet = Facet.define<
  ReadonlyArray<DefaultRule>,
  ReadonlyArray<DefaultRule>
>({
  combine: (values) => values.at(-1) ?? [],
})

const defaultRulesCompartment = new Compartment()

/** Effect that swaps in new default-value rules. */
export function setDefaultRules(rules: ReadonlyArray<DefaultRule>) {
  return defaultRulesCompartment.reconfigure(defaultRulesFacet.of(rules))
}

const setDefaultMarks = StateEffect.define<Array<DefaultMatch>>()

// Built from the parsed model, so it only refreshes when the linter parses.
// In between, the marks follow edits.
const defaultMarks = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(marks, tr) {
    marks = marks.map(tr.changes)
    for (const effect of tr.effects) {
      if (!effect.is(setDefaultMarks)) continue
      marks = Decoration.set(
        effect.value.map(({ key, from, to, differs }) =>
          (differs
            ? Decoration.mark({ class: 'default-differs' })
            : Decoration.mark({
                class: 'cm-default default-chip',
                attributes: { title: m.default_tooltip({ key }) },
              })
          ).range(from, to),
        ),
        true,
      )
    }
    return marks
  },
  provide: (field) => EditorView.decorations.from(field),
})

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
  defaults: ReadonlyArray<DefaultRule>,
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
    editorTheme,
    parentTags,
    varHighlighter,
    tagHighlights(highlights),
    defaultRulesCompartment.of(defaultRulesFacet.of(defaults)),
    defaultMarks,
    // The linter doubles as the parse loop: it runs after typing pauses and
    // publishes the model the tree and status bar read.
    linter(
      (view) => {
        const fileId = view.state.field(fileIdField)
        const doc = parseDocument(
          view.state.doc.toString(),
          view.state.facet(docLanguage),
        )
        callbacks.onParse(fileId, doc)
        view.dispatch({
          effects: setDefaultMarks.of(
            defaultMatches(doc.nodes, view.state.facet(defaultRulesFacet)),
          ),
        })
        return doc.errors.map((error) => ({
          from: error.from,
          to: Math.min(error.to, view.state.doc.length),
          severity: 'error' as const,
          message: error.message,
        }))
      },
      {
        delay: 150,
        // New rules need a fresh parse to mark matching values.
        needsRefresh: (update) =>
          update.startState.facet(defaultRulesFacet) !==
          update.state.facet(defaultRulesFacet),
      },
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
