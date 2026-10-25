import { useLayoutEffect, useRef, useState } from 'react'

/** Last step of a path, with any `[...]` predicates or bracketed keys. */
const LAST_STEP = /[/.](?:[^/.[]|\[[^\]]*\])*$/

/** Sample of the monospace font, to measure one character. */
const PROBE = '0'.repeat(20)

const MARKER =
  'mx-1 inline-flex h-3.5 shrink-0 items-center border bg-popover px-1 text-[10px] tracking-wider text-foreground'

/**
 * A monospace path that fits its line by hiding the middle behind a marker,
 * so the root and the element's own step both stay readable.
 */
export function PathText({ path }: { path: string }) {
  const box = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLSpanElement>(null)
  const marker = useRef<HTMLSpanElement>(null)
  const [cut, setCut] = useState<{ head: string; tail: string } | null>(null)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    // Layout widths, not client rects: the menu opens with a scale animation.
    const fit = () => {
      if (!probe.current || !marker.current) return
      const char = probe.current.offsetWidth / PROBE.length
      const room = Math.floor(el.clientWidth / char)
      if (path.length <= room) return setCut(null)
      const left = room - Math.ceil(marker.current.offsetWidth / char)
      // Keep the whole last step unless it would crowd out the root.
      const step = LAST_STEP.exec(path)?.[0].length ?? left
      const tail = Math.min(step, Math.floor(left * 0.6))
      const head = Math.max(1, left - tail)
      setCut({
        head: path.slice(0, head),
        tail: path.slice(-tail || path.length),
      })
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [path])

  return (
    <div
      ref={box}
      title={path}
      className="relative mt-0.5 flex min-w-0 items-center overflow-hidden text-[11px] whitespace-nowrap text-muted-foreground"
    >
      <span className="sr-only">{path}</span>
      {cut ? (
        <>
          <span aria-hidden>{cut.head}</span>
          <span aria-hidden className={MARKER}>
            ···
          </span>
          <span aria-hidden>{cut.tail}</span>
        </>
      ) : (
        <span aria-hidden>{path}</span>
      )}
      <span aria-hidden className="invisible absolute">
        <span ref={probe}>{PROBE}</span>
        {/* Wrapped so the measured width includes the marker's margins. */}
        <span ref={marker} className="inline-flex">
          <span className={MARKER}>···</span>
        </span>
      </span>
    </div>
  )
}
