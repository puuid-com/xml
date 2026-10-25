// Postman-style `<<name>>` placeholders. They are not valid XML (`<` is not
// allowed in text), so every parser works on a masked copy where the brackets
// are swapped for private-use characters. The masked text has the same length,
// so positions found in it map 1:1 back to the real document.

const VAR_OPEN = ''
const VAR_CLOSE = ''

/** Longest variable name accepted; keeps masking windows bounded. */
export const VAR_MAX_NAME = 64
/** Longest possible `<<$name>>` sequence. */
export const VAR_MAX_LENGTH = VAR_MAX_NAME + 5

// A leading `$` marks Postman's dynamic variables, such as `<<$randomInt>>`.
const NAME = `\\$?[A-Za-z_][\\w.-]{0,${VAR_MAX_NAME - 1}}`

export const VAR_PATTERN = `<<\\s*(${NAME})\\s*>>`

export function varRegExp() {
  return new RegExp(VAR_PATTERN, 'g')
}

export interface VarMatch {
  name: string
  from: number
  to: number
}

export function findVars(text: string): Array<VarMatch> {
  const found: Array<VarMatch> = []
  for (const match of text.matchAll(varRegExp())) {
    found.push({
      name: match[1],
      from: match.index,
      to: match.index + match[0].length,
    })
  }
  return found
}

export function maskVars(text: string): string {
  if (!text.includes('<<')) return text
  return text.replace(
    varRegExp(),
    (whole) => VAR_OPEN + VAR_OPEN + whole.slice(2, -2) + VAR_CLOSE + VAR_CLOSE,
  )
}

/**
 * For the JSON grammar: each variable becomes a same-length number, so a bare
 * `<<qty>>` value parses and one inside a string stays part of it.
 */
export function maskVarsAsNumbers(text: string): string {
  if (!text.includes('<<')) return text
  return text.replace(varRegExp(), (whole) => '1'.padEnd(whole.length, '0'))
}

/** Splits text into literal and variable parts, in order. */
export function splitVars(
  text: string,
): Array<{ kind: 'text' | 'var'; value: string }> {
  const parts: Array<{ kind: 'text' | 'var'; value: string }> = []
  let last = 0
  for (const match of findVars(text)) {
    if (match.from > last) {
      parts.push({ kind: 'text', value: text.slice(last, match.from) })
    }
    parts.push({ kind: 'var', value: text.slice(match.from, match.to) })
    last = match.to
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) })
  return parts
}
