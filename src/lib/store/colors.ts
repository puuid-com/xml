/** Preset swatches; each maps to a `--hl-<name>` token in styles.css. */
export const HIGHLIGHT_PRESETS = [
  'blue',
  'purple',
  'pink',
  'red',
  'amber',
  'green',
  'teal',
  'gray',
] as const

export type HighlightPreset = (typeof HIGHLIGHT_PRESETS)[number]

export function isPreset(color: string): color is HighlightPreset {
  return (HIGHLIGHT_PRESETS as ReadonlyArray<string>).includes(color)
}

/** CSS colour for a stored highlight or profile colour. */
export function highlightCss(color: string) {
  return isPreset(color) ? `var(--hl-${color})` : color
}

/** First preset not in `used`, so new items get distinct colours. */
export function unusedPreset(used: Iterable<string>): HighlightPreset {
  const taken = new Set(used)
  return HIGHLIGHT_PRESETS.find((p) => !taken.has(p)) ?? HIGHLIGHT_PRESETS[0]
}
