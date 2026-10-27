// Postman-style `<<name>>`, `{{name}}` and `${name}` placeholders. `<<name>>` is not
// valid XML (`<` is not allowed in text), so every parser works on a masked
// copy where the brackets are swapped for private-use characters. The masked
// text has the same length, so positions found in it map 1:1 back to the real
// document.

const VAR_OPEN = ''
const VAR_CLOSE = ''

/** Longest variable name accepted; keeps masking windows bounded. */
export const VAR_MAX_NAME = 64
/** Longest possible `<<$name>>`, `{{$name}}` or `${$name}` sequence. */
export const VAR_MAX_LENGTH = VAR_MAX_NAME + 5

// A leading `$` marks Postman's dynamic variables, such as `<<$randomInt>>`.
const NAME = `\\$?[A-Za-z_][\\w.-]{0,${VAR_MAX_NAME - 1}}`

// The name is in group 1 for `<<name>>`, group 2 for `{{name}}` and group 3
// for `${name}`.
export const VAR_PATTERN = `<<\\s*(${NAME})\\s*>>|\\{\\{\\s*(${NAME})\\s*\\}\\}|\\$\\{\\s*(${NAME})\\s*\\}`

export type VarStyle = 'angle' | 'curly' | 'dollar'

const BRACKETS: Record<VarStyle, readonly [string, string]> = {
  angle: ['<<', '>>'],
  curly: ['{{', '}}'],
  dollar: ['${', '}'],
}

/** `name` written as a variable in `style`. */
export function writeVar(name: string, style: VarStyle): string {
  const [open, close] = BRACKETS[style]
  return open + name + close
}

/** The bracket style of the first variable in `text`, if any. */
export function varStyleOf(text: string): VarStyle | undefined {
  const [, angle, curly, dollar] = varRegExp().exec(text) ?? []
  if (angle) return 'angle'
  if (curly) return 'curly'
  if (dollar) return 'dollar'
  return undefined
}

export function varRegExp() {
  return new RegExp(VAR_PATTERN, 'g')
}

/** The variable name in a match of `varRegExp()`. */
export function varName(match: RegExpMatchArray): string {
  const [, angle, curly, dollar] = match as Array<string | undefined>
  return (angle ?? curly ?? dollar)!
}

/** `<< name >>` as `<<name>>`, keeping the brackets it was written with. */
export function trimVar(whole: string): string {
  const close = whole.endsWith('}}') || whole.endsWith('>>') ? 2 : 1
  return whole.slice(0, 2) + whole.slice(2, -close).trim() + whole.slice(-close)
}

/**
 * Rewrites every variable in `style`, such as `{{host}}` as `<<host>>`.
 * Returns the new text and how many variables changed.
 */
export function convertVars(
  text: string,
  style: VarStyle,
): { text: string; count: number } {
  let count = 0
  const converted = text.replace(varRegExp(), (...args) => {
    const whole: string = args[0]
    const next = writeVar(varName(args as RegExpMatchArray), style)
    if (next !== whole) count++
    return next
  })
  return { text: converted, count }
}

function hasVarOpen(text: string) {
  return text.includes('<<') || text.includes('{{') || text.includes('${')
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
      name: varName(match),
      from: match.index,
      to: match.index + match[0].length,
    })
  }
  return found
}

export function maskVars(text: string): string {
  if (!text.includes('<<')) return text
  // `{{name}}` is already valid XML.
  return text.replace(varRegExp(), (whole) =>
    whole.startsWith('<')
      ? VAR_OPEN + VAR_OPEN + whole.slice(2, -2) + VAR_CLOSE + VAR_CLOSE
      : whole,
  )
}

/**
 * For the JSON grammar: each variable becomes a same-length number, so a bare
 * `<<qty>>` or `{{qty}}` value parses and one inside a string stays part of it.
 */
export function maskVarsAsNumbers(text: string): string {
  if (!hasVarOpen(text)) return text
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
