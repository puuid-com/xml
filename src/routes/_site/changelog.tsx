import { createFileRoute } from '@tanstack/react-router'
import { IconChevronDown } from '@tabler/icons-react'

import changelog from '../../../CHANGELOG.md?raw'
import { Badge } from '#/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { parseChangelog } from '#/lib/changelog'
import { seo } from '#/lib/seo'
import { appVersion } from '#/lib/version'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

const entries = parseChangelog(changelog)
const releases = entries.filter((entry) => !entry.historical)
const history = entries.filter((entry) => entry.historical)

type Entry = (typeof entries)[number]

export const Route = createFileRoute('/_site/changelog')({
  head: () => seo({ title: m.changelog_title(), path: '/changelog' }),
  component: Changelog,
})

// Section headings read as small mono labels and commit links as muted
// hashes, so the bullets carry the page.
const bodyClass =
  'prose prose-sm max-w-none break-words prose-neutral dark:prose-invert prose-h3:mt-6 prose-h3:mb-2 prose-h3:font-mono prose-h3:text-[0.6875rem] prose-h3:font-medium prose-h3:uppercase prose-h3:tracking-wider prose-h3:text-muted-foreground first:prose-h3:mt-0 prose-p:my-2 prose-p:text-muted-foreground prose-ul:my-2 prose-ul:pl-4 prose-li:my-1 prose-li:text-foreground prose-li:marker:text-muted-foreground prose-a:font-mono prose-a:text-xs prose-a:font-normal prose-a:text-muted-foreground prose-a:no-underline hover:prose-a:text-foreground prose-code:break-all [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-ring [&>:first-child]:mt-0'

function useDateLabel() {
  const format = new Intl.DateTimeFormat(getLocale(), {
    dateStyle: 'medium',
    timeZone: 'UTC',
  })
  return (date: string) => format.format(new Date(`${date}T00:00:00Z`))
}

function Changelog() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <header className="pb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          {m.changelog_title()}
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
          {m.changelog_description()}
        </p>
      </header>
      {releases.map((entry) => (
        <Release key={entry.id} entry={entry} />
      ))}
      {history.length > 0 && <History />}
    </section>
  )
}

function Row({
  id,
  aside,
  children,
}: {
  id: string
  aside: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <article
      id={id}
      aria-labelledby={`title-${id}`}
      className="grid scroll-mt-8 gap-4 border-t py-8 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8"
    >
      <div className="md:sticky md:top-6 md:self-start">{aside}</div>
      <div className="min-w-0">{children}</div>
    </article>
  )
}

function Release({ entry }: { entry: Entry }) {
  const dateLabel = useDateLabel()
  return (
    <Row
      id={entry.id}
      aside={
        <>
          <h2
            id={`title-${entry.id}`}
            className="font-mono text-sm font-semibold"
          >
            <a href={`#${entry.id}`} className="hover:underline">
              v{entry.id}
            </a>
          </h2>
          <time
            dateTime={entry.date}
            className="mt-1 block text-xs text-muted-foreground"
          >
            {dateLabel(entry.date)}
          </time>
          {entry.id === appVersion && (
            <Badge variant="outline" className="mt-2">
              {m.changelog_latest()}
            </Badge>
          )}
        </>
      }
    >
      <div
        className={bodyClass}
        dangerouslySetInnerHTML={{ __html: entry.html }}
      />
    </Row>
  )
}

function History() {
  const dateLabel = useDateLabel()
  return (
    <Row
      id="history"
      aside={
        <h2 id="title-history" className="text-sm font-semibold">
          {m.changelog_history()}
        </h2>
      }
    >
      <Collapsible className="group">
        <p className="text-sm text-muted-foreground">
          {m.changelog_history_description()}
        </p>
        <CollapsibleTrigger className="mt-3 inline-flex items-center gap-1 text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <span className="group-data-[state=open]:hidden">
            {m.changelog_history_show()}
          </span>
          <span className="hidden group-data-[state=open]:inline">
            {m.changelog_history_hide()}
          </span>
          <IconChevronDown
            aria-hidden
            className="size-4 transition-transform group-data-[state=open]:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="divide-y">
          {history.map((entry) => (
            <div key={entry.id} id={entry.id} className="scroll-mt-8 py-6">
              <time
                dateTime={entry.date}
                className="mb-4 block text-xs font-medium"
              >
                {dateLabel(entry.date)}
              </time>
              <div
                className={bodyClass}
                dangerouslySetInnerHTML={{ __html: entry.html }}
              />
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </Row>
  )
}
