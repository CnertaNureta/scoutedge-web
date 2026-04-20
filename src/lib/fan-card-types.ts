export type CardThemeId = 'classic' | 'neon' | 'gold' | 'holographic' | 'stadium'

export interface CardTheme {
  id: CardThemeId
  name: string
  description: string
  premium: boolean
  priceCents: number
}

export const CARD_THEMES: CardTheme[] = [
  { id: 'classic', name: 'Classic', description: 'Clean dark glass panel', premium: false, priceCents: 0 },
  { id: 'neon', name: 'Neon', description: 'Glowing borders & neon accents', premium: false, priceCents: 0 },
  { id: 'gold', name: 'Gold', description: 'Metallic gold gradient', premium: true, priceCents: 199 },
  { id: 'holographic', name: 'Holographic', description: 'Rainbow gradient overlay', premium: true, priceCents: 299 },
  { id: 'stadium', name: 'Stadium VIP', description: 'Textured pitch background', premium: true, priceCents: 499 },
]

export type BadgeCategory = 'supporter' | 'analyst' | 'social' | 'special'

export interface FanBadge {
  id: string
  name: string
  description: string
  icon: string
  category: BadgeCategory
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export const FAN_BADGES: FanBadge[] = [
  // Supporter
  { id: 'first-pick', name: 'First Pick', description: 'Made your first champion pick', icon: '🏆', category: 'supporter', rarity: 'common' },
  { id: 'true-believer', name: 'True Believer', description: 'Picked the same team 3 times', icon: '💚', category: 'supporter', rarity: 'rare' },
  { id: 'globe-trotter', name: 'Globe Trotter', description: 'Explored all 48 team pages', icon: '🌍', category: 'supporter', rarity: 'epic' },

  // Analyst
  { id: 'sharp-eye', name: 'Sharp Eye', description: 'Correct prediction 3 times in a row', icon: '🎯', category: 'analyst', rarity: 'rare' },
  { id: 'oracle', name: 'Oracle', description: '10+ correct predictions', icon: '🔮', category: 'analyst', rarity: 'epic' },
  { id: 'underdog-scout', name: 'Underdog Scout', description: 'Correctly predicted an upset', icon: '⚡', category: 'analyst', rarity: 'legendary' },

  // Social
  { id: 'broadcaster', name: 'Broadcaster', description: 'Shared your fan card on social media', icon: '📡', category: 'social', rarity: 'common' },
  { id: 'influencer', name: 'Influencer', description: 'Card shared by 10+ people', icon: '🌟', category: 'social', rarity: 'epic' },
  { id: 'community-voice', name: 'Community Voice', description: 'Joined a prediction league', icon: '🗣️', category: 'social', rarity: 'common' },

  // Special
  { id: 'early-supporter', name: 'Early Supporter', description: 'Joined before World Cup kickoff', icon: '🎫', category: 'special', rarity: 'rare' },
  { id: 'night-owl', name: 'Night Owl', description: 'Active during a midnight match', icon: '🦉', category: 'special', rarity: 'rare' },
  { id: 'world-cup-veteran', name: 'World Cup Veteran', description: 'Active throughout the entire tournament', icon: '🏅', category: 'special', rarity: 'legendary' },
]

export const AVATAR_OPTIONS = [
  '⚽', '🥅', '🏟️', '🦁', '🦅', '🐉', '🐺', '🦊',
  '🔥', '⭐', '💎', '🎖️', '👑', '🛡️', '⚡', '🌊',
] as const

export type AvatarEmoji = (typeof AVATAR_OPTIONS)[number]

export interface FanCardData {
  displayName: string
  teamSlug: string
  avatar: AvatarEmoji
  theme: CardThemeId
  badges: string[]
  predictionsCount: number
  accuracy: number
  favPlayer: string
}
