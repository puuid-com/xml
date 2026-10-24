import { Link } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'

export function NotFound() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        {m.not_found_title()}
      </h1>
      <p className="mt-3 max-w-prose text-muted-foreground">
        {m.not_found_body()}
      </p>
      <Button asChild className="mt-8">
        <Link to="/">{m.go_home()}</Link>
      </Button>
    </section>
  )
}
