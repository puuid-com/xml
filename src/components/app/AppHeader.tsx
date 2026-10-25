import {
  IconBraces,
  IconChevronDown,
  IconClipboard,
  IconDownload,
  IconFilePlus,
  IconFileSearch,
  IconFolderOpen,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
  IconPencil,
  IconSparkles,
  IconTrash,
  IconWand,
  IconArrowsMinimize,
} from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'

import { askDelete, askRename, setPaletteOpen } from './ui-store'
import { loadSample, newFile } from './files'
import {
  copyActive,
  downloadFile,
  formatActive,
  minifyActive,
} from '#/components/editor/actions'
import { HighlightsPopover } from '#/components/highlights/HighlightsPopover'
import { LocaleSwitcher } from '#/components/LocaleSwitcher'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Kbd, KbdGroup } from '#/components/ui/kbd'
import { Separator } from '#/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { sessionStore, setInspectorOpen } from '#/lib/store/session'
import { m } from '#/paraglide/messages'
import { site } from '#/site'

const isMac =
  typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl'
const alt = isMac ? '⌥' : 'Alt'

export function AppHeader({
  activeId,
  onOpenFromDisk,
}: {
  activeId: string | null
  onOpenFromDisk: () => void
}) {
  const inspectorOpen = useSelector(sessionStore, (s) => s.inspectorOpen)

  return (
    <header className="flex h-12 shrink-0 items-center gap-0.5 overflow-x-auto border-b px-2 [scrollbar-width:none] sm:gap-1 sm:px-3">
      <Link
        to="/"
        className="mr-1 flex items-center gap-2 text-sm font-semibold tracking-tight sm:mr-2"
      >
        <span className="grid size-6 place-items-center bg-foreground text-background">
          <IconBraces className="size-3.5" />
        </span>
        <span className="hidden sm:inline">{site.name}</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            {m.menu_file()}
            <IconChevronDown className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuItem onSelect={newFile}>
            <IconFilePlus />
            {m.file_new()}
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

      <Separator
        orientation="vertical"
        className="mx-1 hidden data-vertical:h-5 data-vertical:self-center sm:block"
      />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!activeId}
            onClick={formatActive}
          >
            <IconWand />
            <span className="hidden md:inline">{m.action_format()}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <KbdGroup>
            <Kbd>⇧</Kbd>
            <Kbd>{alt}</Kbd>
            <Kbd>F</Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>
      <Button
        variant="ghost"
        size="sm"
        disabled={!activeId}
        onClick={minifyActive}
      >
        <IconArrowsMinimize />
        <span className="hidden md:inline">{m.action_minify()}</span>
      </Button>

      <div className="flex-1" />

      <HighlightsPopover />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-pressed={inspectorOpen}
            aria-label={m.action_toggle_panel()}
            onClick={() => setInspectorOpen(!inspectorOpen)}
          >
            {inspectorOpen ? (
              <IconLayoutSidebarRightFilled />
            ) : (
              <IconLayoutSidebarRight />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{m.action_toggle_panel()}</TooltipContent>
      </Tooltip>
      <LocaleSwitcher />
    </header>
  )
}
