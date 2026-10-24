import {
  baseLocale,
  getLocale,
  locales,
  localizeUrl,
} from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import { site } from '#/site'

interface SeoOptions {
  /** Page title, shown as "Title | Site name". Omit for the site name alone. */
  title?: string
  description?: string
  /** Unlocalized path such as "/about". Enables canonical and hreflang links. */
  path?: string
  /** Absolute URL or site-relative path of the social preview image. */
  image?: string
  noindex?: boolean
}

/** Absolute URL for an unlocalized path, in the given (or current) locale. */
export function absoluteUrl(path: string, locale = getLocale()) {
  return localizeUrl(new URL(path, site.url), { locale }).href
}

/** Head tags for a route: `head: () => seo({ title: m.about_title(), path: '/about' })`. */
export function seo({
  title,
  description = m.site_description(),
  path,
  image = site.ogImage,
  noindex = false,
}: SeoOptions = {}) {
  const fullTitle = title ? `${title} | ${site.name}` : site.name
  const imageUrl = image ? new URL(image, site.url).href : undefined

  const meta = [
    { title: fullTitle },
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: site.name },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:locale', content: getLocale() },
    {
      name: 'twitter:card',
      content: imageUrl ? 'summary_large_image' : 'summary',
    },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description },
    ...(site.twitter ? [{ name: 'twitter:site', content: site.twitter }] : []),
    ...(imageUrl
      ? [
          { property: 'og:image', content: imageUrl },
          { name: 'twitter:image', content: imageUrl },
        ]
      : []),
    ...(path ? [{ property: 'og:url', content: absoluteUrl(path) }] : []),
    ...(noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
  ]

  const links = path
    ? [
        { rel: 'canonical', href: absoluteUrl(path) },
        ...locales.map((locale) => ({
          rel: 'alternate',
          hrefLang: locale,
          href: absoluteUrl(path, locale),
        })),
        {
          rel: 'alternate',
          hrefLang: 'x-default',
          href: absoluteUrl(path, baseLocale),
        },
      ]
    : []

  return { meta, links }
}
