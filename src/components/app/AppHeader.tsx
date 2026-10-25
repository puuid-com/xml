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
} from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'

import { askDelete, askRename, setPaletteOpen } from './ui-store'
import { loadSample, newFile } from './files'
import {
  copyActive,
  downloadFile,
  formatActive,
} from '#/components/editor/actions'
import { DefaultsControls } from '#/components/defaults/DefaultsControls'
import { LocaleSwitcher } from '#/components/LocaleSwitcher'
import { Button } from '#/components/ui/button'
import { ButtonGroup } from '#/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Kbd, KbdGroup } from '#/components/ui/kbd'
import { Label } from '#/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import {
  formatSettingsStore,
  setFormatSetting,
} from '#/lib/store/format-settings'
import { alt, mod } from '#/lib/platform'
import { sessionStore, setPanelOpen } from '#/lib/store/session'
import { m } from '#/paraglide/messages'
import { site } from '#/site'
import type { SortOrder } from '#/lib/xml/format'

/** The app's single top bar: menus, then `children` (tabs, highlights), then view toggles. */
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
    <header className="flex h-10 shrink-0 items-center gap-0.5 border-b pl-2 sm:gap-1 sm:pl-3">
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

      <FormatControls disabled={!activeId} />
      <DefaultsControls disabled={!activeId} />

      <div className="ml-1 flex min-w-0 flex-1 self-stretch border-x sm:ml-2">
        {children}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
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
      <LocaleSwitcher />
      <div className="w-1 shrink-0 sm:w-2" />
    </header>
  )
}

function FormatControls({ disabled }: { disabled: boolean }) {
  const settings = useSelector(formatSettingsStore, (s) => s)

  return (
    <ButtonGroup>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
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
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={m.format_options()}
          >
            <IconChevronDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 gap-0 p-0">
          <PopoverHeader className="px-3 py-2.5">
            <PopoverTitle>{m.format_options()}</PopoverTitle>
          </PopoverHeader>
          <Separator />
          <div className="flex flex-col py-1">
            <SettingSwitch
              id="format-on-save"
              checked={settings.formatOnSave}
              onCheckedChange={(v) => setFormatSetting('formatOnSave', v)}
            >
              {m.format_on_save()}
              <KbdGroup>
                <Kbd>{mod}</Kbd>
                <Kbd>S</Kbd>
              </KbdGroup>
            </SettingSwitch>
            <SettingSwitch
              id="format-remove-empty-lines"
              checked={settings.removeEmptyLines}
              onCheckedChange={(v) => setFormatSetting('removeEmptyLines', v)}
            >
              {m.format_remove_empty_lines()}
            </SettingSwitch>
            <SettingSwitch
              id="format-trim-vars"
              checked={settings.trimVars}
              onCheckedChange={(v) => setFormatSetting('trimVars', v)}
            >
              {m.format_trim_vars()}
            </SettingSwitch>
            <SettingSwitch
              id="format-highlighted-first"
              checked={settings.highlightedFirst}
              onCheckedChange={(v) => setFormatSetting('highlightedFirst', v)}
            >
              {m.format_highlighted_first()}
            </SettingSwitch>
          </div>
          <Separator />
          <div className="flex flex-col gap-2 px-3 py-2.5">
            <span className="text-muted-foreground">{m.format_sort()}</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              className="w-full"
              value={settings.sort}
              onValueChange={(v) => {
                if (v) setFormatSetting('sort', v as SortOrder)
              }}
            >
              <ToggleGroupItem value="none" className="flex-1">
                {m.format_sort_none()}
              </ToggleGroupItem>
              <ToggleGroupItem value="asc" className="flex-1">
                {m.format_sort_asc()}
              </ToggleGroupItem>
              <ToggleGroupItem value="desc" className="flex-1">
                {m.format_sort_desc()}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </PopoverContent>
      </Popover>
    </ButtonGroup>
  )
}

function SettingSwitch({
  id,
  checked,
  onCheckedChange,
  children,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Label
      htmlFor={id}
      className="justify-between gap-4 px-3 py-2 leading-normal hover:bg-muted"
    >
      <span className="flex items-center gap-2">{children}</span>
      <Switch
        id={id}
        size="sm"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </Label>
  )
}
