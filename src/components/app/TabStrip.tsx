import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFileCode,
  IconJson,
  IconPlus,
  IconX,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef, useState } from 'react'

import { newFile } from './files'
import { ToolbarButton } from './ToolbarButton'
import { askClose, askRename, setTabListOpen, uiStore } from './ui-store'
import { hlStyle } from '#/components/highlights/hl-style'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '#/components/ui/command'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useFileContent } from '#/hooks/use-files'
import { useProfiles } from '#/hooks/use-profiles'
import { languageOf } from '#/lib/document'
import { shortcuts } from '#/lib/shortcuts'
import { diskStore } from '#/lib/store/disk'
import { reorderFile } from '#/lib/store/files'
import { profileCss, resolveProfile } from '#/lib/store/profiles'
import { setActive } from '#/lib/store/session'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

interface TabFile {
  id: string
  name: string
  profileId: string
}

// Tabs fit their name, within bounds, however many are open. When they don't
// fit, the strip scrolls and the full list sits behind a menu at its end.

export function TabStrip({
  files,
  activeId,
}: {
  files: Array<TabFile>
  activeId: string | null
}) {
  const profiles = useProfiles()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const edges = useScrollEdges(stripRef)
  const listOpen = useSelector(uiStore, (s) => s.tabListOpen)
  const overflowing = edges.start || edges.end

  // Bring the active tab into view, with a sliver of its neighbours.
  useEffect(() => {
    const strip = stripRef.current
    if (!strip || !activeId) return
    const tab = [...strip.querySelectorAll<HTMLElement>('[data-tab-id]')].find(
      (el) => el.dataset.tabId === activeId,
    )
    if (!tab) return
    const peek = 32
    const left = tab.offsetLeft - peek
    const right = tab.offsetLeft + tab.offsetWidth + peek - strip.clientWidth
    if (strip.scrollLeft > left) strip.scrollLeft = left
    else if (strip.scrollLeft < right) strip.scrollLeft = right
  }, [activeId, files.length])

  const scrollBy = (direction: number) => {
    const strip = stripRef.current
    if (strip) strip.scrollLeft += direction * strip.clientWidth * 0.8
  }

  return (
    <div className="flex h-full min-w-0 flex-1 items-stretch">
      {overflowing && (
        <ToolbarButton
          label={m.tabs_scroll_left()}
          disabled={!edges.start}
          className="ml-1 shrink-0 self-center"
          onClick={() => scrollBy(-1)}
        >
          <IconChevronLeft />
        </ToolbarButton>
      )}
      <Tabs
        value={activeId ?? ''}
        onValueChange={setActive}
        className="min-w-0 flex-initial gap-0"
      >
        <TabsList
          ref={stripRef}
          variant="line"
          aria-label={m.tabs_label()}
          className="relative h-full! w-full items-end justify-start gap-0 overflow-x-auto px-2 pt-1.5 pb-0 [scrollbar-width:none]"
        >
          {files.map((file, index) => {
            const profile = resolveProfile(profiles, file.profileId)
            return (
              <ContextMenu key={file.id}>
                <ContextMenuTrigger asChild>
                  <div
                    draggable
                    data-tab-id={file.id}
                    onDragStart={(e) => {
                      setDragId(file.id)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/x-xml-tab', file.id)
                    }}
                    onDragOver={(e) => {
                      if (!dragId) return
                      e.preventDefault()
                      setOverId(file.id)
                    }}
                    onDragLeave={() => setOverId(null)}
                    onDrop={(e) => {
                      if (!dragId) return
                      e.preventDefault()
                      e.stopPropagation()
                      if (dragId !== file.id) reorderFile(dragId, file.id)
                      setDragId(null)
                      setOverId(null)
                    }}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverId(null)
                    }}
                    data-active={file.id === activeId || undefined}
                    className={cn(
                      'chrome-tab group/tab relative flex h-full max-w-60 min-w-28 shrink-0 items-stretch rounded-t-lg',
                      file.id === activeId
                        ? 'z-10 bg-background'
                        : 'hover:bg-foreground/5',
                      overId === file.id &&
                        dragId !== file.id &&
                        'shadow-[inset_2px_0_0_var(--ring)]',
                    )}
                  >
                    <span
                      aria-hidden
                      className="chrome-tab-divider pointer-events-none absolute top-1/2 left-0 h-4 w-px -translate-y-1/2 bg-border"
                    />
                    <TabsTrigger
                      value={file.id}
                      title={file.name}
                      onDoubleClick={() => askRename(file.id)}
                      onAuxClick={(e) => {
                        if (e.button === 1) askClose(file.id)
                      }}
                      className="h-full! min-w-0 flex-1 justify-start gap-2 rounded-t-lg pr-11 pl-3 font-normal after:hidden md:pr-8"
                    >
                      <IconFileCode className="size-3.5! text-muted-foreground" />
                      {profile ? (
                        <span
                          title={m.profile_label({ name: profile.name })}
                          style={hlStyle(profileCss(profile))}
                          className="hl-tag hl-ink min-w-0 truncate px-1 leading-5"
                        >
                          {file.name}
                          <span className="sr-only">
                            {` (${m.profile_label({ name: profile.name })})`}
                          </span>
                        </span>
                      ) : (
                        <span className="truncate">{file.name}</span>
                      )}
                      <UnsavedMark fileId={file.id} />
                    </TabsTrigger>
                    <button
                      type="button"
                      aria-label={m.tab_close({ name: file.name })}
                      onClick={() => askClose(file.id)}
                      className={cn(
                        'absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:opacity-100 md:right-2 md:size-5 md:opacity-0 md:group-hover/tab:opacity-100',
                        file.id === activeId && 'md:opacity-100',
                      )}
                    >
                      <IconX className="size-3" />
                    </button>
                  </div>
                </ContextMenuTrigger>
                <TabContextMenu files={files} index={index} />
              </ContextMenu>
            )
          })}
        </TabsList>
      </Tabs>
      {overflowing && (
        <ToolbarButton
          label={m.tabs_scroll_right()}
          disabled={!edges.end}
          className="shrink-0 self-center"
          onClick={() => scrollBy(1)}
        >
          <IconChevronRight />
        </ToolbarButton>
      )}
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5 px-1',
          overflowing && 'border-l',
        )}
      >
        <ToolbarButton
          label={m.file_new()}
          shortcut={shortcuts.newFile}
          size="icon-sm"
          className="rounded-full"
          onClick={newFile}
        >
          <IconPlus />
        </ToolbarButton>
        {(overflowing || listOpen) && (
          <TabList files={files} activeId={activeId} open={listOpen} />
        )}
      </div>
    </div>
  )
}

/** Whether `ref` can scroll further left or right. Tracks size and tab changes. */
function useScrollEdges(ref: React.RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const start = el.scrollLeft > 1
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setEdges((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      )
    }
    // Wheels without a horizontal axis scroll the strip sideways.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      if (el.scrollWidth <= el.clientWidth) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    update()
    const resize = new ResizeObserver(update)
    resize.observe(el)
    const tabs = new MutationObserver(update)
    tabs.observe(el, { childList: true })
    el.addEventListener('scroll', update, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      resize.disconnect()
      tabs.disconnect()
      el.removeEventListener('scroll', update)
      el.removeEventListener('wheel', onWheel)
    }
  }, [ref])

  return edges
}

function TabContextMenu({
  files,
  index,
}: {
  files: Array<TabFile>
  index: number
}) {
  const file = files[index]
  const others = files.filter((f) => f.id !== file.id).map((f) => f.id)
  const right = files.slice(index + 1).map((f) => f.id)

  return (
    <ContextMenuContent className="w-56">
      <ContextMenuItem onSelect={() => askRename(file.id)}>
        {m.file_rename()}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => askClose(file.id)}>
        {m.tabs_close()}
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!others.length}
        onSelect={() => askClose(others)}
      >
        {m.tabs_close_others()}
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!right.length}
        onSelect={() => askClose(right)}
      >
        {m.tabs_close_right()}
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => askClose(files.map((f) => f.id))}>
        {m.tabs_close_all()}
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

/** Every open tab in a searchable list, for when the strip can't show them all. */
function TabList({
  files,
  activeId,
  open,
}: {
  files: Array<TabFile>
  activeId: string | null
  open: boolean
}) {
  return (
    <Popover open={open} onOpenChange={setTabListOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton
          label={m.tabs_list()}
          shortcut={shortcuts.tabList}
          size="xs"
          className="font-mono tabular-nums"
        >
          <IconChevronDown />
          {files.length}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <Command loop filter={matchKeywords}>
          <CommandInput placeholder={m.tabs_search()} />
          <CommandList>
            <CommandEmpty>{m.tabs_search_empty()}</CommandEmpty>
            <CommandGroup heading={m.palette_files()}>
              {files.map((file) => (
                <CommandItem
                  key={file.id}
                  value={file.id}
                  keywords={[file.name]}
                  data-checked={file.id === activeId}
                  onSelect={() => {
                    setActive(file.id)
                    setTabListOpen(false)
                  }}
                >
                  {languageOf(file.name, '') === 'json' ? (
                    <IconJson />
                  ) : (
                    <IconFileCode />
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {file.name}
                  </span>
                  <UnsavedMark fileId={file.id} />
                  <button
                    type="button"
                    aria-label={m.tab_close({ name: file.name })}
                    onClick={(e) => {
                      e.stopPropagation()
                      askClose(file.id)
                    }}
                    className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 group-hover/command-item:opacity-100 group-data-selected/command-item:opacity-100 hover:bg-background hover:text-foreground"
                  >
                    <IconX className="size-3" />
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="close-all"
                keywords={[m.tabs_close_all()]}
                onSelect={() => {
                  setTabListOpen(false)
                  askClose(files.map((f) => f.id))
                }}
              >
                {m.tabs_close_all()}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Items are keyed by id, so search only what people can read.
function matchKeywords(
  _value: string,
  search: string,
  keywords?: Array<string>,
) {
  const query = search.toLowerCase()
  return keywords?.some((word) => word.toLowerCase().includes(query)) ? 1 : 0
}

/** A dot on a tab linked to a file on disk whose changes aren't written yet. */
function UnsavedMark({ fileId }: { fileId: string }) {
  const saved = useSelector(diskStore, (links) => links[fileId]?.saved)
  if (saved === undefined) return null
  return <UnsavedDot fileId={fileId} saved={saved} />
}

// Apart from UnsavedMark so only linked tabs follow the content as it's typed.
function UnsavedDot({ fileId, saved }: { fileId: string; saved: string }) {
  const file = useFileContent(fileId)
  if (!file || file.content === saved) return null
  return (
    <span
      role="img"
      aria-label={m.tab_unsaved_disk()}
      title={m.tab_unsaved_disk()}
      className="size-1.5 shrink-0 rounded-full bg-foreground"
    />
  )
}
