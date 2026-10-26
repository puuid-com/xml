import {
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
  IconX,
} from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef, useState } from 'react'

import { editorStore } from '#/components/editor/editor-store'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import { localName } from '#/lib/names'
import { appendNames, documentNames, moveItem } from '#/lib/sort-order'
import { setCustomOrder } from '#/lib/store/profiles'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

/** Edits the custom sort order: drag rows, or use the arrow keys on a handle. */
export function SortOrderEditor({ order }: { order: Array<string> }) {
  const doc = useSelector(editorStore, (s) => s.doc)
  const listed = new Set(order.map(localName))
  const missing = documentNames(doc.nodes).filter((n) => !listed.has(n))
  // Moving a row re-inserts its node, which drops focus; put it back after.
  const handles = useRef(new Map<string, HTMLButtonElement>())
  const refocus = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [drag, setDrag] = useState<{ from: number; to: number | null } | null>(
    null,
  )

  useEffect(() => {
    const name = refocus.current
    refocus.current = null
    if (name) handles.current.get(name)?.focus()
  }, [order])

  const move = (from: number, to: number) => {
    const target = Math.max(0, Math.min(to, order.length - 1))
    if (target === from) return
    const name = order[from]
    setCustomOrder(moveItem(order, from, target))
    refocus.current = name
    setAnnouncement(
      m.sort_order_moved({ name, position: target + 1, count: order.length }),
    )
  }

  const onHandleKey = (e: React.KeyboardEvent, index: number) => {
    const to = {
      ArrowUp: index - 1,
      ArrowDown: index + 1,
      Home: 0,
      End: order.length - 1,
    }[e.key]
    if (to === undefined) return
    e.preventDefault()
    move(index, to)
  }

  // `to` is an insertion point between rows, 0 to `order.length`.
  const drop = () => {
    if (drag?.to == null) return
    move(drag.from, drag.to > drag.from ? drag.to - 1 : drag.to)
  }

  return (
    <div className="flex flex-col">
      <p className="px-3 pb-2 text-muted-foreground">{m.sort_order_hint()}</p>
      <Separator />
      {order.length > 0 ? (
        <ol
          aria-label={m.sort_order_label()}
          className="flex max-h-60 flex-col overflow-y-auto py-1"
        >
          {order.map((name, index) => (
            <li
              key={name}
              draggable
              onDragStart={(e) => {
                setDrag({ from: index, to: null })
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', name)
              }}
              onDragOver={(e) => {
                if (!drag) return
                e.preventDefault()
                const box = e.currentTarget.getBoundingClientRect()
                const after = e.clientY > box.top + box.height / 2
                const to = index + Number(after)
                if (to !== drag.to) setDrag({ ...drag, to })
              }}
              onDrop={(e) => {
                e.preventDefault()
                drop()
                setDrag(null)
              }}
              onDragEnd={() => setDrag(null)}
              className={cn(
                'group/row flex items-center gap-1 py-0.5 pr-2 pl-1 hover:bg-muted',
                drag?.from === index && 'opacity-50',
                drag?.to === index && 'shadow-[inset_0_2px_0_var(--ring)]',
                drag?.to === index + 1 &&
                  index === order.length - 1 &&
                  'shadow-[inset_0_-2px_0_var(--ring)]',
              )}
            >
              <button
                type="button"
                ref={(el) => {
                  if (el) handles.current.set(name, el)
                  else handles.current.delete(name)
                }}
                aria-label={m.sort_order_move({ name })}
                title={m.sort_order_move({ name })}
                onKeyDown={(e) => onHandleKey(e, index)}
                className="grid size-6 cursor-grab place-items-center text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
              >
                <IconGripVertical className="size-3.5" />
              </button>
              <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span
                className="min-w-0 flex-1 truncate font-mono text-xs"
                title={name}
              >
                {name}
              </span>
              <div className="hidden pointer-coarse:flex">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={index === 0}
                  aria-label={m.sort_order_move_up({ name })}
                  onClick={() => move(index, index - 1)}
                >
                  <IconChevronUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={index === order.length - 1}
                  aria-label={m.sort_order_move_down({ name })}
                  onClick={() => move(index, index + 1)}
                >
                  <IconChevronDown />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={m.sort_order_remove({ name })}
                title={m.sort_order_remove({ name })}
                onClick={() => setCustomOrder(order.filter((n) => n !== name))}
                className="md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100"
              >
                <IconX />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-3 py-3 text-muted-foreground">
          {m.sort_order_empty()}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <Separator />
      <AddNameForm order={order} suggestions={missing} />
      <div className="flex items-center gap-1 px-3 pb-2.5">
        <Button
          variant="outline"
          size="sm"
          disabled={missing.length === 0}
          title={m.sort_order_add_file_hint({ count: missing.length })}
          onClick={() => setCustomOrder(appendNames(order, missing))}
        >
          {m.sort_order_add_file()}
          {missing.length > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {missing.length}
            </span>
          )}
        </Button>
        <div className="flex-1" />
        {order.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setCustomOrder([])}>
            {m.sort_order_clear()}
          </Button>
        )}
      </div>
    </div>
  )
}

function AddNameForm({
  order,
  suggestions,
}: {
  order: Array<string>
  suggestions: Array<string>
}) {
  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: ({ value, formApi }) => {
      const name = value.name.trim()
      if (!name) return
      setCustomOrder(appendNames(order, [name]))
      formApi.reset()
    },
  })

  return (
    <form
      className="flex items-center gap-1 px-3 py-2.5"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => (
          <Input
            list="sort-order-suggestions"
            aria-label={m.sort_order_name()}
            placeholder={m.sort_order_name()}
            autoComplete="off"
            className="h-7 flex-1 font-mono"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      <datalist id="sort-order-suggestions">
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <form.Subscribe
        selector={(s) => {
          const name = s.values.name.trim()
          return name !== '' && !order.includes(name)
        }}
      >
        {(canSubmit) => (
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {m.sort_order_add()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
