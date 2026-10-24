import { m } from '#/paraglide/messages'
import { site } from '#/site'

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted-foreground">
        {m.footer_rights({ year: new Date().getFullYear(), name: site.name })}
      </div>
    </footer>
  )
}
