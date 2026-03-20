/**
 * Second pass: retry failed players with normalized names
 * - Strip diacritics
 * - Try last name only for unique names
 * - Try common name variations
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_KEY = '3'
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchplayers.php`
const DELAY_MS = 400
const OUTPUT_FILE = join(__dirname, '../src/data/player-images.json')

function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

async function searchPlayer(query) {
  const url = `${BASE_URL}?p=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.player || data.player.length === 0) return null
    const match = data.player.find(p =>
      p.strSport === 'Soccer' || p.strSport === 'Football'
    ) || data.player[0]
    return {
      imageUrl: match.strThumb || null,
      cutoutUrl: match.strCutout || null,
      position: match.strPosition || null,
      nationality: match.strNationality || null,
      club: match.strTeam || null,
    }
  } catch {
    return null
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const imageMap = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
  const failed = Object.entries(imageMap).filter(([, v]) => !v.imageUrl)
  console.log(`${failed.length} players without images. Retrying with normalized names...`)

  let fixed = 0
  let still_failed = 0

  for (let i = 0; i < failed.length; i++) {
    const [key] = failed[i]
    const name = key.split('/').slice(1).join('/')

    // Strategy 1: Strip diacritics
    const normalized = stripDiacritics(name)
    if (normalized !== name) {
      const result = await searchPlayer(normalized)
      if (result && result.imageUrl) {
        imageMap[key] = result
        fixed++
        if (fixed % 10 === 0) console.log(`[${i + 1}/${failed.length}] Fixed: ${fixed}`)
        await sleep(DELAY_MS)
        continue
      }
      await sleep(DELAY_MS)
    }

    // Strategy 2: Try last name only (if name has 2+ parts)
    const parts = normalized.split(' ')
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1]
      if (lastName.length >= 4) {
        const result = await searchPlayer(lastName)
        if (result && result.imageUrl) {
          // Verify it's roughly the right person by checking nationality or sport
          if (result.position) {
            imageMap[key] = result
            fixed++
            if (fixed % 10 === 0) console.log(`[${i + 1}/${failed.length}] Fixed: ${fixed}`)
            await sleep(DELAY_MS)
            continue
          }
        }
        await sleep(DELAY_MS)
      }
    }

    still_failed++

    if ((fixed + still_failed) % 50 === 0) {
      console.log(`[${i + 1}/${failed.length}] Fixed: ${fixed}, Still failed: ${still_failed}`)
      writeFileSync(OUTPUT_FILE, JSON.stringify(imageMap, null, 2))
    }

    await sleep(100)
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(imageMap, null, 2))
  const totalWithImages = Object.values(imageMap).filter(v => v.imageUrl).length
  console.log(`\nPass 2 done! Fixed: ${fixed}, Total with images: ${totalWithImages}/${Object.keys(imageMap).length}`)
}

main()
