import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { parseChangelog } from './changelog'
import { appVersion } from './version'

describe('parseChangelog', () => {
  it('separates releases and historical dates without rendering maintenance instructions', () => {
    const entries = parseChangelog(
      `# Changelog\nPrivate maintenance instructions.\n\n## [1.0.0] - 2026-10-28\n\n### Added\n\n- Support \`<<name>>\` variables.\n\n## [history-2026-10-24] - 2026-10-24\n\n- Initial editor.\n`,
    )
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ id: '1.0.0', historical: false })
    expect(entries[0].html).toContain('&lt;&lt;name&gt;&gt;')
    expect(entries[0].html).not.toContain('Initial editor')
    expect(entries[0].html).not.toContain('maintenance')
    expect(entries[1]).toMatchObject({
      id: 'history-2026-10-24',
      date: '2026-10-24',
      historical: true,
    })
    expect(entries[1].html).toContain('Initial editor')
  })

  it('renders the current release and all five days of the historical archive', () => {
    const entries = parseChangelog(readFileSync('CHANGELOG.md', 'utf8'))
    expect(entries[0].id).toBe(appVersion)
    expect(
      entries.filter((entry) => entry.historical).map((entry) => entry.date),
    ).toEqual([
      '2026-10-28',
      '2026-10-27',
      '2026-10-26',
      '2026-10-25',
      '2026-10-24',
    ])
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length)
  })
})
