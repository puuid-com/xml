import { varRegExp } from './vars'
import type { Faker } from '@faker-js/faker'

// Postman's dynamic variables, such as `<<$randomInt>>`: each one stands for
// a value made up when the document is used. Only the Common and the Text,
// numbers and colors groups are supported so far.
// https://learning.postman.com/docs/tests-and-scripts/write-scripts/variables-list

export interface DynamicVarContext {
  faker: Faker
  /** One clock for the whole run, so every timestamp agrees. */
  now: Date
}

export interface DynamicVar {
  name: string
  generate: (ctx: DynamicVarContext) => string
}

export const DYNAMIC_VARS: ReadonlyArray<DynamicVar> = [
  {
    name: '$guid',
    generate: ({ faker }) => faker.string.uuid(),
  },
  {
    name: '$timestamp',
    generate: ({ now }) => String(Math.floor(now.getTime() / 1000)),
  },
  {
    name: '$isoTimestamp',
    generate: ({ now }) => now.toISOString(),
  },
  {
    name: '$randomUUID',
    generate: ({ faker }) => faker.string.uuid(),
  },
  {
    name: '$randomAlphaNumeric',
    generate: ({ faker }) =>
      faker.string.alphanumeric({ length: 1, casing: 'lower' }),
  },
  {
    name: '$randomBoolean',
    generate: ({ faker }) => String(faker.datatype.boolean()),
  },
  {
    name: '$randomInt',
    generate: ({ faker }) => String(faker.number.int({ min: 0, max: 1000 })),
  },
  {
    name: '$randomColor',
    generate: ({ faker }) => faker.color.human(),
  },
  {
    name: '$randomHexColor',
    generate: ({ faker }) => faker.color.rgb(),
  },
  {
    name: '$randomAbbreviation',
    generate: ({ faker }) => faker.hacker.abbreviation(),
  },
]

const byName = new Map(DYNAMIC_VARS.map((v) => [v.name, v]))

export function isDynamicVar(name: string) {
  return byName.has(name)
}

export interface ResolveContext extends DynamicVarContext {
  /** Values of plain variables, such as `host` for `<<host>>`. */
  values: ReadonlyMap<string, string>
}

/**
 * Replaces variables as written, like Postman: plain ones with their value
 * and each supported dynamic one with a fresh value. Values are literal text
 * and aren't resolved again. Unknown variables stay as written.
 */
export function resolveVars(
  text: string,
  ctx: ResolveContext,
): { text: string; count: number; unresolved: number } {
  let count = 0
  let unresolved = 0
  const resolved = text.replace(
    varRegExp(),
    (whole, angle?: string, curly?: string) => {
      const name = (angle ?? curly)!
      const value = ctx.values.get(name) ?? byName.get(name)?.generate(ctx)
      if (value === undefined) {
        unresolved++
        return whole
      }
      count++
      return value
    },
  )
  return { text: resolved, count, unresolved }
}
