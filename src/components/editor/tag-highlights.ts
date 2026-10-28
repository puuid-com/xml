import { syntaxTree } from '@codemirror/language'
import { Compartment, Facet, Prec } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view'

import { namedTag, treeChanged } from './syntax'
import { localName } from '#/lib/names'
import type { Range } from '@codemirror/state'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'

// User highlight rules: a wash over every matching tag, its name and brackets
// inked in the rule's colour.

/** Local tag name (no prefix) → CSS colour, for user highlight rules. */
const tagHighlightsFacet = Facet.define<
  ReadonlyMap<string, string>,
  ReadonlyMap<string, string>
>({
  combine: (values) => values.at(-1) ?? new Map(),
})

const tagHighlightsCompartment = new Compartment()

function rulesChanged(update: ViewUpdate) {
  return (
    update.startState.facet(tagHighlightsFacet) !==
    update.state.facet(tagHighlightsFacet)
  )
}

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
        const tag = namedTag(node.node, doc)
        const color = tag && rules.get(localName(tag.name))
        if (!tag || !color) return
        const attributes = { style: `--hl: ${color}` }
        tags.push(
          Decoration.mark({ class: 'hl-tag', attributes }).range(
            tag.from,
            tag.to,
          ),
        )
        const ink = Decoration.mark({ class: 'hl-ink', attributes })
        for (const range of tag.inks) inks.push(ink.range(range.from, range.to))
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
        treeChanged(update) ||
        rulesChanged(update)
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

export function tagHighlights(rules: ReadonlyMap<string, string>) {
  return [
    tagHighlightsCompartment.of(tagHighlightsFacet.of(rules)),
    tagHighlighter,
  ]
}

/** Effect that swaps in new highlight rules. */
export function setTagHighlights(rules: ReadonlyMap<string, string>) {
  return tagHighlightsCompartment.reconfigure(tagHighlightsFacet.of(rules))
}
