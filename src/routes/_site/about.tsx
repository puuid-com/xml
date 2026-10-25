import { createFileRoute } from '@tanstack/react-router'

import { seo } from '#/lib/seo'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/about')({
  head: () => seo({ title: m.about_title(), path: '/about' }),
  component: About,
})

function About() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">
        {m.about_title()}
      </h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        {m.about_body()}
      </p>
    </section>
  )
}
