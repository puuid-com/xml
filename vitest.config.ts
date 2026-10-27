import { defineConfig } from 'vitest/config'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import viteReact from '@vitejs/plugin-react'

// Kept apart from vite.config.ts: the Cloudflare and Start plugins expect a
// full app build and are not needed to unit test components and helpers.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['url', 'baseLocale'],
    }),
    viteReact(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
