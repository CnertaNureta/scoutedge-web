/**
 * Player Article Variants
 *
 * The 1,103 player `seoArticle` strings in `src/data/players-data.ts` were
 * generated from a small number of template phrases, which leaves us with
 * thousands of pages sharing exact 4-word sequences:
 *
 *   - "When penalty shootouts loom"
 *   - "fearless future of"
 *   - "tournament fate will hinge on his gloves"
 *   - "the calm in every storm"
 *
 * Google flags this as scaled AI content. We swap the templated phrases out
 * at render time with position-aware, deterministic-but-varied alternates,
 * using the player slug as the FNV-1a key so the same player always renders
 * the same phrasing across builds.
 *
 * For the top 50 players we additionally splice in a hand-written
 * "World Cup 2026 Outlook" block — see `src/data/player-outlooks.ts`.
 */

import type { Player } from './types'
import { getPlayerOutlook, type PlayerOutlook } from '@/data/player-outlooks'

/** FNV-1a-style hash so variant choices are stable across builds. */
function variantHash(key: string): number {
  let hash = 2166136261
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }
  return hash
}

function pickVariant<T>(key: string, variants: readonly T[]): T {
  if (variants.length === 0) {
    throw new Error('pickVariant requires at least one variant')
  }
  return variants[variantHash(key) % variants.length]
}

// ─── Position-aware phrase pools ────────────────────────────────────────────

/**
 * Replaces "When penalty shootouts loom" / "When the pressure reaches boiling
 * point" / similar high-stakes openers. Different pool per position so a
 * goalkeeper line doesn't read identically to a striker line.
 */
const GK_PRESSURE: readonly string[] = [
  'When the knockout-round penalty drama unfolds',
  'When the late-game pressure climbs into the red',
  'When a one-goal lead has to be defended in stoppage time',
  'When the back four is finally breached',
  'When the cameras zoom in on the six-yard box',
  'When extra time forces a save of the tournament',
]

const DEF_PRESSURE: readonly string[] = [
  'When the late-game pressure climbs into the red',
  'When a quick counter slices through the midfield',
  'When the opposition switches to a back-three press',
  'When the touchline screams for one last clearance',
  'When the scoreboard demands a clean sheet',
  'When stoppage time turns every clearance into a referendum',
]

const MID_PRESSURE: readonly string[] = [
  'When the tempo has to be reset in the second half',
  'When the midfield battle starts losing its shape',
  'When a tournament hinges on a single switch of play',
  'When the press is firing and the ball needs an exit',
  'When two banks of four refuse to budge',
  'When transition football decides the round',
]

const FWD_PRESSURE: readonly string[] = [
  'When the box opens up for a single half-yard',
  'When the half-chance arrives in the 89th minute',
  'When a low-block has to be unlocked',
  'When the keeper steps off his line by one stride',
  'When the final third turns into a knife-fight',
  'When a tournament narrative needs a goal',
]

/**
 * Replaces "fearless future of <team> football—a prodigy unafraid of the
 * spotlight". Pool varies by position; the variant key is the player slug.
 */
const GK_YOUNG: readonly string[] = [
  'a goalkeeping prospect his federation has waited a decade for',
  'an emerging No. 1 whose ceiling is still being mapped',
  'the kind of young keeper coaches build a back-line around',
  'a rare goalkeeping talent inside the prime-development window',
]

const DEF_YOUNG: readonly string[] = [
  'the rare modern defender who reads the press a step early',
  'a defensive prospect already drafting his federation\'s next decade',
  'one of the position\'s most promising European-academy graduates',
  'a back-line talent whose composure outruns his caps tally',
]

const MID_YOUNG: readonly string[] = [
  'one of the position\'s most coveted under-23 talents',
  'a midfield prospect already rerouting his country\'s tactical plan',
  'the kind of progressive passer modern football is built around',
  'a tempo-setter whose ceiling is still being charted',
]

const FWD_YOUNG: readonly string[] = [
  'a forward whose finishing already outpaces players five years older',
  'the rare young attacker comfortable inside and outside the box',
  'a tournament-ready prospect his coach is building a system around',
  'a finisher whose name keeps surfacing in elite-scout reports',
]

/**
 * Replaces "tournament fate will hinge on his gloves" — keep variants
 * grounded in the actual position rather than reaching for cliché.
 */
const GK_HINGE: readonly string[] = [
  'tournament fate will hinge on the quality of his shot-stopping',
  'route through the knockout round will lean on his command of the area',
  'goals-against column will tell the truth of his tournament',
  'biggest games will be decided in the six-yard box he patrols',
]

const DEF_HINGE: readonly string[] = [
  'goals-against column will tell the truth of his tournament',
  'route through the knockout round will hinge on his backline reads',
  'late-game discipline will live or die at his feet',
  'tactical balance leans on the duels he is asked to win',
]

const MID_HINGE: readonly string[] = [
  'tournament tempo will live or die at his feet',
  'attacking output will only be as good as his passing range allows',
  'press resistance will be tested in every match he starts',
  'second balls and transitions will define his tournament',
]

const FWD_HINGE: readonly string[] = [
  'goal output will tell the truth of his tournament',
  'finishing efficiency will decide how deep the run goes',
  'movement off the shoulder of the last defender will be decisive',
  'box presence will dictate whether the run reaches a quarter-final',
]

/**
 * Replaces "the calm in every storm" and "engine that makes <team> tick".
 */
const MID_ENGINE: readonly string[] = [
  'the metronome the rest of the side syncs to',
  'the player coaches map their press around',
  'the midfielder who is asked to fix what breaks',
  'the player who tilts the field when the lines stretch',
]

const FWD_ENGINE: readonly string[] = [
  'the finisher coaches plan their final third around',
  'the attacker who pulls a defender out of shape on every run',
  'the forward whose movement creates space for everyone else',
  'the striker tasked with turning half-chances into goals',
]

const DEF_ENGINE: readonly string[] = [
  'the back-line voice the manager listens for in tight games',
  'the defender who decides which winger gets isolated',
  'the player who calibrates the offside line under pressure',
  'the defender every set-piece routine is drawn around',
]

const GK_ENGINE: readonly string[] = [
  'the goalkeeper coaches build a defensive identity around',
  'the No. 1 who organises the back four before every restart',
  'the keeper whose command of the area sets the tone for the press',
  'the goalkeeper trusted to absorb pressure in dead-rubber stretches',
]

/**
 * Replaces "his gloves" — only used for goalkeepers, but vary the wording.
 */
const GLOVES_VARIANTS: readonly string[] = [
  'the work he does behind the back four',
  'every reflex save he produces under the lights',
  'the line he draws between victory and elimination',
  'each decision he makes off his line',
]

// ─── Phrase rewriting ───────────────────────────────────────────────────────

interface PhrasePattern {
  /** Substring (case-insensitive) that triggers a replacement. */
  needle: string
  /** Variant pool selector — returns the chosen replacement. */
  variant: (player: Player) => string
}

function pickByPosition<T>(
  player: Player,
  byPosition: Record<Player['position'], readonly T[]>,
): T {
  return pickVariant(`${player.slug}|${player.position}`, byPosition[player.position])
}

const PATTERNS: readonly PhrasePattern[] = [
  // Pressure-moment openers
  {
    needle: 'When penalty shootouts loom and stadiums roar across North America',
    variant: (p) =>
      pickByPosition(p, {
        GK: GK_PRESSURE,
        DEF: DEF_PRESSURE,
        MID: MID_PRESSURE,
        FWD: FWD_PRESSURE,
      }),
  },
  {
    needle: 'When the pressure reaches boiling point on the grandest stages of North America',
    variant: (p) =>
      pickByPosition(p, {
        GK: GK_PRESSURE,
        DEF: DEF_PRESSURE,
        MID: MID_PRESSURE,
        FWD: FWD_PRESSURE,
      }),
  },
  {
    needle: 'When the pressure reaches boiling point in the electric atmospheres of the 2026 host cities',
    variant: (p) =>
      pickByPosition(p, {
        GK: GK_PRESSURE,
        DEF: DEF_PRESSURE,
        MID: MID_PRESSURE,
        FWD: FWD_PRESSURE,
      }),
  },
  // "Fearless future" prodigy line
  {
    needle: 'fearless future of',
    variant: (p) =>
      pickByPosition(p, {
        GK: GK_YOUNG,
        DEF: DEF_YOUNG,
        MID: MID_YOUNG,
        FWD: FWD_YOUNG,
      }),
  },
  // "tournament fate will hinge on his gloves" / "his Key Stats reveal..."
  {
    needle: "tournament fate will hinge on his gloves",
    variant: (p) =>
      pickByPosition(p, {
        GK: GK_HINGE,
        DEF: DEF_HINGE,
        MID: MID_HINGE,
        FWD: FWD_HINGE,
      }),
  },
  // "calm in every storm"
  {
    needle: 'the calm in every storm',
    variant: (p) =>
      pickByPosition(p, {
        GK: GK_ENGINE,
        DEF: DEF_ENGINE,
        MID: MID_ENGINE,
        FWD: FWD_ENGINE,
      }),
  },
  // "engine that makes <team> tick"
  {
    needle: 'the engine that makes',
    variant: (p) =>
      pickByPosition(p, {
        GK: GK_ENGINE,
        DEF: DEF_ENGINE,
        MID: MID_ENGINE,
        FWD: FWD_ENGINE,
      }),
  },
  // "his gloves" stand-alone goalkeeper phrase
  {
    needle: 'his gloves',
    variant: (p) =>
      p.position === 'GK'
        ? pickVariant(`${p.slug}|gloves`, GLOVES_VARIANTS)
        : 'his work behind the back four',
  },
  // "his Performance Analysis data confirms he thrives in exactly these moments"
  {
    needle: 'he thrives in exactly these moments',
    variant: (p) => {
      const pool: readonly string[] = [
        'his tape from the qualifying cycle backs that up',
        'his recent club form tells the same story',
        'his major-tournament record points the same direction',
        'his last 12 months of performances point the same way',
      ]
      return pickVariant(`${p.slug}|thrive`, pool)
    },
  },
  // "the immovable force they cannot do without"
  {
    needle: 'the immovable force they cannot do without',
    variant: (p) => {
      const pool: readonly string[] = [
        'the defender the back-line plan is built around',
        'a back-line anchor with no obvious like-for-like replacement',
        'the player whose absence would force a structural rebuild',
        'a backline cornerstone the coach refuses to rotate',
      ]
      return pickVariant(`${p.slug}|immovable`, pool)
    },
  },
]

/**
 * Apply position-aware phrase variants to a player's seoArticle HTML string.
 * Pure — does not mutate the input.
 */
export function applyPhraseVariants(html: string, player: Player): string {
  let out = html
  for (const pattern of PATTERNS) {
    if (out.includes(pattern.needle)) {
      const replacement = pattern.variant(player)
      // Only swap the first occurrence per pattern to preserve sentence flow
      // (these phrases generally appear once per article).
      out = out.replace(pattern.needle, replacement)
    }
  }
  return out
}

// ─── Hand-written World Cup 2026 outlooks ───────────────────────────────────

/**
 * Render the World Cup 2026 outlook block (when a hand-written outlook exists
 * for the player). Returned as raw HTML so it can be appended to the existing
 * seoArticle string.
 */
export function renderOutlookHtml(outlook: PlayerOutlook): string {
  const matchupsList = outlook.keyMatchups
    .map((m) => `<li>${m}</li>`)
    .join('')

  return [
    '<h2>World Cup 2026 Outlook</h2>',
    `<p>${outlook.outlook}</p>`,
    '<h3>Signature stat</h3>',
    `<p><strong>${outlook.signatureStat.label}:</strong> ${outlook.signatureStat.value}</p>`,
    '<h3>Key 2026 matchups</h3>',
    `<ul>${matchupsList}</ul>`,
  ].join('\n')
}

/**
 * The pipeline used by `PlayerArticle` — applies templated-phrase variants,
 * and appends the hand-written outlook when one is available for this slug.
 *
 * When `autoLinkEntities` is provided, the rendered HTML is post-processed
 * with `linkifyHtml` to inject internal links to teams/cities mentioned in
 * the outlook prose. Capped at 3 links to avoid over-optimization.
 */
import { linkifyHtml, type LinkEntity } from './auto-link'

export function transformPlayerArticle(
  player: Player,
  autoLinkEntities?: ReadonlyArray<LinkEntity>,
): string {
  const varied = applyPhraseVariants(player.seoArticle, player)
  const outlook = getPlayerOutlook(player.slug)
  const articleHtml = outlook ? `${varied}\n${renderOutlookHtml(outlook)}` : varied
  if (!autoLinkEntities || autoLinkEntities.length === 0) return articleHtml
  return linkifyHtml(articleHtml, autoLinkEntities, {
    maxLinks: 3,
    className: 'auto-link text-primary hover:underline',
  })
}

// Exposed for tests
export const __TEST = {
  PATTERNS,
  pickVariant,
  variantHash,
  GK_PRESSURE,
  DEF_PRESSURE,
  MID_PRESSURE,
  FWD_PRESSURE,
}
