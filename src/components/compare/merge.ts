import {
  MergeView,
  getChunks,
  getOriginalDoc,
  originalDocChangeEffect,
  unifiedMergeView,
} from '@codemirror/merge'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { ChangeSet, EditorState } from '@codemirror/state'
import {
  EditorView,
  drawSelection,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view'

import { languageExtension } from '#/components/editor/language'
import { searchNoAutofill } from '#/components/editor/search'
import { editorTheme } from '#/components/editor/theme'
import { DIFF_CONFIG } from '#/lib/compare'
import { diffChange } from '#/lib/xml/edit'
import { m } from '#/paraglide/messages'
import type { Extension } from '@codemirror/state'
import type { DocLanguage } from '#/lib/document'

// Diff marks reuse the destructive and green highlight tokens, kept faint so
// the monochrome editor still reads as text first. Selectors mirror the
// package's base theme so these rules win on precedence.
const removed = (pct: number) =>
  `color-mix(in oklch, var(--destructive) ${pct}%, transparent)`
const added = (pct: number) =>
  `color-mix(in oklch, var(--hl-green) ${pct}%, transparent)`

const compareTheme = EditorView.theme({
  '&.cm-merge-a .cm-changedLine, .cm-deletedChunk': {
    backgroundColor: removed(8),
  },
  '&.cm-merge-b .cm-changedLine': { backgroundColor: added(8) },
  '&.cm-merge-a .cm-changedText, .cm-deletedChunk .cm-deletedText': {
    background: removed(24),
  },
  '&.cm-merge-b .cm-changedText': { background: added(26) },
  '&.cm-merge-b .cm-deletedText': { background: removed(24) },
  '.cm-deletedChunk': { paddingLeft: '0' },
  '.cm-deletedChunk .cm-deletedLine': { padding: '0 16px 0 8px' },
  '&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter': {
    background: 'var(--destructive)',
  },
  '&.cm-merge-b .cm-changedLineGutter': { background: 'var(--hl-green)' },
  '.cm-collapsedLines': {
    padding: '4px 16px',
    fontFamily: 'var(--font-sans)',
    fontSize: '11px',
    color: 'var(--muted-foreground)',
    background: 'var(--muted)',
  },
  '.cm-collapsedLines:hover': { color: 'var(--foreground)' },
  '.cm-collapsedLines:before, .cm-collapsedLines:after': { content: 'none' },
})

const COLLAPSE = { margin: 3, minSize: 4 }

function sideExtensions(language: DocLanguage, editable: boolean): Extension {
  return [
    lineNumbers(),
    highlightSpecialChars(),
    drawSelection(),
    highlightSelectionMatches(),
    EditorState.readOnly.of(true),
    EditorView.editable.of(editable),
    EditorState.phrases.of({
      '$ unchanged lines': m.compare_unchanged_lines({ count: '$' }),
    }),
    keymap.of(searchKeymap),
    searchNoAutofill,
    languageExtension(language),
    editorTheme,
    compareTheme,
  ]
}

export interface CompareSideDoc {
  text: string
  language: DocLanguage
}

export interface CompareHandle {
  /** Brings both sides up to date, keeping scroll and selection. */
  update: (a: string, b: string) => void
  focus: () => void
  destroy: () => void
}

/**
 * Read-only diff of `a` (shown first, as the original) against `b`. Split
 * shows the two side by side; unified shows `b` with `a`'s removed lines
 * inline, for narrow screens.
 */
export function createCompare(
  parent: HTMLElement,
  a: CompareSideDoc,
  b: CompareSideDoc,
  layout: 'split' | 'unified',
  onChunks: (count: number) => void,
): CompareHandle {
  const report = EditorView.updateListener.of((update) => {
    onChunks(getChunks(update.state)?.chunks.length ?? 0)
  })

  if (layout === 'split') {
    const view = new MergeView({
      parent,
      a: { doc: a.text, extensions: sideExtensions(a.language, true) },
      b: {
        doc: b.text,
        extensions: [sideExtensions(b.language, true), report],
      },
      gutter: true,
      highlightChanges: true,
      collapseUnchanged: COLLAPSE,
      diffConfig: DIFF_CONFIG,
    })
    onChunks(view.chunks.length)
    return {
      update(nextA, nextB) {
        const changeA = diffChange(view.a.state.doc.toString(), nextA)
        if (changeA) view.a.dispatch({ changes: changeA })
        const changeB = diffChange(view.b.state.doc.toString(), nextB)
        if (changeB) view.b.dispatch({ changes: changeB })
      },
      focus: () => view.b.focus(),
      destroy: () => view.destroy(),
    }
  }

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: b.text,
      extensions: [
        sideExtensions(b.language, false),
        unifiedMergeView({
          original: a.text,
          mergeControls: false,
          gutter: true,
          highlightChanges: true,
          collapseUnchanged: COLLAPSE,
          diffConfig: DIFF_CONFIG,
        }),
        report,
      ],
    }),
  })
  onChunks(getChunks(view.state)?.chunks.length ?? 0)
  return {
    update(nextA, nextB) {
      const original = getOriginalDoc(view.state)
      const changeA = diffChange(original.toString(), nextA)
      if (changeA) {
        const changes = ChangeSet.of(changeA, original.length)
        view.dispatch({ effects: originalDocChangeEffect(view.state, changes) })
      }
      const changeB = diffChange(view.state.doc.toString(), nextB)
      if (changeB) view.dispatch({ changes: changeB })
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  }
}
