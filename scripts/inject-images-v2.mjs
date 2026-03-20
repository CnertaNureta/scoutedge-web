/**
 * v2: Properly parse the TS file as JSON, inject images, write back.
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
  const content = readFileSync(PLAYERS_FILE, 'utf-8')

  // Extract the JSON array from the TS file (skip the type annotation "Player[]")
  const arrayStart = content.indexOf('= [') + 2  // start at the '[' after '= ['
  const arrayEnd = content.lastIndexOf(']') + 1
  const prefix = content.slice(0, arrayStart)
  const suffix = content.slice(arrayEnd)
  const jsonStr = content.slice(arrayStart, arrayEnd)

  // Parse the JSON array
  const players = JSON.parse(jsonStr)
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
