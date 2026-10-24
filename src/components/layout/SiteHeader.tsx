import { Link } from '@tanstack/react-router'

import { LocaleSwitcher } from '#/components/LocaleSwitcher'
import { m } from '#/paraglide/messages'
import { site } from '#/site'

const navItems = [
  { to: '/', label: () => m.nav_home() },
  { to: '/about', label: () => m.nav_about() },
] as const

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link to="/" className="text-sm font-semibold">
          {site.name}
        </Link>
        <nav className="flex flex-1 items-center gap-4 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{
                className: 'text-foreground',
                'aria-current': 'page',
              }}
              activeOptions={{ exact: true }}
            >
              {item.label()}
            </Link>
          ))}
        </nav>
        <LocaleSwitcher />
      </div>
    </header>
  )
}
