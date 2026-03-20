/**
 * Batch fetch player images from TheSportsDB API
 * Usage: node scripts/fetch-player-images.mjs
 *
 * Reads players-data.ts, searches TheSportsDB for each player,
 * and writes an image mapping JSON file.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getDirname, searchPlayer, sleep, parseTsPlayersArray } from './lib/thesportsdb.mjs'

const __dirname = getDirname(import.meta.url)
const DELAY_MS = 350 // Rate limit: ~3 requests/sec to be safe

const PLAYERS_FILE = join(__dirname, '../src/data/players-data.ts')
const OUTPUT_FILE = join(__dirname, 'player-images.json')

function extractPlayers(content) {
  const { players } = parseTsPlayersArray(content)
  return players.map(p => ({ name: p.name, teamSlug: p.teamSlug }))
}

async function main() {
  console.log('Reading players data...')
  const content = readFileSync(PLAYERS_FILE, 'utf-8')
  const players = extractPlayers(content)
  console.log(`Found ${players.length} players`)

  // Load existing progress if any
  let imageMap = {}
  try {
    imageMap = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
    console.log(`Resuming from ${Object.keys(imageMap).length} already fetched`)
  } catch {
    // Fresh start
  }

  let found = 0
  let notFound = 0
  let skipped = 0

  for (let i = 0; i < players.length; i++) {
    const { name, teamSlug } = players[i]
    const key = `${teamSlug}/${name}`

    // Skip if already fetched
    if (imageMap[key]) {
      skipped++
      continue
    }

    const result = await searchPlayer(name)

    if (result && result.imageUrl) {
      imageMap[key] = result
      found++
    } else {
      imageMap[key] = { imageUrl: null, cutoutUrl: null }
      notFound++
    }

    // Progress log every 50 players
    if ((found + notFound) % 50 === 0) {
      console.log(`[${i + 1}/${players.length}] Found: ${found}, Not found: ${notFound}, Skipped: ${skipped}`)
      // Save intermediate progress
      writeFileSync(OUTPUT_FILE, JSON.stringify(imageMap, null, 2))
    }

    await sleep(DELAY_MS)
  }

  // Final save
  writeFileSync(OUTPUT_FILE, JSON.stringify(imageMap, null, 2))

  const totalWithImages = Object.values(imageMap).filter(v => v.imageUrl).length
  console.log(`\nDone! Total: ${players.length}, With images: ${totalWithImages}, Without: ${players.length - totalWithImages}`)
  console.log(`Saved to ${OUTPUT_FILE}`)
}

main()
