import { PanelHeading } from './PanelHeading'
import { XmlTree } from '#/components/inspector/XmlTree'
import { PinnedFields } from '#/components/pins/PinnedFields'
import { m } from '#/paraglide/messages'

/** Pinned fields and the structure tree of the active document. */
export function SidePanel() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PinnedFields />
      <PanelHeading>{m.panel_structure()}</PanelHeading>
      <div className="min-h-0 flex-1">
        <XmlTree />
      </div>
    </div>
  )
}
