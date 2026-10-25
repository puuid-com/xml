import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'
import { useState } from 'react'

import { switchProfile } from './actions'
import { ProfileTag } from './ProfileTag'
import { notify } from '#/components/app/notice-store'
import {
  askDeleteProfile,
  setProfileDialog,
  uiStore,
} from '#/components/app/ui-store'
import { ColorSwatches } from '#/components/highlights/ColorSwatches'
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
import { useProfiles } from '#/hooks/use-profiles'
import { cloneProfile, deleteProfile } from '#/lib/store/profile-actions'
import {
  createProfile,
  nextProfileColor,
  profilesCollection,
  resolveProfile,
  updateProfile,
} from '#/lib/store/profiles'
import { m } from '#/paraglide/messages'
import type { ProfileDialog as ProfileDialogState } from '#/components/app/ui-store'
import type { Profile } from '#/lib/store/profiles'

/** Creates, clones or edits a profile: its name and colour. */
export function ProfileDialog() {
  const state = useSelector(uiStore, (s) => s.profileDialog)
  const source =
    state && state.mode !== 'create'
      ? profilesCollection.get(state.profileId)
      : undefined
  const open = !!state && (state.mode === 'create' || !!source)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setProfileDialog(null)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        {state && open && (
          <ProfileForm
            key={state.mode + (source?.id ?? '')}
            state={state}
            source={source}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProfileForm({
  state,
  source,
}: {
  state: ProfileDialogState
  source: Profile | undefined
}) {
  // Read once: a new profile's colour must not change while the form is open.
  const [initial] = useState(() =>
    state.mode === 'edit' && source
      ? { name: source.name, color: source.color }
      : {
          name: source ? m.profile_copy_name({ name: source.name }) : '',
          color: nextProfileColor(),
        },
  )
  const sourceName = source?.name ?? ''
  const form = useForm({
    defaultValues: initial,
    onSubmit: ({ value }) => {
      if (state.mode === 'edit') {
        updateProfile(state.profileId, value)
      } else {
        const profile =
          state.mode === 'clone'
            ? cloneProfile(state.profileId, value)
            : createProfile(value)
        if (profile) void switchProfile(profile.id)
      }
      setProfileDialog(null)
    },
  })

  const copy = {
    create: {
      title: m.profile_new_title(),
      description: m.profile_new_description(),
      submit: m.profile_create(),
    },
    clone: {
      title: m.profile_clone_title({ name: sourceName }),
      description: m.profile_clone_description(),
      submit: m.profile_create(),
    },
    edit: {
      title: m.profile_edit_title(),
      description: m.profile_edit_description(),
      submit: m.profile_save(),
    },
  }[state.mode]

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.description}</DialogDescription>
      </DialogHeader>
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            value.trim() === '' ? m.profile_name_required() : undefined,
        }}
      >
        {(field) => (
          <div className="grid gap-1.5">
            <Label htmlFor="profile-name">{m.profile_name()}</Label>
            <Input
              id="profile-name"
              autoFocus
              onFocus={(e) => e.target.select()}
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
      <form.Field name="color">
        {(field) => (
          <div className="grid gap-1.5">
            <span className="text-xs font-medium">{m.profile_color()}</span>
            <ColorSwatches
              label={m.profile_color()}
              value={field.state.value}
              onSelect={field.handleChange}
            />
          </div>
        )}
      </form.Field>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => (
          <ProfileTag
            aria-hidden
            className="max-w-full justify-self-start"
            profile={{
              name: values.name.trim() || m.profile_untitled(),
              color: values.color,
            }}
          />
        )}
      </form.Subscribe>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => setProfileDialog(null)}
        >
          {m.cancel()}
        </Button>
        <form.Subscribe
          selector={(s) => s.canSubmit && s.values.name.trim() !== ''}
        >
          {(canSubmit) => (
            <Button type="submit" disabled={!canSubmit}>
              {copy.submit}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}

/** Confirms deleting a profile and names where its files go. */
export function DeleteProfileDialog() {
  const id = useSelector(uiStore, (s) => s.deleteProfileId)
  const profiles = useProfiles()
  const profile = profiles.find((p) => p.id === id)
  const fallback = resolveProfile(
    profiles.filter((p) => p.id !== id),
    null,
  )
  const [deleting, setDeleting] = useState(false)

  const confirm = async () => {
    if (!profile || deleting) return
    setDeleting(true)
    try {
      await deleteProfile(profile.id)
      askDeleteProfile(null)
    } catch {
      notify.error(m.profile_delete_failed())
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog
      open={!!profile && !!fallback}
      onOpenChange={(open) => {
        if (!open && !deleting) askDeleteProfile(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.profile_delete_title({ name: profile?.name ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.profile_delete_description({ fallback: fallback?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>
            {m.cancel()}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault()
              void confirm()
            }}
          >
            {m.profile_delete_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
