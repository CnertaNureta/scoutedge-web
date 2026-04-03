import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { buildPredictionContextRecord, type PredictionContextRecord } from '@/lib/prediction-context'

export const PREDICTION_CONTEXTS: PredictionContextRecord[] = MATCH_FIXTURES.map((fixture) =>
  buildPredictionContextRecord(fixture)
)
