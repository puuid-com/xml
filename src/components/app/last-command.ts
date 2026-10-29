const storageKey = 'palette-last-command'

/** The cmdk value of the command last run from the palette, if any. */
export function readLastCommand() {
  return localStorage.getItem(storageKey) ?? ''
}

export function saveLastCommand(value: string) {
  if (value) localStorage.setItem(storageKey, value)
}
