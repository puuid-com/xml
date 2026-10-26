import { IconLink } from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'

import { notify } from './notice-store'
import { ToolbarButton } from './ToolbarButton'
import { setShareOpen, uiStore } from './ui-store'
import { copyShareLink } from '#/components/editor/actions'
import { ProfileTag } from '#/components/profiles/ProfileTag'
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
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { Switch } from '#/components/ui/switch'
import { useDefaults } from '#/hooks/use-defaults'
import { useOpenFiles } from '#/hooks/use-files'
import { useHighlights } from '#/hooks/use-highlights'
import { usePins } from '#/hooks/use-pins'
import { useActiveProfile } from '#/hooks/use-profiles'
import { useVariables } from '#/hooks/use-variables'
import { decodeShare, isShareHash, ShareError } from '#/lib/share'
import type { SharedFile, SharedProfile } from '#/lib/share'
import { createFile } from '#/lib/store/files'
import { setActive } from '#/lib/store/session'
import {
  importSharedProfile,
  matchSharedProfile,
  sharedCounts,
  updateFromShared,
} from '#/lib/store/shared-profile'
import type { Profile } from '#/lib/store/profiles'
import type { SharedProfileMatch } from '#/lib/store/shared-profile'
import { m } from '#/paraglide/messages'

/** Opens the share dialog for the active file. */
export function ShareButton() {
  return (
    <ToolbarButton
      label={m.share_button()}
      size="icon-sm"
      className="mx-1"
      onClick={() => setShareOpen(true)}
    >
      <IconLink />
    </ToolbarButton>
  )
}

/** Picks what a share link of the active file carries, then copies it. */
export function ShareLinkDialog({ activeId }: { activeId: string | null }) {
  const open = useSelector(uiStore, (s) => s.shareOpen)
  const file = useOpenFiles().find((f) => f.id === activeId)

  return (
    <Dialog open={open && !!file} onOpenChange={setShareOpen}>
      <DialogContent className="sm:max-w-md">
        {file && <ShareLinkForm name={file.name} />}
      </DialogContent>
    </Dialog>
  )
}

function ShareLinkForm({ name }: { name: string }) {
  const profile = useActiveProfile()
  const highlights = useHighlights().length
  const pins = usePins().length
  const defaults = useDefaults().length
  const variables = useVariables().length
  const form = useForm({
    defaultValues: { profile: true, variables: true },
    onSubmit: async ({ value }) => {
      if (await copyShareLink(value)) setShareOpen(false)
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
        <DialogTitle>{m.share_title({ name })}</DialogTitle>
        <DialogDescription>{m.share_description()}</DialogDescription>
      </DialogHeader>
      {profile && (
        <div className="-mx-1 flex flex-col border-y py-1">
          <form.Field name="profile">
            {(field) => (
              <OptionSwitch
                id="share-profile"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                label={
                  <>
                    {m.share_include_profile()}
                    <ProfileTag profile={profile} />
                  </>
                }
                detail={m.share_profile_detail({ highlights, pins, defaults })}
              />
            )}
          </form.Field>
          {variables > 0 && (
            <form.Subscribe selector={(s) => s.values.profile}>
              {(withProfile) => (
                <form.Field name="variables">
                  {(field) => (
                    <OptionSwitch
                      id="share-variables"
                      checked={withProfile && field.state.value}
                      disabled={!withProfile}
                      onCheckedChange={field.handleChange}
                      label={m.share_include_variables()}
                      detail={m.share_variables_detail({ count: variables })}
                    />
                  )}
                </form.Field>
              )}
            </form.Subscribe>
          )}
        </div>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShareOpen(false)}
        >
          {m.cancel()}
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(submitting) => (
            <Button type="submit" disabled={submitting}>
              {m.share_copy_confirm()}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}

function OptionSwitch({
  id,
  label,
  detail,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string
  label: React.ReactNode
  detail: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 px-1 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label htmlFor={id} className="gap-2">
          {label}
        </Label>
        <p className="text-muted-foreground">{detail}</p>
      </div>
      <Switch
        id={id}
        size="sm"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

/** Drops the fragment so a reload doesn't ask again. */
function clearHash() {
  const { pathname, search } = window.location
  history.replaceState(history.state, '', pathname + search)
}

/** What opening a link does with the profile it carries. */
type ProfileChoice = 'import' | 'keep' | 'update' | 'ignore'

/** Asks before opening a file carried in a `#share=` link. */
export function OpenSharedDialog() {
  const [shared, setShared] = useState<SharedFile | null>(null)

  useEffect(() => {
    const read = () => {
      const { hash } = window.location
      if (!isShareHash(hash)) return
      decodeShare(hash)
        .then(setShared)
        .catch((error: unknown) => {
          clearHash()
          notify.error(
            error instanceof ShareError && error.reason === 'too-long'
              ? m.share_open_too_large()
              : m.share_open_invalid(),
          )
        })
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  const close = () => {
    clearHash()
    setShared(null)
  }

  return (
    <AlertDialog
      open={!!shared}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <AlertDialogContent>
        {shared && <OpenSharedForm shared={shared} onDone={close} />}
      </AlertDialogContent>
    </AlertDialog>
  )
}

function OpenSharedForm({
  shared,
  onDone,
}: {
  shared: SharedFile
  onDone: () => void
}) {
  // Read once: opening the file shouldn't reshuffle the choices under it.
  const [match] = useState(() =>
    shared.profile ? matchSharedProfile(shared.profile) : null,
  )
  const [choice, setChoice] = useState<ProfileChoice>(
    match?.kind === 'none' ? 'import' : 'keep',
  )
  const current = useActiveProfile()

  const open = () => {
    const profile =
      shared.profile && match && pickProfile(shared.profile, match, choice)
    const file = createFile(
      shared.name,
      shared.content,
      (profile ?? current)?.id,
    )
    setActive(file.id)
    notify.success(
      profile
        ? m.share_opened_profile({ name: file.name, profile: profile.name })
        : m.share_opened({ name: file.name }),
    )
    onDone()
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {m.share_open_title({ name: shared.name })}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {m.share_open_description()}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {shared.profile && match && (
        <ProfileChoices
          shared={shared.profile}
          match={match}
          current={current}
          value={choice}
          onChange={setChoice}
        />
      )}
      <AlertDialogFooter>
        <AlertDialogCancel>{m.share_open_cancel()}</AlertDialogCancel>
        <AlertDialogAction onClick={open}>
          {m.share_open_confirm()}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )
}

/** Applies `choice`; the profile the file opens in, or none for the current one. */
function pickProfile(
  shared: SharedProfile,
  match: SharedProfileMatch,
  choice: ProfileChoice,
) {
  if (choice === 'import') return importSharedProfile(shared)
  if (match.kind === 'none' || choice === 'ignore') return undefined
  if (choice === 'update') updateFromShared(match.profile.id, shared)
  return match.profile
}

function ProfileChoices({
  shared,
  match,
  current,
  value,
  onChange,
}: {
  shared: SharedProfile
  match: SharedProfileMatch
  current: Profile | undefined
  value: ProfileChoice
  onChange: (choice: ProfileChoice) => void
}) {
  const counts = sharedCounts(shared)
  const local = match.kind === 'none' ? null : match.profile
  const options: Array<{
    value: ProfileChoice
    label: string
    detail: string
  }> = [
    ...(local
      ? [
          {
            value: 'keep' as const,
            label: m.share_profile_keep({ name: local.name }),
            detail:
              match.kind === 'same'
                ? m.share_profile_keep_same()
                : m.share_profile_keep_changed(),
          },
        ]
      : []),
    ...(local && match.kind === 'changed'
      ? [
          {
            value: 'update' as const,
            label: m.share_profile_update({ name: local.name }),
            detail: shared.variables
              ? m.share_profile_update_variables()
              : m.share_profile_update_detail(),
          },
        ]
      : []),
    ...(match.kind === 'same'
      ? []
      : [
          {
            value: 'import' as const,
            label: m.share_profile_import(),
            detail: m.share_profile_import_detail(),
          },
        ]),
    // Keeping the matched profile already means the current one.
    ...(!current || local?.id === current.id
      ? []
      : [
          {
            value: 'ignore' as const,
            label: m.share_profile_ignore({ name: current.name }),
            detail: m.share_profile_ignore_detail(),
          },
        ]),
  ]

  return (
    <div className="-mx-1 flex flex-col gap-3 border-y px-1 py-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {m.share_open_profile()}
          <ProfileTag profile={shared} />
        </div>
        <p className="text-muted-foreground">
          {shared.variables
            ? m.share_open_profile_detail({ ...counts })
            : m.share_open_no_variables({ ...counts })}
        </p>
      </div>
      <RadioGroup
        aria-label={m.share_profile_choice()}
        value={value}
        onValueChange={(v) => onChange(v as ProfileChoice)}
        className="gap-0"
      >
        {options.map((option) => (
          <Label
            key={option.value}
            htmlFor={`share-choice-${option.value}`}
            className="items-start gap-3 px-1 py-1.5 leading-normal font-normal hover:bg-muted"
          >
            <RadioGroupItem
              id={`share-choice-${option.value}`}
              value={option.value}
              className="mt-0.5"
            />
            <span className="flex min-w-0 flex-col">
              <span className="text-foreground">{option.label}</span>
              <span className="text-muted-foreground">{option.detail}</span>
            </span>
          </Label>
        ))}
      </RadioGroup>
    </div>
  )
}
