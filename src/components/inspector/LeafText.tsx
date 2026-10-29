import { VarText } from './VarText'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

/**
 * A leaf's text as the tree shows it: `<<var>>` chips, the default chip when
 * it equals its default, or a wavy underline when it differs from it.
 */
export function LeafText({
  value,
  defaultKey,
  differs,
}: {
  value: string
  /** Set when the value equals the default for this key. */
  defaultKey?: string
  /** Whether the value differs from the default for this key. */
  differs: boolean
}) {
  if (defaultKey !== undefined && value !== '') {
    return (
      <DefaultChip>
        <VarText text={value.trim()} />
      </DefaultChip>
    )
  }
  if (value.trim() === '') {
    return (
      <span className="text-muted-foreground/60 italic">{m.node_empty()}</span>
    )
  }
  return (
    <VarText
      text={value.trim()}
      className={cn(differs && 'default-differs leading-5')}
    />
  )
}

/** Marks a value that equals its default, like the editor does. */
export function DefaultChip({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn('default-chip flex min-w-0 items-center pr-0.5', className)}
    >
      {children}
    </span>
  )
}
