import { createFileRoute } from '@tanstack/react-router'

import { site } from '#/site'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`,
          { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        ),
    },
  },
})
