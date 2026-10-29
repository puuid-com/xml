import { createFileRoute } from '@tanstack/react-router'
import { marked } from 'marked'

import changelog from '../../../CHANGELOG.md?raw'
import { seo } from '#/lib/seo'
import { m } from '#/paraglide/messages'

// CHANGELOG.md is ours, so its HTML is trusted. The page supplies the
// localized h1, so drop the file's own title.
const html = marked.parse(changelog.replace(/^# .*\n/, ''), {
  async: false,
})

export const Route = createFileRoute('/_site/changelog')({
  head: () => seo({ title: m.changelog_title(), path: '/changelog' }),
  component: Changelog,
})

function Changelog() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">
        {m.changelog_title()}
      </h1>
      <div
        className="prose mt-4 max-w-prose prose-neutral dark:prose-invert prose-h2:font-mono prose-h2:text-xl prose-h3:text-base"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  )
}
