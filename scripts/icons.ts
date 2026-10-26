// Renders the PNG app icons from public/favicon.svg: `bun run icons`.
// Run it again after replacing the favicon, then commit the PNGs.
//   icon-*.png           purpose "any": the favicon as drawn
//   icon-maskable-*.png  purpose "maskable": full-bleed theme colour with the
//                        favicon inside the safe zone, so any mask shape fits
//   apple-touch-icon.png iOS needs an opaque image and rounds it itself
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

import { site } from '../src/site'

const svg = readFileSync('public/favicon.svg')
const { width = 32 } = await sharp(svg).metadata()

/** The favicon rasterized at `size`, with density set so it is drawn sharp, not scaled. */
const logo = (size: number) =>
  sharp(svg, { density: (72 * size) / width })
    .resize(size, size)
    .png()
    .toBuffer()

async function tile(size: number) {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: site.themeColor,
    },
  })
    .composite([{ input: await logo(Math.round(size * 0.6)) }])
    .png()
}

for (const size of [192, 512]) {
  await sharp(await logo(size)).toFile(`public/icon-${size}.png`)
  await (await tile(size)).toFile(`public/icon-maskable-${size}.png`)
}
await (await tile(180)).toFile('public/apple-touch-icon.png')

console.log('Wrote public/icon-*.png and public/apple-touch-icon.png')
