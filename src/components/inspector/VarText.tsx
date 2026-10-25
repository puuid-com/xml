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
            className="rounded-[3px] bg-syntax-var/20 text-syntax-var shadow-[inset_0_-1.5px_0_var(--syntax-var)]"
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
