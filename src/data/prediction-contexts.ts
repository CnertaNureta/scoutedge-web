import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { getPredictionMatches } from '@/data/prediction-matches'
import { buildPredictionContextRecord, type PredictionContextRecord } from '@/lib/prediction-context'

const fixtureRecords = MATCH_FIXTURES.map((fixture) => buildPredictionContextRecord(fixture))
const fixtureRecordByMatchId = new Map(
  fixtureRecords.map((record) => [record.match_id, record])
)

const predictionMatches = getPredictionMatches()
const extraPredictionRecords: PredictionContextRecord[] = []

export const PREDICTION_CONTEXT_MATCH_ID_ALIASES = predictionMatches.reduce<Record<string, string>>((acc, match) => {
  const canonicalRecord = buildPredictionContextRecord(match)
  const existing = fixtureRecordByMatchId.get(canonicalRecord.match_id)

  acc[match.id] = existing?.match_id ?? canonicalRecord.match_id

  if (!existing) {
    extraPredictionRecords.push(canonicalRecord)
  }

  return acc
}, {})

export const PREDICTION_CONTEXTS: PredictionContextRecord[] = [
  ...fixtureRecords,
  ...extraPredictionRecords,
]
