/**
 * P3 — StatTwin
 *
 * Historical comparables module for a player profile. Wraps an extended
 * radar (with ghost overlays for up to 3 comparables) inside the shared
 * IntelligenceModule shell. Server component — data comes from the
 * curated JSON via `computeStatTwin`.
 *
 * When a player isn't curated, the module renders a graceful "comparables
 * pending" state inside the same shell so the page layout stays stable.
 */

import { getTranslations } from 'next-intl/server'
import type { Player, Team } from '@/lib/types'
import type { DerivedStats } from '@/lib/player-derived-stats'
import {
  computeStatTwin,
  type StatTwinComparable,
} from '@/lib/intelligence/stat-twin'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import Paywall from '@/components/monetization/Paywall'
import StatTwinRadar, {
  type ComparableOverlay,
} from '@/components/player/StatTwinRadar'
import { BRAND, POSITION_HEX } from '@/lib/brand-tokens'

interface StatTwinProps {
  player: Player
  team: Team
  derivedStats: DerivedStats
}

const COMPARABLE_PALETTE = ['#e2e8f0', '#94a3b8', '#64748b'] as const

/**
 * Build a dossier id consistent with P1 (`SCT-{TEAM3}-P1-{PLAYER8}-2026`)
 * but namespaced with `-STAT-TWIN-`.
 */
function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
  const playerPart = playerSlug
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  return `SCT-${teamPart}-P3-${playerPart}-STAT-TWIN-2026`
}

/** Map a similarity percent to a 0-99 stat scale offset relative to the player. */
function similarityToFactor(similarityPercent: number): number {
  // 100% → identical; 60% → ~80% scale of the player's polygon; 0% → 50%.
  const clamped = Math.max(0, Math.min(100, similarityPercent))
  return 0.5 + (clamped / 100) * 0.5
}

/** Synthesise an overlay stat vector for a comparable — visual only. */
function buildOverlayStats(
  baseStats: DerivedStats,
  comparable: StatTwinComparable,
  seed: number,
): DerivedStats {
  const factor = similarityToFactor(comparable.similarityPercent)
  // Mild per-axis jitter so the overlay polygon doesn't look like a
  // perfectly scaled copy of the main polygon. Deterministic from index +
  // year so SSR stays stable.
  const jitter = (axis: number): number => {
    const t = Math.sin((seed + 1) * (axis + 1) * 13.37 + comparable.year) * 0.5
    return 1 + t * 0.08 // ±8%
  }
  const scale = (value: number, axis: number): number => {
    const next = value * factor * jitter(axis)
    return Math.max(20, Math.min(99, Math.round(next)))
  }
  return {
    pace: scale(baseStats.pace, 0),
    shooting: scale(baseStats.shooting, 1),
    passing: scale(baseStats.passing, 2),
    physical: scale(baseStats.physical, 3),
    defense: scale(baseStats.defense, 4),
    overall: scale(baseStats.overall, 5),
  }
}

function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1] ?? fullName
}

export default async function StatTwin({
  player,
  team,
  derivedStats,
}: StatTwinProps) {
  const t = await getTranslations('statTwin')
  const breakdown = computeStatTwin(player.slug)
  const accentColor = POSITION_HEX[player.position] ?? BRAND.primary
  const dossierId = buildDossierId(team.slug, player.slug)

  // Color palette used for both the radar overlays and the comparable cards
  // so the chart and the list visually agree.
  const teamGlow = accentColor
  const teamPrimary = accentColor

  // Confidence footer numbers stay sane for both states; for uncurated
  // players we want signalCount=0/sourceCount=0 so the footer reflects
  // "pending" rather than implying coverage.
  const signalCount = breakdown.signalCount
  const sourceCount = breakdown.sourceCount

  const topComparable = breakdown.comparables[0]
  const scoutVerdict = topComparable
    ? t('scoutVerdict', {
        player: player.name,
        topComparable: `${topComparable.year} ${topComparable.name}`,
      })
    : undefined

  const overlays: ComparableOverlay[] = breakdown.comparables.map((c, i) => ({
    label: extractLastName(c.name),
    stats: buildOverlayStats(derivedStats, c, i),
  }))

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <Paywall contentType="player_intel" scope={player.slug} previewLines={6}>
        <IntelligenceModule
          title={t('heading')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          scoutVerdict={scoutVerdict}
          signalCount={signalCount}
          sourceCount={sourceCount}
          lastUpdatedAt={
            player.intelLastUpdated ?? new Date().toISOString()
          }
          accentColor={accentColor}
        >
          {breakdown.hasComparables ? (
            <>
              <div className="flex flex-col items-center mb-6">
                <StatTwinRadar
                  stats={derivedStats}
                  teamGlow={teamGlow}
                  teamPrimary={teamPrimary}
                  overlays={overlays}
                  idSuffix={player.slug}
                />
              </div>

              {/* Legend */}
              <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8 list-none p-0">
                <li className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block w-4 h-[2px] rounded-full"
                    style={{ background: accentColor }}
                  />
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {t('comparablesLegend.mainPlayerLabel', {
                      player: player.name,
                    })}
                  </span>
                </li>
                {overlays.map((overlay, i) => (
                  <li key={overlay.label} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block w-4 h-[2px] rounded-full"
                      style={{
                        background:
                          COMPARABLE_PALETTE[i] ??
                          COMPARABLE_PALETTE[COMPARABLE_PALETTE.length - 1],
                        outline: '1px dashed rgba(255,255,255,0.2)',
                      }}
                    />
                    <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                      {t('comparablesLegend.comparableLabel', {
                        label: overlay.label,
                      })}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Comparable cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {breakdown.comparables.map((c, i) => (
                  <article
                    key={`${c.name}-${c.year}`}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
                  >
                    <header className="flex items-baseline justify-between mb-3">
                      <h4 className="font-headline text-base uppercase tracking-wider">
                        {c.name}
                      </h4>
                      <span
                        className="font-mono text-[11px] uppercase tracking-widest"
                        style={{
                          color:
                            COMPARABLE_PALETTE[i] ??
                            COMPARABLE_PALETTE[
                              COMPARABLE_PALETTE.length - 1
                            ],
                        }}
                      >
                        {c.year}
                      </span>
                    </header>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span
                        className="font-headline text-3xl"
                        style={{ color: accentColor }}
                      >
                        {c.similarityPercent}%
                      </span>
                      <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                        {t('similarityLabel')}
                      </span>
                    </div>
                    <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                      <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/70 mr-2">
                        {t('traitLabel')}
                      </span>
                      {c.trait}
                    </p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-center py-10">
              <StatTwinRadar
                stats={derivedStats}
                teamGlow={teamGlow}
                teamPrimary={teamPrimary}
                idSuffix={player.slug}
              />
              <p className="font-body text-sm text-on-surface-variant max-w-md mt-6">
                {t('pendingState', { player: player.name })}
              </p>
            </div>
          )}
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
