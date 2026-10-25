import { toast } from 'sonner'

import { setFileProfile } from '#/lib/store/files'
import {
  activeProfileId,
  profilesCollection,
  profilesList,
} from '#/lib/store/profiles'
import { sessionStore } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

/** Switches the active file to a profile, and so to its settings. */
export async function switchProfile(profileId: string, announce = false) {
  const fileId = sessionStore.state.activeId
  const profile = profilesCollection.get(profileId)
  if (!fileId || !profile) return
  await setFileProfile(fileId, profileId)
  // Keyboard switches have no menu to show the result.
  if (announce)
    toast(m.profile_switched({ name: profile.name }), { id: 'profile' })
}

/** Cycles the active file through the profiles, in order. */
export function switchToNextProfile() {
  const profiles = profilesList()
  const index = profiles.findIndex((p) => p.id === activeProfileId())
  const next = profiles.at((index + 1) % profiles.length)
  if (next) void switchProfile(next.id, true)
}

/** Switches the active file to the profile at `index`, oldest first. */
export function switchToProfileAt(index: number) {
  const profile = profilesList().at(index)
  if (profile) void switchProfile(profile.id, true)
}
