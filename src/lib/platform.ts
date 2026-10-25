export const isMac =
  typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform)

/** Modifier key labels as shown in shortcuts. */
export const mod = isMac ? '⌘' : 'Ctrl'
export const alt = isMac ? '⌥' : 'Alt'
