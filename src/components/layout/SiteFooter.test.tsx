import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SiteFooter } from './SiteFooter'
import { appVersion } from '#/lib/version'
import { site } from '#/site'

describe('SiteFooter', () => {
  it('shows the current year and site name', () => {
    render(<SiteFooter />)

    expect(
      screen.getByText(`© ${new Date().getFullYear()} ${site.name}`),
    ).toBeInTheDocument()
  })

  it('shows the app version', () => {
    render(<SiteFooter />)

    expect(screen.getByText(`v${appVersion}`)).toBeInTheDocument()
  })
})
