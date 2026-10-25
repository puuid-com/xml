import {
  IconBraces,
  IconCheck,
  IconChevronDown,
  IconClipboard,
  IconDownload,
  IconFileCode,
  IconFilePlus,
  IconFolderOpen,
  IconHighlight,
  IconJson,
  IconPencil,
  IconReplace,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { useLayoutEffect, useRef, useState } from 'react'

import {
  activate,
  loadJsonSample,
  loadSample,
  newFile,
  newJsonFile,
} from './files'
import { askDelete, askRename, setPaletteOpen, uiStore } from './ui-store'
import {
  applyDefaultsActive,
  copyActive,
  downloadFile,
  highlightAtCursor,
} from '#/components/editor/actions'
import { useTagCounts } from '#/components/highlights/HighlightsBar'
import { Button } from '#/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '#/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { useAllFiles } from '#/hooks/use-files'
import { useHighlights } from '#/hooks/use-highlights'
import { languageOf } from '#/lib/document'
import { alt, mod } from '#/lib/platform'
import { setHighlight } from '#/lib/store/highlights'
import { m } from '#/paraglide/messages'

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function ago(time: number) {
  const minutes = Math.round((time - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  return relative.format(Math.round(hours / 24), 'day')
}

/** The logo opens a searchable menu of files and actions; ⌘K opens it too. */
export function FileMenu({
  activeId,
  onOpenFromDisk,
}: {
  activeId: string | null
  onOpenFromDisk: () => void
}) {
  const open = useSelector(uiStore, (s) => s.paletteOpen)
  const returnFocus = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Runs before Radix moves focus into the menu, so ⌘K then Escape lands
  // back in the editor instead of on the logo.
  useLayoutEffect(() => {
    if (!open) return
    const el = document.activeElement
    returnFocus.current =
      el instanceof HTMLElement &&
      el !== triggerRef.current &&
      el !== document.body
        ? el
        : null
  }, [open])

  return (
    <Popover open={open} onOpenChange={setPaletteOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
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
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 gap-0 p-0"
        onCloseAutoFocus={(e) => {
          if (!returnFocus.current?.isConnected) return
          e.preventDefault()
          returnFocus.current.focus()
        }}
      >
        <FileCommands activeId={activeId} onOpenFromDisk={onOpenFromDisk} />
      </PopoverContent>
    </Popover>
  )
}

// Mounted only while the menu is open, so the search resets each time.
function FileCommands({
  activeId,
  onOpenFromDisk,
}: {
  activeId: string | null
  onOpenFromDisk: () => void
}) {
  const files = useAllFiles()
  const counts = useTagCounts()
  const highlighted = new Set(useHighlights().map((r) => r.tag))
  const [search, setSearch] = useState('')
  // Tags only show once you type, so they don't bury files and actions.
  const tags = search.trim()
    ? [...counts.keys()].filter((t) => !highlighted.has(t)).sort()
    : []

  const run = (fn: () => void) => {
    setPaletteOpen(false)
    // Let the menu hand focus back before fn moves it.
    requestAnimationFrame(fn)
  }

  return (
    <Command>
      <CommandInput
        placeholder={m.palette_placeholder()}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[min(28rem,70vh)]">
        <CommandEmpty>{m.palette_empty()}</CommandEmpty>
        {files.length > 0 && (
          <CommandGroup heading={m.palette_files()}>
            {files.map((file) => (
              <CommandItem
                key={file.id}
                value={`${file.name} ${file.id}`}
                onSelect={() => run(() => activate(file.id))}
              >
                {languageOf(file.name, '') === 'json' ? (
                  <IconJson />
                ) : (
                  <IconFileCode />
                )}
                <span className="truncate font-mono">{file.name}</span>
                {file.id === activeId && (
                  <IconCheck className="size-3 text-muted-foreground" />
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {ago(file.updatedAt)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {activeId && (
          <>
            <CommandSeparator />
            <CommandGroup heading={m.palette_current()}>
              <CommandItem onSelect={() => run(() => askRename(activeId))}>
                <IconPencil />
                {m.file_rename()}
              </CommandItem>
              <CommandItem onSelect={() => run(() => downloadFile(activeId))}>
                <IconDownload />
                {m.file_download()}
              </CommandItem>
              <CommandItem onSelect={() => run(() => void copyActive())}>
                <IconClipboard />
                {m.file_copy()}
              </CommandItem>
              <CommandItem
                className="text-destructive data-selected:text-destructive *:[svg]:text-destructive! data-selected:bg-destructive/10"
                onSelect={() => run(() => askDelete(activeId))}
              >
                <IconTrash />
                {m.file_delete()}
              </CommandItem>
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading={m.palette_actions()}>
          <CommandItem onSelect={() => run(newFile)}>
            <IconFilePlus />
            {m.file_new()}
          </CommandItem>
          <CommandItem onSelect={() => run(newJsonFile)}>
            <IconFilePlus />
            {m.file_new_json()}
          </CommandItem>
          <CommandItem onSelect={() => run(onOpenFromDisk)}>
            <IconFolderOpen />
            {m.file_open_disk()}
            <CommandShortcut>{mod}O</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(loadSample)}>
            <IconSparkles />
            {m.file_sample()}
          </CommandItem>
          <CommandItem onSelect={() => run(loadJsonSample)}>
            <IconSparkles />
            {m.file_sample_json()}
          </CommandItem>
          <CommandItem onSelect={() => run(() => void highlightAtCursor())}>
            <IconHighlight />
            {m.highlight_at_cursor()}
            <CommandShortcut>{alt}H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => void applyDefaultsActive())}>
            <IconReplace />
            {m.defaults_apply()}
            <CommandShortcut>⇧{alt}D</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        {tags.length > 0 && (
          <CommandGroup heading={m.highlights_title()}>
            {tags.map((tag) => (
              <CommandItem
                key={tag}
                value={`highlight ${tag}`}
                onSelect={() => run(() => setHighlight(tag))}
              >
                <IconHighlight />
                <span className="truncate">
                  {m.highlight_tag({ name: tag })}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                  {counts.get(tag)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )
}
