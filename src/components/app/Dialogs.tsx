import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'
import { useState } from 'react'

import { replaceWorkspace } from './backup'
import { neighbour } from './files'
import { notify } from './notice-store'
import {
  askClose,
  askRename,
  askVariableValue,
  setDefaultsPreview,
  setRestorePreview,
  uiStore,
} from './ui-store'
import { commitDefaultsActive } from '#/components/editor/actions'
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
import { mod } from '#/lib/platform'
import { backupCounts } from '#/lib/store/backup'
import { closeFile, filesCollection, renameFile } from '#/lib/store/files'
import { sessionStore, setActive } from '#/lib/store/session'
import { findVariable, setVariable } from '#/lib/store/variables'
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

export function CloseDialog({ openIds }: { openIds: Array<string> }) {
  const closeId = useSelector(uiStore, (s) => s.closeId)
  const file = closeId ? filesCollection.get(closeId) : undefined
  const [closing, setClosing] = useState(false)

  const confirm = async () => {
    if (!file || closing) return
    const wasActive = sessionStore.state.activeId === file.id
    setClosing(true)
    try {
      if (wasActive) {
        const index = openIds.indexOf(file.id)
        setActive(neighbour(openIds, index) ?? null)
      }
      await closeFile(file.id)
      dropEditorState(file.id)
      askClose(null)
    } catch {
      if (wasActive) setActive(file.id)
      notify.error(m.archive_delete_failed())
    } finally {
      setClosing(false)
    }
  }

  return (
    <AlertDialog
      open={!!file}
      onOpenChange={(open) => {
        if (!open && !closing) askClose(null)
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
          <AlertDialogCancel disabled={closing}>{m.cancel()}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={closing}
            onClick={(event) => {
              event.preventDefault()
              void confirm()
            }}
          >
            {m.close_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Lists the defaults that would change the active file before writing them. */
export function DefaultsConfirmDialog() {
  const preview = useSelector(uiStore, (s) => s.defaultsPreview)

  return (
    <AlertDialog
      open={!!preview}
      onOpenChange={(open) => {
        if (!open) setDefaultsPreview(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.defaults_confirm_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.defaults_confirm_description({ mod })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="-mx-1 flex max-h-64 flex-col overflow-y-auto border-y py-1">
          {preview?.map((rule) => (
            <li
              key={rule.key}
              className="flex items-center gap-3 px-1 py-1.5 font-mono text-xs"
            >
              <span className="w-32 shrink-0 truncate" title={rule.key}>
                {rule.key}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-muted-foreground"
                title={rule.value}
              >
                {rule.value || m.defaults_confirm_empty()}
              </span>
              <span
                className="shrink-0 text-muted-foreground tabular-nums"
                aria-label={m.defaults_confirm_count_label({
                  count: rule.count,
                })}
              >
                {m.defaults_confirm_count({ count: rule.count })}
              </span>
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.cancel()}</AlertDialogCancel>
          <AlertDialogAction onClick={commitDefaultsActive}>
            {m.defaults_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Lists what a backup holds before it replaces the workspace. */
export function RestoreDialog() {
  const preview = useSelector(uiStore, (s) => s.restorePreview)
  const backup = preview?.backup
  const [restoring, setRestoring] = useState(false)
  const counts = backup && backupCounts(backup)
  const rows =
    counts &&
    ([
      [m.restore_count_open(), counts.open],
      [m.restore_count_archived(), counts.archived],
      [m.restore_count_profiles(), counts.profiles],
      [m.restore_count_highlights(), counts.highlights],
      [m.restore_count_pins(), counts.pins],
      [m.restore_count_defaults(), counts.defaults],
    ] as const)

  const confirm = async () => {
    if (!backup || restoring) return
    setRestoring(true)
    // Reports its own failure, so the dialog always closes afterwards.
    await replaceWorkspace(backup)
    setRestoring(false)
    setRestorePreview(null)
  }

  return (
    <AlertDialog
      open={!!backup}
      onOpenChange={(open) => {
        if (!open && !restoring) setRestorePreview(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.restore_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.restore_description({ date: preview?.date ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="-mx-1 flex flex-col border-y py-1 text-xs">
          {rows?.map(([label, count]) => (
            <div key={label} className="flex items-center gap-3 px-1 py-1.5">
              <dt className="min-w-0 flex-1 truncate">{label}</dt>
              <dd className="shrink-0 text-muted-foreground tabular-nums">
                {count}
              </dd>
            </div>
          ))}
        </dl>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={restoring}>
            {m.cancel()}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={restoring}
            onClick={(event) => {
              event.preventDefault()
              void confirm()
            }}
          >
            {m.restore_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Sets the active profile's value for a variable picked in the editor. */
export function VariableValueDialog() {
  const name = useSelector(uiStore, (s) => s.variableName)

  return (
    <Dialog
      open={!!name}
      onOpenChange={(open) => {
        if (!open) askVariableValue(null)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        {name && (
          <VariableValueForm
            key={name}
            name={name}
            value={findVariable(name)?.value ?? ''}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function VariableValueForm({ name, value }: { name: string; value: string }) {
  const form = useForm({
    defaultValues: { value },
    onSubmit: ({ value: submitted }) => {
      setVariable(name, submitted.value)
      askVariableValue(null)
      notify.success(m.variables_saved({ name }))
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
        <DialogTitle>{m.variables_dialog_title({ name })}</DialogTitle>
        <DialogDescription>
          {m.variables_dialog_description()}
        </DialogDescription>
      </DialogHeader>
      <form.Field name="value">
        {(field) => (
          <div className="grid gap-1.5">
            <Label htmlFor="variable-value">{m.variables_value()}</Label>
            <Input
              id="variable-value"
              autoFocus
              className="font-mono"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => askVariableValue(null)}
        >
          {m.cancel()}
        </Button>
        <Button type="submit">{m.variables_save()}</Button>
      </DialogFooter>
    </form>
  )
}
