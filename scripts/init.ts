// Turns this template into a new site: `bun run init`.
// Prompts for the site's identity and writes it everywhere it is used.
// Pass answers as flags to skip prompts:
//   bun run init --name "Acme" --description "..." --url https://acme.com
import { readFileSync, writeFileSync } from 'node:fs'
import { stdin as input, stdout as output } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'

const { values: flags } = parseArgs({
  options: {
    name: { type: 'string' },
    description: { type: 'string' },
    url: { type: 'string' },
    slug: { type: 'string' },
  },
})

const rl = createInterface({ input, output })

async function ask(question: string, fallback: string) {
  // Non-interactive runs (CI, piped input) take the defaults.
  if (!input.isTTY) return fallback
  const answer = await rl.question(`${question} (${fallback}): `)
  return answer.trim() || fallback
}

const name = flags.name ?? (await ask('Site name', 'My Site'))
const slug =
  flags.slug ??
  (await ask(
    'Package and Worker name',
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  ))
const description =
  flags.description ?? (await ask('Description', `${name} website.`))
const url = (
  flags.url ?? (await ask('Production URL', `https://${slug}.com`))
).replace(/\/$/, '')

rl.close()

function edit(path: string, change: (content: string) => string) {
  writeFileSync(path, change(readFileSync(path, 'utf8')))
  console.log(`  updated ${path}`)
}

const quote = (value: string) => `'${value.replace(/'/g, "\\'")}'`

edit('package.json', (s) => s.replace(/"name": ".*?"/, `"name": "${slug}"`))
edit('wrangler.jsonc', (s) => s.replace(/"name": ".*?"/, `"name": "${slug}"`))
edit('.cta.json', (s) =>
  s.replace(/"projectName": ".*?"/, `"projectName": "${slug}"`),
)
edit('src/site.ts', (s) =>
  s
    .replace(/name: '.*?',/, `name: ${quote(name)},`)
    .replace(/description: '.*?',/, `description: ${quote(description)},`)
    .replace(/url: '.*?',/, `url: ${quote(url)},`),
)
edit('messages/en.json', (s) => {
  const messages = JSON.parse(s) as Record<string, string>
  messages.site_description = description
  return `${JSON.stringify(messages, null, 2)}\n`
})
edit('README.md', (s) => s.replace(/^# .*$/m, `# ${name}`))

console.log(`
Done. Next:
  - Translate site_description in messages/fr.json
  - Replace public/favicon.svg and set site.ogImage in src/site.ts
  - Review the commit, then delete scripts/init.ts and the "init" script`)
