#!/usr/bin/env node

import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  buildCanonicalTeamRows,
  buildTeamAliasRows,
  parseCliArgs,
  parseFbrefTeamStatsCsv,
} from './lib/team-layer1.mjs'
import {
  getSupabaseAdminFromEnv,
  upsertCanonicalTeamsAndAliases,
  upsertTeamStats,
} from './lib/team-layer1-db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_INPUT = path.join(__dirname, 'fixtures', 'fbref-team-stats.csv')
const DEFAULT_COMPETITION = 'World Cup 2026'
const DEFAULT_SEASON = '2026'

async function loadText({ input, url }) {
  if (input) return readFileSync(path.resolve(process.cwd(), input), 'utf8')
  if (!url) return readFileSync(DEFAULT_INPUT, 'utf8')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`)
  }

  return await response.text()
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2))
  const text = await loadText(args)
  const result = parseFbrefTeamStatsCsv(text, {
    asOfDate: args['as-of'],
    competition: args.competition ?? process.env.LAYER1_COMPETITION ?? DEFAULT_COMPETITION,
    season: args.season ?? process.env.LAYER1_SEASON ?? DEFAULT_SEASON,
    sourceUrl: args['source-url'] ?? args.url ?? null,
    sourceUpdatedAt: args['source-updated-at'],
  })

  if (result.unresolvedTeams.length > 0) {
    throw new Error(`Unresolved FBref team aliases: ${result.unresolvedTeams.join(', ')}`)
  }

  if (!args.execute) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      records: result.records.length,
      coverage: result.coverage,
      sample: result.records.slice(0, 5),
    }, null, 2))
    return
  }

  const client = getSupabaseAdminFromEnv()
  await upsertCanonicalTeamsAndAliases(client, {
    teamRows: buildCanonicalTeamRows(),
    aliasRows: buildTeamAliasRows(),
  })
  await upsertTeamStats(client, result.records)

  console.log(JSON.stringify({
    mode: 'execute',
    records: result.records.length,
    coverage: result.coverage,
  }, null, 2))
}

main().catch((error) => {
  console.error(`[fbref-import] ${error.message}`)
  process.exit(1)
})
