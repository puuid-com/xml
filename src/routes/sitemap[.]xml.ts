import { createFileRoute } from '@tanstack/react-router'

import { absoluteUrl } from '#/lib/seo'
import { locales } from '#/paraglide/runtime'
import { site } from '#/site'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const urls = site.sitemapPaths.flatMap((path) =>
          locales.map((locale) => {
            const alternates = locales
              .map(
                (alt) =>
                  `<xhtml:link rel="alternate" hreflang="${alt}" href="${absoluteUrl(path, alt)}"/>`,
              )
              .join('')
            return `<url><loc>${absoluteUrl(path, locale)}</loc>${alternates}</url>`
          }),
        )

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`

        return new Response(xml, {
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        })
      },
    },
  },
})
