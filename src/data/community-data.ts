import { BRAND } from '@/lib/brand-tokens'

export interface ForumCategory {
  slug: string
  title: string
  description: string
  icon: string
  accent: string
  topicCount: number
  topics: ForumTopic[]
}

export interface ForumTopic {
  id: string
  title: string
  author: string
  authorFlag?: string
  replies: number
  views: number
  lastActivity: string
  pinned?: boolean
  hot?: boolean
  tags?: string[]
}

export const FORUM_CATEGORIES: ForumCategory[] = [
  {
    slug: 'predictions',
    title: 'Predictions & Betting',
    description: 'Share your World Cup 2026 predictions, group stage picks, and Golden Boot tips.',
    icon: '🔮',
    accent: BRAND.tertiary,
    topicCount: 47,
    topics: [
      {
        id: 'pred-1',
        title: 'Official Bold Predictions Thread — Who Wins It All?',
        author: 'KickOracle',
        replies: 312,
        views: 8420,
        lastActivity: '2h ago',
        pinned: true,
        tags: ['Official', 'Hot'],
      },
      {
        id: 'pred-2',
        title: 'Dark Horse Watch: Which unseeded team makes the quarterfinals?',
        author: 'TacticalMind',
        authorFlag: '🇩🇪',
        replies: 89,
        views: 2340,
        lastActivity: '4h ago',
        hot: true,
        tags: ['Discussion'],
      },
      {
        id: 'pred-3',
        title: 'Golden Boot 2026 — Mbappé, Haaland, or someone else?',
        author: 'GoalMachine',
        authorFlag: '🇫🇷',
        replies: 156,
        views: 4210,
        lastActivity: '6h ago',
        hot: true,
        tags: ['Players'],
      },
      {
        id: 'pred-4',
        title: 'Group of Death: Which group is the toughest this time?',
        author: 'GroupStageExpert',
        authorFlag: '🇧🇷',
        replies: 67,
        views: 1890,
        lastActivity: '8h ago',
        tags: ['Groups'],
      },
      {
        id: 'pred-5',
        title: 'Can the host nations (USA/Canada/Mexico) reach the semis?',
        author: 'CONCACAF_Fan',
        authorFlag: '🇺🇸',
        replies: 201,
        views: 5430,
        lastActivity: '12h ago',
        tags: ['Hosts'],
      },
    ],
  },
  {
    slug: 'team-talk',
    title: 'Team Talk',
    description: 'Discuss squads, tactics, key players, and managers for all 48 nations.',
    icon: '⚽',
    accent: BRAND.primary,
    topicCount: 124,
    topics: [
      {
        id: 'team-1',
        title: 'Brazil Squad Thread — Vinicius Jr leading the charge?',
        author: 'Seleção_Forever',
        authorFlag: '🇧🇷',
        replies: 245,
        views: 6780,
        lastActivity: '1h ago',
        pinned: true,
        hot: true,
        tags: ['Brazil'],
      },
      {
        id: 'team-2',
        title: 'Argentina: Can they defend the title with an aging Messi?',
        author: 'LaAlbiceleste',
        authorFlag: '🇦🇷',
        replies: 189,
        views: 5120,
        lastActivity: '3h ago',
        hot: true,
        tags: ['Argentina'],
      },
      {
        id: 'team-3',
        title: 'France 2026 — Depth is insane but can Deschamps manage egos?',
        author: 'LesBleus',
        authorFlag: '🇫🇷',
        replies: 134,
        views: 3890,
        lastActivity: '5h ago',
        tags: ['France'],
      },
      {
        id: 'team-4',
        title: 'England: This generation HAS to deliver. Bellingham era.',
        author: 'ThreeLions',
        authorFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        replies: 178,
        views: 4560,
        lastActivity: '7h ago',
        tags: ['England'],
      },
      {
        id: 'team-5',
        title: 'Japan Rising — Real dark horse or just hype?',
        author: 'SamuraiBlue',
        authorFlag: '🇯🇵',
        replies: 92,
        views: 2340,
        lastActivity: '10h ago',
        tags: ['Japan'],
      },
    ],
  },
  {
    slug: 'match-day',
    title: 'Match Day Live',
    description: 'Live match threads, post-match reactions, and instant analysis.',
    icon: '🏟️',
    accent: BRAND.secondary,
    topicCount: 18,
    topics: [
      {
        id: 'match-1',
        title: '[PRE-TOURNAMENT] Opening Ceremony Predictions & Hype Thread',
        author: 'KickOracle',
        replies: 89,
        views: 3210,
        lastActivity: '30m ago',
        pinned: true,
        tags: ['Official'],
      },
      {
        id: 'match-2',
        title: 'Which opening day match are you most excited for?',
        author: 'MatchdayFan',
        authorFlag: '🇲🇽',
        replies: 56,
        views: 1450,
        lastActivity: '2h ago',
        tags: ['Discussion'],
      },
      {
        id: 'match-3',
        title: 'Venue Guide: Best atmospheres expected at WC 2026',
        author: 'StadiumGuru',
        authorFlag: '🇺🇸',
        replies: 73,
        views: 2100,
        lastActivity: '5h ago',
        tags: ['Venues'],
      },
    ],
  },
  {
    slug: 'general',
    title: 'General Discussion',
    description: 'Off-topic chat, fan meetups, travel tips, and World Cup culture.',
    icon: '💬',
    accent: BRAND.primaryFixed,
    topicCount: 63,
    topics: [
      {
        id: 'gen-1',
        title: 'Fan Travel Guide: Getting around USA, Canada & Mexico',
        author: 'WC_Traveler',
        authorFlag: '🇬🇧',
        replies: 145,
        views: 7890,
        lastActivity: '1h ago',
        pinned: true,
        tags: ['Travel'],
      },
      {
        id: 'gen-2',
        title: 'Best World Cup ever? How 2026 compares to previous tournaments',
        author: 'FootballHistory',
        replies: 98,
        views: 3450,
        lastActivity: '4h ago',
        tags: ['History'],
      },
      {
        id: 'gen-3',
        title: 'Fan meetup thread — Share your city and find watch parties',
        author: 'KickOracle',
        replies: 234,
        views: 6780,
        lastActivity: '2h ago',
        hot: true,
        tags: ['Meetup', 'Official'],
      },
      {
        id: 'gen-4',
        title: 'Your all-time World Cup XI — Build your dream team',
        author: 'ClassicFan',
        authorFlag: '🇮🇹',
        replies: 167,
        views: 4230,
        lastActivity: '8h ago',
        tags: ['Fun'],
      },
    ],
  },
]

export const COMMUNITY_STATS = {
  totalMembers: '12.4K',
  totalTopics: 252,
  totalReplies: '3.2K',
  onlineNow: 847,
}
