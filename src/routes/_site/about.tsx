import { Link, createFileRoute } from '@tanstack/react-router'

import { seo } from '#/lib/seo'
import { appVersion } from '#/lib/version'
import { m } from '#/paraglide/messages'
import { site } from '#/site'

export const Route = createFileRoute('/_site/about')({
  head: () => seo({ title: m.about_title(), path: '/about' }),
  component: About,
})

const linkClass =
  'underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

function About() {
  const facts = [
    {
      label: m.about_version(),
      value: (
        <Link to="/changelog" className={`font-mono ${linkClass}`}>
          {m.app_version({ version: appVersion })}
        </Link>
      ),
    },
    { label: m.about_storage(), value: m.about_storage_value() },
    {
      label: m.about_source(),
      value: (
        <a href={site.repository} className={linkClass}>
          {site.repository.replace(/^https:\/\//, '')}
        </a>
      ),
    },
  ]

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        {m.about_title()}
      </h1>
      <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
        {m.about_body()}
      </p>
      <dl className="mt-10 border-t text-sm">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="grid gap-1 border-b py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8"
          >
            <dt className="text-muted-foreground">{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
