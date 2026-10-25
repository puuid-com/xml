import {
  IconArrowDown,
  IconArrowUp,
  IconHighlightOff,
  IconPin,
  IconPinnedOff,
} from '@tabler/icons-react'

import { SwatchMenuRow } from './SwatchMenuRow'
import { revealTag } from '#/components/editor/actions'
import { editorStore } from '#/components/editor/editor-store'
import { ContextMenuItem, ContextMenuLabel } from '#/components/ui/context-menu'
import { useHighlights } from '#/hooks/use-highlights'
import { usePins } from '#/hooks/use-pins'
import { formatPath, pathFormats } from '#/lib/paths'
import { removeHighlight, setHighlight } from '#/lib/store/highlights'
import { togglePin } from '#/lib/store/pins'
import { m } from '#/paraglide/messages'
import type { XmlElement } from '#/lib/xml/model'

// Context menu items shared by every place that names a tag: the editor,
// the structure tree, highlight chips and pinned fields.

/** Names the tag a menu acts on, with the element's path when known. */
export function TagMenuHeader({
  tag,
  el,
}: {
  tag: string
  el?: XmlElement | null
}) {
  const json = el ? !!el.json : editorStore.state.doc.language === 'json'
  const path =
    el && formatPath(editorStore.state.doc.nodes, el, pathFormats(el)[0])
  return (
    <ContextMenuLabel className="-mx-1 -mt-1 mb-1 border-b bg-muted/50 px-3 py-2 font-mono">
      <div className="truncate text-[13px] text-syntax-tag">
        {json ? tag : `<${tag}>`}
      </div>
      {path && (
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {path}
        </div>
      )}
    </ContextMenuLabel>
  )
}

/** Inline colour dots for a tag, plus Remove once it has a highlight. */
export function HighlightMenuItems({ tag }: { tag: string }) {
  const rule = useHighlights().find((r) => r.tag === tag)
  return (
    <>
      <SwatchMenuRow
        label={m.highlight_label()}
        value={rule?.color}
        onSelect={(color) => setHighlight(tag, color)}
      />
      {rule && (
        <ContextMenuItem onSelect={() => removeHighlight(rule.id)}>
          <IconHighlightOff />
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
      {pinned ? <IconPinnedOff /> : <IconPin />}
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
