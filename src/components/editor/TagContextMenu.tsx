import { useState } from 'react'

import { tagAt } from './actions'
import { getView } from './editor-store'
import { ColorSwatches } from '#/components/highlights/ColorSwatches'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { useHighlights } from '#/hooks/use-highlights'
import { removeHighlight, setHighlight } from '#/lib/store/highlights'
import { m } from '#/paraglide/messages'

/**
 * Right-click on a tag in the editor offers to highlight it. Anywhere else
 * the browser's own menu shows, so copy and paste stay at hand.
 */
export function TagContextMenu({ children }: { children: React.ReactNode }) {
  const [tag, setTag] = useState<string | null>(null)
  const rules = useHighlights()
  const rule = tag ? rules.find((r) => r.tag === tag) : undefined

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild className="select-auto">
        <div className="h-full min-h-0">
          <div
            className="h-full min-h-0"
            onContextMenu={(e) => {
              const view = getView()
              const pos = view?.posAtCoords({ x: e.clientX, y: e.clientY })
              const name = view && pos != null ? tagAt(view, pos) : null
              // Not on a tag: keep the event from the trigger.
              if (!name) e.stopPropagation()
              else setTag(name)
            }}
          >
            {children}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        className="w-56"
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          getView()?.focus()
        }}
      >
        {tag && (
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
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
