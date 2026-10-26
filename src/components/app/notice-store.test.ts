import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NOTICE_MS, dismissNotice, noticeStore, notify } from './notice-store'

describe('notice store', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    dismissNotice()
    vi.useRealTimers()
  })

  it('clears success and info messages on their own', () => {
    notify.success('Copied')
    expect(noticeStore.state).toMatchObject({
      tone: 'success',
      message: 'Copied',
    })
    vi.advanceTimersByTime(NOTICE_MS)
    expect(noticeStore.state).toBeNull()
  })

  it('keeps errors until dismissed', () => {
    notify.error('Format failed', { detail: 'Unclosed tag' })
    vi.advanceTimersByTime(NOTICE_MS * 10)
    expect(noticeStore.state).toMatchObject({ detail: 'Unclosed tag' })
    dismissNotice(noticeStore.state?.id)
    expect(noticeStore.state).toBeNull()
  })

  it('keeps sticky notices until dismissed', () => {
    notify.info('New version', { sticky: true })
    vi.advanceTimersByTime(NOTICE_MS * 10)
    expect(noticeStore.state?.message).toBe('New version')
  })

  it('replaces the current notice and ignores its stale timer', () => {
    notify.info('First')
    vi.advanceTimersByTime(NOTICE_MS - 1)
    notify.error('Second')
    vi.advanceTimersByTime(NOTICE_MS)
    expect(noticeStore.state?.message).toBe('Second')
  })

  it('leaves a newer notice alone when an old id is dismissed', () => {
    notify.info('First')
    const first = noticeStore.state?.id
    notify.info('Second')
    dismissNotice(first)
    expect(noticeStore.state?.message).toBe('Second')
  })

  it('brings an update notice back after a copied notice', () => {
    notify.info('New version', { sticky: true })
    notify.success('Share link copied')
    expect(noticeStore.state?.message).toBe('Share link copied')
    vi.advanceTimersByTime(NOTICE_MS)
    expect(noticeStore.state?.message).toBe('New version')
  })

  it('brings an update notice back after a dismissed copied notice', () => {
    notify.info('New version', { sticky: true })
    notify.success('Copied')
    dismissNotice(noticeStore.state?.id)
    expect(noticeStore.state?.message).toBe('New version')
  })

  it('shows an error over an update notice until the error is dismissed', () => {
    notify.info('New version', { sticky: true })
    notify.error('Save failed')
    expect(noticeStore.state?.message).toBe('Save failed')
    dismissNotice(noticeStore.state?.id)
    expect(noticeStore.state?.message).toBe('New version')
  })

  it('keeps a save error above a later update notice', () => {
    notify.error('Save failed')
    notify.info('New version', { sticky: true })
    expect(noticeStore.state?.message).toBe('Save failed')
    dismissNotice(noticeStore.state?.id)
    expect(noticeStore.state?.message).toBe('New version')
  })

  it('brings a save error back after a copied notice', () => {
    notify.error('Save failed')
    notify.success('Copied')
    vi.advanceTimersByTime(NOTICE_MS)
    expect(noticeStore.state?.message).toBe('Save failed')
  })

  it('shows a lasting notice at once over a short-lived one', () => {
    notify.success('Copied')
    notify.error('Save failed')
    expect(noticeStore.state?.message).toBe('Save failed')
    vi.advanceTimersByTime(NOTICE_MS)
    expect(noticeStore.state?.message).toBe('Save failed')
  })
})
