import { createClient } from '@supabase/supabase-js'

function chunkRows(rows, size = 500) {
  const chunks = []
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size))
  }
  return chunks
}

export function getSupabaseAdminFromEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function upsertRows(client, table, rows, onConflict) {
  for (const chunk of chunkRows(rows)) {
    const { error } = await client.from(table).upsert(chunk, { onConflict })
    if (error) {
      throw new Error(`Supabase upsert failed for ${table}: ${error.message}`)
    }
  }
}

export async function upsertCanonicalTeamsAndAliases(client, { teamRows, aliasRows }) {
  await upsertRows(client, 'teams', teamRows, 'slug')
  await upsertRows(client, 'team_name_aliases', aliasRows, 'normalized_alias')
}

export async function upsertTeamStats(client, rows) {
  await upsertRows(client, 'team_stats', rows, 'team_slug,source,competition,season,as_of_date')
}

export async function upsertTeamRatings(client, rows) {
  await upsertRows(client, 'team_ratings', rows, 'team_slug,source,competition,season,as_of_date')
}
