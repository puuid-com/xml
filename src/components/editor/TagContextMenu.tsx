import { IconBookmark, IconVariable } from '@tabler/icons-react'
import { useState } from 'react'

import { leafAt } from './actions'
import { editorStore, getView } from './editor-store'
import { tagAt } from './syntax'
import { notify } from '#/components/app/notice-store'
import { askVariableValue } from '#/components/app/ui-store'
import { CopyPathMenuItems } from '#/components/inspector/CopyPathMenuItems'
import {
  HighlightMenuItems,
  PinMenuItem,
  TagMenuHeader,
} from '#/components/highlights/TagMenuItems'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { setDefault } from '#/lib/store/defaults'
import { isVariableName } from '#/lib/store/variables'
import { elementAt } from '#/lib/xml/locate'
import { findVars } from '#/lib/xml/vars'
import { m } from '#/paraglide/messages'
import type { EditorView } from '@codemirror/view'
import type { XmlElement } from '#/lib/xml/model'

/** Name of the plain `<<name>>` variable at `pos`, if any. */
function varAt(view: EditorView, pos: number) {
  const line = view.state.doc.lineAt(pos)
  const match = findVars(line.text).find(
    (v) => line.from + v.from <= pos && pos <= line.from + v.to,
  )
  return match && isVariableName(match.name) ? match.name : null
}

/**
 * Right-click on a tag in the editor offers to highlight it or copy its
 * path, and on a variable to set its value. Anywhere else the browser's own
 * menu shows, so copy and paste stay at hand.
 */
export function TagContextMenu({ children }: { children: React.ReactNode }) {
  const [tag, setTag] = useState<string | null>(null)
  const [leaf, setLeaf] = useState<{ name: string; value: string } | null>(null)
  const [element, setElement] = useState<XmlElement | null>(null)
  const [variable, setVariable] = useState<string | null>(null)

  const onContextMenu = (e: React.MouseEvent) => {
    const view = getView()
    const pos = view?.posAtCoords({ x: e.clientX, y: e.clientY })
    const name = view && pos != null ? tagAt(view.state, pos) : null
    const varName = view && pos != null ? varAt(view, pos) : null
    setVariable(varName)
    // Neither on a tag nor a variable: keep the event from the trigger.
    if (pos == null || (!name && !varName)) {
      e.stopPropagation()
      return
    }
    setTag(name)
    if (!name) {
      setLeaf(null)
      setElement(null)
      return
    }
    const el = leafAt(pos)
    setLeaf(el?.name === name ? el : null)
    const at = elementAt(editorStore.state.doc.nodes, pos)
    setElement(at?.name === name ? at : null)
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
        className="w-72"
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          getView()?.focus()
        }}
      >
        {variable && (
          <ContextMenuItem onSelect={() => askVariableValue(variable)}>
            <IconVariable />
            {m.variables_set_value()}
          </ContextMenuItem>
        )}
        {variable && tag && <ContextMenuSeparator />}
        {tag && <TagMenuHeader tag={tag} el={element} />}
        {tag && <HighlightMenuItems tag={tag} />}
        {tag && element && (
          <>
            <ContextMenuSeparator />
            <CopyPathMenuItems el={element} />
          </>
        )}
        {tag && leaf && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() => {
                setDefault(leaf.name, leaf.value)
                notify.success(m.defaults_saved({ name: leaf.name }))
              }}
            >
              <IconBookmark />
              {m.defaults_save_current()}
            </ContextMenuItem>
            <PinMenuItem tag={leaf.name} />
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
