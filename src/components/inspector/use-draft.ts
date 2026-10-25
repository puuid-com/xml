import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'

type Field = HTMLInputElement | HTMLTextAreaElement

/**
 * Keeps an input editable while the document re-parses underneath it. Every
 * keystroke commits; Escape reverts to the value the field had on focus.
 */
export function useDraft(value: string, onCommit: (value: string) => void) {
  const [draft, setDraft] = useState<string | null>(null)
  const original = useRef(value)

  return {
    value: draft ?? value,
    onFocus: () => {
      original.current = value
      setDraft(value)
    },
    onChange: (e: ChangeEvent<Field>) => {
      setDraft(e.target.value)
      onCommit(e.target.value)
    },
    onBlur: () => setDraft(null),
    onKeyDown: (e: KeyboardEvent<Field>) => {
      if (e.key !== 'Escape') return
      if (draft !== original.current) onCommit(original.current)
      e.currentTarget.blur()
    },
  }
}
