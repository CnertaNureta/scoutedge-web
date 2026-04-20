import type { Player } from '@/lib/types'
import { PLAYER_STATUS_OVERLAY } from '@/data/player-status-data'

export type PlayerStatus = 'confirmed' | 'likely' | 'doubtful' | 'ruled-out' | 'retired'

export interface StatusConfig {
  label: string
  emoji: string
  badge: 'primary' | 'secondary' | 'tertiary' | 'outline'
  tone: 'positive' | 'cautious' | 'negative'
  description: string
}

export const STATUS_CONFIG: Record<PlayerStatus, StatusConfig> = {
  confirmed: {
    label: 'Confirmed',
    emoji: '\u2705',
    badge: 'primary',
    tone: 'positive',
    description: 'Expected to be named in the final World Cup squad.',
  },
  likely: {
    label: 'Likely',
    emoji: '\ud83d\udfe2',
    badge: 'primary',
    tone: 'positive',
    description: 'Highly probable inclusion barring late setbacks.',
  },
  doubtful: {
    label: 'Doubtful',
    emoji: '\ud83d\udfe1',
    badge: 'secondary',
    tone: 'cautious',
    description: 'Selection uncertain due to fitness, form, or squad competition.',
  },
  'ruled-out': {
    label: 'Ruled Out',
    emoji: '\u274c',
    badge: 'outline',
    tone: 'negative',
    description: 'Will not participate in the 2026 tournament.',
  },
  retired: {
    label: 'Retired (International)',
    emoji: '\ud83c\udfc1',
    badge: 'outline',
    tone: 'negative',
    description: 'Has retired from international football and will not feature.',
  },
}

const OVERLAY_MAP = new Map(PLAYER_STATUS_OVERLAY.map((r) => [r.slug, r]))

export interface ResolvedPlayerStatus {
  status: PlayerStatus
  reason: string
  updated: string
  source: 'editorial' | 'derived'
}

const DEFAULT_UPDATED = '2026-04-16'

export function resolvePlayerStatus(player: Player): ResolvedPlayerStatus {
  const overlay = OVERLAY_MAP.get(player.slug)
  if (overlay) {
    return {
      status: overlay.status,
      reason: overlay.reason,
      updated: overlay.updated,
      source: 'editorial',
    }
  }

  const fitness = player.fitnessStatus
  if (fitness === 'red') {
    return {
      status: 'doubtful',
      reason: player.fitnessNote || 'Significant injury or fitness concern flagged by our scouting team.',
      updated: DEFAULT_UPDATED,
      source: 'derived',
    }
  }

  if (fitness === 'amber') {
    return {
      status: 'likely',
      reason: player.fitnessNote || 'Minor fitness concern being monitored; likely to feature if the schedule cooperates.',
      updated: DEFAULT_UPDATED,
      source: 'derived',
    }
  }

  return {
    status: 'confirmed',
    reason: player.fitnessNote || 'In full training, with no fitness or selection concerns at this stage.',
    updated: DEFAULT_UPDATED,
    source: 'derived',
  }
}
