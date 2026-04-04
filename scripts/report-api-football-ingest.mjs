#!/usr/bin/env node

import path from 'path'
import { createClient } from '@supabase/supabase-js'

import {
  createSupabaseSink,
  generateIngestVerificationReport,
  loadProjectEnv,
  parsePositiveInt,
  resolveArtifactRootPath,
} from './lib/api-football-ingest.mjs'

function parseArgs(argv) {
  const options = {
    artifactRoot: undefined,
    leagueId: 1,
    season: 2026,
    strict: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--strict') {
      options.strict = true
      continue
    }

    const nextValue = argv[index + 1]
    if (nextValue == null) {
      throw new Error(`Missing value for ${arg}`)
    }

    if (arg === '--artifact-root') {
      options.artifactRoot = resolveArtifactRootPath(nextValue)
      index++
      continue
    }

    if (arg === '--league') {
      options.leagueId = parsePositiveInt(nextValue, 'league')
      index++
      continue
    }

    if (arg === '--season') {
      options.season = parsePositiveInt(nextValue, 'season')
      index++
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

function printHelp() {
  console.log(`Usage:
  node scripts/report-api-football-ingest.mjs
  node scripts/report-api-football-ingest.mjs --season 2026 --league 1 --strict

Options:
  --artifact-root <path>  override artifact root (default: logs/api-football)
  --league <id>           league identifier (default: 1)
  --season <year>         season year (default: 2026)
  --strict                exit non-zero if any table scope does not match artifacts
  --help                  show this message

Environment:
  .env.local / .env are auto-loaded when present
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  loadProjectEnv()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase env vars not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const sink = createSupabaseSink({ supabase })
  const report = await generateIngestVerificationReport({
    sink,
    artifactRoot: options.artifactRoot,
    leagueId: options.leagueId,
    season: options.season,
  })

  console.log(JSON.stringify(report, null, 2))

  if (options.strict) {
    const hasMismatch = Object.values(report.tables).some((tableReport) => tableReport.matches === false)
    if (hasMismatch) {
      process.exitCode = 1
    }
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
