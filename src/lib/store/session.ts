import { persistedStore } from './persist'
import { singleton } from './singleton'

// Identifies this page load. Not persisted: a duplicated browser tab copies
// sessionStorage, and two tabs must never share an id.
export const writerId = singleton('writerId', () =>
  typeof crypto !== 'undefined' ? crypto.randomUUID() : 'server',
)

// Per browser tab: which file is active and which tree nodes are collapsed.
// Kept in sessionStorage so a reload restores it without leaking to other tabs.
interface SessionState {
  activeId: string | null
  /** Collapsed tree paths, by file id. */
  collapsed: Record<string, Array<string>>
  panelOpen: boolean
}

export const sessionStore = persistedStore<SessionState>(
  'session',
  () => sessionStorage,
  { activeId: null, collapsed: {}, panelOpen: true },
)

export function setActive(activeId: string | null) {
  sessionStore.setState((s) => ({ ...s, activeId }))
}

export function toggleCollapsed(fileId: string, path: string) {
  sessionStore.setState((s) => {
    const current = new Set(s.collapsed[fileId] ?? [])
    if (current.has(path)) current.delete(path)
    else current.add(path)
    return { ...s, collapsed: { ...s.collapsed, [fileId]: [...current] } }
  })
}

/** Collapses (or expands) every one of `paths` in a file's tree. */
export function setCollapsed(
  fileId: string,
  paths: Iterable<string>,
  collapsed: boolean,
) {
  sessionStore.setState((s) => {
    const current = new Set(s.collapsed[fileId] ?? [])
    for (const path of paths) {
      if (collapsed) current.add(path)
      else current.delete(path)
    }
    return { ...s, collapsed: { ...s.collapsed, [fileId]: [...current] } }
  })
}

export function setPanelOpen(panelOpen: boolean) {
  sessionStore.setState((s) => ({ ...s, panelOpen }))
}
