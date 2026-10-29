import { IconCheck, IconPlus } from '@tabler/icons-react'
import { useRef } from 'react'

import { colorLabel } from './ColorSwatches'
import { ContextMenuItem } from '#/components/ui/context-menu'
import { highlightCss } from '#/lib/store/colors'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

const SWATCH =
  'size-4 shrink-0 justify-center rounded-full p-0 ring-offset-2 ring-offset-popover focus:ring-2 focus:ring-ring data-selected:ring-2 data-selected:ring-foreground/60'

/**
 * Colour dots laid out inline in a context menu. Each dot is a menu item, so
 * arrow keys reach it and picking one closes the menu.
 */
export function SwatchMenuRow({
  colors,
  label,
  value,
  onSelect,
}: {
  colors: ReadonlyArray<string>
  label: string
  value?: string
  onSelect: (color: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const custom = value && !colors.includes(value) ? value : undefined

  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="relative flex items-center gap-1.5"
      >
        {colors.map((color) => (
          <ContextMenuItem
            key={color}
            aria-label={colorLabel(color)}
            data-selected={value === color || undefined}
            onSelect={() => onSelect(color)}
            className={SWATCH}
            style={{ backgroundColor: highlightCss(color) }}
          >
            {value === color && <IconCheck className="size-3! text-white!" />}
          </ContextMenuItem>
        ))}
        <ContextMenuItem
          aria-label={m.color_custom()}
          data-selected={custom ? true : undefined}
          // The native picker stays open after the menu would close, so keep
          // the menu up and let it apply the colour as it changes.
          onSelect={(e) => {
            e.preventDefault()
            input.current?.showPicker()
          }}
          className={cn(
            SWATCH,
            !custom && 'border border-dashed border-muted-foreground/60',
          )}
          style={custom ? { backgroundColor: custom } : undefined}
        >
          {!custom && <IconPlus className="size-3!" />}
        </ContextMenuItem>
        <input
          ref={input}
          type="color"
          tabIndex={-1}
          aria-hidden
          value={custom ?? '#3b82f6'}
          onChange={(e) => onSelect(e.target.value)}
          className="pointer-events-none absolute right-0 bottom-0 size-px opacity-0"
        />
      </div>
    </div>
  )
}
