export interface PlayerSocialProfile {
  playerSlug: string
  teamSlug: string
  platforms: {
    instagram?: { handle: string; followers: string; recentEngagement: string }
    twitter?: { handle: string; followers: string; recentEngagement: string }
    tiktok?: { handle: string; followers: string; recentEngagement: string }
  }
  buzzScore: number // 0-100 social media buzz index
  recentPosts: { date: string; platform: string; summary: string; sentiment: 'positive' | 'neutral' | 'negative'; engagement: string }[]
  trending: boolean
}

/**
 * Social media profiles and recent activity for key World Cup 2026 players.
 * Buzz scores reflect pre-tournament social media activity and engagement.
 */
export const PLAYER_SOCIAL_DATA: PlayerSocialProfile[] = [
  {
    playerSlug: 'kylian-mbappe',
    teamSlug: 'france',
    platforms: {
      instagram: { handle: '@k.mbappe', followers: '120M', recentEngagement: '4.2M avg' },
      twitter: { handle: '@KMbappe', followers: '14.5M', recentEngagement: '180K avg' },
    },
    buzzScore: 97,
    recentPosts: [
      { date: '2026-05-28', platform: 'Instagram', summary: 'Training camp arrival with France squad', sentiment: 'positive', engagement: '6.8M likes' },
      { date: '2026-05-25', platform: 'Instagram', summary: 'Season recap at Real Madrid — 38 goals', sentiment: 'positive', engagement: '5.2M likes' },
      { date: '2026-05-20', platform: 'Twitter', summary: '"Ready for the World Cup. This time, we finish what we started."', sentiment: 'positive', engagement: '420K likes' },
    ],
    trending: true,
  },
  {
    playerSlug: 'vinicius-junior',
    teamSlug: 'brazil',
    platforms: {
      instagram: { handle: '@vinijr', followers: '62M', recentEngagement: '2.8M avg' },
      twitter: { handle: '@vinaborges', followers: '8.2M', recentEngagement: '95K avg' },
      tiktok: { handle: '@vinijr', followers: '18M', recentEngagement: '1.5M avg' },
    },
    buzzScore: 94,
    recentPosts: [
      { date: '2026-05-30', platform: 'Instagram', summary: 'Brazil training session — "Seleção mode activated"', sentiment: 'positive', engagement: '4.1M likes' },
      { date: '2026-05-22', platform: 'TikTok', summary: 'Skills compilation set to samba music', sentiment: 'positive', engagement: '12M views' },
    ],
    trending: true,
  },
  {
    playerSlug: 'jude-bellingham',
    teamSlug: 'england',
    platforms: {
      instagram: { handle: '@judebellingham', followers: '45M', recentEngagement: '2.1M avg' },
      twitter: { handle: '@BellsJude', followers: '4.8M', recentEngagement: '85K avg' },
    },
    buzzScore: 91,
    recentPosts: [
      { date: '2026-05-29', platform: 'Instagram', summary: 'England camp check-in — "Time to make history 🏴󠁧󠁢󠁥󠁮󠁧󠁿"', sentiment: 'positive', engagement: '3.8M likes' },
      { date: '2026-05-18', platform: 'Twitter', summary: 'Celebrating La Liga title win', sentiment: 'positive', engagement: '210K likes' },
    ],
    trending: true,
  },
  {
    playerSlug: 'erling-haaland',
    teamSlug: 'norway',
    platforms: {
      instagram: { handle: '@eraborgs', followers: '38M', recentEngagement: '1.5M avg' },
      twitter: { handle: '@ErlingHaaland', followers: '3.2M', recentEngagement: '55K avg' },
    },
    buzzScore: 89,
    recentPosts: [
      { date: '2026-05-27', platform: 'Instagram', summary: 'Norway qualifying celebration — "See you at the World Cup"', sentiment: 'positive', engagement: '2.8M likes' },
      { date: '2026-05-15', platform: 'Instagram', summary: 'PL Golden Boot with 42 goals', sentiment: 'positive', engagement: '3.1M likes' },
    ],
    trending: true,
  },
  {
    playerSlug: 'lionel-messi',
    teamSlug: 'argentina',
    platforms: {
      instagram: { handle: '@leomessi', followers: '510M', recentEngagement: '12M avg' },
      twitter: { handle: '@TeamMessi', followers: '11M', recentEngagement: '320K avg' },
    },
    buzzScore: 98,
    recentPosts: [
      { date: '2026-05-30', platform: 'Instagram', summary: '"One last dance? Vamos Argentina 🇦🇷"', sentiment: 'positive', engagement: '28M likes' },
      { date: '2026-05-20', platform: 'Instagram', summary: 'Training for final tournament appearance speculation', sentiment: 'neutral', engagement: '15M likes' },
    ],
    trending: true,
  },
  {
    playerSlug: 'pedri',
    teamSlug: 'spain',
    platforms: {
      instagram: { handle: '@pedri', followers: '22M', recentEngagement: '980K avg' },
    },
    buzzScore: 78,
    recentPosts: [
      { date: '2026-05-26', platform: 'Instagram', summary: 'Spain squad announcement — "Proud to represent"', sentiment: 'positive', engagement: '1.4M likes' },
    ],
    trending: false,
  },
  {
    playerSlug: 'florian-wirtz',
    teamSlug: 'germany',
    platforms: {
      instagram: { handle: '@florianwirtz', followers: '12M', recentEngagement: '620K avg' },
    },
    buzzScore: 82,
    recentPosts: [
      { date: '2026-05-28', platform: 'Instagram', summary: 'Germany training camp — new generation ready', sentiment: 'positive', engagement: '890K likes' },
    ],
    trending: true,
  },
  {
    playerSlug: 'christian-pulisic',
    teamSlug: 'usa',
    platforms: {
      instagram: { handle: '@cmpulisic', followers: '8.5M', recentEngagement: '420K avg' },
      twitter: { handle: '@cpulisic_10', followers: '2.8M', recentEngagement: '48K avg' },
    },
    buzzScore: 85,
    recentPosts: [
      { date: '2026-05-29', platform: 'Instagram', summary: '"Home World Cup. This is what we dreamed of. 🇺🇸"', sentiment: 'positive', engagement: '1.8M likes' },
      { date: '2026-05-22', platform: 'Twitter', summary: 'USMNT squad reveal reaction', sentiment: 'positive', engagement: '92K likes' },
    ],
    trending: true,
  },
  {
    playerSlug: 'lamine-yamal',
    teamSlug: 'spain',
    platforms: {
      instagram: { handle: '@laborgs', followers: '28M', recentEngagement: '1.8M avg' },
      tiktok: { handle: '@lamineyamal', followers: '15M', recentEngagement: '2.2M avg' },
    },
    buzzScore: 93,
    recentPosts: [
      { date: '2026-05-30', platform: 'TikTok', summary: 'Pre-World Cup dance with Spain teammates', sentiment: 'positive', engagement: '18M views' },
      { date: '2026-05-24', platform: 'Instagram', summary: 'La Liga stats — youngest ever to 20 goals', sentiment: 'positive', engagement: '3.2M likes' },
    ],
    trending: true,
  },
  {
    playerSlug: 'hiroki-ito',
    teamSlug: 'japan',
    platforms: {
      instagram: { handle: '@hirokiito', followers: '1.2M', recentEngagement: '45K avg' },
    },
    buzzScore: 58,
    recentPosts: [
      { date: '2026-05-25', platform: 'Instagram', summary: 'Bayern Munich season wrap + Japan WC prep', sentiment: 'positive', engagement: '62K likes' },
    ],
    trending: false,
  },
]

/** Get trending players sorted by buzz score */
export function getTrendingPlayers(limit = 10): PlayerSocialProfile[] {
  return [...PLAYER_SOCIAL_DATA]
    .sort((a, b) => b.buzzScore - a.buzzScore)
    .slice(0, limit)
}

/** Get social profile for a specific player */
export function getPlayerSocial(playerSlug: string): PlayerSocialProfile | undefined {
  return PLAYER_SOCIAL_DATA.find((p) => p.playerSlug === playerSlug)
}
