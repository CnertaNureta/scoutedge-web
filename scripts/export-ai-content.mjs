#!/usr/bin/env node

/**
 * Export approved AI content from Supabase to markdown blog files.
 *
 * Reads rows from `ai_content` where status='approved',
 * writes markdown files to src/content/blog/,
 * then updates status to 'published' with published_at timestamp.
 *
 * Idempotent — skips content that already has a matching file on disk.
 *
 * Usage:
 *   node scripts/export-ai-content.mjs
 *
 * Env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BLOG_DIR = path.join(__dirname, '..', 'src', 'content', 'blog')

// ── Setup ────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Helpers ──────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildFrontmatter(row) {
  const meta = {
    title: row.title,
    description: row.summary || '',
    keywords: row.related_team_ids?.length
      ? ['World Cup 2026', row.content_type.replace(/_/g, ' ')]
      : ['World Cup 2026'],
    date: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString().split('T')[0],
    author: 'ScoutEdge AI',
    slug: row.slug,
    category: formatCategory(row.content_type),
  }

  const lines = ['---']
  lines.push(`title: ${JSON.stringify(meta.title)}`)
  lines.push(`description: ${JSON.stringify(meta.description)}`)
  lines.push(`keywords: ${JSON.stringify(meta.keywords)}`)
  lines.push(`date: "${meta.date}"`)
  lines.push(`lastUpdated: "${meta.lastUpdated}"`)
  lines.push(`author: "${meta.author}"`)
  lines.push(`slug: "${meta.slug}"`)
  lines.push(`category: "${meta.category}"`)
  lines.push('---')
  return lines.join('\n')
}

function formatCategory(contentType) {
  return contentType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  // Ensure output directory exists
  fs.mkdirSync(BLOG_DIR, { recursive: true })

  // Fetch approved content
  const { data: rows, error } = await supabase
    .from('ai_content')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Supabase query error:', error.message)
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log('No approved content to export.')
    return
  }

  console.log(`Found ${rows.length} approved article(s) to export.`)

  let exported = 0

  for (const row of rows) {
    // Ensure slug exists
    const slug = row.slug || slugify(row.title)
    const filename = `${slug}.md`
    const filepath = path.join(BLOG_DIR, filename)

    // Idempotent: skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`  Skipping "${row.title}" — file already exists at ${filename}`)
      continue
    }

    // Build markdown
    const rowWithSlug = { ...row, slug }
    const frontmatter = buildFrontmatter(rowWithSlug)
    const markdown = `${frontmatter}\n\n${row.full_content || ''}\n`

    // Write file
    fs.writeFileSync(filepath, markdown, 'utf-8')
    console.log(`  Exported: ${filename}`)

    // Update status in Supabase
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('ai_content')
      .update({ status: 'published', published_at: now, slug })
      .eq('id', row.id)

    if (updateError) {
      console.error(`  Warning: failed to update status for id=${row.id}: ${updateError.message}`)
    }

    exported++
  }

  console.log(`\nDone. Exported ${exported} article(s).`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
