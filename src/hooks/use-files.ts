import { useLiveQuery } from '@tanstack/react-db'

import { filesCollection } from '#/lib/store/files'

/** Tabs in order, without content so typing doesn't re-render them. */
export function useOpenFiles() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ file: filesCollection })
      .orderBy(({ file }) => file.order, 'asc')
      .select(({ file }) => ({
        id: file.id,
        name: file.name,
        order: file.order,
      })),
  )
  return data
}
