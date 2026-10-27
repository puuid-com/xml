import { beforeEach, describe, expect, it, vi } from 'vitest'

import { noticeStore } from './notice-store'
import { applyTemplate } from './sort-template'

const setCustomOrder = vi.fn()

vi.mock('#/lib/store/profiles', () => ({
  setCustomOrder: (order: Array<string>) => setCustomOrder(order),
}))

beforeEach(() => {
  setCustomOrder.mockClear()
})

describe('applyTemplate', () => {
  it('sets the custom order from a template file', async () => {
    const file = new File(['<s:r><s:b/><a x:k="1"/></s:r>'], 'order.xml')
    await applyTemplate(file)
    expect(setCustomOrder).toHaveBeenCalledWith(['r', 'b', 'a', '@k'])
  })

  it('leaves the order alone when the template has errors', async () => {
    await applyTemplate(new File(['<r><a></r>'], 'order.xml'))
    expect(setCustomOrder).not.toHaveBeenCalled()
    expect(noticeStore.state?.tone).toBe('error')
  })
})
