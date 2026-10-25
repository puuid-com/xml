import { useState } from 'react'

import { leafAt } from './actions'
import { getView } from './editor-store'
import { tagAt } from './syntax'
import { notify } from '#/components/app/notice-store'
import {
  HighlightMenuItems,
  PinMenuItem,
} from '#/components/highlights/TagMenuItems'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { setDefault } from '#/lib/store/defaults'
import { m } from '#/paraglide/messages'

/**
 * Right-click on a tag in the editor offers to highlight it. Anywhere else
 * the browser's own menu shows, so copy and paste stay at hand.
 */
export function TagContextMenu({ children }: { children: React.ReactNode }) {
  const [tag, setTag] = useState<string | null>(null)
  const [leaf, setLeaf] = useState<{ name: string; value: string } | null>(null)

  const onContextMenu = (e: React.MouseEvent) => {
    const view = getView()
    const pos = view?.posAtCoords({ x: e.clientX, y: e.clientY })
    const name = view && pos != null ? tagAt(view.state, pos) : null
    // Not on a tag: keep the event from the trigger.
    if (!name || pos == null) {
      e.stopPropagation()
      return
    }
    setTag(name)
    const el = leafAt(pos)
    setLeaf(el?.name === name ? el : null)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild className="select-auto">
        <div className="h-full min-h-0">
          <div className="h-full min-h-0" onContextMenu={onContextMenu}>
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
        {tag && <HighlightMenuItems tag={tag} />}
        {tag && leaf && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() => {
                setDefault(leaf.name, leaf.value)
                notify.success(m.defaults_saved({ name: leaf.name }))
              }}
            >
              {m.defaults_save_current()}
            </ContextMenuItem>
            <PinMenuItem tag={leaf.name} />
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
