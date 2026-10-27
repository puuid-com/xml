import { IconAlertTriangle, IconSearch, IconX } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { treeKeyAction } from './tree-keys'
import { SearchHighlightProvider } from './SearchHighlight'
import { searchNeedle, searchTree } from './tree-search'
import { StructureBreadcrumb } from './StructureBreadcrumb'
import { TreeRowView } from './TreeRowView'
import { useScrollSync } from './use-scroll-sync'
import {
  editorStore,
  revealElement,
  revealRange,
} from '#/components/editor/editor-store'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group'
import { useEnabledDefaults } from '#/hooks/use-defaults'
import { useHighlightMap } from '#/hooks/use-highlights'
import { usePins } from '#/hooks/use-pins'
import { useFormatSettings } from '#/hooks/use-profiles'
import { useMediaQuery } from '#/hooks/use-media-query'
import { sessionStore, setCollapsed } from '#/lib/store/session'
import { localName } from '#/lib/names'
import { isZplTag } from '#/lib/zpl'
import { defaultIndex } from '#/lib/xml/defaults'
import { ancestorPaths } from '#/lib/xml/locate'
import { hasName, isTextLeaf } from '#/lib/xml/model'
import { m } from '#/paraglide/messages'

const NO_COLLAPSED: Array<string> = []

export function XmlTree() {
  const fileId = useSelector(editorStore, (s) => s.fileId)
  const doc = useSelector(editorStore, (s) => s.doc)
  const selectedPath = useSelector(editorStore, (s) => s.selectedPath)
  const collapsedList = useSelector(sessionStore, (s) =>
    fileId ? (s.collapsed[fileId] ?? NO_COLLAPSED) : NO_COLLAPSED,
  )
  const highlights = useHighlightMap()
  const pins = usePins()
  const pinned = new Set(pins.map((p) => p.tag))
  const { zplTags } = useFormatSettings()
  const enabledDefaults = useEnabledDefaults()
  const defaults = useMemo(
    () => defaultIndex(enabledDefaults),
    [enabledDefaults],
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  // The row holding keyboard focus while focus is inside the tree.
  const [focusedPath, setFocusedPath] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [searchCollapsed, setSearchCollapsed] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const wide = useMediaQuery('(min-width: 768px)')
  const rowHeight = wide ? 26 : 44
  const searching = query.trim() !== ''

  const collapsed = useMemo(
    () => (searching ? searchCollapsed : new Set(collapsedList)),
    [searching, searchCollapsed, collapsedList],
  )
  const { rows, matches } = useMemo(
    () => searchTree(doc.nodes, query, collapsed, editingPath),
    [doc.nodes, query, collapsed, editingPath],
  )
  const indexOf = (path: string | null) =>
    path === null ? -1 : rows.findIndex((r) => r.el.path === path)
  // The single tabbable row (roving tabIndex): the focused row, else the
  // selection, else the first row.
  const focusedIndex = indexOf(focusedPath)
  const activeIndex =
    focusedIndex >= 0 ? focusedIndex : Math.max(0, indexOf(selectedPath))

  // TanStack Virtual is a known React Compiler opt-out; nothing it returns is
  // passed to a memoized child, so skipping compilation here is harmless.
  // react-doctor-disable-next-line react-hooks-js/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 16,
    // Keep the tab stop mounted even when scrolled away, so Tab still lands
    // in the tree and arrow keys can move focus from it.
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range)
      if (activeIndex >= rows.length || indexes.includes(activeIndex)) {
        return indexes
      }
      return [...indexes, activeIndex].sort((a, b) => a - b)
    },
  })
  useScrollSync(scrollRef, rows, rowHeight, fileId, wide && !searching)
  useEffect(() => virtualizer.measure(), [virtualizer, rowHeight])

  // Follow the editor cursor: expand collapsed ancestors and scroll to it.
  // Only a cursor move triggers this, so collapsing a row by hand sticks.
  const followCursor = useEffectEvent(() => {
    if (!selectedPath || !fileId || searching) return
    const hidden = ancestorPaths(selectedPath).filter((p) => collapsed.has(p))
    if (hidden.length > 0) {
      setCollapsed(fileId, hidden, false)
      return
    }
    const index = indexOf(selectedPath)
    if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' })
  })
  // `rows.length` re-runs it once expanded ancestors have rendered their rows.
  useEffect(
    () => followCursor(),
    [selectedPath, fileId, rows.length, searching],
  )
  useEffect(() => virtualizer.scrollToOffset(0), [query, virtualizer])

  if (!fileId) return null

  const changeQuery = (value: string) => {
    setQuery(value)
    setSearchCollapsed(new Set())
    setFocusedPath(null)
  }

  const changeCollapsed = (paths: Array<string>, collapse: boolean) => {
    if (!searching) {
      setCollapsed(fileId, paths, collapse)
      return
    }
    setSearchCollapsed((previous) => {
      const next = new Set(previous)
      for (const path of paths) {
        if (collapse) next.add(path)
        else next.delete(path)
      }
      return next
    })
  }

  const focusRow = (index: number) => {
    // Render first so the row is mounted and tabbable, then move focus to it.
    flushSync(() => setFocusedPath(rows[index].el.path))
    scrollRef.current
      ?.querySelector<HTMLElement>(`[role="treeitem"][data-index="${index}"]`)
      ?.focus({ preventScroll: true })
    virtualizer.scrollToIndex(index, { align: 'auto' })
  }

  const onTreeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.getAttribute('role') !== 'treeitem') return
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    const action = treeKeyAction(rows, activeIndex, e.key)
    if (!action) return
    e.preventDefault()
    const { el } = rows[action.index]
    switch (action.type) {
      case 'focus':
        focusRow(action.index)
        break
      case 'expand':
      case 'collapse':
        changeCollapsed([el.path], action.type === 'collapse')
        break
      case 'reveal':
        revealElement(el)
        break
      case 'edit':
        target.querySelector<HTMLElement>('[data-edit-value]')?.click()
        break
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:h-10">
        <h2 className="shrink-0 text-xs font-medium text-muted-foreground">
          {m.panel_structure()}
        </h2>
        <InputGroup className="h-11 border-0 bg-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-inset md:h-8 dark:bg-transparent">
          <InputGroupInput
            ref={inputRef}
            aria-label={m.tree_search()}
            placeholder={m.tree_search_placeholder()}
            value={query}
            className="h-full text-base md:text-xs"
            onChange={(event) => changeQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                changeQuery('')
              } else if (event.key === 'ArrowDown' && rows.length) {
                event.preventDefault()
                focusRow(0)
              }
            }}
          />
          <InputGroupAddon>
            <IconSearch aria-hidden />
          </InputGroupAddon>
          {searching && (
            <InputGroupAddon align="inline-end" className="shrink-0">
              <span role="status" className="whitespace-nowrap font-normal">
                {m.tree_search_matches({ count: matches.size })}
              </span>
            </InputGroupAddon>
          )}
          {query && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                className="max-md:size-11"
                aria-label={m.tree_search_clear()}
                onClick={() => {
                  changeQuery('')
                  inputRef.current?.focus()
                }}
              >
                <IconX />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>
      {doc.errors.length > 0 && (
        <div className="border-b bg-destructive/5 px-3 py-2 text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-destructive">
            <IconAlertTriangle className="size-3.5" />
            {m.tree_errors({ count: doc.errors.length })}
          </div>
          <ul className="space-y-0.5">
            {doc.errors.slice(0, 3).map((error) => (
              <li key={`${error.from}-${error.message}`}>
                <button
                  type="button"
                  className="w-full truncate text-left text-muted-foreground hover:text-foreground"
                  onClick={() => revealRange(error.from, error.to)}
                >
                  {error.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="flex-1 p-4 text-sm text-muted-foreground">
          {searching ? m.tree_search_empty() : m.tree_empty()}
        </p>
      ) : (
        <div
          ref={scrollRef}
          role="tree"
          aria-label={m.tree_label()}
          className="min-h-0 flex-1 overflow-auto py-1"
          onKeyDown={onTreeKeyDown}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setFocusedPath(null)
          }}
        >
          <SearchHighlightProvider needle={searchNeedle(query)}>
            <div
              className="relative w-full"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((item) => {
                const row = rows[item.index]
                const named = hasName(row.el)
                return (
                  <TreeRowView
                    key={row.el.path}
                    row={row}
                    index={item.index}
                    active={item.index === activeIndex}
                    onFocusRow={setFocusedPath}
                    onEditingChange={setEditingPath}
                    rowHeight={rowHeight}
                    onCollapse={changeCollapsed}
                    top={item.start}
                    defaults={defaults}
                    selected={row.el.path === selectedPath}
                    color={
                      named ? highlights.get(localName(row.el.name)) : undefined
                    }
                    pinned={named && pinned.has(row.el.name)}
                    zpl={
                      named &&
                      isTextLeaf(row.el) &&
                      isZplTag(zplTags, row.el.name)
                    }
                  />
                )
              })}
            </div>
          </SearchHighlightProvider>
        </div>
      )}
      <StructureBreadcrumb
        nodes={doc.nodes}
        path={selectedPath}
        onNavigate={() => changeQuery('')}
      />
    </div>
  )
}
