import { IconCheck, IconPlus } from '@tabler/icons-react'

import {
  HIGHLIGHT_PRESETS,
  highlightCss,
  isPreset,
} from '#/lib/store/highlights'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'
import type { HighlightPreset } from '#/lib/store/highlights'

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

/** Preset colour dots plus a custom colour picker. */
export function ColorSwatches({
  value,
  onSelect,
  className,
}: {
  value?: string
  onSelect: (color: string) => void
  className?: string
}) {
  const custom = value && !isPreset(value) ? value : undefined
  return (
    <div
      role="radiogroup"
      aria-label={m.highlight_color()}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {HIGHLIGHT_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          role="radio"
          aria-checked={value === preset}
          aria-label={presetLabels[preset]()}
          title={presetLabels[preset]()}
          onClick={() => onSelect(preset)}
          className="grid size-5 place-items-center rounded-full ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:ring-2 aria-checked:ring-foreground/60"
          style={{ backgroundColor: highlightCss(preset) }}
        >
          {value === preset && <IconCheck className="size-3 text-white" />}
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

/** Small round dot in a highlight colour. */
export function ColorDot({
  color,
  className,
}: {
  color: string
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      style={{ backgroundColor: highlightCss(color) }}
    />
  )
}
