import { Store } from '@tanstack/store'

import type { DefaultSummary } from '#/lib/xml/defaults'

// Transient dialog state for the editor screen.
interface UiState {
  paletteOpen: boolean
  renameId: string | null
  closeId: string | null
  archiveOpen: boolean
  mobileView: 'editor' | 'structure'
  /** Tag whose colour picker is open next to the editor cursor. */
  quickHighlight: QuickHighlight | null
  /** Defaults waiting for confirmation before they're written to the file. */
  defaultsPreview: Array<DefaultSummary> | null
  profileDialog: ProfileDialog | null
  deleteProfileId: string | null
  /** Variable whose value is being set from the editor. */
  variableName: string | null
}

/** Creating a profile, or cloning or editing the one with `profileId`. */
export type ProfileDialog =
  { mode: 'create' } | { mode: 'clone' | 'edit'; profileId: string }

export interface QuickHighlight {
  tag: string
  /** Viewport coordinates to anchor the picker at. */
  x: number
  y: number
}

export const uiStore = new Store<UiState>({
  paletteOpen: false,
  renameId: null,
  closeId: null,
  archiveOpen: false,
  mobileView: 'editor',
  quickHighlight: null,
  defaultsPreview: null,
  profileDialog: null,
  deleteProfileId: null,
  variableName: null,
})

export function setPaletteOpen(paletteOpen: boolean) {
  uiStore.setState((s) => ({ ...s, paletteOpen }))
}

export function askRename(renameId: string | null) {
  uiStore.setState((s) => ({ ...s, renameId }))
}

export function askClose(closeId: string | null) {
  uiStore.setState((s) => ({ ...s, closeId }))
}

export function setArchiveOpen(archiveOpen: boolean) {
  uiStore.setState((s) => ({ ...s, archiveOpen }))
}

export function setMobileView(mobileView: 'editor' | 'structure') {
  uiStore.setState((s) => ({ ...s, mobileView }))
}

export function setQuickHighlight(quickHighlight: QuickHighlight | null) {
  uiStore.setState((s) => ({ ...s, quickHighlight }))
}

export function setDefaultsPreview(
  defaultsPreview: Array<DefaultSummary> | null,
) {
  uiStore.setState((s) => ({ ...s, defaultsPreview }))
}

export function setProfileDialog(profileDialog: ProfileDialog | null) {
  uiStore.setState((s) => ({ ...s, profileDialog }))
}

export function askDeleteProfile(deleteProfileId: string | null) {
  uiStore.setState((s) => ({ ...s, deleteProfileId }))
}

export function askVariableValue(variableName: string | null) {
  uiStore.setState((s) => ({ ...s, variableName }))
}
