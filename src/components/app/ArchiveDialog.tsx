import { IconArchive, IconFileCode, IconRestore } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { useState } from 'react'
import { toast } from 'sonner'

import { ToolbarButton } from './ToolbarButton'
import { setArchiveOpen, setMobileView, uiStore } from './ui-store'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useArchivedFiles } from '#/hooks/use-files'
import { ARCHIVE_LIMIT, restoreFile } from '#/lib/store/files'
import { setActive } from '#/lib/store/session'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

export function ArchiveButton() {
  return (
    <ToolbarButton
      label={m.archive_title()}
      size="icon-sm"
      className="mx-1"
      onClick={() => setArchiveOpen(true)}
    >
      <IconArchive />
    </ToolbarButton>
  )
}

export function ArchiveDialog() {
  const open = useSelector(uiStore, (s) => s.archiveOpen)
  const files = useArchivedFiles()
  const [restoring, setRestoring] = useState<string | null>(null)

  const restore = async (id: string) => {
    setRestoring(id)
    try {
      const restored = await restoreFile(id)
      if (restored) {
        setActive(restored)
        setMobileView('editor')
        setArchiveOpen(false)
        toast.success(m.archive_restored())
      }
    } catch {
      toast.error(m.archive_restore_failed())
    } finally {
      setRestoring(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setArchiveOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.archive_title()}</DialogTitle>
          <DialogDescription>
            {m.archive_description({ count: ARCHIVE_LIMIT })}
          </DialogDescription>
        </DialogHeader>
        {files.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {m.archive_empty()}
          </p>
        ) : (
          <ul className="divide-y border-y">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex min-w-0 items-center gap-3 py-3"
              >
                <IconFileCode className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm" title={file.name}>
                    {file.name}
                  </p>
                  <time
                    dateTime={new Date(file.deletedAt!).toISOString()}
                    className="text-xs text-muted-foreground"
                  >
                    {new Intl.DateTimeFormat(getLocale(), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(file.deletedAt!)}
                  </time>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 shrink-0 md:h-7"
                  aria-label={m.archive_restore_file({ name: file.name })}
                  disabled={restoring !== null}
                  onClick={() => void restore(file.id)}
                >
                  <IconRestore />
                  {m.archive_restore()}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
