import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { VariableValueDialog } from './Dialogs'
import { reportSaveFailed } from './backup'
import { dismissNotice, noticeStore, notify } from './notice-store'
import { askVariableValue, uiStore } from './ui-store'
import { onSaveFailed, settleWrites } from '#/lib/store/persist'
import { setVariable, variablesCollection } from '#/lib/store/variables'
import { workspaceReady } from '#/lib/store/workspace'

beforeAll(() => workspaceReady())

beforeEach(async () => {
  const ids = [...variablesCollection.keys()]
  if (ids.length) await variablesCollection.delete(ids).isPersisted.promise
  dismissNotice()
  askVariableValue('host')
})

afterEach(async () => {
  vi.restoreAllMocks()
  await settleWrites()
  askVariableValue(null)
  dismissNotice()
})

describe('variable value dialog', () => {
  it('closes and confirms only after the value is persisted', async () => {
    render(<VariableValueDialog />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(uiStore.state.variableName).toBeNull())
    expect(await variablesCollection.utils.exportData()).toEqual([
      expect.objectContaining({ name: 'host', value: 'example.test' }),
    ])
    expect(noticeStore.state?.tone).toBe('success')
  })

  it.each([false, true])(
    'keeps the draft without confirming a refused save (existing: %s)',
    async (existing) => {
      if (existing) await setVariable('host', 'old')!.isPersisted.promise
      const success = vi.spyOn(notify, 'success')
      const stop = onSaveFailed(reportSaveFailed)
      vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
        throw new DOMException('Full', 'QuotaExceededError')
      })
      try {
        render(<VariableValueDialog />)
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: 'keep this draft' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => expect(noticeStore.state?.tone).toBe('error'))
        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
        )
        expect(success).not.toHaveBeenCalled()
        expect(screen.getByRole('textbox')).toHaveValue('keep this draft')
        expect(uiStore.state.variableName).toBe('host')
        const stored = await variablesCollection.utils.exportData()
        expect(stored.map((row) => row.value)).toEqual(existing ? ['old'] : [])
      } finally {
        stop()
      }
    },
  )
})
