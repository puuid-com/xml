// Site-wide identity used by the SEO helper, sitemap, robots.txt and manifest.
// `bun run init` rewrites these values when starting a new site.
interface Site {
  name: string
  description: string
  url: string
  ogImage: string
  twitter: string
  themeColor: string
  sitemapPaths: ReadonlyArray<string>
}

export const site: Site = {
  name: 'Web Template',
  description: 'A TanStack Start website template.',
  /** Production origin, no trailing slash. Used for canonical and sitemap URLs. */
  url: 'http://localhost:3000',
  /** Default social preview image (1200x630), e.g. '/og.png'. Empty to omit. */
  ogImage: '',
  /** Twitter/X handle including the @, or empty. */
  twitter: '',
  themeColor: '#0a0a0a',
  /** Unlocalized paths listed in sitemap.xml. Add new public pages here. */
  sitemapPaths: ['/', '/about'],
}
