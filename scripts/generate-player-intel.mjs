#!/usr/bin/env node

/**
 * Generates structured player `signals` + aggregated `player_intel`.
 *
 * Outputs:
 * - src/data/generated-player-signals.json
 * - src/data/generated-player-intel.json
 * - reports/player-intel-validation.json
 *
 * If Supabase env vars are present, the same payloads are upserted into:
 * - signals
 * - player_intel
 *
 * Usage:
 *   npm run generate:player-intel
 */

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { PLAYERS } from '../src/data/players-data.ts'
import { PLAYER_SOCIAL_DATA, buildPlayerSocialIndex } from '../src/data/player-social.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SIGNALS_OUTPUT = path.join(ROOT, 'src', 'data', 'generated-player-signals.json')
const INTEL_OUTPUT = path.join(ROOT, 'src', 'data', 'generated-player-intel.json')
const VALIDATION_OUTPUT = path.join(ROOT, 'reports', 'player-intel-validation.json')
const GENERATED_AT = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`

const SAMPLE_PLAYERS = [
  { teamSlug: 'mexico', playerSlug: 'guillermo-ochoa' },
  { teamSlug: 'france', playerSlug: 'kylian-mbappe' },
  { teamSlug: 'argentina', playerSlug: 'lionel-messi' },
  { teamSlug: 'usa', playerSlug: 'christian-pulisic' },
  { teamSlug: 'japan', playerSlug: 'hiroki-ito' },
]

const POSITIVE_WORDS = ['fully fit', 'peak physical', 'ready', 'breakout', 'proud', 'dreamed', 'outstanding shape', 'clean bill of health', 'statement tournament']
const NEGATIVE_WORDS = ['injury', 'inflammation', 'concern', 'monitor', 'speculation', 'questionable', 'managing', 'cautionary']

const socialByPlayerKey = buildPlayerSocialIndex(PLAYER_SOCIAL_DATA)

function hash(text) {
  return createHash('sha1').update(text).digest('hex').slice(0, 16)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function toIsoDate(value) {
  if (!value) return GENERATED_AT
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T12:00:00.000Z`

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return GENERATED_AT
  return parsed.toISOString()
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function classifyMoraleLabel(score) {
  if (score >= 67) return 'positive'
  if (score <= 45) return 'negative'
  return 'neutral'
}

function rankRisk(risk) {
  return risk === 'high' ? 3 : risk === 'medium' ? 2 : 1
}

function maxRisk(left, right) {
  return rankRisk(left) >= rankRisk(right) ? left : right
}

function inferSignalSentiment(text) {
  const lower = text.toLowerCase()
  const hasPositive = POSITIVE_WORDS.some((word) => lower.includes(word))
  const hasNegative = NEGATIVE_WORDS.some((word) => lower.includes(word))

  if (hasPositive && hasNegative) return 'mixed'
  if (hasNegative) return 'negative'
  if (hasPositive) return 'positive'
  return 'neutral'
}

function inferArticleCategory(sentence) {
  const lower = sentence.toLowerCase()

  if (
    lower.includes('fit') ||
    lower.includes('fitness') ||
    lower.includes('health') ||
    lower.includes('condition') ||
    lower.includes('inflammation')
  ) {
    return 'fitness'
  }

  if (
    lower.includes('pressure') ||
    lower.includes('lineup') ||
    lower.includes('tactical') ||
    lower.includes('defensive') ||
    lower.includes('midfield') ||
    lower.includes('forward')
  ) {
    return 'tactical'
  }

  return 'morale'
}

function inferSignalTypeFromText(text) {
  const lower = text.toLowerCase()
  if (lower.includes('training') || lower.includes('camp') || lower.includes('fit')) return 'training'
  if (text.includes('"') || text.includes('“') || text.includes('”')) return 'quote'
  return 'data'
}

function buildPlayerKey(player) {
  return `${player.teamSlug}::${player.slug}`
}

function buildPlayerKeyFromSlugs(teamSlug, playerSlug) {
  return `${teamSlug}::${playerSlug}`
}

function createSignal({
  player,
  category,
  type,
  sourceType,
  sourceKey,
  summary,
  evidence,
  sentiment,
  confidence,
  weight,
  happenedAt,
  metadata = {},
}) {
  return {
    id: hash(`${buildPlayerKey(player)}|${sourceKey}`),
    player_key: buildPlayerKey(player),
    player_slug: player.slug,
    player_name: player.name,
    team_slug: player.teamSlug,
    category,
    type,
    source_type: sourceType,
    source_key: sourceKey,
    summary,
    evidence,
    sentiment,
    confidence,
    weight,
    happened_at: happenedAt,
    metadata,
  }
}

function buildFitnessSignal(player) {
  const sentiment = player.fitnessStatus === 'green'
    ? 'positive'
    : player.fitnessStatus === 'amber'
      ? 'neutral'
      : 'negative'

  const summary = player.fitnessStatus === 'green'
    ? `${player.name} is currently fully available for tournament preparation.`
    : player.fitnessStatus === 'amber'
      ? `${player.name} is available but carrying a manageable fitness concern.`
      : `${player.name} is carrying an injury-level fitness concern that could affect availability.`

  return createSignal({
    player,
    category: 'fitness',
    type: player.fitnessStatus === 'green' ? 'training' : 'data',
    sourceType: 'player_profile',
    sourceKey: `fitness:${player.fitnessStatus}:${player.fitnessNote}`,
    summary,
    evidence: player.fitnessNote,
    sentiment,
    confidence: 0.92,
    weight: player.fitnessStatus === 'red' ? 1.7 : player.fitnessStatus === 'amber' ? 1.35 : 1,
    happenedAt: GENERATED_AT,
    metadata: { fitness_status: player.fitnessStatus },
  })
}

function buildMoraleBaselineSignal(player) {
  return createSignal({
    player,
    category: 'morale',
    type: 'data',
    sourceType: 'player_profile',
    sourceKey: `sentiment:${player.sentimentScore}:${player.sentimentLabel}`,
    summary: `${player.name}'s baseline mood signal sits at ${player.sentimentScore}/100 (${player.sentimentLabel}).`,
    evidence: `sentimentScore=${player.sentimentScore}; sentimentLabel=${player.sentimentLabel}`,
    sentiment: classifyMoraleLabel(player.sentimentScore),
    confidence: 0.87,
    weight: 1,
    happenedAt: GENERATED_AT,
  })
}

function pickArticleSentence(player) {
  const sentences = splitSentences(stripHtml(player.seoArticle))
  const preferred = sentences.find((sentence) => {
    const lower = sentence.toLowerCase()
    return (
      lower.includes('fitness') ||
      lower.includes('fit') ||
      lower.includes('ready') ||
      lower.includes('breakout') ||
      lower.includes('veteran') ||
      lower.includes('final') ||
      lower.includes('pressure')
    )
  })

  return preferred ?? sentences[1] ?? sentences[0] ?? ''
}

function buildArticleSignal(player) {
  const sentence = pickArticleSentence(player)
  if (!sentence) return null

  const category = inferArticleCategory(sentence)
  const sentiment = inferSignalSentiment(sentence)

  return createSignal({
    player,
    category,
    type: inferSignalTypeFromText(sentence),
    sourceType: 'seo_article',
    sourceKey: `seo-article:${hash(sentence)}`,
    summary: sentence,
    evidence: sentence,
    sentiment,
    confidence: 0.69,
    weight: 0.85,
    happenedAt: GENERATED_AT,
  })
}

function deriveSelectionProfile(player) {
  let selectionRisk = 'low'
  let tacticalRisk = 'low'
  const reasons = []

  if (player.fitnessStatus === 'red') {
    selectionRisk = 'high'
    tacticalRisk = maxRisk(tacticalRisk, 'medium')
    reasons.push('fitness availability is currently compromised')
  } else if (player.fitnessStatus === 'amber') {
    selectionRisk = maxRisk(selectionRisk, 'medium')
    tacticalRisk = maxRisk(tacticalRisk, 'medium')
    reasons.push('medical workload is being monitored')
  }

  if (player.age >= 35) {
    selectionRisk = maxRisk(selectionRisk, 'medium')
    reasons.push('age/workload management is part of the decision')
  }

  if (player.caps < 10) {
    selectionRisk = maxRisk(selectionRisk, 'medium')
    reasons.push('international sample size remains thin')
  } else if (player.caps >= 40 && player.rating >= 7) {
    reasons.push('international experience points to a trusted squad role')
  }

  if (player.rating < 6.6) {
    tacticalRisk = maxRisk(tacticalRisk, 'medium')
    reasons.push('current rating sits below the squad-leading tier')
  } else if (player.rating >= 7.2) {
    reasons.push('recent performance level supports a stable tactical role')
  }

  if (reasons.length === 0) {
    reasons.push('availability, caps, and rating all point toward a stable role')
  }

  const dominantReason = reasons.slice(0, 2).join('; ')
  const sentiment = selectionRisk === 'high'
    ? 'negative'
    : selectionRisk === 'medium' || tacticalRisk === 'medium'
      ? 'neutral'
      : 'positive'

  return {
    selectionRisk,
    tacticalRisk,
    summary: selectionRisk === 'high'
      ? `${player.name} carries elevated lineup risk because ${dominantReason}.`
      : selectionRisk === 'medium' || tacticalRisk === 'medium'
        ? `${player.name} carries manageable lineup risk because ${dominantReason}.`
        : `${player.name} profiles as a stable tactical option because ${dominantReason}.`,
    sentiment,
    reasons,
  }
}

function buildTacticalSignal(player) {
  const profile = deriveSelectionProfile(player)

  return createSignal({
    player,
    category: 'tactical',
    type: 'data',
    sourceType: 'derived_rule',
    sourceKey: `selection:${profile.selectionRisk}:${profile.tacticalRisk}:${player.caps}:${player.rating}`,
    summary: profile.summary,
    evidence: profile.reasons.join('; '),
    sentiment: profile.sentiment,
    confidence: 0.78,
    weight: profile.selectionRisk === 'high' ? 1.4 : profile.selectionRisk === 'medium' ? 1.15 : 0.95,
    happenedAt: GENERATED_AT,
    metadata: {
      selection_risk: profile.selectionRisk,
      tactical_risk: profile.tacticalRisk,
    },
  })
}

function buildSocialSignals(player) {
  const profile = socialByPlayerKey.get(buildPlayerKey(player))
  if (!profile) return []

  return profile.recentPosts.slice(0, 2).map((post) => {
    const category = inferSignalTypeFromText(post.summary) === 'training' ? 'fitness' : 'morale'
    const trendingBoost = profile.trending ? 0.15 : 0
    const weight = 0.9 + trendingBoost + (post.sentiment === 'negative' ? 0.1 : 0)

    return createSignal({
      player,
      category,
      type: inferSignalTypeFromText(post.summary),
      sourceType: 'social_post',
      sourceKey: `social:${post.platform}:${post.date}:${hash(post.summary)}`,
      summary: `${post.platform} pulse: ${post.summary}`,
      evidence: `${post.platform} on ${post.date} (${post.engagement})`,
      sentiment: post.sentiment,
      confidence: 0.73,
      weight,
      happenedAt: toIsoDate(post.date),
      metadata: {
        platform: post.platform,
        engagement: post.engagement,
        buzz_score: profile.buzzScore,
        trending: profile.trending,
      },
    })
  })
}

function generateSignalsForPlayer(player) {
  const signals = [
    buildFitnessSignal(player),
    buildMoraleBaselineSignal(player),
    buildArticleSignal(player),
    buildTacticalSignal(player),
    ...buildSocialSignals(player),
  ].filter(Boolean)

  return signals
    .sort((left, right) => {
      const dateDelta = new Date(right.happened_at).getTime() - new Date(left.happened_at).getTime()
      if (dateDelta !== 0) return dateDelta
      return right.weight - left.weight
    })
}

function aggregateFitness(player, signals) {
  const fitnessSignals = signals.filter((signal) => signal.category === 'fitness')
  const fitnessStatus = fitnessSignals.some((signal) => signal.sentiment === 'negative')
    ? 'red'
    : player.fitnessStatus === 'red'
      ? 'red'
      : player.fitnessStatus === 'amber' || fitnessSignals.some((signal) => signal.sentiment === 'neutral')
        ? 'amber'
        : 'green'

  const socialTraining = fitnessSignals.find((signal) => signal.source_type === 'social_post')
  const articleFitness = fitnessSignals.find((signal) => signal.source_type === 'seo_article')
  const noteExtras = []

  if (socialTraining && fitnessStatus === 'green') {
    noteExtras.push('Recent training/camp activity supports current availability.')
  }
  if (articleFitness && fitnessStatus !== 'green' && articleFitness.evidence !== player.fitnessNote) {
    noteExtras.push(articleFitness.evidence)
  }

  return {
    status: fitnessStatus,
    note: [player.fitnessNote, ...noteExtras].filter(Boolean).join(' '),
  }
}

function aggregateMorale(player, signals) {
  const moraleSignals = signals.filter((signal) => signal.category === 'morale')
  let score = player.sentimentScore

  for (const signal of moraleSignals) {
    const swing = signal.sentiment === 'positive'
      ? 6 * signal.weight
      : signal.sentiment === 'negative'
        ? -8 * signal.weight
        : signal.sentiment === 'mixed'
          ? -2 * signal.weight
          : 0
    score += swing
  }

  const rounded = clamp(Math.round(score), 0, 100)
  return {
    score: rounded,
    label: classifyMoraleLabel(rounded),
  }
}

function aggregateTactical(player, signals) {
  const tacticalSignals = signals.filter((signal) => signal.category === 'tactical')
  const derivedSignal = tacticalSignals.find((signal) => signal.source_type === 'derived_rule')
  const articleSignal = tacticalSignals.find((signal) => signal.source_type === 'seo_article')

  const selectionRisk = derivedSignal?.metadata?.selection_risk ?? deriveSelectionProfile(player).selectionRisk
  const tacticalRisk = derivedSignal?.metadata?.tactical_risk ?? deriveSelectionProfile(player).tacticalRisk

  return {
    selectionRisk,
    selectionNote: derivedSignal?.summary ?? `${player.name} has no fresh lineup-specific caution signal, so baseline heuristics are in effect.`,
    tacticalRisk,
    tacticalNote: articleSignal?.summary ?? derivedSignal?.evidence ?? 'No separate tactical text signal was detected.',
  }
}

function toRecentSignals(signals) {
  return signals
    .slice(0, 4)
    .map((signal) => ({
      id: signal.id,
      type: signal.type,
      category: signal.category,
      text: signal.summary,
      sourceType: signal.source_type,
      sentiment: signal.sentiment,
      confidence: signal.confidence,
      happenedAt: signal.happened_at,
    }))
}

function aggregatePlayerIntel(player, signals) {
  const fitness = aggregateFitness(player, signals)
  const morale = aggregateMorale(player, signals)
  const tactical = aggregateTactical(player, signals)
  const lastSignalAt = signals[0]?.happened_at ?? GENERATED_AT

  return {
    player_key: buildPlayerKey(player),
    player_slug: player.slug,
    player_name: player.name,
    team_slug: player.teamSlug,
    fitness_status: fitness.status,
    fitness_note: fitness.note,
    morale_score: morale.score,
    morale_label: morale.label,
    tactical_risk: tactical.tacticalRisk,
    tactical_note: tactical.tacticalNote,
    selection_risk: tactical.selectionRisk,
    selection_note: tactical.selectionNote,
    recent_signals: toRecentSignals(signals),
    source_signal_ids: signals.map((signal) => signal.id),
    signal_count: signals.length,
    last_signal_at: lastSignalAt,
    last_updated: GENERATED_AT,
    metadata: {
      source_count_by_type: signals.reduce((acc, signal) => {
        acc[signal.source_type] = (acc[signal.source_type] || 0) + 1
        return acc
      }, {}),
    },
  }
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function writeJson(filePath, value) {
  ensureDir(filePath)
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function upsertInChunks(client, table, rows, onConflict) {
  const chunkSize = 250
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize)
    const { error } = await client.from(table).upsert(chunk, { onConflict })
    if (error) {
      throw new Error(`${table} upsert failed: ${error.message}`)
    }
  }
}

async function maybeUpsertToSupabase(signals, playerIntel) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.log('[player-intel] Supabase env vars not set. Skipping remote upsert.')
    return { skipped: true }
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  await upsertInChunks(supabase, 'signals', signals.map((signal) => ({
    id: signal.id,
    player_key: signal.player_key,
    player_slug: signal.player_slug,
    player_name: signal.player_name,
    team_slug: signal.team_slug,
    category: signal.category,
    signal_type: signal.type,
    source_type: signal.source_type,
    source_key: signal.source_key,
    summary: signal.summary,
    evidence: signal.evidence,
    sentiment: signal.sentiment,
    confidence: signal.confidence,
    weight: signal.weight,
    happened_at: signal.happened_at,
    metadata: signal.metadata ?? {},
  })), 'id')

  await upsertInChunks(supabase, 'player_intel', playerIntel, 'player_key')

  console.log(`[player-intel] Upserted ${signals.length} signals and ${playerIntel.length} player_intel rows to Supabase.`)
  return { skipped: false }
}

async function main() {
  const allSignals = PLAYERS.flatMap((player) => generateSignalsForPlayer(player))
  const signalsByPlayerKey = allSignals.reduce((acc, signal) => {
    const existing = acc.get(signal.player_key) ?? []
    existing.push(signal)
    acc.set(signal.player_key, existing)
    return acc
  }, new Map())

  const allPlayerIntel = PLAYERS.map((player) => (
    aggregatePlayerIntel(player, signalsByPlayerKey.get(buildPlayerKey(player)) ?? [])
  ))

  const intelByPlayerKey = new Map(
    allPlayerIntel.map((intel) => [intel.player_key, intel])
  )

  const validationPayload = {
    generated_at: GENERATED_AT,
    player_count: PLAYERS.length,
    signal_count: allSignals.length,
    sample_players: SAMPLE_PLAYERS.map(({ teamSlug, playerSlug }) => (
      intelByPlayerKey.get(buildPlayerKeyFromSlugs(teamSlug, playerSlug))
    )).filter(Boolean),
    signal_to_intel_evidence: SAMPLE_PLAYERS.map(({ teamSlug, playerSlug }) => {
      const playerKey = buildPlayerKeyFromSlugs(teamSlug, playerSlug)

      return {
        player_key: playerKey,
        player_slug: playerSlug,
        team_slug: teamSlug,
        signals: (signalsByPlayerKey.get(playerKey) ?? []).slice(0, 6),
        player_intel: intelByPlayerKey.get(playerKey),
      }
    }),
  }

  writeJson(SIGNALS_OUTPUT, allSignals)
  writeJson(INTEL_OUTPUT, allPlayerIntel)
  writeJson(VALIDATION_OUTPUT, validationPayload)

  console.log(`[player-intel] Wrote ${allSignals.length} signals -> ${path.relative(ROOT, SIGNALS_OUTPUT)}`)
  console.log(`[player-intel] Wrote ${allPlayerIntel.length} player_intel rows -> ${path.relative(ROOT, INTEL_OUTPUT)}`)
  console.log(`[player-intel] Wrote validation snapshot -> ${path.relative(ROOT, VALIDATION_OUTPUT)}`)

  await maybeUpsertToSupabase(allSignals, allPlayerIntel)
}

main().catch((error) => {
  console.error('[player-intel] Fatal:', error)
  process.exit(1)
})
