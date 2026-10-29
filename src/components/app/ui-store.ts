import { Store } from '@tanstack/store'

import type { Backup } from '#/lib/store/backup'
import type { DefaultSummary } from '#/lib/xml/defaults'
import type { ResolvedVar } from '#/lib/xml/dynamic-vars'

// Transient dialog state for the editor screen.
interface UiState {
  paletteOpen: boolean
  renameId: string | null
  closeId: string | null
  archiveOpen: boolean
  /** Choosing what a share link of the active file carries. */
  shareOpen: boolean
  mobileView: 'editor' | 'structure'
  /** Tag whose colour picker is open next to the editor cursor. */
  quickHighlight: QuickHighlight | null
  /** Defaults waiting for confirmation before they're written to the file. */
  defaultsPreview: Array<DefaultSummary> | null
  /** Variables waiting for confirmation before a filled-in copy is opened. */
  varsPreview: VarsPreview | null
  profileDialog: ProfileDialog | null
  deleteProfileId: string | null
  /** A backup waiting for confirmation before it replaces the workspace. */
  restorePreview: RestorePreview | null
  /** Variable whose value is being set from the editor. */
  variableName: string | null
  /** Tab the active file is being compared with, shown in place of the editor. */
  compareId: string | null
  /** Format both sides before comparing, so only the data differs. */
  compareIgnoreFormatting: boolean
}

/** The filled-in copy of `fileId`, computed up front so the dialog shows its values. */
export interface VarsPreview {
  fileId: string
  text: string
  count: number
  unresolved: number
  vars: Array<ResolvedVar>
  /** Whether the original parsed cleanly, so new errors come from the values. */
  wasValid: boolean
}

/** A backup read from disk, with its date formatted for the reader's locale. */
export interface RestorePreview {
  backup: Backup
  date: string
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
  shareOpen: false,
  mobileView: 'editor',
  quickHighlight: null,
  defaultsPreview: null,
  varsPreview: null,
  profileDialog: null,
  deleteProfileId: null,
  restorePreview: null,
  variableName: null,
  compareId: null,
  compareIgnoreFormatting: false,
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

export function setShareOpen(shareOpen: boolean) {
  uiStore.setState((s) => ({ ...s, shareOpen }))
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

export function setVarsPreview(varsPreview: VarsPreview | null) {
  uiStore.setState((s) => ({ ...s, varsPreview }))
}

export function setProfileDialog(profileDialog: ProfileDialog | null) {
  uiStore.setState((s) => ({ ...s, profileDialog }))
}

export function askDeleteProfile(deleteProfileId: string | null) {
  uiStore.setState((s) => ({ ...s, deleteProfileId }))
}

export function setRestorePreview(restorePreview: RestorePreview | null) {
  uiStore.setState((s) => ({ ...s, restorePreview }))
}

export function askVariableValue(variableName: string | null) {
  uiStore.setState((s) => ({ ...s, variableName }))
}

/** Compares the active file with `compareId`, or closes the comparison. */
export function setCompareId(compareId: string | null) {
  uiStore.setState((s) => ({
    ...s,
    compareId,
    mobileView: compareId ? 'editor' : s.mobileView,
  }))
}

export function setCompareIgnoreFormatting(compareIgnoreFormatting: boolean) {
  uiStore.setState((s) => ({ ...s, compareIgnoreFormatting }))
}
