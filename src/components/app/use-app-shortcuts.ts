import { useHotkey, useHotkeys } from '@tanstack/react-hotkeys'

import { newFile } from './files'
import { askRename, setPaletteOpen, uiStore } from './ui-store'
import {
  switchToNextProfile,
  switchToProfileAt,
} from '#/components/profiles/actions'
import { profileShortcuts, shortcuts } from '#/lib/shortcuts'
import { sessionStore, setActive, setPanelOpen } from '#/lib/store/session'

function togglePalette() {
  setPaletteOpen(!uiStore.state.paletteOpen)
}

/** Page-wide shortcuts for the editor screen. */
export function useAppShortcuts({
  activeId,
  fileIds = [],
  onOpenFromDisk,
  onTogglePanel = () => setPanelOpen(!sessionStore.state.panelOpen),
}: {
  activeId: string | null
  /** The open tabs, in order. */
  fileIds?: ReadonlyArray<string>
  onOpenFromDisk: () => void
  onTogglePanel?: () => void
}) {
  useHotkey(shortcuts.palette.hotkey, togglePalette)
  // VS Code's Quick Open; the command menu lists the open files first.
  useHotkey(shortcuts.quickOpen.hotkey, togglePalette)
  useHotkey(shortcuts.openFile.hotkey, onOpenFromDisk)
  useHotkey(shortcuts.newFile.hotkey, newFile)
  useHotkey(shortcuts.togglePanel.hotkey, onTogglePanel)
  // Profiles belong to files, so these only act with a file open.
  useHotkey(shortcuts.nextProfile.hotkey, switchToNextProfile, {
    enabled: !!activeId,
  })
  useHotkeys(
    profileShortcuts.map((shortcut, index) => ({
      hotkey: shortcut.hotkey,
      callback: () => switchToProfileAt(index),
    })),
    { enabled: !!activeId },
  )
  // Step through the tabs, wrapping at either end. Text fields and the
  // editor keep the keys when they use them, as for word jumps on Windows.
  const stepTab = (step: number) => (e: KeyboardEvent) => {
    if (e.defaultPrevented || fileIds.length < 2) return
    const target = e.target
    if (target instanceof Element && target.closest('input, textarea, select'))
      return
    e.preventDefault()
    const index = activeId ? fileIds.indexOf(activeId) : -1
    setActive(fileIds.at((index + step) % fileIds.length) ?? null)
  }
  const tabOptions = { ignoreInputs: false, preventDefault: false }
  useHotkey(shortcuts.previousTab.hotkey, stepTab(-1), tabOptions)
  useHotkey(shortcuts.nextTab.hotkey, stepTab(1), tabOptions)
  // Works in the editor too, but not in text fields such as the rename
  // dialog, and not on a tree row, where F2 edits the value.
  useHotkey(
    shortcuts.rename.hotkey,
    (e) => {
      if (e.defaultPrevented || !activeId) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select')) return
      e.preventDefault()
      askRename(activeId)
    },
    { ignoreInputs: false, preventDefault: false },
  )
}
