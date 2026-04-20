export interface PointBalance {
  balance: number
  lifetime_earned: number
  lifetime_spent: number
  current_streak_days: number
  checked_in_today: boolean
}

export interface PointTransaction {
  id: string
  amount: number
  balance_after: number
  type: PointTransactionType
  description: string
  created_at: string
}

export type PointTransactionType =
  | 'prediction_correct'
  | 'prediction_exact'
  | 'challenge_correct'
  | 'checkin'
  | 'checkin_streak_bonus'
  | 'invite_reward'
  | 'booster_purchase'
  | 'store_redemption'
  | 'first_prediction_bonus'
  | 'first_challenge_bonus'
  | 'admin_adjustment'

export type StoreItemCategory =
  | 'premium_trial'
  | 'wallpaper'
  | 'ai_credits'
  | 'badge'
  | 'booster'

export interface StoreItem {
  id: string
  slug: string
  name: string
  description: string
  category: StoreItemCategory
  point_cost: number
  real_money_cents: number | null
  image_url: string | null
  metadata: Record<string, unknown>
  stock: number | null
  is_featured: boolean
  sort_order: number
}

export interface StoreOrder {
  id: string
  item_id: string
  point_cost: number
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  fulfilled_at: string | null
  created_at: string
}

export interface InventoryItem {
  id: string
  status: 'active' | 'used' | 'expired'
  expires_at: string | null
  activated_at: string
  created_at: string
  store_items: {
    id: string
    slug: string
    name: string
    description: string
    category: StoreItemCategory
    image_url: string | null
    metadata: Record<string, unknown>
  }
}

export interface CheckinResult {
  success: boolean
  reason?: string
  points_earned?: number
  base_points?: number
  bonus_points?: number
  bonus_description?: string
  streak: number
  new_balance?: number
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  avatar_url: string | null
  balance: number
  lifetime_earned: number
  streak: number
}

export const TRANSACTION_LABELS: Record<PointTransactionType, string> = {
  prediction_correct: 'Correct Prediction',
  prediction_exact: 'Exact Score',
  challenge_correct: 'Challenge Correct',
  checkin: 'Daily Check-in',
  checkin_streak_bonus: 'Streak Bonus',
  invite_reward: 'Friend Invited',
  booster_purchase: 'Booster Activated',
  store_redemption: 'Store Purchase',
  first_prediction_bonus: 'First Prediction',
  first_challenge_bonus: 'First Challenge',
  admin_adjustment: 'Adjustment',
}

export const CATEGORY_LABELS: Record<StoreItemCategory, string> = {
  premium_trial: 'Premium',
  wallpaper: 'Wallpapers',
  ai_credits: 'AI Credits',
  badge: 'Badges & Themes',
  booster: 'Boosters',
}

export const CATEGORY_ICONS: Record<StoreItemCategory, string> = {
  premium_trial: '\u2B50',
  wallpaper: '\uD83C\uDFA8',
  ai_credits: '\uD83E\uDDE0',
  badge: '\uD83C\uDFC5',
  booster: '\u26A1',
}
