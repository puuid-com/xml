import { EditorState } from '@codemirror/state'
import type { Transaction } from '@codemirror/state'

// Content of files nobody has written in yet: the old new-file template,
// still in tabs opened before files started empty, and the JSON one.
const STARTERS = new Set([
  '<?xmlversion="1.0"encoding="UTF-8"?><root></root>',
  '{}',
])

function isStarter(text: string) {
  return STARTERS.has(text.replace(/\s+/g, ''))
}

function insertedText(tr: Transaction) {
  let inserted = ''
  tr.changes.iterChanges((_fromA, _toA, _fromB, _toB, text) => {
    inserted += text.toString()
  })
  return inserted
}

/**
 * The document after a paste that makes up all of it, such as into an empty
 * file or over a full selection; otherwise null.
 */
export function pastedWhole(tr: Transaction): string | null {
  if (!tr.docChanged || !tr.isUserEvent('input.paste')) return null
  const text = tr.newDoc.toString()
  const trimmed = text.trim()
  return trimmed !== '' && trimmed === insertedText(tr).trim() ? text : null
}

/** Pasting into an untouched starter template replaces the template. */
export const pasteOverStarter = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || !tr.isUserEvent('input.paste')) return tr
  const before = tr.startState.doc.toString()
  if (before.trim() === '' || !isStarter(before)) return tr
  const inserted = insertedText(tr)
  if (inserted.trim() === '') return tr
  return {
    changes: { from: 0, to: before.length, insert: inserted },
    selection: { anchor: inserted.length },
    userEvent: 'input.paste',
    scrollIntoView: true,
  }
})
