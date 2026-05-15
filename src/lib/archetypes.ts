import data from '@/data/archetypes.json'

export interface ArchetypeHistoricalReference {
  team: string
  year: number
  finish: string
}

export interface Archetype {
  id: string
  name: string
  matchAliases: string[]
  historicalReferences: ArchetypeHistoricalReference[]
  baselineFinish: string
  /** 0-1 probability the archetype historically reaches its baseline finish. */
  successRate: number
  strengths: string[]
  cautions: string[]
  summary: string
}

const TYPED_ARCHETYPES: ReadonlyArray<Archetype> = data as Archetype[]

export const ARCHETYPES: ReadonlyArray<Archetype> = TYPED_ARCHETYPES

const FALLBACK_ID = 'rebuilding-generation'

/**
 * Case-insensitive substring match against `matchAliases`. Falls back to the
 * "Rebuilding Generation" archetype if nothing matches, so the caller always
 * receives a renderable record. Returns null only if the curated DB is empty.
 */
export function findArchetype(matchString?: string | null): Archetype | null {
  if (TYPED_ARCHETYPES.length === 0) return null

  const fallback =
    TYPED_ARCHETYPES.find((a) => a.id === FALLBACK_ID) ??
    TYPED_ARCHETYPES[TYPED_ARCHETYPES.length - 1]

  if (!matchString) {
    return fallback
  }

  const haystack = matchString.toLowerCase()
  for (const archetype of TYPED_ARCHETYPES) {
    for (const alias of archetype.matchAliases) {
      if (haystack.includes(alias.toLowerCase())) {
        return archetype
      }
    }
  }
  return fallback
}

/**
 * Coarse ceiling tier derived from `baselineFinish`. Used to pick a localized
 * verdict string in ArchetypeDossier without hard-coding finishes in the UI.
 */
export type ArchetypeCeilingTier =
  | 'title'
  | 'deepRun'
  | 'knockouts'
  | 'group'

export function pickCeilingTier(baselineFinish: string): ArchetypeCeilingTier {
  const f = baselineFinish.toLowerCase()
  // Order matters: "Semifinals" / "Quarterfinals" contain "final", so test
  // the deep-run keywords first.
  if (
    f.includes('semi') ||
    f.includes('quarter') ||
    f.includes('third') ||
    f.includes('fourth')
  ) {
    return 'deepRun'
  }
  if (
    f.includes('champion') ||
    f.includes('runners-up') ||
    f.includes('final')
  ) {
    return 'title'
  }
  if (f.includes('round of 16') || f.includes('r16')) {
    return 'knockouts'
  }
  return 'group'
}
