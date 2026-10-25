/** Sets the `--hl` colour that `.hl-tag` and `.hl-ink` draw with. */
export function hlStyle(color: string | undefined) {
  return color ? ({ '--hl': color } as React.CSSProperties) : undefined
}
