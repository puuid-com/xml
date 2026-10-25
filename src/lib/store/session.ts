import { Store } from '@tanstack/store'

// Identifies this page load. Not persisted: a duplicated browser tab copies
// sessionStorage, and two tabs must never share an id.
export const writerId =
  typeof crypto !== 'undefined' ? crypto.randomUUID() : 'server'

// Per browser tab: which file is active and which tree nodes are collapsed.
// Kept in sessionStorage so a reload restores it without leaking to other tabs.
export interface SessionState {
  activeId: string | null
  /** Collapsed tree paths, by file id. */
  collapsed: Record<string, Array<string>>
  inspectorOpen: boolean
}

const STORAGE_KEY = 'xml-editor:session'

const initial: SessionState = {
  activeId: null,
  collapsed: {},
  inspectorOpen: true,
}

function load(): SessionState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initial, ...(JSON.parse(raw) as SessionState) }
  } catch {
    // No storage (SSR, private mode); start fresh.
  }
  return initial
}

export const sessionStore = new Store<SessionState>(load())

sessionStore.subscribe(() => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionStore.state))
  } catch {
    // Ignore quota or unavailable storage.
  }
})

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

export function setCollapsed(fileId: string, paths: Array<string>) {
  sessionStore.setState((s) => ({
    ...s,
    collapsed: { ...s.collapsed, [fileId]: paths },
  }))
}

export function setInspectorOpen(inspectorOpen: boolean) {
  sessionStore.setState((s) => ({ ...s, inspectorOpen }))
}
