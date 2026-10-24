import { createFileRoute } from '@tanstack/react-router'

import { site } from '#/site'

export const Route = createFileRoute('/site.webmanifest')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            name: site.name,
            short_name: site.name,
            description: site.description,
            start_url: '/',
            display: 'standalone',
            background_color: site.themeColor,
            theme_color: site.themeColor,
            icons: [
              { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
            ],
          },
          { headers: { 'Content-Type': 'application/manifest+json' } },
        ),
    },
  },
})
