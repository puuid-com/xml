import { Store } from '@tanstack/store'

// Transient dialog state for the editor screen.
interface UiState {
  paletteOpen: boolean
  renameId: string | null
  deleteId: string | null
}

export const uiStore = new Store<UiState>({
  paletteOpen: false,
  renameId: null,
  deleteId: null,
})

export function setPaletteOpen(paletteOpen: boolean) {
  uiStore.setState((s) => ({ ...s, paletteOpen }))
}

export function askRename(renameId: string | null) {
  uiStore.setState((s) => ({ ...s, renameId }))
}

export function askDelete(deleteId: string | null) {
  uiStore.setState((s) => ({ ...s, deleteId }))
}
