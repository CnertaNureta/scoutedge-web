#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { buildSampleNarrativeBundles, parseNarrativeStatus } from '../src/lib/narratives.ts'

process.loadEnvFile?.(path.join(process.cwd(), '.env.local'))

interface CliOptions {
  output: string
  persist: boolean
  sourceDate?: string
  status: 'draft' | 'approved' | 'published'
}

interface SnapshotFile {
  generatedAt: string
  status: string
  sourceDate: string
  narratives: ReturnType<typeof buildSampleNarrativeBundles>[number]['narrative'][]
  ai_content: ReturnType<typeof buildSampleNarrativeBundles>[number]['aiContent'][]
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    output: path.join(process.cwd(), 'logs', 'narrative-samples.json'),
    persist: false,
    status: 'draft',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--persist') {
      options.persist = true
      continue
    }

    if (token === '--status') {
      options.status = parseNarrativeStatus(argv[index + 1], 'draft')
      index += 1
      continue
    }

    if (token === '--source-date') {
      options.sourceDate = argv[index + 1]
      index += 1
      continue
    }

    if (token === '--output') {
      options.output = path.resolve(process.cwd(), argv[index + 1])
      index += 1
    }
  }

  return options
}

async function persistSnapshot(snapshot: SnapshotFile): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run without --persist for offline snapshots.')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  for (let index = 0; index < snapshot.narratives.length; index += 1) {
    const narrativeRow = snapshot.narratives[index]
    const aiContentRow = snapshot.ai_content[index]

    const { data: narrativeRecord, error: narrativeError } = await supabase
      .from('narratives')
      .upsert(narrativeRow, {
        onConflict: 'cache_key',
      })
      .select('id, cache_key')
      .single()

    if (narrativeError || !narrativeRecord) {
      throw new Error(`Failed to upsert narrative ${narrativeRow.slug}: ${narrativeError?.message ?? 'unknown error'}`)
    }

    const { error: aiContentError } = await supabase
      .from('ai_content')
      .upsert(
        {
          ...aiContentRow,
          source_narrative_id: narrativeRecord.id,
        },
        { onConflict: 'slug' },
      )

    if (aiContentError) {
      throw new Error(`Failed to upsert ai_content ${aiContentRow.slug}: ${aiContentError.message}`)
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const sourceDate = options.sourceDate ?? new Date().toISOString().slice(0, 10)
  const bundles = buildSampleNarrativeBundles({
    status: options.status,
    sourceDate,
  })

  const snapshot: SnapshotFile = {
    generatedAt: new Date().toISOString(),
    status: options.status,
    sourceDate,
    narratives: bundles.map((bundle) => bundle.narrative),
    ai_content: bundles.map((bundle) => bundle.aiContent),
  }

  fs.mkdirSync(path.dirname(options.output), { recursive: true })
  fs.writeFileSync(options.output, JSON.stringify(snapshot, null, 2), 'utf-8')

  console.log(`Generated ${bundles.length} narrative sample(s) at ${options.output}.`)

  if (options.persist) {
    await persistSnapshot(snapshot)
    console.log('Persisted narratives and ai_content rows to Supabase.')
  } else {
    console.log('Skipped Supabase persistence. Re-run with --persist once env vars are available.')
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
