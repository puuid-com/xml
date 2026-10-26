import { Store } from '@tanstack/store'

/**
 * One message in the status bar. Only one shows at a time, picked by
 * priority: a short-lived notice, then an error, then a sticky notice.
 */
export interface Notice {
  id: number
  tone: 'info' | 'success' | 'error'
  message: string
  /** Extra detail shown after the message, such as a parser error. */
  detail?: string
  action?: { label: string; run: () => void }
  /** Stays until dismissed, like an error, and comes back after short-lived ones. */
  sticky?: boolean
}

type NoticeOptions = Pick<Notice, 'detail' | 'action' | 'sticky'>

/** How long info and success messages stay up. Errors and sticky ones wait to be dismissed. */
export const NOTICE_MS = 2500

export const noticeStore = new Store<Notice | null>(null)

/**
 * Each kind keeps its latest notice. A short-lived one covers the others
 * until it times out, and an error covers a sticky one until dismissed, so
 * neither an error nor a sticky notice is lost to a newer, lesser one.
 */
const layers: Record<'brief' | 'error' | 'sticky', Notice | null> = {
  brief: null,
  error: null,
  sticky: null,
}

let lastId = 0
let timer: ReturnType<typeof setTimeout> | undefined

function sync() {
  noticeStore.setState(() => layers.brief ?? layers.error ?? layers.sticky)
}

function show(tone: Notice['tone'], message: string, options?: NoticeOptions) {
  const notice: Notice = { id: ++lastId, tone, message, ...options }
  if (tone === 'error') {
    layers.error = notice
  } else if (options?.sticky) {
    layers.sticky = notice
  } else {
    clearTimeout(timer)
    layers.brief = notice
    timer = setTimeout(() => dismissNotice(notice.id), NOTICE_MS)
  }
  // A lasting notice should be seen now, not after a brief one times out.
  if (layers.brief !== notice) {
    clearTimeout(timer)
    layers.brief = null
  }
  sync()
}

/**
 * Clears every notice, or only notice `id` if it is still held. The next
 * held notice, if any, shows in its place.
 */
export function dismissNotice(id?: number) {
  for (const key of ['brief', 'error', 'sticky'] as const) {
    if (id === undefined || layers[key]?.id === id) layers[key] = null
  }
  if (id === undefined) clearTimeout(timer)
  sync()
}

export const notify = {
  info: (message: string, options?: NoticeOptions) =>
    show('info', message, options),
  success: (message: string, options?: NoticeOptions) =>
    show('success', message, options),
  error: (message: string, options?: NoticeOptions) =>
    show('error', message, options),
}
