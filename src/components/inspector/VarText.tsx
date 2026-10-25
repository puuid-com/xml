import { Highlighted } from './SearchHighlight'
import { cn } from '#/lib/utils'
import { splitVars } from '#/lib/xml/vars'

/** Renders text with `<<var>>` placeholders as chips and search hits marked. */
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
          <span key={i} className="var-chip">
            <Highlighted text={part.value} />
          </span>
        ) : (
          <span key={i}>
            <Highlighted text={part.value} />
          </span>
        ),
      )}
    </span>
  )
}
