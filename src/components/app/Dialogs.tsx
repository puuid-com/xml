import {
  IconCheck,
  IconFileCode,
  IconFilePlus,
  IconFolderOpen,
  IconHighlight,
  IconJson,
  IconReplace,
  IconSparkles,
} from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'
import { useState } from 'react'

import {
  activate,
  loadJsonSample,
  loadSample,
  neighbour,
  newFile,
  newJsonFile,
} from './files'
import {
  askClose,
  askDelete,
  askRename,
  setPaletteOpen,
  uiStore,
} from './ui-store'
import {
  applyDefaultsActive,
  highlightAtCursor,
} from '#/components/editor/actions'
import { dropEditorState } from '#/components/editor/CodeEditor'
import { useTagCounts } from '#/components/highlights/HighlightsBar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '#/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useAllFiles } from '#/hooks/use-files'
import { useHighlights } from '#/hooks/use-highlights'
import { alt } from '#/lib/platform'
import {
  closeFile,
  deleteFile,
  filesCollection,
  renameFile,
} from '#/lib/store/files'
import { setHighlight } from '#/lib/store/highlights'
import { sessionStore, setActive } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function ago(time: number) {
  const minutes = Math.round((time - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  return relative.format(Math.round(hours / 24), 'day')
}

export function FilePalette({
  onOpenFromDisk,
}: {
  onOpenFromDisk: () => void
}) {
  const open = useSelector(uiStore, (s) => s.paletteOpen)

  return (
    <CommandDialog
      open={open}
      onOpenChange={setPaletteOpen}
      title={m.palette_title()}
      description={m.palette_description()}
    >
      <PaletteCommands onOpenFromDisk={onOpenFromDisk} />
    </CommandDialog>
  )
}

// Mounted only while the dialog is open, so the search resets each time.
function PaletteCommands({ onOpenFromDisk }: { onOpenFromDisk: () => void }) {
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
    // Let the dialog hand focus back to the editor before fn moves it.
    requestAnimationFrame(fn)
  }

  return (
    <Command>
      <CommandInput
        placeholder={m.palette_placeholder()}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>{m.palette_empty()}</CommandEmpty>
        {files.length > 0 && (
          <CommandGroup heading={m.palette_files()}>
            {files.map((file) => (
              <CommandItem
                key={file.id}
                value={`${file.name} ${file.id}`}
                onSelect={() => run(() => activate(file.id))}
              >
                <IconFileCode />
                <span className="truncate">{file.name}</span>
                {file.open && (
                  <IconCheck className="size-3 text-muted-foreground" />
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {ago(file.updatedAt)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading={m.palette_actions()}>
          <CommandItem onSelect={() => run(newFile)}>
            <IconFilePlus />
            {m.file_new()}
          </CommandItem>
          <CommandItem onSelect={() => run(newJsonFile)}>
            <IconJson />
            {m.file_new_json()}
          </CommandItem>
          <CommandItem onSelect={() => run(onOpenFromDisk)}>
            <IconFolderOpen />
            {m.file_open_disk()}
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

export function RenameDialog() {
  const renameId = useSelector(uiStore, (s) => s.renameId)
  const file = renameId ? filesCollection.get(renameId) : undefined

  return (
    <Dialog
      open={!!file}
      onOpenChange={(open) => {
        if (!open) askRename(null)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        {file && <RenameForm key={file.id} id={file.id} name={file.name} />}
      </DialogContent>
    </Dialog>
  )
}

function RenameForm({ id, name }: { id: string; name: string }) {
  const form = useForm({
    defaultValues: { name },
    onSubmit: ({ value }) => {
      renameFile(id, value.name)
      askRename(null)
    },
  })

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <DialogHeader>
        <DialogTitle>{m.rename_title()}</DialogTitle>
        <DialogDescription>{m.rename_description()}</DialogDescription>
      </DialogHeader>
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            value.trim() === '' ? m.rename_required() : undefined,
        }}
      >
        {(field) => (
          <div className="grid gap-1.5">
            <Label htmlFor="rename-file">{m.rename_label()}</Label>
            <Input
              id="rename-file"
              autoFocus
              onFocus={(e) => {
                const dot = e.target.value.lastIndexOf('.')
                e.target.setSelectionRange(
                  0,
                  dot > 0 ? dot : e.target.value.length,
                )
              }}
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive">
                {field.state.meta.errors.join(', ')}
              </p>
            )}
          </div>
        )}
      </form.Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => askRename(null)}>
          {m.cancel()}
        </Button>
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={!canSubmit}>
              {m.rename_submit()}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}

export function DeleteDialog({ openIds }: { openIds: Array<string> }) {
  const deleteId = useSelector(uiStore, (s) => s.deleteId)
  const file = deleteId ? filesCollection.get(deleteId) : undefined

  const confirm = () => {
    if (!file) return
    if (sessionStore.state.activeId === file.id) {
      const index = openIds.indexOf(file.id)
      setActive(neighbour(openIds, index) ?? null)
    }
    deleteFile(file.id)
    dropEditorState(file.id)
    askDelete(null)
  }

  return (
    <AlertDialog
      open={!!file}
      onOpenChange={(open) => {
        if (!open) askDelete(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.delete_title({ name: file?.name ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.delete_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.cancel()}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm}>
            {m.delete_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function CloseDialog({ openIds }: { openIds: Array<string> }) {
  const closeId = useSelector(uiStore, (s) => s.closeId)
  const file = closeId ? filesCollection.get(closeId) : undefined

  const confirm = () => {
    if (!file) return
    if (sessionStore.state.activeId === file.id) {
      const index = openIds.indexOf(file.id)
      setActive(neighbour(openIds, index) ?? null)
    }
    closeFile(file.id)
    askClose(null)
  }

  return (
    <AlertDialog
      open={!!file}
      onOpenChange={(open) => {
        if (!open) askClose(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.close_title({ name: file?.name ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.close_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.cancel()}</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>
            {m.close_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
