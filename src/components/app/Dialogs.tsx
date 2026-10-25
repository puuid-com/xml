import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'

import { neighbour } from './files'
import { askClose, askDelete, askRename, uiStore } from './ui-store'
import { dropEditorState } from '#/components/editor/CodeEditor'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  closeFile,
  deleteFile,
  filesCollection,
  renameFile,
} from '#/lib/store/files'
import { sessionStore, setActive } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

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
