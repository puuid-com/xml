/**
 * `pins` grouped by colour, groups in the order their first pin appears.
 * Pins without a colour form the last group.
 */
export function groupPins<T>(
  pins: ReadonlyArray<T>,
  colorOf: (pin: T) => string | undefined,
): Array<Array<T>> {
  const groups = new Map<string, Array<T>>()
  const plain: Array<T> = []
  for (const pin of pins) {
    const color = colorOf(pin)?.toLowerCase()
    if (!color) {
      plain.push(pin)
      continue
    }
    const group = groups.get(color)
    if (group) group.push(pin)
    else groups.set(color, [pin])
  }
  return plain.length ? [...groups.values(), plain] : [...groups.values()]
}
