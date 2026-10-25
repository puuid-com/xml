import { NodeInspector } from '#/components/inspector/NodeInspector'
import { XmlTree } from '#/components/inspector/XmlTree'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '#/components/ui/resizable'
import { m } from '#/paraglide/messages'

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex h-8 shrink-0 items-center border-b px-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  )
}

/** Structure tree on top, inspector for the selected element below. */
export function SidePanel() {
  return (
    <ResizablePanelGroup orientation="vertical" id="xml-side-panel">
      <ResizablePanel id="tree" defaultSize="60" minSize="20">
        <div className="flex h-full min-h-0 flex-col">
          <PanelTitle>{m.panel_structure()}</PanelTitle>
          <div className="min-h-0 flex-1">
            <XmlTree />
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel id="inspector" defaultSize="40" minSize="15">
        <div className="flex h-full min-h-0 flex-col">
          <PanelTitle>{m.panel_inspector()}</PanelTitle>
          <div className="flex min-h-0 flex-1 flex-col">
            <NodeInspector />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
