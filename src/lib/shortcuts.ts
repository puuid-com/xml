import { alt, mod } from './platform'
import type { Hotkey } from '@tanstack/react-hotkeys'

// Keyboard shortcuts: the CodeMirror binding, when the editor handles it, the
// app-wide hotkey, when the page handles it, and the keys as shown to people.
// Browsers keep ⌘N and ⌘W for themselves, so file shortcuts that VS Code puts
// there use the same keys as VS Code for the Web instead.

export interface Shortcut {
  /** CodeMirror key name, for shortcuts bound in the editor keymap. */
  key?: string
  /** TanStack Hotkeys binding, for shortcuts that work anywhere on the page. */
  hotkey?: Hotkey
  keys: ReadonlyArray<string>
}

export const shortcuts = {
  format: { key: 'Shift-Alt-f', keys: ['⇧', alt, 'F'] },
  save: { key: 'Mod-s', keys: [mod, 'S'] },
  highlight: { key: 'Alt-h', keys: [alt, 'H'] },
  applyDefaults: { key: 'Shift-Alt-d', keys: ['⇧', alt, 'D'] },
  palette: { hotkey: 'Mod+K', keys: [mod, 'K'] },
  quickOpen: { hotkey: 'Mod+P', keys: [mod, 'P'] },
  openFile: { hotkey: 'Mod+O', keys: [mod, 'O'] },
  newFile: { hotkey: 'Mod+Alt+N', keys: [alt, mod, 'N'] },
  rename: { hotkey: 'F2', keys: ['F2'] },
  togglePanel: { hotkey: 'Mod+B', keys: [mod, 'B'] },
  nextProfile: { hotkey: 'Mod+Alt+P', keys: [alt, mod, 'P'] },
} satisfies Record<string, Shortcut>

/** ⌥⌘1 to ⌥⌘9 switch the current file to the profile in that position. */
export const profileShortcuts = (
  [
    'Mod+Alt+1',
    'Mod+Alt+2',
    'Mod+Alt+3',
    'Mod+Alt+4',
    'Mod+Alt+5',
    'Mod+Alt+6',
    'Mod+Alt+7',
    'Mod+Alt+8',
    'Mod+Alt+9',
  ] satisfies Array<Hotkey>
).map((hotkey, i) => ({ hotkey, keys: [alt, mod, String(i + 1)] }))

/** The keys run together, as in `⇧⌥F`. */
export function shortcutLabel(shortcut: Shortcut) {
  return shortcut.keys.join('')
}
