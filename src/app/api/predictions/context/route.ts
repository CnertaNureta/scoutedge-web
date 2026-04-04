import { NextRequest, NextResponse } from 'next/server'
import { MATCH_CONTEXT_MODEL_VERSION } from '@/lib/prediction-context'
import { getPredictionContextByMatchId, getPredictionContextByTeamPair, getPredictionContexts } from '@/lib/data-service'

export function GET(request: NextRequest) {
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

    return NextResponse.json(record)
  }

  if (homeTeamSlug && awayTeamSlug) {
    const record = getPredictionContextByTeamPair(homeTeamSlug, awayTeamSlug)

    if (!record) {
      return NextResponse.json(
        { error: `Prediction context not found for ${homeTeamSlug} vs ${awayTeamSlug}` },
        { status: 404 }
      )
    }

    return NextResponse.json(record)
  }

  return NextResponse.json({
    model_version: MATCH_CONTEXT_MODEL_VERSION,
    total: getPredictionContexts().length,
    items: getPredictionContexts(),
  })
}
