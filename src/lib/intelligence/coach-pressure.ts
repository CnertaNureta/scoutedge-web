import type { CoachProfile } from '@/data/coaches-data'

export type SetPieceBias = 'attacking' | 'defensive' | 'neutral'

export interface BigGameRecordRaw {
  played: number
  won: number
  lost: number
  drawn: number
}

export interface CoachPressureProfileData {
  bigGameRecord?: BigGameRecordRaw
  inGameTells: string[]
  formationTweaks: string[]
  setPieceBias?: SetPieceBias
}

export interface CoachPressureBreakdown {
  hasProfile: boolean
  bigGameRecord?: {
    played: number
    won: number
    drawn: number
    lost: number
    winRate: number
  }
  inGameTells: string[]
  formationTweaks: string[]
  setPieceBias: SetPieceBias
  signalCount: number
  sourceCount: number
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeCoachPressure(coach: CoachProfile): CoachPressureBreakdown {
  const profile = coach.pressureProfile
  const tells = coach.coachTells ?? []

  if (!profile) {
    return {
      hasProfile: false,
      inGameTells: [],
      formationTweaks: [],
      setPieceBias: 'neutral',
      signalCount: 0,
      sourceCount: 0,
    }
  }

  const inGameTells = [...(profile.inGameTells ?? [])]
  const formationTweaks = [...(profile.formationTweaks ?? [])]
  const setPieceBias: SetPieceBias = profile.setPieceBias ?? 'neutral'

  let bigGameRecord: CoachPressureBreakdown['bigGameRecord']
  if (profile.bigGameRecord) {
    const { played, won, drawn, lost } = profile.bigGameRecord
    const winRate = played > 0 ? roundTo2(won / played) : 0
    bigGameRecord = { played, won, drawn, lost, winRate }
  }

  const signalCount =
    inGameTells.length + formationTweaks.length + tells.length + (bigGameRecord ? 1 : 0)

  const sourceBuckets = [
    inGameTells.length > 0,
    formationTweaks.length > 0,
    tells.length > 0,
    Boolean(bigGameRecord),
    profile.setPieceBias !== undefined,
  ]
  const sourceCount = sourceBuckets.filter(Boolean).length

  return {
    hasProfile:
      inGameTells.length > 0 ||
      formationTweaks.length > 0 ||
      Boolean(bigGameRecord) ||
      profile.setPieceBias !== undefined,
    bigGameRecord,
    inGameTells,
    formationTweaks,
    setPieceBias,
    signalCount,
    sourceCount,
  }
}
