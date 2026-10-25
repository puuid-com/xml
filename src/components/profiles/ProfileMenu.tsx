import {
  IconCopy,
  IconPencil,
  IconPlus,
  IconSelector,
  IconTrash,
} from '@tabler/icons-react'

import { switchProfile } from './actions'
import { ProfileTag } from './ProfileTag'
import { askDeleteProfile, setProfileDialog } from '#/components/app/ui-store'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { useActiveProfile, useProfiles } from '#/hooks/use-profiles'
import { profileShortcuts, shortcutLabel } from '#/lib/shortcuts'
import { m } from '#/paraglide/messages'

/** Bottom bar control: the active file's profile, and a menu to switch or manage profiles. */
export function ProfileMenu() {
  const profiles = useProfiles()
  const active = useActiveProfile()
  if (!active) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          aria-label={m.profile_label({ name: active.name })}
          title={m.profile_label({ name: active.name })}
          className="gap-1 px-1 font-normal max-md:h-11"
        >
          <ProfileTag profile={active} />
          <IconSelector className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-60">
        <DropdownMenuLabel>{m.profiles_title()}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={active.id}
          onValueChange={(id) => void switchProfile(id)}
        >
          {profiles.map((profile, index) => (
            <DropdownMenuRadioItem key={profile.id} value={profile.id}>
              <ProfileTag profile={profile} className="max-w-40" />
              {profileShortcuts[index] && (
                <DropdownMenuShortcut>
                  {shortcutLabel(profileShortcuts[index])}
                </DropdownMenuShortcut>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setProfileDialog({ mode: 'create' })}>
          <IconPlus />
          {m.profile_new()}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            setProfileDialog({ mode: 'clone', profileId: active.id })
          }
        >
          <IconCopy />
          <span className="truncate">
            {m.profile_clone({ name: active.name })}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            setProfileDialog({ mode: 'edit', profileId: active.id })
          }
        >
          <IconPencil />
          <span className="truncate">
            {m.profile_edit({ name: active.name })}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={profiles.length < 2}
          onSelect={() => askDeleteProfile(active.id)}
        >
          <IconTrash />
          <span className="truncate">
            {m.profile_delete({ name: active.name })}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
