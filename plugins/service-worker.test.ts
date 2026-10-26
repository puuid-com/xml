// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { localeShells, workerBuild } from './service-worker'

const file = (path: string, source = path) => ({ path, source })

describe('workerBuild', () => {
  it('precaches build and public files, sorted, without dotfiles, maps or the worker', () => {
    const build = workerBuild(
      [
        file('/assets/index-a1.js'),
        file('/assets/index-a1.js.map'),
        file('/.assetsignore'),
        file('/.vite/manifest.json'),
        file('/sw.js'),
        file('/favicon.svg'),
        file('/assets/styles-b2.css'),
      ],
      ['/', '/fr/'],
      ['/site.webmanifest'],
    )
    expect(build.assets).toEqual([
      '/assets/index-a1.js',
      '/assets/styles-b2.css',
      '/favicon.svg',
    ])
    expect(build.pages).toEqual(['/', '/fr/', '/site.webmanifest'])
    expect(build.shells).toEqual(['/', '/fr/'])
  })

  it('keeps the version while nothing changes', () => {
    const files = [file('/a.js'), file('/b.css')]
    expect(workerBuild(files, ['/']).version).toBe(
      workerBuild([...files].reverse(), ['/']).version,
    )
  })

  it('changes the version when a file, its content or a page changes', () => {
    const base = workerBuild([file('/favicon.svg', 'a')], ['/']).version
    expect(workerBuild([file('/favicon.svg', 'b')], ['/']).version).not.toBe(
      base,
    )
    expect(
      workerBuild([file('/favicon.svg', 'a'), file('/x.png')], ['/']).version,
    ).not.toBe(base)
    expect(
      workerBuild([file('/favicon.svg', 'a')], ['/', '/fr/']).version,
    ).not.toBe(base)
    expect(
      workerBuild([file('/favicon.svg', 'a')], ['/'], ['/site.webmanifest'])
        .version,
    ).not.toBe(base)
  })
})

describe('localeShells', () => {
  it('lists the base locale at the root and the others under their prefix', () => {
    expect(localeShells('./project.inlang')).toEqual(['/', '/fr/'])
  })
})
