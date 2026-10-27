import { coalesce, eq, useLiveQuery } from '@tanstack/react-db'

import { useActiveProfileId } from './use-profiles'
import { pinsCollection } from '#/lib/store/pins'

/** Pinned tags of the active profile, in their saved order. */
export function usePins() {
  const profileId = useActiveProfileId()
  const { data } = useLiveQuery({
    query: (q) =>
      q
        .from({ pin: pinsCollection })
        .where(({ pin }) => eq(pin.profileId, profileId))
        .orderBy(({ pin }) => coalesce(pin.order, pin.createdAt), 'asc'),
  })
  return data
}
