/**
 * Shared utilities for TheSportsDB scripts
 */

import { dirname } from 'path'
import { fileURLToPath } from 'url'

export const API_KEY = '3'
export const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchplayers.php`

const SPORT_NAMES = new Set(['Soccer', 'Football'])

export function getDirname(importMetaUrl) {
  return dirname(fileURLToPath(importMetaUrl))
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export async function searchPlayer(query) {
  const url = `${BASE_URL}?p=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.player || data.player.length === 0) return null
    const match = data.player.find(p => SPORT_NAMES.has(p.strSport)) || data.player[0]
    return {
      imageUrl: match.strThumb || null,
      cutoutUrl: match.strCutout || null,
      position: match.strPosition || null,
      dateBorn: match.dateBorn || null,
      nationality: match.strNationality || null,
      club: match.strTeam || null,
    }
  } catch {
    return null
  }
}

/**
 * Parse the PLAYERS array from the TS data file.
 * Extracts the JSON array between `= [` and the last `]`.
 */
export function parseTsPlayersArray(content) {
  const arrayStart = content.indexOf('= [') + 2
  const arrayEnd = content.lastIndexOf(']') + 1
  return {
    prefix: content.slice(0, arrayStart),
    suffix: content.slice(arrayEnd),
    players: JSON.parse(content.slice(arrayStart, arrayEnd)),
  }
}
