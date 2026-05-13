// Namespaces that must be available to client components.
// Server components use `await getTranslations()` directly and do not need
// messages in the client provider; only namespaces referenced from a
// `'use client'` component (or anything React hydrates) need to be shipped.
//
// Filtering at the layout boundary cuts the inlined message payload by
// roughly half (~80KB → ~34KB), reducing JSON parse cost during hydration.
//
// To regenerate:
//   grep -rE "^['\"]use client['\"]" src/ -l --include='*.tsx' \
//     | xargs grep -hE "useTranslations\([^)]+\)" \
//     | sed -nE "s/.*useTranslations\(['\"]([a-zA-Z0-9_.]+)['\"]\).*/\1/p" \
//     | awk -F'.' '{print $1}' | sort -u
export const CLIENT_NAMESPACES = [
  // Layout-level widgets / chrome
  'nav',
  'auth',
  'search',
  'footer',
  'common',
  'urgencyStrip',
  'chat',
  'pwa',
  // Marketing components rendered inside server pages
  'hero',
  'testimonials',
  'subscriptionBanner',
  'newsletter',
  'trustStrip',
  'articleSubscribe',
  // Page-scoped client components
  'apiDashboardClient',
  'apiEndpointsTab',
  'apiKeys',
  'apiPlanTab',
  'apiUsageTab',
  'blog',
  'blogFilter',
  'challengesPage',
  'compareSelector',
  'countdown',
  'countdownPage',
  'fanCard',
  'fitness',
  'formationsPage',
  'leaderboardPage',
  'leagueDetail',
  'leaguesCreatePage',
  'leaguesPage',
  'lingoSearch',
  'matchesPage',
  'offlinePage',
  'paywall',
  'pkBattle',
  'pointsPage',
  'predictPage',
  'pricingTiers',
  'schedulePage',
  'share',
  'squadDepth',
  'squadRoster',
  'stickerTracker',
  'storePage',
  'teamsPage',
] as const

type AnyMessages = Record<string, unknown>

export function pickClientMessages(messages: AnyMessages): AnyMessages {
  const out: AnyMessages = {}
  for (const ns of CLIENT_NAMESPACES) {
    if (ns in messages) {
      out[ns] = messages[ns]
    }
  }
  return out
}
