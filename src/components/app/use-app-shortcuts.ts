import { useHotkey } from '@tanstack/react-hotkeys'

import { newFile } from './files'
import { askRename, setPaletteOpen, uiStore } from './ui-store'
import { shortcuts } from '#/lib/shortcuts'
import { sessionStore, setPanelOpen } from '#/lib/store/session'

function togglePalette() {
  setPaletteOpen(!uiStore.state.paletteOpen)
}

/** Page-wide shortcuts for the editor screen. */
export function useAppShortcuts({
  activeId,
  onOpenFromDisk,
}: {
  activeId: string | null
  onOpenFromDisk: () => void
}) {
  useHotkey(shortcuts.palette.hotkey, togglePalette)
  // VS Code's Quick Open; the command menu lists the open files first.
  useHotkey(shortcuts.quickOpen.hotkey, togglePalette)
  useHotkey(shortcuts.openFile.hotkey, onOpenFromDisk)
  useHotkey(shortcuts.newFile.hotkey, newFile)
  useHotkey(shortcuts.togglePanel.hotkey, () =>
    setPanelOpen(!sessionStore.state.panelOpen),
  )
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
