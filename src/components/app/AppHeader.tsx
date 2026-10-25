import {
  IconBraces,
  IconChevronDown,
  IconClipboard,
  IconDownload,
  IconFilePlus,
  IconJson,
  IconFileSearch,
  IconFolderOpen,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
  IconPencil,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { askDelete, askRename, setPaletteOpen } from './ui-store'
import { loadJsonSample, loadSample, newFile, newJsonFile } from './files'
import { copyActive, downloadFile } from '#/components/editor/actions'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { mod } from '#/lib/platform'
import { sessionStore, setPanelOpen } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

/** Slim top bar: the logo opens the File menu, then the tabs, then the panel toggle. */
export function AppHeader({
  activeId,
  onOpenFromDisk,
  children,
}: {
  activeId: string | null
  onOpenFromDisk: () => void
  children?: React.ReactNode
}) {
  const panelOpen = useSelector(sessionStore, (s) => s.panelOpen)

  return (
    <header className="flex h-9 shrink-0 items-center border-b">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="mx-1 gap-1 px-1.5"
            aria-label={m.menu_file()}
          >
            <span className="grid size-5 place-items-center bg-foreground text-background">
              <IconBraces className="size-3" />
            </span>
            <IconChevronDown className="size-3! text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuItem onSelect={newFile}>
            <IconFilePlus />
            {m.file_new()}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={newJsonFile}>
            <IconJson />
            {m.file_new_json()}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenFromDisk}>
            <IconFolderOpen />
            {m.file_open_disk()}
            <DropdownMenuShortcut>{mod}O</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPaletteOpen(true)}>
            <IconFileSearch />
            {m.file_open_cached()}
            <DropdownMenuShortcut>{mod}K</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={loadSample}>
            <IconSparkles />
            {m.file_sample()}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={loadJsonSample}>
            <IconSparkles />
            {m.file_sample_json()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!activeId}
            onSelect={() => activeId && askRename(activeId)}
          >
            <IconPencil />
            {m.file_rename()}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!activeId}
            onSelect={() => activeId && downloadFile(activeId)}
          >
            <IconDownload />
            {m.file_download()}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!activeId}
            onSelect={() => void copyActive()}
          >
            <IconClipboard />
            {m.file_copy()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={!activeId}
            onSelect={() => activeId && askDelete(activeId)}
          >
            <IconTrash />
            {m.file_delete()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex min-w-0 flex-1 self-stretch border-x">
        {children}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="mx-1"
            aria-pressed={panelOpen}
            aria-label={m.action_toggle_panel()}
            onClick={() => setPanelOpen(!panelOpen)}
          >
            {panelOpen ? (
              <IconLayoutSidebarRightFilled />
            ) : (
              <IconLayoutSidebarRight />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{m.action_toggle_panel()}</TooltipContent>
      </Tooltip>
    </header>
  )
}
