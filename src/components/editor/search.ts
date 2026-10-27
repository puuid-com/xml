import { ViewPlugin } from '@codemirror/view'

/**
 * Stops the browser from offering past entries in the find and replace
 * fields. CodeMirror names them `search` and `replace`, which browsers key
 * their form history on. Runs on focus because the panel focuses its field
 * right after it mounts.
 */
export const searchNoAutofill = ViewPlugin.define((view) => {
  const onFocus = (event: FocusEvent) => {
    const panel = (event.target as HTMLElement).closest('.cm-search')
    if (!panel) return
    for (const input of panel.querySelectorAll('input')) {
      input.autocomplete = 'off'
      input.removeAttribute('name')
    }
  }
  view.dom.addEventListener('focusin', onFocus, true)
  return { destroy: () => view.dom.removeEventListener('focusin', onFocus, true) }
})
