import { IconCopy, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'

import { switchProfile } from './actions'
import { ProfileTag } from './ProfileTag'
import { ShortcutKeys } from '#/components/app/ShortcutKeys'
import { askDeleteProfile, setProfileDialog } from '#/components/app/ui-store'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { Separator } from '#/components/ui/separator'
import { useActiveProfile, useProfiles } from '#/hooks/use-profiles'
import { profileShortcuts } from '#/lib/shortcuts'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

/** Profiles tab of the settings popover: switch the file's profile, or manage it. */
export function ProfilesPanel() {
  const profiles = useProfiles()
  const active = useActiveProfile()
  if (!active) return null

  return (
    <>
      <RadioGroup
        value={active.id}
        onValueChange={(id) => void switchProfile(id)}
        className="max-h-72 gap-0 overflow-y-auto py-1"
      >
        {profiles.map((profile, index) => (
          <Label
            key={profile.id}
            htmlFor={`profile-${profile.id}`}
            className="justify-between gap-4 px-3 py-2 leading-normal hover:bg-muted"
          >
            <span className="flex min-w-0 items-center gap-2">
              <RadioGroupItem id={`profile-${profile.id}`} value={profile.id} />
              <ProfileTag profile={profile} className="max-w-60" />
            </span>
            {profileShortcuts[index] && (
              <ShortcutKeys shortcut={profileShortcuts[index]} />
            )}
          </Label>
        ))}
      </RadioGroup>
      <Separator />
      <div className="flex flex-col py-1">
        <PanelAction onClick={() => setProfileDialog({ mode: 'create' })}>
          <IconPlus />
          {m.profile_new()}
        </PanelAction>
        <PanelAction
          onClick={() =>
            setProfileDialog({ mode: 'clone', profileId: active.id })
          }
        >
          <IconCopy />
          <span className="truncate">
            {m.profile_clone({ name: active.name })}
          </span>
        </PanelAction>
        <PanelAction
          onClick={() =>
            setProfileDialog({ mode: 'edit', profileId: active.id })
          }
        >
          <IconPencil />
          <span className="truncate">
            {m.profile_edit({ name: active.name })}
          </span>
        </PanelAction>
        <PanelAction
          disabled={profiles.length < 2}
          onClick={() => askDeleteProfile(active.id)}
          className="text-destructive hover:text-destructive"
        >
          <IconTrash />
          <span className="truncate">
            {m.profile_delete({ name: active.name })}
          </span>
        </PanelAction>
      </div>
    </>
  )
}

function PanelAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('justify-start px-3 font-normal', className)}
      {...props}
    />
  )
}
