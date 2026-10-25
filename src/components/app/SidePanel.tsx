import { XmlTree } from '#/components/inspector/XmlTree'
import { m } from '#/paraglide/messages'

/** Structure tree of the active document. */
export function SidePanel() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <h2 className="flex h-8 shrink-0 items-center border-b px-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {m.panel_structure()}
      </h2>
      <div className="min-h-0 flex-1">
        <XmlTree />
      </div>
    </div>
  )
}
