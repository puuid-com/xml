import { Store } from '@tanstack/store'

// Transient dialog state for the editor screen.
interface UiState {
  paletteOpen: boolean
  renameId: string | null
  closeId: string | null
  /** Tag whose colour picker is open next to the editor cursor. */
  quickHighlight: QuickHighlight | null
}

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
  quickHighlight: null,
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

export function setQuickHighlight(quickHighlight: QuickHighlight | null) {
  uiStore.setState((s) => ({ ...s, quickHighlight }))
}
