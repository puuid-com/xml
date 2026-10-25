import { cn } from '#/lib/utils'

/** Small caps heading over a side panel section. */
export function PanelHeading({
  className,
  ...props
}: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 border-b px-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  )
}
