import { createFileRoute } from '@tanstack/react-router'

import changelog from '../../../CHANGELOG.md?raw'
import { Badge } from '#/components/ui/badge'
import { parseChangelog } from '#/lib/changelog'
import { seo } from '#/lib/seo'
import { appVersion } from '#/lib/version'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

const entries = parseChangelog(changelog)

export const Route = createFileRoute('/_site/changelog')({
  head: () => seo({ title: m.changelog_title(), path: '/changelog' }),
  component: Changelog,
})

function Changelog() {
  const dateFormat = new Intl.DateTimeFormat(getLocale(), {
    dateStyle: 'medium',
    timeZone: 'UTC',
  })
  const dateLabel = (date: string) =>
    dateFormat.format(new Date(`${date}T00:00:00Z`))

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <header className="border-b pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {m.changelog_title()}
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
          {m.changelog_description()}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {m.changelog_language()}{' '}
          <a
            href="https://github.com/puuid-com/xml/blob/main/CHANGELOG.md"
            className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {m.changelog_source()}
          </a>
        </p>
      </header>
      <div className="grid items-start gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
        <nav
          aria-label={m.changelog_navigation()}
          className="pt-6 md:sticky md:top-6"
        >
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            {m.changelog_navigation()}
          </p>
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {entries.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className="block px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {entry.historical ? dateLabel(entry.date) : `v${entry.id}`}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 divide-y">
          {entries.map((entry) => (
            <article
              key={entry.id}
              id={entry.id}
              aria-labelledby={`title-${entry.id}`}
              className="scroll-mt-8 py-8 first:pt-6"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h2
                  id={`title-${entry.id}`}
                  className="text-base font-semibold tracking-tight"
                >
                  {entry.historical ? (
                    m.changelog_history()
                  ) : (
                    <span className="font-mono">v{entry.id}</span>
                  )}
                </h2>
                {entry.id === appVersion && (
                  <Badge variant="secondary">{m.changelog_latest()}</Badge>
                )}
              </div>
              <time
                dateTime={entry.date}
                className="mt-2 block text-xs text-muted-foreground"
              >
                {dateLabel(entry.date)}
              </time>
              <div
                className="prose prose-sm mt-5 max-w-none break-words prose-neutral dark:prose-invert prose-headings:text-foreground prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-xs prose-h3:font-semibold prose-p:my-2 prose-p:text-muted-foreground prose-a:font-normal prose-a:text-muted-foreground prose-a:decoration-border prose-a:underline-offset-4 hover:prose-a:text-foreground prose-code:break-all prose-ul:my-2 prose-li:my-1.5 prose-li:text-muted-foreground [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-ring"
                dangerouslySetInnerHTML={{ __html: entry.html }}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
