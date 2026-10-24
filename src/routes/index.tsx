import { createFileRoute } from '@tanstack/react-router'

import { seo } from '#/lib/seo'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/')({
  head: () => seo({ path: '/' }),
  component: Home,
})

function Home() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">
        {m.home_title()}
      </h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        {m.home_lede()}
      </p>
    </section>
  )
}
