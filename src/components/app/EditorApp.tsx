import {
  IconFilePlus,
  IconFileUpload,
  IconFolderOpen,
  IconJson,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useDefaultLayout } from 'react-resizable-panels'

import { AppHeader } from './AppHeader'
import { ArchiveDialog } from './ArchiveDialog'
import { keepWorkspaceSafe, reportSaveFailed } from './backup'
import { CommandMenu } from './CommandMenu'
import {
  CloseDialog,
  DefaultsConfirmDialog,
  RenameDialog,
  RestoreDialog,
  VariableValueDialog,
} from './Dialogs'
import {
  ACCEPTED_TYPES,
  canOpenFromDisk,
  dropFiles,
  importFiles,
  newFile,
  newJsonFile,
  pickFromDisk,
} from './files'
import { OpenSharedDialog, ShareLinkDialog } from './ShareDialog'
import { SidePanel } from './SidePanel'
import { StatusBar } from './StatusBar'
import { TabStrip } from './TabStrip'
import { useAppShortcuts } from './use-app-shortcuts'
import { setCompareId, setMobileView, uiStore } from './ui-store'
import { CodeEditor } from '#/components/editor/CodeEditor'
import { QuickHighlight } from '#/components/highlights/QuickHighlight'
import {
  DeleteProfileDialog,
  ProfileDialog,
} from '#/components/profiles/ProfileDialogs'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useOpenFiles } from '#/hooks/use-files'
import { useMediaQuery } from '#/hooks/use-media-query'
import { shortcutLabel, shortcuts } from '#/lib/shortcuts'
import { onSaveFailed } from '#/lib/store/files'
import { sessionStore, setActive, setPanelOpen } from '#/lib/store/session'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

// The diff package is only needed while comparing, so it loads on first use.
const CompareView = lazy(() =>
  import('#/components/compare/CompareView').then((mod) => ({
    default: mod.CompareView,
  })),
)

export function EditorApp() {
  const files = useOpenFiles()
  const storedActive = useSelector(sessionStore, (s) => s.activeId)
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

  useEffect(() => onSaveFailed(reportSaveFailed), [])

  const inUse = files.length > 0
  useEffect(() => {
    if (inUse) keepWorkspaceSafe()
  }, [inUse])

  // A comparison belongs to the tab it was opened from, and needs the other
  // tab to stay open.
  const storedCompareId = useSelector(uiStore, (s) => s.compareId)
  const compareId =
    storedCompareId &&
    storedCompareId !== activeId &&
    files.some((f) => f.id === storedCompareId)
      ? storedCompareId
      : null
  useEffect(() => setCompareId(null), [activeId])
  useEffect(() => {
    if (storedCompareId && !compareId) setCompareId(null)
  }, [storedCompareId, compareId])

  // Browsers that can write back to the file open it with a handle.
  const openFromDisk = () => {
    if (canOpenFromDisk()) void pickFromDisk()
    else inputRef.current?.click()
  }

  useAppShortcuts({
    activeId,
    fileIds: files.map((f) => f.id),
    onOpenFromDisk: openFromDisk,
    onTogglePanel: () => {
      if (wide) setPanelOpen(!sessionStore.state.panelOpen)
      else
        setMobileView(
          uiStore.state.mobileView === 'editor' ? 'structure' : 'editor',
        )
    },
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
        dropFiles(e.dataTransfer)
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
          wide ? (
            <DesktopWorkspace fileId={activeId} compareId={compareId} />
          ) : (
            <MobileWorkspace fileId={activeId} compareId={compareId} />
          )
        ) : (
          <Welcome onOpenFromDisk={openFromDisk} />
        )}
      </main>
      <StatusBar />

      <RenameDialog />
      <ArchiveDialog />
      <CommandMenu activeId={activeId} onOpenFromDisk={openFromDisk} />
      <CloseDialog openIds={files.map((f) => f.id)} />
      <DefaultsConfirmDialog />
      <RestoreDialog />
      <VariableValueDialog />
      <ProfileDialog />
      <DeleteProfileDialog />
      <QuickHighlight />
      <ShareLinkDialog activeId={activeId} />
      <OpenSharedDialog />

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

interface WorkspaceProps {
  fileId: string
  /** Tab to compare with, shown in place of the editor. */
  compareId: string | null
}

/**
 * The editor, or a comparison in its place. The editor stays mounted while
 * hidden, so its state, undo history and the toolbar keep working.
 */
function EditorOrCompare({
  fileId,
  compareId,
  layout,
}: WorkspaceProps & { layout: 'split' | 'unified' }) {
  return (
    <>
      <div className={cn('h-full', compareId && 'hidden')}>
        <CodeEditor fileId={fileId} />
      </div>
      {compareId && (
        <Suspense>
          <CompareView fileId={fileId} otherId={compareId} layout={layout} />
        </Suspense>
      )}
    </>
  )
}

function DesktopWorkspace({ fileId, compareId }: WorkspaceProps) {
  const panelOpen = useSelector(sessionStore, (s) => s.panelOpen)
  const layout = useDefaultLayout({
    id: 'xml-main-h',
    panelIds: panelOpen ? ['editor', 'side'] : ['editor'],
  })

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      defaultLayout={layout.defaultLayout}
      onLayoutChanged={layout.onLayoutChanged}
    >
      <ResizablePanel id="editor" minSize="25">
        <EditorOrCompare fileId={fileId} compareId={compareId} layout="split" />
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
  )
}

export function MobileWorkspace({ fileId, compareId }: WorkspaceProps) {
  const view = useSelector(uiStore, (s) => s.mobileView)
  useEffect(() => setMobileView('editor'), [fileId])

  return (
    <Tabs
      value={view}
      onValueChange={(value) =>
        setMobileView(value === 'structure' ? 'structure' : 'editor')
      }
      className="h-full min-h-0 gap-0"
    >
      <TabsList
        variant="line"
        aria-label={m.workspace_views()}
        className="h-11! w-full shrink-0 border-b p-0"
      >
        <TabsTrigger value="editor" className="h-full! text-sm after:bottom-0!">
          {m.nav_editor()}
        </TabsTrigger>
        <TabsTrigger
          value="structure"
          className="h-full! text-sm after:bottom-0!"
        >
          {m.panel_structure()}
        </TabsTrigger>
      </TabsList>
      {/* Keep CodeMirror alive so tree edits, selection and undo still work. */}
      <TabsContent
        value="editor"
        forceMount
        className="min-h-0 overflow-hidden data-[state=inactive]:hidden"
      >
        <EditorOrCompare
          fileId={fileId}
          compareId={compareId}
          layout="unified"
        />
      </TabsContent>
      <TabsContent
        value="structure"
        forceMount
        className="min-h-0 overflow-hidden bg-muted/20 data-[state=inactive]:hidden"
      >
        <SidePanel />
      </TabsContent>
    </Tabs>
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
