import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CompareView } from './CompareView'
import {
  setCompareId,
  setCompareIgnoreFormatting,
  uiStore,
} from '#/components/app/ui-store'
import { TooltipProvider } from '#/components/ui/tooltip'
import { createFile, filesCollection } from '#/lib/store/files'

function clearFiles() {
  for (const file of [...filesCollection.values()]) {
    filesCollection.delete(file.id)
  }
}

function open(a: string, b: string, layout: 'split' | 'unified' = 'split') {
  const original = createFile('before.xml', a)
  const changed = createFile('after.xml', b)
  setCompareId(original.id)
  render(
    <TooltipProvider>
      <CompareView fileId={changed.id} otherId={original.id} layout={layout} />
    </TooltipProvider>,
  )
  return { original, changed }
}

beforeEach(clearFiles)

afterEach(() => {
  setCompareId(null)
  setCompareIgnoreFormatting(false)
  clearFiles()
})

describe('CompareView', () => {
  it('shows formatting differences unless told to ignore them', async () => {
    open('<r><a>1</a></r>', '<r>\n  <a>1</a>\n</r>\n')
    expect(await screen.findByText('Differences: 1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('switch', { name: 'Ignore formatting' }))
    expect(await screen.findByText('No differences')).toBeInTheDocument()
  })

  it('still marks real changes with formatting ignored', async () => {
    setCompareIgnoreFormatting(true)
    open('<r><a>1</a><b>2</b></r>', '<r>\n  <a>1</a>\n  <b>3</b>\n</r>')
    expect(await screen.findByText('Differences: 1')).toBeInTheDocument()
    expect(
      document.querySelector('.cm-merge-a .cm-changedText'),
    ).toHaveTextContent('2')
    expect(
      document.querySelector('.cm-merge-b .cm-changedText'),
    ).toHaveTextContent('3')
  })

  it('says when a side cannot be formatted', async () => {
    setCompareIgnoreFormatting(true)
    open('<r><a>1</a></r>', '<r><a>1</r>')
    expect(
      await screen.findByText('Shown as written: after.xml has errors'),
    ).toBeInTheDocument()
  })

  it('follows edits to either file', async () => {
    const { changed } = open('<r/>', '<r/>', 'unified')
    expect(await screen.findByText('No differences')).toBeInTheDocument()
    act(() => {
      filesCollection.update(changed.id, (draft) => {
        draft.content = '<r>\n  <a/>\n</r>'
      })
    })
    expect(await screen.findByText('Differences: 1')).toBeInTheDocument()
  })

  it('closes with Escape or the close button', () => {
    open('<r/>', '<r/>')
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' })
    expect(uiStore.state.compareId).toBeNull()

    setCompareId('x')
    fireEvent.click(screen.getByRole('button', { name: 'Close comparison' }))
    expect(uiStore.state.compareId).toBeNull()
  })
})
