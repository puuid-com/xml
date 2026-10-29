import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { appVersion } from './version'

describe('appVersion', () => {
  it('is a semver', () => {
    expect(appVersion).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('has the newest CHANGELOG.md entry', () => {
    const changelog = readFileSync('CHANGELOG.md', 'utf8')
    const latest = /^## \[(\d+\.\d+\.\d+)\]/m.exec(changelog)?.[1]
    expect(latest).toBe(appVersion)
  })
})
