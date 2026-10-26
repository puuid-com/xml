import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import { useHotkey } from '@tanstack/react-hotkeys'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useMemo, useRef, useState } from 'react'

import { createCompare } from './merge'
import { ToolbarButton } from '#/components/app/ToolbarButton'
import {
  setCompareId,
  setCompareIgnoreFormatting,
  uiStore,
} from '#/components/app/ui-store'
import { getView } from '#/components/editor/editor-store'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import { useFileContent } from '#/hooks/use-files'
import { useHighlights } from '#/hooks/use-highlights'
import { useFormatSettings } from '#/hooks/use-profiles'
import { compareTexts } from '#/lib/compare'
import { languageOf } from '#/lib/document'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'
import type { CompareHandle } from './merge'
import type { CompareSide, CompareTexts } from '#/lib/compare'
import type { DocLanguage } from '#/lib/document'

type Layout = 'split' | 'unified'

/** Ends the comparison and hands focus back to the editor. */
function closeCompare() {
  setCompareId(null)
  requestAnimationFrame(() => getView()?.focus())
}

/**
 * Read-only diff of the active file against another open tab, shown in place
 * of the editor. The other tab is the original, so what the active file adds
 * reads as inserted.
 */
export function CompareView({
  fileId,
  otherId,
  layout,
}: {
  fileId: string
  otherId: string
  layout: Layout
}) {
  const file = useFileContent(fileId)
  const other = useFileContent(otherId)

  useHotkey(
    'Escape',
    (e) => {
      // Dialogs, menus and the search panel close themselves first.
      if (e.defaultPrevented) return
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      closeCompare()
    },
    { ignoreInputs: false, preventDefault: false },
  )

  if (!file || !other) return null
  return <CompareFiles original={other} changed={file} layout={layout} />
}

function CompareFiles({
  original,
  changed,
  layout,
}: {
  original: CompareSide
  changed: CompareSide
  layout: Layout
}) {
  const ignoreFormatting = useSelector(
    uiStore,
    (s) => s.compareIgnoreFormatting,
  )
  const format = useFormatSettings()
  const highlights = useHighlights()
  const first = format.highlightedFirst
    ? highlights.filter((r) => r.enabled).map((r) => r.tag)
    : []
  const firstKey = first.join('\n')
  const orderKey = format.customOrder.join('\n')
  // Formatting large files is the costly part; only redo it when an input
  // changes. The pieces are listed one by one, as query rows are new objects.
  const { name: nameA, content: contentA } = original
  const { name: nameB, content: contentB } = changed
  const texts = useMemo(
    () =>
      compareTexts(
        { name: nameA, content: contentA },
        { name: nameB, content: contentB },
        ignoreFormatting,
        {
          removeEmptyLines: format.removeEmptyLines,
          trimVars: format.trimVars,
          sort: format.sort,
          order: orderKey ? orderKey.split('\n') : [],
          first: firstKey ? firstKey.split('\n') : [],
        },
      ),
    [
      nameA,
      contentA,
      nameB,
      contentB,
      ignoreFormatting,
      format.removeEmptyLines,
      format.trimVars,
      format.sort,
      orderKey,
      firstKey,
    ],
  )
  const [chunks, setChunks] = useState<number | null>(null)

  return (
    <section
      aria-label={m.compare_label({ a: original.name, b: changed.name })}
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b pr-1 pl-3 text-[11px] text-muted-foreground md:h-8">
        <span aria-live="polite" className="truncate">
          {chunks === null
            ? null
            : chunks === 0
              ? m.compare_no_changes()
              : m.compare_changes({ count: chunks })}
        </span>
        {texts.unparsed !== null && (
          <span className="flex min-w-0 items-center gap-1 text-foreground">
            <IconAlertTriangle className="size-3.5 shrink-0" />
            <span className="truncate">
              {m.compare_unparsed({ name: texts.unparsed })}
            </span>
          </span>
        )}
        <div className="flex-1" />
        <Label
          htmlFor="compare-ignore-formatting"
          className="shrink-0 gap-2 text-[11px] font-normal text-foreground max-md:h-11"
        >
          {m.compare_ignore_formatting()}
          <Switch
            id="compare-ignore-formatting"
            size="sm"
            checked={ignoreFormatting}
            onCheckedChange={setCompareIgnoreFormatting}
          />
        </Label>
        <Separator
          orientation="vertical"
          className="mx-1 data-vertical:h-4 data-vertical:self-center"
        />
        <ToolbarButton label={m.compare_close()} onClick={closeCompare}>
          <IconX />
        </ToolbarButton>
      </div>
      <div
        className={cn(
          'shrink-0 border-b text-[11px] font-mono',
          layout === 'split' ? 'grid grid-cols-2' : 'flex flex-wrap gap-x-4',
        )}
      >
        <SideName name={original.name} side="removed" />
        <SideName
          name={changed.name}
          side="added"
          className={layout === 'split' ? 'border-l' : undefined}
        />
      </div>
      <MergeHost
        texts={texts}
        languageA={languageOf(original.name, texts.a)}
        languageB={languageOf(changed.name, texts.b)}
        layout={layout}
        onChunks={setChunks}
      />
    </section>
  )
}

function SideName({
  name,
  side,
  className,
}: {
  name: string
  side: 'removed' | 'added'
  className?: string
}) {
  return (
    <div
      className={cn('flex h-7 min-w-0 items-center gap-2 px-3', className)}
      title={name}
    >
      <span
        aria-hidden
        className={cn(
          'h-3 w-0.5 shrink-0',
          side === 'removed' ? 'bg-destructive' : 'bg-(--hl-green)',
        )}
      />
      <span className="truncate">{name}</span>
    </div>
  )
}

function MergeHost({
  texts,
  languageA,
  languageB,
  layout,
  onChunks,
}: {
  texts: CompareTexts
  languageA: DocLanguage
  languageB: DocLanguage
  layout: Layout
  onChunks: (count: number) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<CompareHandle | null>(null)
  const latest = useRef(texts)

  // Later edits go through `update`, which keeps scroll and selection.
  useEffect(() => {
    latest.current = texts
    handleRef.current?.update(texts.a, texts.b)
  }, [texts])

  useEffect(() => {
    const { a, b } = latest.current
    const handle = createCompare(
      hostRef.current!,
      { text: a, language: languageA },
      { text: b, language: languageB },
      layout,
      onChunks,
    )
    handleRef.current = handle
    if (layout === 'split') handle.focus()
    return () => {
      handle.destroy()
      handleRef.current = null
    }
  }, [languageA, languageB, layout, onChunks])

  return (
    <div
      ref={hostRef}
      className="min-h-0 flex-1 overflow-hidden [&_.cm-mergeView]:h-full [&_.cm-mergeViewEditor+.cm-mergeViewEditor]:border-l"
    />
  )
}
