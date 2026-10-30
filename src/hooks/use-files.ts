import { eq, isNull, length, not, useLiveQuery } from '@tanstack/react-db'

import { filesCollection } from '#/lib/store/files'

/** Tabs in order, without content so typing doesn't re-render them. */
export function useOpenFiles() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ file: filesCollection })
      .where(({ file }) => isNull(file.deletedAt))
      .orderBy(({ file }) => file.order, 'asc')
      .select(({ file }) => ({
        id: file.id,
        name: file.name,
        order: file.order,
        profileId: file.profileId,
        // An empty file has no type until something is pasted or typed.
        empty: eq(length(file.content), 0),
      })),
  )
  return data
}

/** Whether a file has no content, and so no type or structure yet. */
export function useFileEmpty(id: string | null) {
  const { data } = useLiveQuery(
    (q) =>
      q
        .from({ file: filesCollection })
        .where(({ file }) => eq(file.id, id ?? ''))
        .select(({ file }) => ({ empty: eq(length(file.content), 0) })),
    [id],
  )
  return data.at(0)?.empty ?? false
}

/** Recently deleted files, newest first; content stays out of the rendered list. */
export function useArchivedFiles() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ file: filesCollection })
      .where(({ file }) => not(isNull(file.deletedAt)))
      .orderBy(({ file }) => file.deletedAt, 'desc')
      .orderBy(({ file }) => file.id, 'asc')
      .select(({ file }) => ({
        id: file.id,
        name: file.name,
        deletedAt: file.deletedAt,
      })),
  )
  return data
}

/** One file's name and content, kept current as it changes. */
export function useFileContent(id: string) {
  const { data } = useLiveQuery({
    query: (q) =>
      q
        .from({ file: filesCollection })
        .where(({ file }) => eq(file.id, id))
        .select(({ file }) => ({ name: file.name, content: file.content })),
  })
  return data.at(0) ?? null
}
