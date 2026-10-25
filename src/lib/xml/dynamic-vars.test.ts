import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it } from 'vitest'

import { DYNAMIC_VARS, resolveDynamicVars } from './dynamic-vars'

const now = new Date('2026-06-09T21:10:36.177Z')

function resolve(text: string) {
  return resolveDynamicVars(text, { faker, now }).text
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
    )
    expect(out).toBe(
      '<a t="1781039436">2026-06-09T21:10:36.177Z</a><b><<user>><<$unknown>></b>',
    )
  })

  it('gives each occurrence its own value', () => {
    const [a, b] = resolve('<<$guid>> <<$guid>>').split(' ')
    expect(a).not.toBe(b)
  })

  it('counts only the variables it replaced', () => {
    expect(
      resolveDynamicVars('<<$randomInt>> <<user>> <<$randomInt>>', {
        faker,
        now,
      }).count,
    ).toBe(2)
  })
})
