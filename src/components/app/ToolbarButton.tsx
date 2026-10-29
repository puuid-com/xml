import { ShortcutKeys } from './ShortcutKeys'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import type { Shortcut } from '#/lib/shortcuts'
import { cn } from '#/lib/utils'

/** Icon button; only a button with a shortcut gets a tooltip to show it. */
export function ToolbarButton({
  label,
  shortcut,
  size = 'icon-xs',
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'aria-label'> & {
  label: string
  shortcut?: Shortcut
}) {
  const button = (
    <Button
      variant="ghost"
      size={size}
      aria-label={label}
      className={cn('max-md:size-11', className)}
      {...props}
    />
  )
  if (!shortcut) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {label}
        <ShortcutKeys shortcut={shortcut} />
      </TooltipContent>
    </Tooltip>
  )
}
