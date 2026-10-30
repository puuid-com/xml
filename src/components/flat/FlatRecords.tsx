import { useSelector } from '@tanstack/react-store'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useEffect, useMemo, useRef, useState } from 'react'

import { editorStore, revealRange } from '#/components/editor/editor-store'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { m } from '#/paraglide/messages'
import type { FlatGroup, FlatRecord } from '#/lib/flat/parse'

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, FlatRecord>()

// The record type is the tab, so columns start at the second field. Fields
// have no names in the file, so they're numbered from 1 like the type.
function columnsFor(width: number) {
  return helper.columns([
    helper.accessor('line', { header: () => m.flat_line() }),
    ...Array.from({ length: Math.max(0, width - 1) }, (_, i) =>
      helper.accessor((record) => record.fields[i + 1]?.value ?? '', {
        id: `field-${i + 2}`,
        header: `#${i + 2}`,
      }),
    ),
  ])
}

/** Records of the flat file in the editor, one table per record type. */
export function FlatRecords() {
  const flat = useSelector(editorStore, (s) => s.doc.flat)
  const line = useSelector(editorStore, (s) => s.line)
  // A picked tab holds until the cursor moves to another line.
  const [picked, setPicked] = useState<{ type: string; line: number } | null>(
    null,
  )
  const groups = flat?.groups ?? []
  if (groups.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{m.flat_empty()}</p>
  }

  const atCursor = flat?.records.find((r) => r.line === line)?.type
  const wanted =
    picked && (picked.line === line || !atCursor) ? picked.type : atCursor
  const active = groups.some((g) => g.type === wanted) ? wanted : groups[0].type

  return (
    <Tabs
      value={active}
      onValueChange={(type) => setPicked({ type, line })}
      className="h-full min-h-0 gap-0"
    >
      <div className="shrink-0 overflow-x-auto border-b px-2">
        <TabsList variant="line" aria-label={m.flat_types()}>
          {groups.map((group) => (
            <TabsTrigger
              key={group.type}
              value={group.type}
              className="flex-none px-2 font-mono"
            >
              {group.type}
              <span className="text-muted-foreground tabular-nums">
                {group.records.length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {groups.map((group) => (
        <TabsContent
          key={group.type}
          value={group.type}
          className="flex min-h-0 flex-col"
        >
          <RecordTable group={group} line={line} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function RecordTable({ group, line }: { group: FlatGroup; line: number }) {
  const columns = useMemo(() => columnsFor(group.width), [group.width])
  const table = useTable({ features, columns, data: group.records })
  const activeRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [line])

  return (
    <>
      {/* The table's own container scrolls both ways, so the header and
          line column can stick. */}
      <div className="min-h-0 flex-1 [&>[data-slot=table-container]]:h-full">
        <Table className="font-mono">
          <TableHeader className="sticky top-0 z-20 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header, i) => (
                  <TableHead
                    key={header.id}
                    className={
                      i === 0
                        ? 'sticky left-0 z-10 h-8 border-r bg-background font-sans text-muted-foreground'
                        : 'h-8 font-sans text-muted-foreground'
                    }
                  >
                    <table.FlexRender header={header} />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const record = row.original
              const current = record.line === line
              return (
                <TableRow
                  key={row.id}
                  ref={current ? activeRef : undefined}
                  data-state={current ? 'selected' : undefined}
                  className="group/row"
                >
                  {row.getAllCells().map((cell, i) => {
                    // The line column reveals the record type.
                    const field = record.fields.at(i)
                    return (
                      <TableCell
                        key={cell.id}
                        className={
                          i === 0
                            ? 'sticky left-0 z-10 border-r bg-background p-0 text-muted-foreground group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted'
                            : 'p-0'
                        }
                      >
                        <button
                          type="button"
                          className="w-full px-2 py-1.5 text-left"
                          onClick={() =>
                            revealRange(
                              field?.from ?? record.to,
                              field?.to ?? record.to,
                              false,
                            )
                          }
                        >
                          <table.FlexRender cell={cell} />
                        </button>
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <p className="flex h-6 shrink-0 items-center border-t px-3 font-mono text-[11px] text-muted-foreground">
        {m.flat_summary({
          rows: group.records.length,
          fields: group.width,
        })}
      </p>
    </>
  )
}
