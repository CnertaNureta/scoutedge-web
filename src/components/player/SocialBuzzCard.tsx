import { getTranslations } from 'next-intl/server'
import type { Player, Team } from '@/lib/types'
import type { PlayerSocialProfile } from '@/data/player-social'
import { getPlayerSocial } from '@/data/player-social'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import Badge from '@/components/ui/Badge'
import ChemistryBar from '@/components/ui/ChemistryBar'
import Paywall from '@/components/monetization/Paywall'
import { BRAND, POSITION_HEX, SURFACE } from '@/lib/brand-tokens'

// ── Verdict thresholds (by buzz) ──────────────────────────────
const HIGH_BUZZ_MIN = 75
const SENTIMENT_POSITIVE_MIN = 60
const SENTIMENT_NEGATIVE_MAX = 40

// ── Delta calibration ─────────────────────────────────────────
const DELTA_PER_POST = 5
const DELTA_MIN = -50
const DELTA_MAX = 50

export type BuzzVerdictKey = 'tailwind' | 'headwind' | 'quiet' | 'mixed' | 'noChatter'

export interface BuzzSummary {
  buzz: number
  sentiment: number
  delta: number
  verdictKey: BuzzVerdictKey
  topPosts: PlayerSocialProfile['recentPosts']
  platformCount: number
  lastUpdatedAt: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Aggregate recentPosts sentiment polarity into a 0..100 normalized score.
 * Positive posts pull toward 100, negative pull toward 0, neutral toward 50.
 * Returns 50 (neutral baseline) when there are no posts.
 */
function aggregateSentiment(posts: PlayerSocialProfile['recentPosts']): number {
  if (!posts || posts.length === 0) return 50
  let sum = 0
  for (const post of posts) {
    if (post.sentiment === 'positive') sum += 100
    else if (post.sentiment === 'negative') sum += 0
    else sum += 50
  }
  return clamp(Math.round(sum / posts.length), 0, 100)
}

function computeDelta(posts: PlayerSocialProfile['recentPosts']): number {
  if (!posts || posts.length === 0) return 0
  let positive = 0
  let negative = 0
  for (const post of posts) {
    if (post.sentiment === 'positive') positive += 1
    else if (post.sentiment === 'negative') negative += 1
  }
  return clamp((positive - negative) * DELTA_PER_POST, DELTA_MIN, DELTA_MAX)
}

function countPlatforms(profile: PlayerSocialProfile | undefined): number {
  if (!profile) return 0
  const platforms = profile.platforms
  let count = 0
  if (platforms.instagram) count += 1
  if (platforms.twitter) count += 1
  if (platforms.tiktok) count += 1
  return count
}

function mostRecentPostDate(posts: PlayerSocialProfile['recentPosts']): string | undefined {
  if (!posts || posts.length === 0) return undefined
  let latestTime = -Infinity
  let latest: string | undefined
  for (const post of posts) {
    const t = new Date(post.date).getTime()
    if (Number.isFinite(t) && t > latestTime) {
      latestTime = t
      latest = post.date
    }
  }
  return latest
}

function getVerdict(buzz: number, sentiment: number, hasData: boolean): BuzzVerdictKey {
  if (!hasData) return 'noChatter'
  const isHighBuzz = buzz >= HIGH_BUZZ_MIN
  if (isHighBuzz && sentiment >= SENTIMENT_POSITIVE_MIN) return 'tailwind'
  if (isHighBuzz && sentiment <= SENTIMENT_NEGATIVE_MAX) return 'headwind'
  if (!isHighBuzz && sentiment >= SENTIMENT_NEGATIVE_MAX && sentiment <= SENTIMENT_POSITIVE_MIN) {
    return 'quiet'
  }
  return 'mixed'
}

/**
 * Pure compute function — exported for unit testing.
 * Aggregates a PlayerSocialProfile into buzz, sentiment, delta, and verdict.
 */
export function computeBuzzSummary(social: PlayerSocialProfile | undefined): BuzzSummary {
  if (!social) {
    return {
      buzz: 0,
      sentiment: 50,
      delta: 0,
      verdictKey: 'noChatter',
      topPosts: [],
      platformCount: 0,
      lastUpdatedAt: new Date().toISOString(),
    }
  }

  const buzz = clamp(Math.round(social.buzzScore), 0, 100)
  const sentiment = aggregateSentiment(social.recentPosts)
  const delta = computeDelta(social.recentPosts)
  const hasData =
    (social.recentPosts && social.recentPosts.length > 0) || countPlatforms(social) > 0
  const verdictKey = getVerdict(buzz, sentiment, hasData)
  const topPosts = (social.recentPosts ?? []).slice(0, 3)
  const platformCount = countPlatforms(social)
  const lastUpdatedAt =
    mostRecentPostDate(social.recentPosts) ?? new Date().toISOString()

  return {
    buzz,
    sentiment,
    delta,
    verdictKey,
    topPosts,
    platformCount,
    lastUpdatedAt,
  }
}

function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().slice(0, 3)
  const playerPart = playerSlug
    .toUpperCase()
    .slice(0, 8)
    .replace(/[^A-Z0-9]/g, '')
  return `SCT-${teamPart}-P8-${playerPart}-2026`
}

function deltaArrow(delta: number): string {
  if (delta > 0) return '↑'
  if (delta < 0) return '↓'
  return '→'
}

function deltaColor(delta: number, accent: string): string {
  if (delta > 0) return accent
  if (delta < 0) return BRAND.secondary
  return SURFACE.onSurfaceVariant
}

interface SocialBuzzCardProps {
  player: Player
  team: Team
}

export default async function SocialBuzzCard({ player, team }: SocialBuzzCardProps) {
  const t = await getTranslations('socialBuzz')

  const social = getPlayerSocial(team.slug, player.slug)
  const summary = computeBuzzSummary(social)
  const { buzz, sentiment, delta, verdictKey, topPosts, platformCount, lastUpdatedAt } = summary

  const accentColor = POSITION_HEX[player.position] ?? BRAND.primary
  const dossierId = buildDossierId(team.slug, player.slug)
  const verdictText = t(`verdict.${verdictKey}`)

  // Signal count: total posts captured (or 0 when no chatter).
  const signalCount = social?.recentPosts?.length ?? 0
  const sourceCount = platformCount

  const hasChatter = verdictKey !== 'noChatter'

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <Paywall contentType="player_intel" scope={player.slug} previewLines={6}>
        <IntelligenceModule
          title={t('title')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          scoutVerdict={verdictText}
          signalCount={signalCount}
          sourceCount={sourceCount}
          lastUpdatedAt={lastUpdatedAt}
          accentColor={accentColor}
        >
          {!hasChatter ? (
            <div className="py-8 text-center">
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2">
                {t('noChatter')}
              </p>
              <p className="text-sm text-on-surface-variant">
                {t('subtitle')}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="flex flex-col items-center text-center">
                  <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">
                    {t('buzzLabel')}
                  </p>
                  <AnimatedNumber
                    value={buzz}
                    className="font-headline text-5xl leading-none"
                    style={{ color: accentColor }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                    {t('sentimentLabel')}
                  </p>
                  <ChemistryBar value={sentiment} showValue={true} size="md" />
                </div>
                <div className="flex flex-col items-center text-center">
                  <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">
                    {t('deltaLabel')}
                  </p>
                  <span
                    className="font-mono text-3xl font-bold flex items-baseline gap-1"
                    style={{ color: deltaColor(delta, accentColor) }}
                  >
                    <span aria-hidden="true">{deltaArrow(delta)}</span>
                    <AnimatedNumber value={Math.abs(delta)} />
                  </span>
                </div>
              </div>

              {topPosts.length > 0 && (
                <ul className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 list-none p-0">
                  {topPosts.map((post, idx) => (
                    <li
                      key={`${post.platform}-${post.date}-${idx}`}
                      className="flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              post.sentiment === 'positive'
                                ? 'primary'
                                : post.sentiment === 'negative'
                                  ? 'outline'
                                  : 'secondary'
                            }
                            size="sm"
                          >
                            {post.platform}
                          </Badge>
                          <span className="font-mono text-[11px] text-on-surface-variant">
                            {post.date}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface leading-snug truncate">
                          {post.summary}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-on-surface-variant whitespace-nowrap shrink-0">
                        {post.engagement}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
