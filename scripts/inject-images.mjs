/**
 * Inject fetched images into players-data.ts
 * Usage: node scripts/inject-images.mjs
 *
 * Reads player-images.json and updates players-data.ts
 * to include imageUrl and cutoutUrl fields.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IMAGES_FILE = join(__dirname, '../src/data/player-images.json')
const PLAYERS_FILE = join(__dirname, '../src/data/players-data.ts')

function main() {
  console.log('Reading image mapping...')
  const imageMap = JSON.parse(readFileSync(IMAGES_FILE, 'utf-8'))

  console.log('Reading players data...')
  let content = readFileSync(PLAYERS_FILE, 'utf-8')

  let injected = 0
  let noImage = 0

  // For each entry in imageMap, find the player in the TS file and inject imageUrl
  for (const [key, data] of Object.entries(imageMap)) {
    if (!data.imageUrl) {
      noImage++
      continue
    }

    const [teamSlug, ...nameParts] = key.split('/')
    const name = nameParts.join('/')

    // Find the player entry by matching name and teamSlug, inject imageUrl after seoArticle
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(
      `("name":\\s*"${escapedName}"[\\s\\S]*?"teamSlug":\\s*"${teamSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[\\s\\S]*?"seoArticle":\\s*"[^"]*")`,
      ''
    )

    const match = content.match(pattern)
    if (match) {
      const replacement = `${match[1]},\n    "imageUrl": "${data.imageUrl}"${data.cutoutUrl ? `,\n    "cutoutUrl": "${data.cutoutUrl}"` : ''}`
      content = content.replace(match[1], replacement)
      injected++
    }
  }

  writeFileSync(PLAYERS_FILE, content)
  console.log(`Done! Injected ${injected} images, ${noImage} players without images`)
}

main()
