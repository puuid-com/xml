import { marked } from 'marked'

// Only repository-owned Markdown is passed here. Introductory maintenance
// instructions stay in the source file; the page renders dated entries.
export function parseChangelog(markdown: string) {
  const headings = [
    ...markdown.matchAll(/^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})\s*$/gm),
  ]
  return headings.map((heading, index) => ({
    id: heading[1],
    date: heading[2],
    historical: heading[1].startsWith('history-'),
    html: marked.parse(
      markdown.slice(
        heading.index + heading[0].length,
        headings[index + 1]?.index ?? markdown.length,
      ),
      { async: false },
    ),
  }))
}
