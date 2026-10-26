import { Store } from '@tanstack/store'

/** One message in the status bar. A new one replaces whatever was there. */
export interface Notice {
  id: number
  tone: 'info' | 'success' | 'error'
  message: string
  /** Extra detail shown after the message, such as a parser error. */
  detail?: string
  action?: { label: string; run: () => void }
  /** Stays until dismissed or replaced, like an error. */
  sticky?: boolean
}

type NoticeOptions = Pick<Notice, 'detail' | 'action' | 'sticky'>

/** How long info and success messages stay up. Errors and sticky ones wait to be dismissed. */
export const NOTICE_MS = 2500

export const noticeStore = new Store<Notice | null>(null)

let lastId = 0
let timer: ReturnType<typeof setTimeout> | undefined

function show(tone: Notice['tone'], message: string, options?: NoticeOptions) {
  clearTimeout(timer)
  const id = ++lastId
  noticeStore.setState(() => ({ id, tone, message, ...options }))
  if (tone !== 'error' && !options?.sticky) {
    timer = setTimeout(() => dismissNotice(id), NOTICE_MS)
  }
}

/** Clears the current notice, or only notice `id` if it is still showing. */
export function dismissNotice(id?: number) {
  noticeStore.setState((n) =>
    n && (id === undefined || n.id === id) ? null : n,
  )
}

export const notify = {
  info: (message: string, options?: NoticeOptions) =>
    show('info', message, options),
  success: (message: string, options?: NoticeOptions) =>
    show('success', message, options),
  error: (message: string, options?: NoticeOptions) =>
    show('error', message, options),
}
