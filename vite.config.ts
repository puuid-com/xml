import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // The Cloudflare plugin turns on sourcemaps for the worker build, but
  // vite:css-post reads the top-level flag and skips its map when that is
  // off (SOURCEMAP_BROKEN). Enable it here and keep the client build as it was.
  build: { sourcemap: true },
  environments: {
    client: {
      build: {
        sourcemap: false,
        rolldownOptions: {
          output: {
            // The editor route pulls in large libraries; give them their own
            // cacheable chunks instead of one oversized route chunk.
            codeSplitting: {
              groups: [
                {
                  name: 'react',
                  test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                },
                {
                  name: 'codemirror',
                  test: /node_modules[\\/](@codemirror|@lezer|crelt|style-mod|w3c-keyname)[\\/]/,
                },
                {
                  name: 'tanstack-db',
                  test: /node_modules[\\/](@tanstack[\\/](db|db-ivm|react-db|query-db-collection)|fractional-indexing)[\\/]/,
                },
                { name: 'zod', test: /node_modules[\\/]zod[\\/]/ },
              ],
            },
          },
        },
      },
    },
  },
  plugins: [
    devtools(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['url', 'baseLocale'],
    }),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

export default config
