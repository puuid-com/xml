import { eq, useLiveQuery } from '@tanstack/react-db'

import { filesCollection } from '#/lib/store/files'

/** Open tabs in order, without content so typing doesn't re-render them. */
export function useOpenFiles() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ file: filesCollection })
      .where(({ file }) => eq(file.open, true))
      .orderBy(({ file }) => file.order, 'asc')
      .select(({ file }) => ({
        id: file.id,
        name: file.name,
        order: file.order,
      })),
  )
  return data
}

/** Every cached file, most recently edited first. */
export function useAllFiles() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ file: filesCollection })
      .orderBy(({ file }) => file.updatedAt, 'desc')
      .select(({ file }) => ({
        id: file.id,
        name: file.name,
        open: file.open,
        updatedAt: file.updatedAt,
      })),
  )
  return data
}
