import { useSyncExternalStore } from 'react'

import { canWriteDisk } from '#/lib/store/disk'

const never = () => () => {}

/** Whether this browser can write to a file the person picks; false on the server. */
export function useCanWriteDisk() {
  return useSyncExternalStore(never, canWriteDisk, () => false)
}
