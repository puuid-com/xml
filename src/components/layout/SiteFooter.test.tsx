import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SiteFooter } from './SiteFooter'
import { site } from '#/site'

describe('SiteFooter', () => {
  it('shows the current year and site name', () => {
    render(<SiteFooter />)

    expect(
      screen.getByText(`© ${new Date().getFullYear()} ${site.name}`),
    ).toBeInTheDocument()
  })
})
