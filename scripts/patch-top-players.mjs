/**
 * Manually patch top players that were missed by automated search.
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getDirname, stripDiacritics } from './lib/thesportsdb.mjs'

const __dirname = getDirname(import.meta.url)
const OUTPUT_FILE = join(__dirname, 'player-images.json')

const patches = {
  "france/Kylian Mbappé": {
    imageUrl: "https://r2.thesportsdb.com/images/media/player/thumb/0yw04y1771265385.jpg",
    cutoutUrl: "https://r2.thesportsdb.com/images/media/player/cutout/h9u9vz1733653583.png"
  },
  "norway/Erling Haaland": {
    imageUrl: "https://r2.thesportsdb.com/images/media/player/thumb/bb1agj1727415216.jpg",
    cutoutUrl: "https://r2.thesportsdb.com/images/media/player/cutout/un3jr11769182465.png"
  },
  "croatia/Luka Modrić": {
    imageUrl: "https://r2.thesportsdb.com/images/media/player/thumb/6j40781707595475.jpg",
    cutoutUrl: "https://r2.thesportsdb.com/images/media/player/cutout/msewdx1758892756.png"
  },
  "brazil/Vinícius Jr.": {
    imageUrl: "https://r2.thesportsdb.com/images/media/player/thumb/lxf1he1771264845.jpg",
    cutoutUrl: "https://r2.thesportsdb.com/images/media/player/cutout/ejuxsh1750271859.png"
  },
  "morocco/Achraf Hakimi": {
    imageUrl: "https://r2.thesportsdb.com/images/media/player/thumb/lwhwh71770216476.jpg",
    cutoutUrl: "https://r2.thesportsdb.com/images/media/player/cutout/oqu69c1766335243.png"
  },
}

const imageMap = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))

// Build normalized lookup for O(1) fuzzy matching
const normalizedKeyMap = new Map()
for (const existingKey of Object.keys(imageMap)) {
  normalizedKeyMap.set(stripDiacritics(existingKey), existingKey)
}

let patched = 0
for (const [key, data] of Object.entries(patches)) {
  // Try exact match first
  if (imageMap[key]) {
    imageMap[key] = data
    patched++
    continue
  }
  // Try normalized match via lookup map
  const normalizedTarget = stripDiacritics(key)
  const realKey = normalizedKeyMap.get(normalizedTarget)
  if (realKey) {
    imageMap[realKey] = data
    patched++
  }
}

writeFileSync(OUTPUT_FILE, JSON.stringify(imageMap, null, 2))
console.log(`Patched ${patched} top players`)

const total = Object.values(imageMap).filter(v => v.imageUrl).length
console.log(`Total with images: ${total}/${Object.keys(imageMap).length}`)
