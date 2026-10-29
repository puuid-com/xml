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
        <span className="font-mono tabular-nums">
          {m.app_version({ version: appVersion })}
        </span>
      </div>
    </footer>
  )
}
