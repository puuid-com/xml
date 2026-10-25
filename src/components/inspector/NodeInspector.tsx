import { IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'

import { useDraft } from './use-draft'
import { VarText } from './VarText'
import {
  editAtPath,
  editorStore,
  revealElement,
} from '#/components/editor/editor-store'
import { ColorSwatches } from '#/components/highlights/ColorSwatches'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { useHighlights } from '#/hooks/use-highlights'
import { removeHighlight, setHighlight } from '#/lib/store/highlights'
import {
  addAttr,
  addChild,
  isValidName,
  removeAttr,
  removeNode,
  renameAttr,
  renameElement,
  setAttr,
  setText,
} from '#/lib/xml/edit'
import { ancestorPaths, displayPath, elementByPath } from '#/lib/xml/locate'
import { isLeaf, leafValue } from '#/lib/xml/model'
import { findVars } from '#/lib/xml/vars'
import { m } from '#/paraglide/messages'
import type { XmlAttr, XmlElement, XmlNode } from '#/lib/xml/model'

export function NodeInspector() {
  const doc = useSelector(editorStore, (s) => s.doc)
  const selectedPath = useSelector(editorStore, (s) => s.selectedPath)
  const el = selectedPath ? elementByPath(doc.nodes, selectedPath) : null

  if (!el) {
    return (
      <p className="p-4 text-xs text-muted-foreground">{m.inspector_empty()}</p>
    )
  }
  // Keyed by path so drafts reset when the selection moves.
  return <ElementInspector key={el.path} el={el} nodes={doc.nodes} />
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2 border-b px-3 py-3 last:border-b-0">
      <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function ElementInspector({
  el,
  nodes,
}: {
  el: XmlElement
  nodes: Array<XmlNode>
}) {
  const path = el.path
  const rules = useHighlights()
  const rule = rules.find((r) => r.tag === el.name)
  const leaf = isLeaf(el)
  const text = leafValue(el)
  const vars = [
    ...new Set(
      [...el.attrs.map((a) => a.raw), leaf ? text : '']
        .flatMap(findVars)
        .map((v) => v.name),
    ),
  ]

  const name = useDraft(
    el.name,
    (next) => editAtPath(path, (fresh) => renameElement(fresh, next)),
    'blur',
  )
  const textDraft = useDraft(text, (next) =>
    editAtPath(path, (fresh) => setText(fresh, next)),
  )

  return (
    <div className="min-h-0 overflow-auto text-xs">
      <nav
        aria-label={m.inspector_path()}
        className="flex flex-wrap items-center gap-0.5 border-b px-3 py-2 font-mono text-[11px] text-muted-foreground"
      >
        {[...ancestorPaths(path), path].map((p, i, all) => {
          const target = elementByPath(nodes, p)
          return (
            <span key={p} className="flex items-center gap-0.5">
              {i > 0 && <span className="text-muted-foreground/50">/</span>}
              <button
                type="button"
                className="hover:text-foreground aria-[current=true]:text-foreground"
                aria-current={i === all.length - 1}
                onClick={() => target && revealElement(target)}
              >
                {displayPath(p).at(-1)}
              </button>
            </span>
          )
        })}
      </nav>

      <Section title={m.inspector_element()}>
        <div className="flex items-center gap-2">
          <Input
            aria-label={m.inspector_name()}
            className="h-7 font-mono text-syntax-tag"
            aria-invalid={!isValidName(name.value)}
            {...name}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            title={m.node_delete()}
            aria-label={m.node_delete()}
            onClick={() =>
              editAtPath(path, (fresh, source) => removeNode(source, fresh))
            }
          >
            <IconTrash />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{m.highlight_label()}</span>
          <div className="flex items-center gap-1.5">
            <ColorSwatches
              value={rule?.color}
              onSelect={(c) => setHighlight(el.name, c)}
            />
            {rule && (
              <Button
                variant="ghost"
                size="icon-xs"
                title={m.highlight_remove()}
                aria-label={m.highlight_remove()}
                onClick={() => removeHighlight(rule.id)}
              >
                <IconX />
              </Button>
            )}
          </div>
        </div>
      </Section>

      <Section title={m.inspector_attributes({ count: el.attrs.length })}>
        {el.attrs.map((attr) => (
          <AttrRow key={attr.name} path={path} attr={attr} />
        ))}
        <AddAttrForm path={path} />
      </Section>

      {leaf && (
        <Section title={m.node_text()}>
          <Textarea
            aria-label={m.node_text()}
            className="min-h-16 font-mono text-xs"
            {...textDraft}
          />
        </Section>
      )}

      {vars.length > 0 && (
        <Section title={m.inspector_variables()}>
          <div className="flex flex-wrap gap-1.5 font-mono">
            {vars.map((v) => (
              <VarText key={v} text={`<<${v}>>`} />
            ))}
          </div>
        </Section>
      )}

      <Section title={m.inspector_children()}>
        <AddChildForm path={path} />
      </Section>
    </div>
  )
}

function AttrRow({ path, attr }: { path: string; attr: XmlAttr }) {
  const name = useDraft(
    attr.name,
    (next) =>
      editAtPath(path, (fresh) => {
        const current = fresh.attrs.find((a) => a.name === attr.name)
        return current ? renameAttr(current, next) : []
      }),
    'blur',
  )
  const value = useDraft(attr.value, (next) =>
    editAtPath(path, (fresh) => {
      const current = fresh.attrs.find((a) => a.name === attr.name)
      return current ? setAttr(current, next) : []
    }),
  )

  return (
    <div className="flex items-center gap-1">
      <Input
        aria-label={m.inspector_attr_name()}
        className="h-7 w-2/5 font-mono text-syntax-attr"
        aria-invalid={!isValidName(name.value)}
        {...name}
      />
      <Input
        aria-label={m.inspector_attr_value({ name: attr.name })}
        className="h-7 flex-1 font-mono text-syntax-value"
        {...value}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        title={m.inspector_attr_remove()}
        aria-label={m.inspector_attr_remove()}
        onClick={() =>
          editAtPath(path, (fresh) => {
            const current = fresh.attrs.find((a) => a.name === attr.name)
            return current ? removeAttr(fresh, current) : []
          })
        }
      >
        <IconX />
      </Button>
    </div>
  )
}

function nameError(value: string) {
  return value && !isValidName(value) ? m.invalid_name() : undefined
}

function AddAttrForm({ path }: { path: string }) {
  const form = useForm({
    defaultValues: { name: '', value: '' },
    onSubmit: ({ value, formApi }) => {
      if (!isValidName(value.name)) return
      editAtPath(path, (fresh) => addAttr(fresh, value.name, value.value))
      formApi.reset()
    },
  })

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field
        name="name"
        validators={{ onChange: ({ value }) => nameError(value) }}
      >
        {(field) => (
          <Input
            aria-label={m.inspector_attr_name()}
            placeholder={m.inspector_attr_name_placeholder()}
            className="h-7 w-2/5 font-mono"
            value={field.state.value}
            aria-invalid={field.state.meta.errors.length > 0}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      <form.Field name="value">
        {(field) => (
          <Input
            aria-label={m.inspector_attr_value_placeholder()}
            placeholder={m.inspector_attr_value_placeholder()}
            className="h-7 flex-1 font-mono"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(s) => s.values.name}>
        {(nameValue) => (
          <Button
            type="submit"
            variant="outline"
            size="icon-sm"
            title={m.inspector_attr_add()}
            aria-label={m.inspector_attr_add()}
            disabled={!isValidName(nameValue)}
          >
            <IconPlus />
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

function AddChildForm({ path }: { path: string }) {
  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: ({ value, formApi }) => {
      if (!isValidName(value.name)) return
      editAtPath(path, (fresh, text) => addChild(text, fresh, value.name))
      formApi.reset()
    },
  })

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field
        name="name"
        validators={{ onChange: ({ value }) => nameError(value) }}
      >
        {(field) => (
          <div className="flex-1">
            <Label htmlFor={`child-${path}`} className="sr-only">
              {m.inspector_child_name()}
            </Label>
            <Input
              id={`child-${path}`}
              placeholder={m.inspector_child_name()}
              className="h-7 font-mono"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>
      <form.Subscribe selector={(s) => s.values.name}>
        {(nameValue) => (
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={!isValidName(nameValue)}
          >
            <IconPlus />
            {m.node_add_child()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
