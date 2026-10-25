import { useSelector } from '@tanstack/react-store'

import { PanelHeading } from './PanelHeading'
import { editorStore } from '#/components/editor/editor-store'
import { XmlTree } from '#/components/inspector/XmlTree'
import { PinnedFields } from '#/components/pins/PinnedFields'
import { m } from '#/paraglide/messages'

/** Pinned fields and the structure tree of the active document. */
export function SidePanel() {
  const fileId = useSelector(editorStore, (s) => s.fileId)
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PinnedFields />
      {!fileId && <PanelHeading>{m.panel_structure()}</PanelHeading>}
      <div className="min-h-0 flex-1">
        <XmlTree key={fileId} />
      </div>
    </div>
  )
}
