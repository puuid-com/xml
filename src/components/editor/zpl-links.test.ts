import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { languageExtension } from './language'
import { zplLinkTargets } from './zpl-links'

function stateOf(doc: string, language: 'xml' | 'json' = 'xml') {
  return EditorState.create({ doc, extensions: languageExtension(language) })
}

describe('zplLinkTargets', () => {
  it('links XML text of marked tags, after the opening tag', () => {
    const doc =
      '<a><ns:Label>XlhB</ns:Label><Label/><Label><b>x</b></Label><c>XlhB</c></a>'
    const links = zplLinkTargets(stateOf(doc), ['Label'])
    expect(links).toEqual([
      {
        name: 'ns:Label',
        url: 'https://zpl.puuid.com/?base64=XlhB',
        at: doc.indexOf('XlhB'),
        side: 1,
      },
    ])
  })

  it('reads CDATA', () => {
    const [link] = zplLinkTargets(stateOf('<Label><![CDATA[XlhB]]></Label>'), [
      'Label',
    ])
    expect(link.url).toBe('https://zpl.puuid.com/?base64=XlhB')
  })

  it('links JSON string values, before the string', () => {
    const doc = '{"label": "XlhB", "other": "XlhB", "n": {"label": 1}}'
    const links = zplLinkTargets(stateOf(doc, 'json'), ['label'])
    expect(links.map((l) => l.at)).toEqual([doc.indexOf('"XlhB"')])
  })

  it('links nothing without marked tags', () => {
    expect(zplLinkTargets(stateOf('<Label>XlhB</Label>'), [])).toEqual([])
  })
})
