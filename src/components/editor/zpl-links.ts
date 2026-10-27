import { syntaxTree } from '@codemirror/language'
import { Compartment, Facet, StateField } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'

import { decodeString } from '#/lib/json/parse'
import { isZplTag, zplViewerUrl } from '#/lib/zpl'
import { m } from '#/paraglide/messages'
import type { EditorState, Extension, Range } from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'

// Values of tags marked as base64 ZPL labels get a link, before the value,
// that opens the label in the ZPL viewer.

const tagsFacet = Facet.define<ReadonlyArray<string>, ReadonlyArray<string>>({
  combine: (values) => values.at(-1) ?? [],
})

const tagsCompartment = new Compartment()

/** Effect that changes which tags hold ZPL labels. */
export function setZplTags(tags: ReadonlyArray<string>) {
  return tagsCompartment.reconfigure(tagsFacet.of(tags))
}

const LINK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"/><path d="M11 13l9 -9"/><path d="M15 4h5v5"/></svg>'

class ZplLinkWidget extends WidgetType {
  constructor(
    readonly name: string,
    readonly url: string,
  ) {
    super()
  }

  eq(other: ZplLinkWidget) {
    return other.name === this.name && other.url === this.url
  }

  toDOM() {
    const link = document.createElement('a')
    link.className = 'cm-zpl-link'
    link.href = this.url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.title = m.zpl_open_name({ name: this.name })
    link.setAttribute('aria-label', link.title)
    link.innerHTML = `ZPL${LINK_ICON}`
    // Keep the editor from moving the cursor under the link.
    link.addEventListener('mousedown', (event) => event.preventDefault())
    return link
  }

  ignoreEvent() {
    return true
  }
}

/** Text of an XML element that holds only text, or null. */
function elementText(state: EditorState, element: SyntaxNode) {
  const open = element.getChild('OpenTag')
  const close = element.getChild('CloseTag')
  if (!open || !close || element.getChild('Element')) return null
  return state.sliceDoc(open.to, close.from).replace(/<!\[CDATA\[|\]\]>/g, '')
}

export interface ZplLink {
  name: string
  url: string
  /** Where the link sits: after the opening tag, or before the JSON string. */
  at: number
  side: number
}

/** Links for the values of `tags` in the document. */
export function zplLinkTargets(
  state: EditorState,
  tags: ReadonlyArray<string>,
) {
  const links: Array<ZplLink> = []
  if (tags.length === 0) return links
  const add = (name: string, value: string | null, at: number, side = 1) => {
    if (value === null || !isZplTag(tags, name)) return
    const url = zplViewerUrl(value)
    if (url) links.push({ name, url, at, side })
  }
  syntaxTree(state).iterate({
    enter(ref) {
      if (ref.name === 'Element') {
        const open = ref.node.getChild('OpenTag')
        const name = open?.getChild('TagName')
        if (open && name) {
          add(
            state.sliceDoc(name.from, name.to),
            elementText(state, ref.node),
            open.to,
          )
        }
        return undefined
      }
      if (ref.name === 'Property') {
        const key = ref.node.getChild('PropertyName')
        const value = key?.nextSibling?.nextSibling
        if (key && value?.name === 'String') {
          add(
            decodeString(state.sliceDoc(key.from, key.to)),
            decodeString(state.sliceDoc(value.from, value.to)),
            value.from,
            -1,
          )
        }
      }
      return undefined
    },
  })
  return links
}

function build(state: EditorState): DecorationSet {
  const ranges: Array<Range<Decoration>> = zplLinkTargets(
    state,
    state.facet(tagsFacet),
  ).map(({ name, url, at, side }) =>
    Decoration.widget({ widget: new ZplLinkWidget(name, url), side }).range(at),
  )
  return Decoration.set(ranges, true)
}

const zplLinkField = StateField.define<DecorationSet>({
  create: build,
  update(value, tr) {
    const stale =
      tr.docChanged ||
      syntaxTree(tr.startState) !== syntaxTree(tr.state) ||
      tr.startState.facet(tagsFacet) !== tr.state.facet(tagsFacet)
    return stale ? build(tr.state) : value
  },
  provide: (field) => EditorView.decorations.from(field),
})

/** Links the values of `tags` to the ZPL viewer. */
export function zplLinks(tags: ReadonlyArray<string> = []): Extension {
  return [tagsCompartment.of(tagsFacet.of(tags)), zplLinkField]
}
