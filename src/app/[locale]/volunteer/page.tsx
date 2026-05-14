import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'

export const revalidate = 86400

const FIFA_LINK = 'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026'

const REQUIREMENT_KEYS = ['requirement1', 'requirement2', 'requirement3', 'requirement4', 'requirement5', 'requirement6'] as const
const BENEFIT_KEYS = ['benefit1', 'benefit2', 'benefit3', 'benefit4', 'benefit5', 'benefit6'] as const

const ROLE_KEYS = [
  { name: 'spectatorName', description: 'spectatorDescription', commitment: 'spectatorCommitment' },
  { name: 'transportName', description: 'transportDescription', commitment: 'transportCommitment' },
  { name: 'mediaName', description: 'mediaDescription', commitment: 'mediaCommitment' },
  { name: 'protocolName', description: 'protocolDescription', commitment: 'protocolCommitment' },
  { name: 'techName', description: 'techDescription', commitment: 'techCommitment' },
  { name: 'languageName', description: 'languageDescription', commitment: 'languageCommitment' },
] as const

const FAQ_KEYS = [
  { question: 'q1', answer: 'a1' },
  { question: 'q2', answer: 'a2' },
  { question: 'q3', answer: 'a3' },
  { question: 'q4', answer: 'a4' },
  { question: 'q5', answer: 'a5' },
  { question: 'q6', answer: 'a6' },
] as const

const ogData = buildOGMeta({
  title: 'World Cup 2026 Volunteer Guide — How to Apply',
  description:
    'Complete guide to volunteering at the 2026 FIFA World Cup. Requirements, benefits, roles, and how to apply for one of 30,000 volunteer positions across 16 host cities.',
  url: 'https://kickoracle.com/volunteer',
})

export const metadata: Metadata = {
  title: 'World Cup 2026 Volunteer Guide — How to Apply',
  description:
    'Complete guide to volunteering at the 2026 FIFA World Cup. Requirements, benefits, roles, and how to apply across 16 host cities.',
  keywords: 'World Cup 2026 volunteer, FIFA volunteer 2026, volunteer roles, volunteer requirements',
  alternates: { canonical: 'https://kickoracle.com/volunteer' },
  robots: { index: false, follow: true },
  ...ogData,
}

export default async function VolunteerPage() {
  const t = await getTranslations('volunteerPage')

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Volunteer', url: 'https://kickoracle.com/volunteer' },
  ])

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_KEYS.map((faq) => ({
      '@type': 'Question',
      name: t(`faq.${faq.question}`),
      acceptedAnswer: { '@type': 'Answer', text: t(`faq.${faq.answer}`) },
    })),
  }

  const quickStats = [
    { label: t('stats.volunteersNeeded'), value: '30,000+', sub: t('stats.volunteersSub') },
    { label: t('stats.hostCities'), value: '16', sub: t('stats.hostCitiesSub') },
    { label: t('stats.tournamentDates'), value: t('stats.tournamentDatesValue'), sub: t('stats.tournamentDatesSub') },
    { label: t('stats.minAge'), value: t('stats.minAgeValue'), sub: t('stats.minAgeSub') },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/8 blur-[180px]" />
        <div className="relative z-10 max-w-[1100px] mx-auto text-center">
          <Badge variant="tertiary" size="md">{t('heroBadge')}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            {t('heroTitle1')}<br /><span className="gradient-text">{t('heroTitle2')}</span>
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl max-w-3xl mx-auto">
            {t('description')}
          </p>
        </div>
      </section>

      {/* Quick stats */}
      <section className="max-w-[1100px] mx-auto px-6 -mt-8 relative z-20 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat) => (
            <GlassCard key={stat.label} className="p-5 text-center">
              <p className="font-mono text-2xl md:text-3xl text-primary font-bold">{stat.value}</p>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">{stat.label}</p>
              <p className="text-on-surface-variant text-xs mt-1">{stat.sub}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Deadline banner */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <GlassCard className="p-6 md:p-8">
          <div className="flex items-start gap-4">
            <span className="text-4xl">📅</span>
            <div className="flex-1">
              <h2 className="font-headline text-xl uppercase tracking-tight mb-1">{t('applicationTimeline')}</h2>
              <p className="text-on-surface-variant text-sm mb-4">{t('deadline')}</p>
              <a
                href={FIFA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:scale-105 transition-transform"
              >
                {t('registerCta')}
              </a>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Requirements & Benefits */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-10">{t('requirementsAndBenefits')}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-lg uppercase tracking-tight mb-4">{t('requirements')}</h3>
            <ul className="space-y-3">
              {REQUIREMENT_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2 text-on-surface-variant text-sm">
                  <span className="text-primary mt-0.5">●</span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-lg uppercase tracking-tight mb-4">{t('benefits')}</h3>
            <ul className="space-y-3">
              {BENEFIT_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2 text-on-surface-variant text-sm">
                  <span className="text-tertiary mt-0.5">✓</span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </section>

      {/* Roles */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-10">{t('rolesHeading')}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROLE_KEYS.map((role) => (
            <GlassCard key={role.name} className="p-6" hover>
              <h3 className="font-headline text-base uppercase tracking-tight mb-2">{t(`roles.${role.name}`)}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-3">{t(`roles.${role.description}`)}</p>
              <Badge variant="outline" size="sm">{t(`roles.${role.commitment}`)}</Badge>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-10">{t('faqHeading')}</SectionHeader>
        <div className="space-y-4">
          {FAQ_KEYS.map((faq) => (
            <GlassCard key={faq.question} className="p-6 md:p-7">
              <h3 className="font-headline text-base uppercase tracking-tight mb-2">{t(`faq.${faq.question}`)}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{t(`faq.${faq.answer}`)}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1100px] mx-auto px-6 pb-20">
        <GlassCard className="p-8 md:p-12 text-center">
          <h2 className="font-headline text-3xl md:text-4xl uppercase tracking-tight mb-4">{t('ctaHeading')}</h2>
          <p className="text-on-surface-variant text-sm max-w-xl mx-auto mb-8">
            {t('ctaDescription')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/travel" className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform inline-block">
              {t('travelGuide')}
            </Link>
            <Link href="/cities" className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:bg-white/5 transition-colors inline-block">
              {t('hostCities')}
            </Link>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
