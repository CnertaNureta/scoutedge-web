#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'

import {
  parseFbrefTemplateRows,
  serializeFbrefTemplateRowsCsv,
  type Layer1SourceBundle,
} from '../src/lib/layer1/team-data.ts'

function readFlag(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] || null : null
}

function requiredFlag(flag: string): string {
  const value = readFlag(flag)
  if (!value) {
    throw new Error(`Missing required flag: ${flag}`)
  }
  return value
}

function optionalFlag(flag: string, fallback: string): string {
  return readFlag(flag) || fallback
}

function buildSourceBundle(): Layer1SourceBundle {
  const shootingHtmlPath = resolve(process.cwd(), requiredFlag('--shooting-html'))
  const passingHtmlPath = resolve(process.cwd(), requiredFlag('--passing-html'))
  const possessionHtmlPath = resolve(process.cwd(), requiredFlag('--possession-html'))
  const fetchedAt = optionalFlag('--updated-at', new Date().toISOString())
  const competition = optionalFlag('--competition', 'FBref Template Export')
  const season = optionalFlag('--season', '2024')

  return {
    competition,
    season,
    fbref: {
      shooting: {
        html: readFileSync(shootingHtmlPath, 'utf8'),
        sourceUrl: optionalFlag('--shooting-url', 'browser-export'),
        fetchedAt,
      },
      passing: {
        html: readFileSync(passingHtmlPath, 'utf8'),
        sourceUrl: optionalFlag('--passing-url', 'browser-export'),
        fetchedAt,
      },
      possession: {
        html: readFileSync(possessionHtmlPath, 'utf8'),
        sourceUrl: optionalFlag('--possession-url', 'browser-export'),
        fetchedAt,
      },
    },
    elo: {
      html: '<html><body></body></html>',
      sourceUrl: 'not-used',
      fetchedAt,
    },
  }
}

async function main(): Promise<void> {
  const outputPath = resolve(process.cwd(), optionalFlag('--output', 'tmp/fbref-team-stats.csv'))
  const sourceBundle = buildSourceBundle()
  const rows = parseFbrefTemplateRows(sourceBundle)
  const csv = serializeFbrefTemplateRowsCsv(rows)

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, csv, 'utf8')

  console.log(
    JSON.stringify(
      {
        outputPath,
        rows: rows.length,
        competition: sourceBundle.competition,
        season: sourceBundle.season,
        sourceUrls: {
          shooting: sourceBundle.fbref.shooting.sourceUrl,
          passing: sourceBundle.fbref.passing.sourceUrl,
          possession: sourceBundle.fbref.possession.sourceUrl,
        },
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(`[export-fbref-team-stats-template] ${error.message}`)
  process.exit(1)
})
