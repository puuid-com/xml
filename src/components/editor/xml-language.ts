import { autoCloseTags, xmlLanguage } from '@codemirror/lang-xml'
import { Language, LanguageSupport } from '@codemirror/language'
import { Parser } from '@lezer/common'

import { VAR_MAX_LENGTH, maskVars } from '#/lib/xml/vars'
import type { Input, PartialParse, TreeFragment } from '@lezer/common'

// The stock XML grammar reads `<<name>>` as a broken tag, which throws off
// highlighting for the rest of the line. This language feeds the parser a
// masked view of the document instead (same length, so positions match).

const CHUNK = 4096

class MaskedInput implements Input {
  readonly lineChunks = false

  constructor(private inner: Input) {}

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
    const text = maskVars(this.inner.read(start, end))
    return text.slice(from - start, from - start + (to - from))
  }
}

class MaskedParser extends Parser {
  constructor(private inner: Parser) {
    super()
  }

  createParse(
    input: Input,
    fragments: ReadonlyArray<TreeFragment>,
    ranges: ReadonlyArray<{ from: number; to: number }>,
  ): PartialParse {
    return this.inner.startParse(new MaskedInput(input), fragments, ranges)
  }
}

export const maskedXmlLanguage = new Language(
  xmlLanguage.data,
  new MaskedParser(xmlLanguage.parser),
  [],
  'xml',
)

export function xmlSupport() {
  return new LanguageSupport(maskedXmlLanguage, [autoCloseTags])
}
