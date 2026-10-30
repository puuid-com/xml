import { jsonLanguage } from '@codemirror/lang-json'
import { autoCloseTags, xmlLanguage } from '@codemirror/lang-xml'
import { Language, LanguageSupport } from '@codemirror/language'
import { Compartment, Facet } from '@codemirror/state'
import { Parser } from '@lezer/common'

import { VAR_MAX_LENGTH, maskVars, maskVarsAsNumbers } from '#/lib/xml/vars'
import type { Input, PartialParse, TreeFragment } from '@lezer/common'
import type { DocLanguage } from '#/lib/document'

// The stock grammars read `<<name>>` as broken input, which throws off
// highlighting for the rest of the line. These languages feed the parser a
// masked view of the document instead (same length, so positions match).

const CHUNK = 4096

class MaskedInput implements Input {
  readonly lineChunks = false

  constructor(
    private inner: Input,
    private mask: (text: string) => string,
  ) {}

  get length() {
    return this.inner.length
  }

  chunk(from: number) {
    return this.read(from, Math.min(this.length, from + CHUNK))
  }

  read(from: number, to: number) {
    // Read a little extra on both sides so a variable cut by the window edge
    // is still recognised, then trim back.
    const start = Math.max(0, from - VAR_MAX_LENGTH)
    const end = Math.min(this.length, to + VAR_MAX_LENGTH)
    const text = this.mask(this.inner.read(start, end))
    return text.slice(from - start, from - start + (to - from))
  }
}

class MaskedParser extends Parser {
  constructor(
    private inner: Parser,
    private mask: (text: string) => string,
  ) {
    super()
  }

  createParse(
    input: Input,
    fragments: ReadonlyArray<TreeFragment>,
    ranges: ReadonlyArray<{ from: number; to: number }>,
  ): PartialParse {
    return this.inner.startParse(
      new MaskedInput(input, this.mask),
      fragments,
      ranges,
    )
  }
}

const xmlSupport = new LanguageSupport(
  new Language(
    xmlLanguage.data,
    new MaskedParser(xmlLanguage.parser, maskVars),
    [],
    'xml',
  ),
  [autoCloseTags],
)

const jsonSupport = new LanguageSupport(
  new Language(
    jsonLanguage.data,
    new MaskedParser(jsonLanguage.parser, maskVarsAsNumbers),
    [],
    'json',
  ),
)

/** The language of the file in this editor state. */
export const docLanguage = Facet.define<DocLanguage, DocLanguage>({
  combine: (values) => values.at(-1) ?? 'xml',
})

export const languageCompartment = new Compartment()

export function languageExtension(language: DocLanguage) {
  return [
    docLanguage.of(language),
    language === 'json' ? jsonSupport : language === 'xml' ? xmlSupport : [],
  ]
}
