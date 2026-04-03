import { describe, expect, it } from 'vitest'
import generatedPlayerIntel from '@/data/generated-player-intel.json'
import generatedPlayerSignals from '@/data/generated-player-signals.json'
import { PLAYERS } from '@/data/players-data'
import type { PlayerIntelRecord, PlayerSignalRecord } from '@/lib/types'

const playerIntel = generatedPlayerIntel as PlayerIntelRecord[]
const playerSignals = generatedPlayerSignals as PlayerSignalRecord[]

function buildPlayerKey(teamSlug: string, playerSlug: string): string {
  return `${teamSlug}::${playerSlug}`
}

describe('generated player intel pipeline', () => {
  it('generates a readable batch of player intel records', () => {
    expect(playerIntel.length).toBeGreaterThanOrEqual(1000)
    expect(playerSignals.length).toBeGreaterThanOrEqual(4000)
  })

  it('keeps required fields populated for validation samples', () => {
    for (const slug of ['guillermo-ochoa', 'kylian-mbappe', 'lionel-messi', 'christian-pulisic', 'hiroki-ito']) {
      const intel = playerIntel.find((row) => row.player_slug === slug)
      expect(intel, `missing intel for ${slug}`).toBeDefined()
      expect(intel?.fitness_status).toMatch(/^(green|amber|red)$/)
      expect(intel?.fitness_note.length).toBeGreaterThan(0)
      expect(intel?.recent_signals.length).toBeGreaterThan(0)
      expect(intel?.source_signal_ids.length).toBeGreaterThan(0)
      expect(intel?.last_updated).toMatch(/^20\d\d-/)
    }
  })

  it('links recent intel back to real source signals', () => {
    const signalIds = new Set(playerSignals.map((signal) => signal.id))
    const uniqueSignalIds = new Set(playerSignals.map((signal) => signal.id))

    expect(uniqueSignalIds.size).toBe(playerSignals.length)

    for (const intel of playerIntel.slice(0, 25)) {
      for (const signalId of intel.source_signal_ids) {
        expect(signalIds.has(signalId), `missing signal ${signalId} for ${intel.player_slug}`).toBe(true)
      }
    }
  })

  it('keeps aggregated intel scoped to the team-aware player key', () => {
    const signalIdsByPlayerKey = new Map<string, string[]>()

    for (const signal of playerSignals) {
      const ids = signalIdsByPlayerKey.get(signal.player_key) ?? []
      ids.push(signal.id)
      signalIdsByPlayerKey.set(signal.player_key, ids)
    }

    for (const intel of playerIntel) {
      const expectedSignalIds = signalIdsByPlayerKey.get(intel.player_key) ?? []

      expect(intel.signal_count, `wrong signal_count for ${intel.player_key}`).toBe(expectedSignalIds.length)
      expect([...intel.source_signal_ids].sort(), `wrong source_signal_ids for ${intel.player_key}`).toEqual([...expectedSignalIds].sort())
    }
  })

  it('does not merge signals for duplicate slugs across teams', () => {
    const slugCounts = new Map<string, number>()
    for (const player of PLAYERS) {
      slugCounts.set(player.slug, (slugCounts.get(player.slug) ?? 0) + 1)
    }

    const duplicateSlugPlayers = PLAYERS.filter((player) => (slugCounts.get(player.slug) ?? 0) > 1)
    expect(duplicateSlugPlayers.length).toBeGreaterThan(0)

    for (const player of duplicateSlugPlayers) {
      const intel = playerIntel.find((row) => row.player_key === buildPlayerKey(player.teamSlug, player.slug))
      const unrelatedSignal = intel?.source_signal_ids.find((signalId) => {
        const signal = playerSignals.find((row) => row.id === signalId)
        return signal?.player_key !== buildPlayerKey(player.teamSlug, player.slug)
      })

      expect(intel, `missing intel for ${player.teamSlug}::${player.slug}`).toBeDefined()
      expect(unrelatedSignal, `cross-team signal leaked into ${player.teamSlug}::${player.slug}`).toBeUndefined()
    }
  })
})
