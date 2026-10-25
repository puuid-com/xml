import { IconArrowDown, IconArrowUp } from '@tabler/icons-react'

import { ColorSwatches } from './ColorSwatches'
import { revealTag } from '#/components/editor/actions'
import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '#/components/ui/context-menu'
import { useHighlights } from '#/hooks/use-highlights'
import { usePins } from '#/hooks/use-pins'
import { removeHighlight, setHighlight } from '#/lib/store/highlights'
import { togglePin } from '#/lib/store/pins'
import { m } from '#/paraglide/messages'

// Context menu items shared by every place that names a tag: the editor,
// the structure tree, highlight chips and pinned fields.

/** Colour submenu for a tag, plus Remove once it has a highlight. */
export function HighlightMenuItems({ tag }: { tag: string }) {
  const rule = useHighlights().find((r) => r.tag === tag)
  return (
    <>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          {m.highlight_tag({ name: tag })}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="p-2">
          <ColorSwatches
            value={rule?.color}
            onSelect={(color) => setHighlight(tag, color)}
          />
        </ContextMenuSubContent>
      </ContextMenuSub>
      {rule && (
        <ContextMenuItem onSelect={() => removeHighlight(rule.id)}>
          {m.highlight_remove()}
        </ContextMenuItem>
      )}
    </>
  )
}

/** Pins a tag's value to the side panel, or unpins it. */
export function PinMenuItem({ tag }: { tag: string }) {
  const pinned = usePins().some((p) => p.tag === tag)
  return (
    <ContextMenuItem onSelect={() => togglePin(tag)}>
      {pinned ? m.pin_remove({ name: tag }) : m.pin_tag({ name: tag })}
    </ContextMenuItem>
  )
}

/** Moves the cursor to the next or previous element named `tag`. */
export function MatchNavItems({ tag, count }: { tag: string; count: number }) {
  return (
    <>
      <ContextMenuItem
        disabled={count === 0}
        onSelect={() => revealTag(tag, 1)}
      >
        <IconArrowDown />
        {m.highlight_next()}
      </ContextMenuItem>
      <ContextMenuItem
        disabled={count === 0}
        onSelect={() => revealTag(tag, -1)}
      >
        <IconArrowUp />
        {m.highlight_prev()}
      </ContextMenuItem>
    </>
  )
}
