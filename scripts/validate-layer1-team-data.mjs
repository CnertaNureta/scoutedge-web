#!/usr/bin/env node

import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  parseFbrefTeamStatsCsv,
  parseEloRatingsCsv,
} from './lib/team-layer1.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FBREF_FIXTURE = path.join(__dirname, 'fixtures', 'fbref-team-stats.csv')
const ELO_FIXTURE = path.join(__dirname, 'fixtures', 'elo-ratings.csv')

function makeMatchPreview(statsResult, ratingResult) {
  const statsBySlug = new Map(statsResult.records.map((record) => [record.team_slug, record]))
  const ratingsBySlug = new Map(ratingResult.records.map((record) => [record.team_slug, record]))
  const matchups = [
    ['sample-1', 'argentina', 'brazil'],
    ['sample-2', 'usa', 'south-korea'],
    ['sample-3', 'ivory-coast', 'iran'],
    ['sample-4', 'cabo-verde', 'curacao'],
    ['sample-5', 'saudi-arabia', 'argentina'],
  ]

  return matchups.map(([matchId, homeTeam, awayTeam]) => ({
    matchId,
    homeTeam,
    awayTeam,
    homeXgFor: statsBySlug.get(homeTeam)?.xg_for ?? null,
    awayXgFor: statsBySlug.get(awayTeam)?.xg_for ?? null,
    homeElo: ratingsBySlug.get(homeTeam)?.rating ?? null,
    awayElo: ratingsBySlug.get(awayTeam)?.rating ?? null,
  }))
}

function printSection(title, rows) {
  console.log(`\n${title}`)
  console.table(rows)
}

function main() {
  const fbrefText = readFileSync(FBREF_FIXTURE, 'utf8')
  const eloText = readFileSync(ELO_FIXTURE, 'utf8')

  const fbrefResult = parseFbrefTeamStatsCsv(fbrefText)
  const eloResult = parseEloRatingsCsv(eloText)

  if (fbrefResult.unresolvedTeams.length > 0 || eloResult.unresolvedTeams.length > 0) {
    throw new Error(`Unresolved aliases detected. FBref=${fbrefResult.unresolvedTeams.join(', ')} ELO=${eloResult.unresolvedTeams.join(', ')}`)
  }

  printSection('FBref team_stats sample (5)', fbrefResult.records.slice(0, 5).map((record) => ({
    team_slug: record.team_slug,
    possession_pct: record.possession_pct,
    pass_completion_pct: record.pass_completion_pct,
    xg_for: record.xg_for,
    xg_against: record.xg_against,
    as_of_date: record.as_of_date,
  })))

  printSection('ELO rating sample (5)', eloResult.records.slice(0, 5).map((record) => ({
    team_slug: record.team_slug,
    rating: record.rating,
    rating_rank: record.rating_rank,
    as_of_date: record.as_of_date,
  })))

  printSection('Synthetic match association preview (5)', makeMatchPreview(fbrefResult, eloResult))

  console.log('\nCoverage summary')
  console.log(JSON.stringify({
    fbref: fbrefResult.coverage,
    elo: eloResult.coverage,
  }, null, 2))
}

try {
  main()
} catch (error) {
  console.error(`[layer1-validate] ${error.message}`)
  process.exit(1)
}
