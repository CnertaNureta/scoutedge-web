import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseForUser, getSupabaseAdmin } from '@/lib/supabase-server'

export const GET = withAuth(async (_req, user, token) => {
  const supabase = getSupabaseForUser(token)

  const { data: myLeagues, error: myErr } = await supabase
    .from('league_members')
    .select(`
      league_id,
      role,
      joined_at,
      prediction_leagues (
        id, name, description, league_type, tier, max_members, season, logo_url, is_active, created_by, created_at
      )
    `)
    .eq('user_id', user.id)

  if (myErr) {
    return NextResponse.json({ error: myErr.message }, { status: 500 })
  }

  const { data: publicLeagues, error: pubErr } = await supabase
    .from('prediction_leagues')
    .select('id, name, description, league_type, tier, max_members, season, logo_url, is_active, created_at')
    .eq('league_type', 'public')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (pubErr) {
    return NextResponse.json({ error: pubErr.message }, { status: 500 })
  }

  const myLeagueIds = new Set(myLeagues?.map(m => m.league_id) ?? [])

  return NextResponse.json({
    my_leagues: myLeagues?.map(m => ({
      ...m.prediction_leagues,
      role: m.role,
      joined_at: m.joined_at,
    })) ?? [],
    public_leagues: publicLeagues?.filter(l => !myLeagueIds.has(l.id)) ?? [],
  })
})

export const POST = withAuth(async (req, user, _token) => {
  const body = await req.json()
  const { name, description, league_type, tier } = body as {
    name: string
    description?: string
    league_type?: 'public' | 'private'
    tier?: 'free' | 'premium' | 'enterprise'
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'League name is required' }, { status: 400 })
  }

  const type = league_type ?? 'public'
  const leagueTier = tier ?? 'free'
  const inviteCode = type === 'private' ? generateInviteCode() : null

  const admin = getSupabaseAdmin()

  const { data: league, error: createErr } = await admin
    .from('prediction_leagues')
    .insert({
      name: name.trim(),
      description: description?.trim() ?? null,
      league_type: type,
      tier: leagueTier,
      invite_code: inviteCode,
      created_by: user.id,
    })
    .select()
    .single()

  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 500 })
  }

  const { error: memberErr } = await admin
    .from('league_members')
    .insert({
      league_id: league.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 })
  }

  return NextResponse.json({ league }, { status: 201 })
})

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  for (const b of bytes) {
    code += chars[b % chars.length]
  }
  return code
}
