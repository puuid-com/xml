import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it } from 'vitest'

import { DYNAMIC_VARS, resolveVars } from './dynamic-vars'

const now = new Date('2026-06-09T21:10:36.177Z')

function resolve(text: string, values = new Map<string, string>()) {
  return resolveVars(text, { faker, now, values })
}

describe('dynamic vars', () => {
  beforeEach(() => {
    faker.seed(1)
  })

  it('generates values in Postman’s shapes', () => {
    const shapes: Record<string, RegExp> = {
      $guid:
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      $timestamp: /^1781039436$/,
      $isoTimestamp: /^2026-06-09T21:10:36\.177Z$/,
      $randomUUID: /^[0-9a-f-]{36}$/,
      $randomAlphaNumeric: /^[0-9a-z]$/,
      $randomBoolean: /^(true|false)$/,
      $randomInt: /^\d{1,4}$/,
      $randomColor: /^[a-z ]+$/,
      $randomHexColor: /^#[0-9a-f]{6}$/,
      $randomAbbreviation: /^[A-Z0-9]+$/,
    }
    expect(DYNAMIC_VARS.map((v) => v.name).sort()).toEqual(
      Object.keys(shapes).sort(),
    )
    for (const v of DYNAMIC_VARS) {
      expect(v.generate({ faker, now })).toMatch(shapes[v.name])
    }
  })

  it('keeps random integers within 0 to 1000', () => {
    const int = DYNAMIC_VARS.find((v) => v.name === '$randomInt')!
    for (let i = 0; i < 200; i++) {
      const n = Number(int.generate({ faker, now }))
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(1000)
    }
  })

  it('replaces known variables and keeps the rest', () => {
    const out = resolve(
      '<a t="<<$timestamp>>"><< $isoTimestamp >></a><b><<user>><<$unknown>></b>',
    ).text
    expect(out).toBe(
      '<a t="1781039436">2026-06-09T21:10:36.177Z</a><b><<user>><<$unknown>></b>',
    )
  })

  it('gives each occurrence its own value', () => {
    const [a, b] = resolve('<<$guid>> <<$guid>>').text.split(' ')
    expect(a).not.toBe(b)
  })

  it('counts the variables it replaced and the ones left', () => {
    expect(resolve('<<$randomInt>> <<user>> <<$randomInt>>')).toMatchObject({
      count: 2,
      unresolved: 1,
    })
  })

  it('fills plain variables with the given values, as written', () => {
    const values = new Map([
      ['host', 'example.com'],
      ['empty', ''],
    ])
    expect(
      resolve('<a h="<<host>>"><< host >>|<<empty>>|<<port>></a>', values),
    ).toEqual({
      text: '<a h="example.com">example.com||<<port>></a>',
      count: 3,
      unresolved: 1,
    })
  })

  it('fills {{name}} variables the same way', () => {
    const values = new Map([['host', 'example.com']])
    expect(resolve('{{host}} {{ port }}', values)).toEqual({
      text: 'example.com {{ port }}',
      count: 1,
      unresolved: 1,
    })
  })

  it('keeps values literal, without resolving variables inside them', () => {
    const values = new Map([['id', '<<$guid>> & <<host>>']])
    expect(resolve('<<id>>', values).text).toBe('<<$guid>> & <<host>>')
  })

  it('gives the same file different values per set of values', () => {
    const file = '<url><<host>></url>'
    expect(resolve(file, new Map([['host', 'dev']])).text).toBe(
      '<url>dev</url>',
    )
    expect(resolve(file, new Map([['host', 'prod']])).text).toBe(
      '<url>prod</url>',
    )
    expect(file).toBe('<url><<host>></url>')
  })
})
