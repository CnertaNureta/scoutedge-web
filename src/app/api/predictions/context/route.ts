import { NextRequest, NextResponse } from 'next/server'
import { MATCH_CONTEXT_MODEL_VERSION } from '@/lib/prediction-context'
import type { PredictionContextRecord } from '@/lib/prediction-context'
import { getPredictionContextByMatchId, getPredictionContextByTeamPair, getPredictionContexts } from '@/lib/data-service'
import { withOptionalAuth, checkEntitlement } from '@/lib/api-auth'
import type { User } from '@supabase/supabase-js'

function redactContext(record: PredictionContextRecord): Record<string, unknown> {
  const ctx = record.match_context
  return {
    match_id: record.match_id,
    home_team_slug: record.home_team_slug,
    away_team_slug: record.away_team_slug,
    model_version: record.model_version,
    match_context: {
      match_id: ctx.match_id,
      model_version: ctx.model_version,
      source_inputs: ctx.source_inputs,
      fixture: ctx.fixture,
      home_team: {
        slug: ctx.home_team.slug,
        name: ctx.home_team.name,
        flag: ctx.home_team.flag,
        confederation: ctx.home_team.confederation,
        fifa_ranking: ctx.home_team.fifa_ranking,
      },
      away_team: {
        slug: ctx.away_team.slug,
        name: ctx.away_team.name,
        flag: ctx.away_team.flag,
        confederation: ctx.away_team.confederation,
        fifa_ranking: ctx.away_team.fifa_ranking,
      },
      probabilities: {
        home_win: ctx.probabilities.home_win,
        draw: ctx.probabilities.draw,
        away_win: ctx.probabilities.away_win,
        favorite: ctx.probabilities.favorite,
      },
      key_factors: [],
      confidence_interval: null,
      _redacted: true,
    },
  }
}

async function hasPremiumAccess(user: User | null, matchId?: string): Promise<boolean> {
  if (!user) return false
  const scope = matchId ?? undefined
  return checkEntitlement(user.id, 'prediction', scope)
}

export const GET = withOptionalAuth(async (request: NextRequest, user: User | null) => {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('match_id')
  const homeTeamSlug = searchParams.get('home_team_slug')
  const awayTeamSlug = searchParams.get('away_team_slug')

  if (matchId) {
    const record = getPredictionContextByMatchId(matchId)
    if (!record) {
      return NextResponse.json(
        { error: `Prediction context not found for match_id=${matchId}` },
        { status: 404 }
      )
    }

    const premium = await hasPremiumAccess(user, matchId)
    return NextResponse.json(premium ? record : redactContext(record))
  }

  if (homeTeamSlug && awayTeamSlug) {
    const record = getPredictionContextByTeamPair(homeTeamSlug, awayTeamSlug)
    if (!record) {
      return NextResponse.json(
        { error: `Prediction context not found for ${homeTeamSlug} vs ${awayTeamSlug}` },
        { status: 404 }
      )
    }

    const premium = await hasPremiumAccess(user, record.match_id)
    return NextResponse.json(premium ? record : redactContext(record))
  }

  const premium = await hasPremiumAccess(user)
  const items = getPredictionContexts()

  return NextResponse.json({
    model_version: MATCH_CONTEXT_MODEL_VERSION,
    total: items.length,
    items: premium ? items : items.map(redactContext),
  })
})
