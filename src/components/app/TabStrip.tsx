import { IconFileCode, IconPlus, IconX } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { useState } from 'react'

import { newFile } from './files'
import { ToolbarButton } from './ToolbarButton'
import { askClose, askRename } from './ui-store'
import { hlStyle } from '#/components/highlights/hl-style'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useFileContent } from '#/hooks/use-files'
import { useProfiles } from '#/hooks/use-profiles'
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

  return (
    <div className="flex h-full min-w-0 flex-1 items-stretch">
      <Tabs
        value={activeId ?? ''}
        onValueChange={setActive}
        className="min-w-0 flex-1 gap-0"
      >
        <TabsList
          variant="line"
          aria-label={m.tabs_label()}
          className="h-full! w-full items-end justify-start gap-0 overflow-x-auto px-2 pt-1.5 pb-0 [scrollbar-width:none]"
        >
          {files.map((file) => {
            const profile = resolveProfile(profiles, file.profileId)
            return (
              <div
                key={file.id}
                draggable
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
                  'chrome-tab group/tab relative flex h-full max-w-56 min-w-24 shrink basis-56 items-stretch rounded-t-lg',
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
            )
          })}
          <ToolbarButton
            label={m.file_new()}
            shortcut={shortcuts.newFile}
            size="icon-sm"
            className="mx-1 shrink-0 self-center rounded-full"
            onClick={newFile}
          >
            <IconPlus />
          </ToolbarButton>
        </TabsList>
      </Tabs>
    </div>
  )
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
