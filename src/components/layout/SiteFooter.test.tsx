import { render, screen } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

import { SiteFooter } from './SiteFooter'
import { appVersion } from '#/lib/version'
import { site } from '#/site'

// The footer links to the changelog, so it needs a router around it.
async function renderFooter() {
  const rootRoute = createRootRoute({ component: SiteFooter })
  const changelogRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/changelog',
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([changelogRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('contentinfo')
}

describe('SiteFooter', () => {
  it('shows the current year and site name', async () => {
    await renderFooter()

    expect(
      screen.getByText(`© ${new Date().getFullYear()} ${site.name}`),
    ).toBeInTheDocument()
  })

  it('links the app version to the changelog', async () => {
    await renderFooter()

    expect(screen.getByText(`v${appVersion}`)).toHaveAttribute(
      'href',
      '/changelog',
    )
  })
})
