import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SortOrderEditor } from './SortOrderEditor'
import { publishParse } from '#/components/editor/editor-store'
import { parseXml } from '#/lib/xml/parse'

let current: Array<string> = []
let update: (order: Array<string>) => void = () => {}

vi.mock('#/lib/store/profiles', () => ({
  setCustomOrder: (order: Array<string>) => update(order),
}))

function Harness({ initial }: { initial: Array<string> }) {
  const [order, setOrder] = useState(initial)
  update = (next) => {
    current = next
    setOrder(next)
  }
  return <SortOrderEditor order={order} />
}

beforeEach(() => {
  current = []
})

describe('SortOrderEditor', () => {
  it('moves a row with the arrow keys and keeps focus on its handle', () => {
    render(<Harness initial={['a', 'b', 'c']} />)
    const handle = screen.getByRole('button', { name: 'Move a' })
    handle.focus()
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(current).toEqual(['b', 'a', 'c'])
    expect(screen.getByRole('button', { name: 'Move a' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(current).toEqual(['b', 'c', 'a'])
    expect(screen.getByText(/position 3 of 3/)).toBeInTheDocument()
  })

  it('adds the names of the open file that are missing', () => {
    publishParse('f', parseXml('<r><b id="1"/><a/></r>'))
    render(<Harness initial={['a']} />)
    fireEvent.click(screen.getByRole('button', { name: /Add from file/ }))
    expect(current).toEqual(['a', 'r', 'b', '@id'])
  })
})
