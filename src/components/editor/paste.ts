import type { Transaction } from '@codemirror/state'

/**
 * The document after a paste that makes up all of it, such as into an empty
 * file or over a full selection; otherwise null.
 */
export function pastedWhole(tr: Transaction): string | null {
  if (!tr.docChanged || !tr.isUserEvent('input.paste')) return null
  let inserted = ''
  tr.changes.iterChanges((_fromA, _toA, _fromB, _toB, text) => {
    inserted += text.toString()
  })
  const text = tr.newDoc.toString()
  const trimmed = text.trim()
  return trimmed !== '' && trimmed === inserted.trim() ? text : null
}
