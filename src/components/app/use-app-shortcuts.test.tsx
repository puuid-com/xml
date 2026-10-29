import { fireEvent, render } from '@testing-library/react'
import { useSelector } from '@tanstack/react-store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { newFile, newJsonFile } from './files'
import { askRename, setPaletteOpen, setTabListOpen, uiStore } from './ui-store'
import { useAppShortcuts } from './use-app-shortcuts'
import { redoActive, undoActive } from '#/components/editor/actions'
import { sessionStore, setActive, setPanelOpen } from '#/lib/store/session'

vi.mock('./files', () => ({ newFile: vi.fn(), newJsonFile: vi.fn() }))
vi.mock('#/components/editor/actions', () => ({
  undoActive: vi.fn(),
  redoActive: vi.fn(),
}))

const onOpenFromDisk = vi.fn()

function Harness({ children }: { children?: React.ReactNode }) {
  const activeId = useSelector(sessionStore, (s) => s.activeId) ?? 'a'
  useAppShortcuts({ activeId, fileIds: ['a', 'b', 'c'], onOpenFromDisk })
  return <>{children}</>
}

afterEach(() => {
  vi.clearAllMocks()
  askRename(null)
  setPaletteOpen(false)
  setTabListOpen(false)
  setPanelOpen(true)
  setActive(null)
})

describe('useAppShortcuts', () => {
  it('renames the active file with F2, even from the editor', () => {
    const { getByTestId } = render(
      <Harness>
        <div data-testid="editor" contentEditable tabIndex={0} />
      </Harness>,
    )
    fireEvent.keyDown(getByTestId('editor'), { key: 'F2', code: 'F2' })
    expect(uiStore.state.renameId).toBe('a')
  })

  it('leaves F2 alone in text fields and on rows that handle it', () => {
    const { getByRole, getByTestId } = render(
      <Harness>
        <input />
        <div
          data-testid="row"
          tabIndex={0}
          onKeyDown={(e) => e.preventDefault()}
        />
      </Harness>,
    )
    fireEvent.keyDown(getByRole('textbox'), { key: 'F2', code: 'F2' })
    fireEvent.keyDown(getByTestId('row'), { key: 'F2', code: 'F2' })
    expect(uiStore.state.renameId).toBeNull()
  })

  it('creates a file with Mod+Alt+N, whatever character Alt types', () => {
    render(<Harness />)
    fireEvent.keyDown(document, {
      key: '˜',
      code: 'KeyN',
      ctrlKey: true,
      altKey: true,
    })
    expect(newFile).toHaveBeenCalledOnce()
  })

  it('creates a JSON file with Mod+Alt+Shift+N', () => {
    render(<Harness />)
    fireEvent.keyDown(document, {
      key: 'Ñ',
      code: 'KeyN',
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    })
    expect(newJsonFile).toHaveBeenCalledOnce()
    expect(newFile).not.toHaveBeenCalled()
  })

  it('toggles the command menu, side panel and file picker', () => {
    render(<Harness />)
    fireEvent.keyDown(document, { key: 'p', code: 'KeyP', ctrlKey: true })
    expect(uiStore.state.paletteOpen).toBe(true)
    fireEvent.keyDown(document, { key: 'b', code: 'KeyB', ctrlKey: true })
    expect(sessionStore.state.panelOpen).toBe(false)
    fireEvent.keyDown(document, { key: 'o', code: 'KeyO', ctrlKey: true })
    expect(onOpenFromDisk).toHaveBeenCalledOnce()
  })
  it('toggles the list of tabs with Mod+Shift+A', () => {
    render(<Harness />)
    const press = () =>
      fireEvent.keyDown(document, {
        key: 'A',
        code: 'KeyA',
        ctrlKey: true,
        shiftKey: true,
      })
    press()
    expect(uiStore.state.tabListOpen).toBe(true)
    press()
    expect(uiStore.state.tabListOpen).toBe(false)
  })

  it('steps through the tabs with Control and the arrow keys', () => {
    render(<Harness />)
    const press = (key: string) =>
      fireEvent.keyDown(document, { key, code: key, ctrlKey: true })
    press('ArrowRight')
    expect(sessionStore.state.activeId).toBe('b')
    press('ArrowLeft')
    press('ArrowLeft')
    expect(sessionStore.state.activeId).toBe('c')
    press('ArrowRight')
    expect(sessionStore.state.activeId).toBe('a')
  })

  it('leaves Control and the arrow keys to text fields', () => {
    const { getByRole } = render(
      <Harness>
        <input />
      </Harness>,
    )
    fireEvent.keyDown(getByRole('textbox'), {
      key: 'ArrowRight',
      code: 'ArrowRight',
      ctrlKey: true,
    })
    expect(sessionStore.state.activeId).toBeNull()
  })

  it('undoes and redoes the active file from outside the editor', () => {
    const { getByTestId } = render(
      <Harness>
        <div data-testid="row" tabIndex={0} />
      </Harness>,
    )
    const row = getByTestId('row')
    fireEvent.keyDown(row, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(undoActive).toHaveBeenCalledOnce()
    fireEvent.keyDown(row, {
      key: 'Z',
      code: 'KeyZ',
      ctrlKey: true,
      shiftKey: true,
    })
    expect(redoActive).toHaveBeenCalledOnce()
  })

  it('leaves undo to text fields and the editor', () => {
    const { getByRole, getByTestId } = render(
      <Harness>
        <input />
        <div data-testid="editor" contentEditable tabIndex={0} />
      </Harness>,
    )
    const press = (target: Element) =>
      fireEvent.keyDown(target, { key: 'z', code: 'KeyZ', ctrlKey: true })
    press(getByRole('textbox'))
    press(getByTestId('editor'))
    expect(undoActive).not.toHaveBeenCalled()
  })
})
