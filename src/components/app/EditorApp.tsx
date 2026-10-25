import {
  IconFilePlus,
  IconFileUpload,
  IconFolderOpen,
  IconJson,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef, useState } from 'react'
import { useDefaultLayout } from 'react-resizable-panels'

import { AppHeader } from './AppHeader'
import { CommandMenu } from './CommandMenu'
import { CloseDialog, DefaultsConfirmDialog, RenameDialog } from './Dialogs'
import { ACCEPTED_TYPES, importFiles, newFile, newJsonFile } from './files'
import { SidePanel } from './SidePanel'
import { StatusBar } from './StatusBar'
import { TabStrip } from './TabStrip'
import { useAppShortcuts } from './use-app-shortcuts'
import { CodeEditor } from '#/components/editor/CodeEditor'
import { QuickHighlight } from '#/components/highlights/QuickHighlight'
import { Button } from '#/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Kbd } from '#/components/ui/kbd'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '#/components/ui/resizable'
import { useOpenFiles } from '#/hooks/use-files'
import { useMediaQuery } from '#/hooks/use-media-query'
import { shortcutLabel, shortcuts } from '#/lib/shortcuts'
import { sessionStore, setActive } from '#/lib/store/session'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

export function EditorApp() {
  const files = useOpenFiles()
  const storedActive = useSelector(sessionStore, (s) => s.activeId)
  const panelOpen = useSelector(sessionStore, (s) => s.panelOpen)
  const wide = useMediaQuery('(min-width: 768px)')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // Fall back to the first tab when the stored one is gone (closed here
  // or in another browser tab).
  const activeId = files.some((f) => f.id === storedActive)
    ? storedActive
    : (files.at(0)?.id ?? null)
  useEffect(() => {
    if (activeId !== storedActive) setActive(activeId)
  }, [activeId, storedActive])

  const openFromDisk = () => inputRef.current?.click()

  useAppShortcuts({ activeId, onOpenFromDisk: openFromDisk })

  const layout = useDefaultLayout({
    id: `xml-main-${wide ? 'h' : 'v'}`,
    panelIds: panelOpen ? ['editor', 'side'] : ['editor'],
  })

  const hasFiles = (e: React.DragEvent) =>
    e.dataTransfer.types.includes('Files')

  return (
    <div
      className="relative flex h-dvh flex-col overflow-hidden"
      onDragOver={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setDragging(false)
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        setDragging(false)
        void importFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void importFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <AppHeader>
        {files.length > 0 ? (
          <TabStrip files={files} activeId={activeId} />
        ) : (
          <div className="flex-1" />
        )}
      </AppHeader>
      <main id="main" className="min-h-0 flex-1">
        {activeId ? (
          <ResizablePanelGroup
            orientation={wide ? 'horizontal' : 'vertical'}
            defaultLayout={layout.defaultLayout}
            onLayoutChanged={layout.onLayoutChanged}
          >
            <ResizablePanel id="editor" minSize="25">
              <CodeEditor fileId={activeId} />
            </ResizablePanel>
            {panelOpen && (
              <>
                <ResizableHandle />
                <ResizablePanel
                  id="side"
                  defaultSize="36"
                  minSize="20"
                  className="bg-muted/20"
                >
                  <SidePanel />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        ) : (
          <Welcome onOpenFromDisk={openFromDisk} />
        )}
      </main>
      <StatusBar />

      <RenameDialog />
      <CommandMenu activeId={activeId} onOpenFromDisk={openFromDisk} />
      <CloseDialog openIds={files.map((f) => f.id)} />
      <DefaultsConfirmDialog />
      <QuickHighlight />

      <div
        aria-hidden={!dragging}
        className={cn(
          'pointer-events-none absolute inset-2 z-50 hidden place-items-center border-2 border-dashed border-ring bg-background/80',
          dragging && 'grid',
        )}
      >
        <div className="flex flex-col items-center gap-2 text-sm">
          <IconFileUpload className="size-6" />
          {m.drop_files()}
        </div>
      </div>
    </div>
  )
}

function Welcome({ onOpenFromDisk }: { onOpenFromDisk: () => void }) {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconFilePlus />
        </EmptyMedia>
        <EmptyTitle>{m.welcome_title()}</EmptyTitle>
        <EmptyDescription>{m.welcome_body()}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={newFile}>
            <IconFilePlus />
            {m.file_new()}
          </Button>
          <Button variant="outline" onClick={newJsonFile}>
            <IconJson />
            {m.file_new_json()}
          </Button>
          <Button variant="outline" onClick={onOpenFromDisk}>
            <IconFolderOpen />
            {m.file_open_disk()}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {m.welcome_hint_prefix()}{' '}
          <Kbd>{shortcutLabel(shortcuts.palette)}</Kbd>{' '}
          {m.welcome_hint_suffix()}
        </p>
      </EmptyContent>
    </Empty>
  )
}
