import { ShortcutKeys } from './ShortcutKeys'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import type { Shortcut } from '#/lib/shortcuts'

/** Icon button labelled by a tooltip, with its shortcut when it has one. */
export function ToolbarButton({
  label,
  shortcut,
  size = 'icon-xs',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'aria-label'> & {
  label: string
  shortcut?: Shortcut
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size={size} aria-label={label} {...props} />
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {label}
        {shortcut && <ShortcutKeys shortcut={shortcut} />}
      </TooltipContent>
    </Tooltip>
  )
}
