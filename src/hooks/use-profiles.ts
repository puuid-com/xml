import { eq, useLiveQuery } from '@tanstack/react-db'
import { useSelector } from '@tanstack/react-store'

import { filesCollection } from '#/lib/store/files'
import { DEFAULT_FORMAT } from '#/lib/store/format-settings'
import { DEFAULT_PROFILE_ID } from '#/lib/store/persist'
import { profilesCollection, resolveProfile } from '#/lib/store/profiles'
import { sessionStore } from '#/lib/store/session'

/** Every profile, oldest first. */
export function useProfiles() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ profile: profilesCollection })
      .orderBy(({ profile }) => profile.createdAt, 'asc')
      .orderBy(({ profile }) => profile.id, 'asc'),
  )
  return data
}

/** The profile of the active file, whose settings the editor uses. */
export function useActiveProfile() {
  const profiles = useProfiles()
  const fileId = useSelector(sessionStore, (s) => s.activeId)
  const { data } = useLiveQuery({
    query: (q) =>
      q
        .from({ file: filesCollection })
        .where(({ file }) => eq(file.id, fileId ?? ''))
        .select(({ file }) => ({ profileId: file.profileId })),
  })
  return resolveProfile(profiles, data.at(0)?.profileId)
}

export function useActiveProfileId() {
  return useActiveProfile()?.id ?? DEFAULT_PROFILE_ID
}

export function useFormatSettings() {
  return useActiveProfile()?.format ?? DEFAULT_FORMAT
}
