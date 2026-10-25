import { useLiveQuery } from '@tanstack/react-db'

import { pinsCollection } from '#/lib/store/pins'

/** All pinned tags, oldest first. */
export function usePins() {
  const { data } = useLiveQuery((q) =>
    q.from({ pin: pinsCollection }).orderBy(({ pin }) => pin.createdAt, 'asc'),
  )
  return data
}
