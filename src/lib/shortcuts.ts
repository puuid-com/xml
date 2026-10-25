import { alt, mod } from './platform'

// Keyboard shortcuts: the CodeMirror binding, when the editor handles it, and
// the keys as shown to people.

export interface Shortcut {
  /** CodeMirror key name, for shortcuts bound in the editor keymap. */
  key?: string
  keys: ReadonlyArray<string>
}

export const shortcuts = {
  format: { key: 'Shift-Alt-f', keys: ['⇧', alt, 'F'] },
  save: { key: 'Mod-s', keys: [mod, 'S'] },
  highlight: { key: 'Alt-h', keys: [alt, 'H'] },
  applyDefaults: { key: 'Shift-Alt-d', keys: ['⇧', alt, 'D'] },
  palette: { keys: [mod, 'K'] },
  openFile: { keys: [mod, 'O'] },
} satisfies Record<string, Shortcut>

/** The keys run together, as in `⇧⌥F`. */
export function shortcutLabel(shortcut: Shortcut) {
  return shortcut.keys.join('')
}
