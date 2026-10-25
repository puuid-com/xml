import { Kbd, KbdGroup } from '#/components/ui/kbd'
import type { Shortcut } from '#/lib/shortcuts'

/** A shortcut drawn as one key cap per key. */
export function ShortcutKeys({ shortcut }: { shortcut: Shortcut }) {
  return (
    <KbdGroup>
      {shortcut.keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  )
}
