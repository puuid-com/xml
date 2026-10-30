import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { pasteOverStarter, pastedWhole } from './paste'

function paste(doc: string, text: string, from = 0, to = doc.length) {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.single(from, to),
  })
  return state.update(state.replaceSelection(text), {
    userEvent: 'input.paste',
  })
}

describe('pastedWhole', () => {
  it('returns the document when pasting into an empty file', () => {
    expect(pastedWhole(paste('', '<a/>'))).toBe('<a/>')
  })

  it('ignores whitespace left around the pasted text', () => {
    expect(pastedWhole(paste('\n\n', '{}', 1, 1))).toBe('\n{}\n')
  })

  it('returns the document when pasting over everything', () => {
    expect(pastedWhole(paste('<old/>', '<new/>'))).toBe('<new/>')
  })

  it('ignores pastes into existing content', () => {
    expect(pastedWhole(paste('<a></a>', '<b/>', 3, 3))).toBeNull()
  })

  it('ignores typing and blank pastes', () => {
    const state = EditorState.create({ doc: '' })
    const typed = state.update({
      changes: { from: 0, insert: '<a/>' },
      userEvent: 'input.type',
    })
    expect(pastedWhole(typed)).toBeNull()
    expect(pastedWhole(paste('', '  '))).toBeNull()
  })

  it('replaces an untouched starter template', () => {
    const doc = '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>\n'
    const state = EditorState.create({
      doc,
      selection: EditorSelection.single(52),
      extensions: pasteOverStarter,
    })
    const tr = state.update(state.replaceSelection('SH|1|x'), {
      userEvent: 'input.paste',
    })
    expect(tr.newDoc.toString()).toBe('SH|1|x')
    expect(pastedWhole(tr)).toBe('SH|1|x')
  })

  it('pastes into written content as usual', () => {
    const state = EditorState.create({
      doc: '<root><a/></root>',
      selection: EditorSelection.single(6),
      extensions: pasteOverStarter,
    })
    const tr = state.update(state.replaceSelection('<b/>'), {
      userEvent: 'input.paste',
    })
    expect(tr.newDoc.toString()).toBe('<root><b/><a/></root>')
  })
})
