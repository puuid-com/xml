import { Link } from '@tanstack/react-router'

import { appVersion } from '#/lib/version'
import { m } from '#/paraglide/messages'
import { site } from '#/site'

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl justify-between gap-4 px-4 py-6 text-sm text-muted-foreground">
        <span>
          {m.footer_rights({ year: new Date().getFullYear(), name: site.name })}
        </span>
        <Link
          to="/changelog"
          aria-label={m.app_version_label({ version: appVersion })}
          className="font-mono tabular-nums transition-colors hover:text-foreground"
        >
          {m.app_version({ version: appVersion })}
        </Link>
      </div>
    </footer>
  )
}
