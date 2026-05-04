import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getAllTeams } from '@/lib/data-service'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import HeroRegistrationCta from '@/components/ui/HeroRegistrationCta'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'
import Paywall from '@/components/monetization/Paywall'
import type { Team } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'predictionsPage' })
  return {
    title: t('heading'),
    description: t('description'),
    alternates: { canonical: canonicalForLocale(locale, '/predictions') },
    ...buildOGMeta({
      title: t('heading'),
      description: t('description'),
      url: canonicalForLocale(locale, '/predictions'),
      locale,
    }),
  }
}

export const revalidate = 300

function computeWinProbability(team: Team): number {
  const rankFactor = Math.max(0, 100 - (team.fifaRanking - 1) * 1.8)
  const raw =
    rankFactor * 0.40 +
    team.chemistry * 0.30 +
    team.morale * 0.15 +
    team.stability * 0.10 +
    team.familiarity * 0.05
  return Math.round(raw * 10) / 10
}

interface PredictedTeam extends Team {
  winProbability: number
  rank: number
}

function getTierInfo(rank: number, t: (key: string) => string): { name: string; variant: 'primary' | 'tertiary' | 'secondary' | 'outline' } {
  if (rank <= 5) return { name: t('titleFavorites'), variant: 'primary' }
  if (rank <= 12) return { name: t('contenders'), variant: 'tertiary' }
  if (rank <= 24) return { name: t('darkHorses'), variant: 'secondary' }
  return { name: t('longShots'), variant: 'outline' }
}

function TeamPredictionCard({ team, t }: { team: PredictedTeam; t: (key: string) => string }) {
  const tier = getTierInfo(team.rank, t)

  return (
    <Link href={`/teams/${team.slug}`} className="block group">
      <GlassCard hover className="p-5 h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold text-on-surface-variant/50 tabular-nums w-8">
              {team.rank}
            </span>
            <span className="text-3xl">{team.flag}</span>
            <div>
              <h3 className="font-headline text-lg text-on-surface group-hover:text-primary transition-colors">
                {team.name}
              </h3>
              <span className="font-label text-xs text-on-surface-variant">
                {`${t('fifaRank')} #${team.fifaRanking}`} · {team.confederation}
              </span>
            </div>
          </div>
          <Badge variant={tier.variant}>{tier.name}</Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">{t('winProbability')}</span>
              <span className="font-mono text-sm font-bold text-primary">
                {team.winProbability.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-fixed"
                style={{ width: `${team.winProbability}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
            <div className="text-center">
              <span className="block font-mono text-sm font-bold text-on-surface">{team.chemistry}</span>
              <span className="font-label text-[10px] text-on-surface-variant uppercase">{t('chemistry')}</span>
            </div>
            <div className="text-center">
              <span className="block font-mono text-sm font-bold text-on-surface">{team.morale}</span>
              <span className="font-label text-[10px] text-on-surface-variant uppercase">{t('morale')}</span>
            </div>
            <div className="text-center">
              <span className="block font-mono text-sm font-bold text-on-surface">{team.stability}</span>
              <span className="font-label text-[10px] text-on-surface-variant uppercase">{t('stability')}</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  )
}

export default async function PredictionsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('predictionsPage')
  const teams = getAllTeams()
  const predicted: PredictedTeam[] = teams
    .map((team) => ({ ...team, winProbability: computeWinProbability(team), rank: 0 }))
    .sort((a, b) => b.winProbability - a.winProbability)
    .map((team, i) => ({ ...team, rank: i + 1 }))

  const topContenders = predicted.slice(0, 5)
  const remaining = predicted.slice(5)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'AI Predictions — World Cup 2026',
    description: 'AI-powered win probabilities for all 48 teams.',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: canonicalForLocale(locale, '/') },
        { name: 'AI Predictions', url: canonicalForLocale(locale, '/predictions') },
      ])) }} />

      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="hidden sm:block absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[160px]" aria-hidden="true" />
        <div className="hidden sm:block absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-tertiary/6 blur-[120px]" aria-hidden="true" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-container/20 border border-primary/30 font-label text-xs font-semibold tracking-widest uppercase mb-6 text-primary">
            {t('badge')}
          </span>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-wide uppercase mb-4">
            <span className="block text-on-surface">{t('heading')}</span>
          </h1>

          <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto mb-8">
            {t('description')}
          </p>

          <HeroRegistrationCta
            headline={t('ctaText')}
            cta={t('ctaButton')}
            className="justify-center mb-6"
          />

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/power-rankings" className="px-6 py-3 rounded-xl bg-surface-container-high border border-white/10 font-label text-sm font-semibold text-on-surface hover:bg-surface-container-highest hover:border-white/20 transition-all">
              {t('powerRankings')}
            </Link>
            <Link href="/bracket" className="px-6 py-3 rounded-xl bg-surface-container-high border border-white/10 font-label text-sm font-semibold text-on-surface hover:bg-surface-container-highest hover:border-white/20 transition-all">
              {t('bracketPredictor')}
            </Link>
            <Link href="/odds" className="px-6 py-3 rounded-xl bg-surface-container-high border border-white/10 font-label text-sm font-semibold text-on-surface hover:bg-surface-container-highest hover:border-white/20 transition-all">
              {t('oddsComparison')}
            </Link>
          </div>
        </div>
      </section>

      {/* Top 5 Contenders */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <h2 className="font-headline text-3xl uppercase tracking-wide text-on-surface mb-8">
          {t('topContenders')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {topContenders.map((team) => (
            <TeamPredictionCard key={team.slug} team={team} t={t} />
          ))}
        </div>
      </section>

      {/* All Teams */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <h2 className="font-headline text-3xl uppercase tracking-wide text-on-surface mb-8">
          {t('allTeams')}
        </h2>
        <Paywall contentType="prediction" previewLines={12}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {remaining.map((team) => (
              <TeamPredictionCard key={team.slug} team={team} t={t} />
            ))}
          </div>
        </Paywall>
      </section>

      {/* Premium upgrade CTA */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <GlassCard className="p-8 md:p-12 text-center border-primary/20">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 font-label text-xs font-semibold tracking-widest uppercase mb-4 text-primary">
            {t('premiumBadge')}
          </span>
          <h2 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-on-surface mb-3">
            {t('premiumHeading')}
          </h2>
          <p className="font-body text-on-surface-variant max-w-lg mx-auto mb-6 text-sm md:text-base">
            {t('premiumDescription')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="bg-primary text-on-primary font-label font-bold uppercase tracking-widest text-sm px-8 py-4 rounded-full hover:opacity-90 active:scale-95 transition-all min-h-[48px] flex items-center justify-center"
            >
              {t('premiumButton')}
            </Link>
            <Link
              href="/auth/register"
              className="border border-white/20 text-on-surface font-label font-semibold uppercase tracking-widest text-sm px-8 py-4 rounded-full hover:bg-white/[0.06] transition-colors min-h-[48px] flex items-center justify-center"
            >
              {t('startFree')}
            </Link>
          </div>
        </GlassCard>
      </section>

      {/* Methodology */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <GlassCard className="p-8">
          <h2 className="font-headline text-2xl uppercase tracking-wide text-on-surface mb-4">
            {t('methodology')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-body text-sm text-on-surface-variant">
            <div>
              <h3 className="font-label text-xs uppercase tracking-wider text-primary mb-2">{t('methodFifa')}</h3>
              <p>{t('methodFifaDesc')}</p>
            </div>
            <div>
              <h3 className="font-label text-xs uppercase tracking-wider text-primary mb-2">{t('methodChemistry')}</h3>
              <p>{t('methodChemistryDesc')}</p>
            </div>
            <div>
              <h3 className="font-label text-xs uppercase tracking-wider text-primary mb-2">{t('methodMorale')}</h3>
              <p>{t('methodMoraleDesc')}</p>
            </div>
            <div>
              <h3 className="font-label text-xs uppercase tracking-wider text-primary mb-2">{t('methodStability')}</h3>
              <p>{t('methodStabilityDesc')}</p>
            </div>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
