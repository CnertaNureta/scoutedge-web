import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseForUser(authHeader.slice(7))
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: card } = await admin
    .from('user_fan_cards')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!card) {
    return NextResponse.json({ card: null })
  }

  const { data: badges } = await admin
    .from('user_earned_badges')
    .select('badge_id, source, earned_at')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false })

  return NextResponse.json({ card, earnedBadges: badges ?? [] })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseForUser(authHeader.slice(7))
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    displayName,
    teamSlug,
    avatar,
    theme,
    badges,
    favPlayer,
    isPublic,
  } = body as Record<string, unknown>

  if (!displayName || typeof displayName !== 'string') {
    return NextResponse.json({ error: 'displayName is required' }, { status: 400 })
  }
  if (!teamSlug || typeof teamSlug !== 'string') {
    return NextResponse.json({ error: 'teamSlug is required' }, { status: 400 })
  }

  const validThemes = ['classic', 'neon', 'gold', 'holographic', 'stadium']
  const safeTheme = validThemes.includes(theme as string) ? theme : 'classic'
  const safeName = (displayName as string).trim().slice(0, 50)
  const safeBadges = Array.isArray(badges)
    ? (badges as string[]).filter((b) => typeof b === 'string').slice(0, 6)
    : []

  const shareToken = randomBytes(16).toString('base64url')

  const admin = getSupabaseAdmin()

  const { data: card, error: upsertError } = await admin
    .from('user_fan_cards')
    .upsert(
      {
        user_id: user.id,
        display_name: safeName,
        team_slug: teamSlug as string,
        avatar: (avatar as string) || '⚽',
        theme: safeTheme,
        badges: safeBadges,
        predictions_count: 0,
        accuracy: 0,
        fav_player: typeof favPlayer === 'string' ? favPlayer.trim().slice(0, 100) : null,
        share_token: shareToken,
        is_public: isPublic === true,
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single()

  if (upsertError) {
    return NextResponse.json(
      { error: 'Failed to save fan card' },
      { status: 500 },
    )
  }

  return NextResponse.json({ card })
}
