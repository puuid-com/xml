import { IconFileCode, IconPlus, IconX } from '@tabler/icons-react'
import { useState } from 'react'

import { neighbour, newFile } from './files'
import { askRename } from './ui-store'
import { Button } from '#/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { closeFile, reorderFile } from '#/lib/store/files'
import { setActive } from '#/lib/store/session'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

interface TabFile {
  id: string
  name: string
}

export function TabStrip({
  files,
  activeId,
}: {
  files: Array<TabFile>
  activeId: string | null
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const close = (id: string) => {
    if (id === activeId) {
      const index = files.findIndex((f) => f.id === id)
      setActive(neighbour(files, index)?.id ?? null)
    }
    closeFile(id)
  }

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
          className="h-full! w-full justify-start gap-0 overflow-x-auto p-0 [scrollbar-width:none]"
        >
          {files.map((file) => (
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
              className={cn(
                'group/tab relative flex h-full shrink-0 items-stretch border-r',
                file.id === activeId && 'bg-background',
                overId === file.id &&
                  dragId !== file.id &&
                  'shadow-[inset_2px_0_0_var(--ring)]',
              )}
            >
              <TabsTrigger
                value={file.id}
                title={file.name}
                onDoubleClick={() => askRename(file.id)}
                onAuxClick={(e) => {
                  if (e.button === 1) close(file.id)
                }}
                className="h-full! max-w-52 flex-none gap-1.5 pr-7 pl-3 font-normal after:bottom-0!"
              >
                <IconFileCode className="size-3.5! text-muted-foreground" />
                <span className="truncate">{file.name}</span>
              </TabsTrigger>
              <button
                type="button"
                aria-label={m.tab_close({ name: file.name })}
                onClick={() => close(file.id)}
                className={cn(
                  'absolute top-1/2 right-1.5 grid size-4 -translate-y-1/2 place-items-center text-muted-foreground opacity-0 group-hover/tab:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100',
                  file.id === activeId && 'opacity-100',
                )}
              >
                <IconX className="size-3" />
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon-sm"
            className="mx-1 self-center"
            aria-label={m.file_new()}
            title={m.file_new()}
            onClick={newFile}
          >
            <IconPlus />
          </Button>
        </TabsList>
      </Tabs>
    </div>
  )
}
