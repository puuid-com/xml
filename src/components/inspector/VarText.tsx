import { cn } from '#/lib/utils'
import { splitVars } from '#/lib/xml/vars'

/** Renders text with `<<var>>` placeholders as chips. */
export function VarText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  return (
    <span className={cn('truncate', className)}>
      {splitVars(text).map((part, i) =>
        part.kind === 'var' ? (
          <span
            key={i}
            className="rounded-[3px] bg-syntax-var/15 px-0.5 text-syntax-var ring-1 ring-syntax-var/30 ring-inset"
          >
            {part.value}
          </span>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </span>
  )
}
