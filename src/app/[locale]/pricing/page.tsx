import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import PricingTiers from '@/components/monetization/PricingTiers'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pricingPage' })
  return {
    title: t('heading'),
    description: t('description'),
  }
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('pricingPage')

  return (
    <main className="min-h-screen">
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.04] rounded-full blur-[120px]" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-tertiary/10 border border-tertiary/20 px-3 py-1 mb-6">
            <span className="text-tertiary font-label text-[10px] font-bold uppercase tracking-[0.2em]">
              {t('badge')}
            </span>
          </div>

          <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-bold text-on-surface leading-[1.05] mb-5 tracking-tight">
            {t('heading').split(' ').slice(0, 2).join(' ')}<br className="hidden sm:block" />
            <span className="text-primary">{t('heading').split(' ').slice(2).join(' ')}</span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto leading-relaxed">
            {t('description')}
          </p>
        </div>
      </section>

      <PricingTiers />

      <section className="max-w-4xl mx-auto px-4 pb-24">
        <div className="glass-panel rounded-2xl border border-white/[0.08] p-8">
          <h2 className="font-headline text-xl font-bold text-on-surface mb-6 text-center">
            {t('includedHeading')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureBlock
              title={t('aiMatchPredictions')}
              description="Win probability, predicted scorelines, and tactical matchup analysis powered by our prediction models."
            />
            <FeatureBlock
              title={t('teamDossiers')}
              description="Squad depth, fitness tracking, tactical DNA profiles, and historical performance data for all 48 nations."
            />
            <FeatureBlock
              title={t('playerIntelligence')}
              description="Detailed player cards, form trajectory, workload monitoring, and tournament performance tracking."
            />
            <FeatureBlock
              title={t('dailyBriefing')}
              description="Narrative-first analysis delivered every morning — the signals that matter, with context that explains why."
            />
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-24">
        <h2 className="font-headline text-xl font-bold text-on-surface mb-8 text-center">
          Frequently asked
        </h2>
        <div className="space-y-4">
          <FaqItem
            question="How long do passes last?"
            answer="Match Passes give you 48 hours of access from the time of purchase. Team Passes, Tournament Pass, and Scout Pass all remain active through July 25, 2026 — the end of the World Cup final."
          />
          <FaqItem
            question="Can I upgrade later?"
            answer="Yes. Any money you've already spent on individual passes is credited toward your upgrade. Buy a few match passes, then upgrade to Tournament Pass — you only pay the difference."
          />
          <FaqItem
            question="What payment methods are accepted?"
            answer="We accept all major credit cards, Apple Pay, Google Pay, and select local payment methods through Stripe."
          />
          <FaqItem
            question="Is there a refund policy?"
            answer="Digital content purchases are non-refundable once accessed. If you haven't accessed the content, contact support within 24 hours for a full refund."
          />
        </div>
      </section>
    </main>
  )
}

function FeatureBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-primary">
          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <h3 className="text-on-surface font-bold text-sm mb-1">{title}</h3>
        <p className="text-on-surface-variant text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group glass-panel rounded-xl border border-white/[0.06] overflow-hidden">
      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-on-surface font-bold text-sm hover:bg-white/[0.02] transition-colors">
        {question}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          className="text-on-surface-variant shrink-0 ml-4 transition-transform group-open:rotate-180"
        >
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </summary>
      <div className="px-5 pb-4 text-on-surface-variant text-sm leading-relaxed">
        {answer}
      </div>
    </details>
  )
}
