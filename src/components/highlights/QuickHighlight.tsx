import { IconTrash } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { useRef } from 'react'

import { ColorSwatches } from './ColorSwatches'
import { setQuickHighlight, uiStore } from '#/components/app/ui-store'
import { getView } from '#/components/editor/editor-store'
import { Button } from '#/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '#/components/ui/popover'
import { useHighlights } from '#/hooks/use-highlights'
import {
  highlightCss,
  isPreset,
  removeHighlight,
  setHighlight,
} from '#/lib/store/highlights'
import { m } from '#/paraglide/messages'

/** Colour picker that opens at the editor cursor (Alt+H on a tag). */
export function QuickHighlight() {
  const target = useSelector(uiStore, (s) => s.quickHighlight)
  const rules = useHighlights()
  const rule = target && rules.find((r) => r.tag === target.tag)
  const contentRef = useRef<HTMLDivElement>(null)

  const close = () => setQuickHighlight(null)

  return (
    <Popover
      open={!!target}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <PopoverAnchor
        className="pointer-events-none fixed size-0"
        style={target ? { left: target.x, top: target.y } : undefined}
      />
      <PopoverContent
        align="start"
        className="w-auto gap-2"
        aria-label={m.highlight_tag({ name: target?.tag ?? '' })}
        ref={contentRef}
        onOpenAutoFocus={(e) => {
          // Start on the current colour (or the first) rather than Remove.
          e.preventDefault()
          const root = contentRef.current
          const swatch =
            root?.querySelector<HTMLElement>('[aria-checked=true]') ??
            root?.querySelector<HTMLElement>('[role=radio]')
          swatch?.focus()
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          getView()?.focus()
        }}
      >
        {target && (
          <>
            <div className="flex items-center gap-2">
              <span
                className={
                  rule
                    ? 'hl-tag hl-ink px-0.5 font-mono'
                    : 'font-mono text-syntax-tag'
                }
                style={
                  rule
                    ? ({
                        '--hl': highlightCss(rule.color),
                      } as React.CSSProperties)
                    : undefined
                }
              >
                {target.tag}
              </span>
              <span className="flex-1" />
              {rule && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={m.highlight_remove()}
                  title={m.highlight_remove()}
                  onClick={() => {
                    removeHighlight(rule.id)
                    close()
                  }}
                >
                  <IconTrash />
                </Button>
              )}
            </div>
            <ColorSwatches
              value={rule?.color}
              onSelect={(color) => {
                setHighlight(target.tag, color)
                // The native picker fires on every drag; keep it open for that.
                if (isPreset(color)) close()
              }}
            />
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
