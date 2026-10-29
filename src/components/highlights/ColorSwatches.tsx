import { IconCheck, IconPlus } from '@tabler/icons-react'

import { HIGHLIGHT_PRESETS, highlightCss, isPreset } from '#/lib/store/colors'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'
import type { HighlightPreset } from '#/lib/store/colors'

const presetLabels: Record<HighlightPreset, () => string> = {
  blue: m.color_blue,
  purple: m.color_purple,
  pink: m.color_pink,
  red: m.color_red,
  amber: m.color_amber,
  green: m.color_green,
  teal: m.color_teal,
  gray: m.color_gray,
}

/** Accessible name for a swatch: the preset's name or the hex value. */
export function colorLabel(color: string) {
  return isPreset(color) ? presetLabels[color]() : color
}

/** Colour dots (the presets by default) plus a custom colour picker. */
export function ColorSwatches({
  colors = HIGHLIGHT_PRESETS,
  value,
  onSelect,
  label = m.highlight_color(),
  className,
}: {
  colors?: ReadonlyArray<string>
  value?: string
  onSelect: (color: string) => void
  label?: string
  className?: string
}) {
  const custom = value && !colors.includes(value) ? value : undefined
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={colorLabel(color)}
          onClick={() => onSelect(color)}
          className="grid size-5 place-items-center rounded-full ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:ring-2 aria-checked:ring-foreground/60"
          style={{ backgroundColor: highlightCss(color) }}
        >
          {value === color && <IconCheck className="size-3 text-white" />}
        </button>
      ))}
      <label
        title={m.color_custom()}
        className={cn(
          'relative grid size-5 cursor-pointer place-items-center rounded-full border border-dashed border-muted-foreground/60 text-muted-foreground ring-offset-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring',
          custom && 'border-solid ring-2 ring-foreground/60',
        )}
        style={custom ? { backgroundColor: custom } : undefined}
      >
        {!custom && <IconPlus className="size-3" />}
        <span className="sr-only">{m.color_custom()}</span>
        <input
          type="color"
          value={custom ?? '#3b82f6'}
          onChange={(e) => onSelect(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
