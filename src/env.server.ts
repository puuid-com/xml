import { env as cloudflareEnv } from 'cloudflare:workers'
import { z } from 'zod'

// Server-only environment, validated once when the worker starts so a missing
// or malformed value fails loudly instead of surfacing as a runtime bug.
// Values come from wrangler.jsonc `vars`, .dev.vars locally and
// `wrangler secret put` in production. Bindings (KV, D1, R2...) are typed by
// `bun run cf-typegen` and read straight from `cloudflare:workers`.
//
// The `.server.ts` suffix keeps this file out of client bundles.
const envSchema = z.object({
  // Example: CONTACT_FORM_TO: z.email(),
})

export const env = envSchema.parse(cloudflareEnv)
