import { Link, useRouter } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'

import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  console.error(error)

  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        {m.error_title()}
      </h1>
      <p className="mt-3 max-w-prose text-muted-foreground">{m.error_body()}</p>
      {import.meta.env.DEV && (
        <pre className="mt-6 overflow-x-auto border bg-muted p-4 font-mono text-xs">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      )}
      <div className="mt-8 flex gap-2">
        <Button
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          {m.try_again()}
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">{m.go_home()}</Link>
        </Button>
      </div>
    </section>
  )
}
