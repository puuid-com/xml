import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { parseChangelog } from './changelog'
import { appVersion } from './version'

describe('parseChangelog', () => {
  it('separates releases without rendering maintenance instructions', () => {
    const entries = parseChangelog(
      `# Changelog\nPrivate maintenance instructions.\n\n## [1.0.0] - 2026-10-28\n\n### Added\n\n- Support \`<<name>>\` variables.\n\n## [0.1.0] - 2026-10-24\n\n- Initial editor.\n`,
    )
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ id: '1.0.0', date: '2026-10-28' })
    expect(entries[0].html).toContain('&lt;&lt;name&gt;&gt;')
    expect(entries[0].html).not.toContain('Initial editor')
    expect(entries[0].html).not.toContain('maintenance')
    expect(entries[1]).toMatchObject({ id: '0.1.0', date: '2026-10-24' })
    expect(entries[1].html).toContain('Initial editor')
  })

  it('lists every release as a unique semantic version, newest first', () => {
    const entries = parseChangelog(readFileSync('CHANGELOG.md', 'utf8'))
    expect(entries[0].id).toBe(appVersion)
    for (const entry of entries) expect(entry.id).toMatch(/^\d+\.\d+\.\d+$/)
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length)
    expect(entries.at(-1)?.date).toBe('2026-10-24')
  })
})
