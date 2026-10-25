import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'

type Field = HTMLInputElement | HTMLTextAreaElement

/**
 * Keeps an input editable while the document re-parses underneath it.
 * `live` commits on every keystroke; `blur` commits on blur or Enter, for
 * values that are invalid mid-typing (names). Escape reverts.
 */
export function useDraft(
  value: string,
  onCommit: (value: string) => void,
  mode: 'live' | 'blur' = 'live',
) {
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)
  const original = useRef(value)

  return {
    value: draft ?? value,
    onFocus: () => {
      cancelled.current = false
      original.current = value
      setDraft(value)
    },
    onChange: (e: ChangeEvent<Field>) => {
      setDraft(e.target.value)
      if (mode === 'live') onCommit(e.target.value)
    },
    onBlur: () => {
      if (
        mode === 'blur' &&
        !cancelled.current &&
        draft !== null &&
        draft !== value
      ) {
        onCommit(draft)
      }
      setDraft(null)
    },
    onKeyDown: (e: KeyboardEvent<Field>) => {
      if (e.key === 'Escape') {
        cancelled.current = true
        if (mode === 'live' && draft !== original.current) {
          onCommit(original.current)
        }
        e.currentTarget.blur()
      } else if (
        e.key === 'Enter' &&
        mode === 'blur' &&
        e.currentTarget instanceof HTMLInputElement
      ) {
        e.currentTarget.blur()
      }
    },
  }
}
