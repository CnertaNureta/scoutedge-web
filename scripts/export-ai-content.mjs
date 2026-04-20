#!/usr/bin/env node

/**
 * Export approved AI content to frontend markdown files.
 *
 * Default mode:
 *   - reads approved rows from Supabase `ai_content`
 *   - writes markdown to `src/content/blog`
 *   - marks `ai_content` and linked `narratives` rows as `published`
 *
 * Offline mode:
 *   - pass `--input-file logs/narrative-samples.json`
 *   - reads `ai_content` rows from a local snapshot
 *   - writes markdown to `src/content/blog`
 *   - updates snapshot statuses to `published`
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BLOG_DIR = path.join(__dirname, '..', 'src', 'content', 'blog')
const ENV_FILE = path.join(__dirname, '..', '.env.local')

if (fs.existsSync(ENV_FILE)) {
  process.loadEnvFile?.(ENV_FILE)
}

function parseArgs(argv) {
  const options = {
    inputFile: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--input-file') {
      options.inputFile = path.resolve(process.cwd(), argv[index + 1])
      index += 1
    }
  }

  return options
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function humanize(text) {
  return text
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function normalizeFactsUsed(row) {
  return Array.isArray(row.facts_used) ? row.facts_used : []
}

function buildKeywords(row) {
  const keywords = ['World Cup 2026', humanize(row.content_type)]
  if (Array.isArray(row.related_team_ids)) {
    keywords.push(...row.related_team_ids.slice(0, 3).map((teamSlug) => humanize(teamSlug)))
  }
  return [...new Set(keywords)]
}

function buildFrontmatter(row, publishedAt) {
  const sourceDate = row.source_date || publishedAt.slice(0, 10)
  const date = publishedAt.slice(0, 10)
  const lines = ['---']
  lines.push(`title: ${JSON.stringify(row.title)}`)
  lines.push(`description: ${JSON.stringify(row.summary || '')}`)
  lines.push(`keywords: ${JSON.stringify(buildKeywords(row))}`)
  lines.push(`date: "${date}"`)
  lines.push(`lastUpdated: "${date}"`)
  lines.push(`author: "WorldCapIQ AI"`)
  lines.push(`slug: "${row.slug}"`)
  lines.push(`category: "${humanize(row.content_type)}"`)
  lines.push(`contentType: "${row.content_type}"`)
  lines.push(`sourceDate: "${sourceDate}"`)
  lines.push(`publishedAt: "${publishedAt}"`)
  lines.push(`factCount: ${normalizeFactsUsed(row).length}`)

  const matchKey = row.metadata?.matchKey ?? row.metadata?.match_key ?? null
  if (matchKey) {
    lines.push(`matchKey: ${JSON.stringify(matchKey)}`)
  }

  lines.push('---')
  return lines.join('\n')
}

function buildMarkdown(row, publishedAt) {
  const frontmatter = buildFrontmatter(row, publishedAt)
  return `${frontmatter}\n\n${row.full_content || ''}\n`
}

export function findSnapshotRowIndex(rows, row) {
  if (!Array.isArray(rows)) return -1

  if (row?.id) {
    const idMatch = rows.findIndex(
      (entry) => entry && typeof entry === 'object' && entry.id === row.id
    )
    if (idMatch >= 0) return idMatch
  }

  if (!row?.slug) return -1

  return rows.findIndex(
    (entry) => entry && typeof entry === 'object' && entry.slug === row.slug
  )
}

export function markSnapshotPublished(snapshot, row, publishedAt) {
  const contentRows = Array.isArray(snapshot.ai_content) ? snapshot.ai_content : []
  const contentIndex = findSnapshotRowIndex(contentRows, row)
  if (contentIndex >= 0) {
    snapshot.ai_content[contentIndex] = {
      ...snapshot.ai_content[contentIndex],
      status: 'published',
      published_at: publishedAt,
    }
  }

  if (!Array.isArray(snapshot.narratives)) return snapshot

  const narrativeIndex = row?.source_narrative_id
    ? snapshot.narratives.findIndex(
        (entry) =>
          entry && typeof entry === 'object' && entry.id === row.source_narrative_id
      )
    : findSnapshotRowIndex(snapshot.narratives, row)

  if (narrativeIndex >= 0) {
    snapshot.narratives[narrativeIndex] = {
      ...snapshot.narratives[narrativeIndex],
      status: 'published',
      published_at: publishedAt,
    }
  }

  return snapshot
}

async function loadRowsFromSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set, or use --input-file for offline export.')
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: rows, error } = await supabase
    .from('ai_content')
    .select('*')
    .eq('status', 'approved')
    .order('source_date', { ascending: false })

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`)
  }

  return {
    mode: 'supabase',
    rows: rows || [],
    async markPublished(row, publishedAt) {
      let contentUpdate = supabase
        .from('ai_content')
        .update({ status: 'published', published_at: publishedAt })

      contentUpdate = row.id
        ? contentUpdate.eq('id', row.id)
        : contentUpdate.eq('slug', row.slug)

      const { error: contentError } = await contentUpdate

      if (contentError) {
        throw new Error(
          `Failed to update ai_content ${row.id ?? row.slug}: ${contentError.message}`
        )
      }

      if (row.source_narrative_id) {
        const { error: narrativeError } = await supabase
          .from('narratives')
          .update({ status: 'published', published_at: publishedAt })
          .eq('id', row.source_narrative_id)

        if (narrativeError) {
          throw new Error(`Failed to update linked narrative ${row.source_narrative_id}: ${narrativeError.message}`)
        }
      }
    },
  }
}

function loadRowsFromSnapshot(snapshotPath) {
  const raw = fs.readFileSync(snapshotPath, 'utf-8')
  const snapshot = JSON.parse(raw)
  const rows = Array.isArray(snapshot.ai_content) ? snapshot.ai_content : []

  return {
    mode: 'snapshot',
    rows: rows.filter((row) => row.status === 'approved'),
    async markPublished(row, publishedAt) {
      markSnapshotPublished(snapshot, row, publishedAt)
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8')
    },
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  fs.mkdirSync(BLOG_DIR, { recursive: true })

  const source = options.inputFile
    ? loadRowsFromSnapshot(options.inputFile)
    : await loadRowsFromSupabase()

  if (source.rows.length === 0) {
    console.log('No approved content to export.')
    return
  }

  console.log(`Found ${source.rows.length} approved article(s) to export from ${source.mode}.`)

  let exported = 0

  for (const row of source.rows) {
    const slug = row.slug || slugify(row.title)
    const publishedAt = new Date().toISOString()
    const filepath = path.join(BLOG_DIR, `${slug}.md`)
    const markdown = buildMarkdown({ ...row, slug }, publishedAt)

    fs.writeFileSync(filepath, markdown, 'utf-8')
    await source.markPublished({ ...row, slug }, publishedAt)

    console.log(`  Exported: ${slug}.md`)
    exported += 1
  }

  console.log(`\nDone. Exported ${exported} article(s).`)
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isDirectExecution) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  })
}
