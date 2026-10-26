import { createFileRoute } from '@tanstack/react-router'

import { site } from '#/site'

const icon = (src: string, size: number, purpose: 'any' | 'maskable') => ({
  src,
  sizes: `${size}x${size}`,
  type: 'image/png',
  purpose,
})

export const Route = createFileRoute('/site.webmanifest')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            name: site.name,
            short_name: site.name,
            description: site.description,
            id: '/',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            background_color: site.themeColor,
            theme_color: site.themeColor,
            // Regenerate the PNGs from favicon.svg with `bun run icons`.
            icons: [
              { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
              ...[192, 512].flatMap((size) => [
                icon(`/icon-${size}.png`, size, 'any'),
                icon(`/icon-maskable-${size}.png`, size, 'maskable'),
              ]),
            ],
          },
          { headers: { 'Content-Type': 'application/manifest+json' } },
        ),
    },
  },
})
