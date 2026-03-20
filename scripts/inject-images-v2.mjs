/**
 * Inject fetched images into players-data.ts
 * Usage: node scripts/inject-images-v2.mjs
 *
 * Reads player-images.json and updates players-data.ts
 * to include imageUrl and cutoutUrl fields.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getDirname, parseTsPlayersArray } from './lib/thesportsdb.mjs'

const __dirname = getDirname(import.meta.url)
const IMAGES_FILE = join(__dirname, 'player-images.json')
const PLAYERS_FILE = join(__dirname, '../src/data/players-data.ts')

function main() {
  console.log('Reading image mapping...')
  const imageMap = JSON.parse(readFileSync(IMAGES_FILE, 'utf-8'))

  console.log('Reading players data...')
  const content = readFileSync(PLAYERS_FILE, 'utf-8')
  const { prefix, suffix, players } = parseTsPlayersArray(content)
  console.log(`Parsed ${players.length} players`)

  let injected = 0
  for (const player of players) {
    const key = `${player.teamSlug}/${player.name}`
    const data = imageMap[key]
    if (data && data.imageUrl) {
      player.imageUrl = data.imageUrl
      if (data.cutoutUrl) player.cutoutUrl = data.cutoutUrl
      injected++
    }
  }

  // Write back
  const newJson = JSON.stringify(players, null, 2)
  writeFileSync(PLAYERS_FILE, `${prefix}${newJson}${suffix}`)
  console.log(`Done! Injected ${injected} images into ${players.length} players`)
}

main()
