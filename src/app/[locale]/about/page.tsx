import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import {
  buildOGMeta,
  canonical,
  personJsonLd,
  breadcrumbJsonLd,
  jsonLdGraph,
} from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { buildFAQPageSchema } from '@/lib/seo/structured-data'
import NewsletterSignup from '@/components/monetization/NewsletterSignup'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'aboutPage' })
  const alternates = buildAlternates(locale, '/about')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates,
    ...buildOGMeta({
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: alternates.canonical,
      locale,
    }),
  }
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('aboutPage')
  const geo = await getTranslations('geo')

  const founderPerson = personJsonLd({
    name: t('founderName'),
    jobTitle: t('founderRole'),
    description: t('founderBio'),
    url: canonical(`/${locale}/about`),
  })

  const analystPerson = personJsonLd({
    name: t('analystName'),
    jobTitle: t('analystRole'),
    description: t('analystBio'),
    url: canonical(`/${locale}/about`),
  })

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'KickOracle', url: canonical(`/${locale}`) },
    { name: t('badge'), url: canonical(`/${locale}/about`) },
  ])

  const faqs = [
    { question: geo('aboutFaqsHeading1'), answer: geo('aboutFaqsAnswer1') },
    { question: geo('aboutFaqsHeading2'), answer: geo('aboutFaqsAnswer2') },
    { question: geo('aboutFaqsHeading3'), answer: geo('aboutFaqsAnswer3') },
    { question: geo('aboutFaqsHeading4'), answer: geo('aboutFaqsAnswer4') },
    { question: geo('aboutFaqsHeading5'), answer: geo('aboutFaqsAnswer5') },
  ]

  const faqSchema = buildFAQPageSchema(faqs)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdGraph([founderPerson, analystPerson, breadcrumbs])),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="min-h-screen">
        <section className="relative pt-24 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <span className="inline-flex rounded-full bg-tertiary/10 border border-tertiary/20 px-3 py-1 mb-6 text-tertiary font-label text-[10px] font-bold uppercase tracking-[0.2em]">
              {t('badge')}
            </span>
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface leading-tight tracking-tight mb-6">
              {t('heading')}
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed">{t('intro')}</p>
          </div>
        </section>

        <Section heading={t('missionHeading')}>
          <p className="text-on-surface-variant text-base leading-relaxed">{t('missionBody')}</p>
        </Section>

        <Section heading={t('founderHeading')}>
          <PersonCard
            name={t('founderName')}
            role={t('founderRole')}
            bio={t('founderBio')}
            imageSrc="/about/founder.jpg"
          />
        </Section>

        <Section heading={t('analystHeading')}>
          <PersonCard
            name={t('analystName')}
            role={t('analystRole')}
            bio={t('analystBio')}
            imageSrc="/about/analyst.jpg"
          />
        </Section>

        <Section heading={t('valuesHeading')}>
          <ValuesGrid />
        </Section>

        <Section heading={t('contactHeading')}>
          <ContactBody />
        </Section>

        <Section heading={geo('methodologyHeading')}>
          <MethodologyBlock />
        </Section>

        <Section heading={geo('aboutFaqHeading')}>
          <div className="space-y-5">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
              >
                <h2 className="font-headline text-base md:text-lg text-on-surface mb-2">
                  {faq.question}
                </h2>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </Section>

        <section className="max-w-3xl mx-auto px-4 pb-24">
          <div className="glass-panel rounded-2xl border border-white/[0.08] p-8 md:p-12 text-center">
            <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-3">
              {t('ctaHeading')}
            </h2>
            <p className="text-on-surface-variant text-sm mb-6">{t('ctaBody')}</p>
            <NewsletterSignup variant="inline" source="article" />
            <Link
              href="/predictions"
              className="inline-block mt-6 text-primary font-label text-xs font-bold uppercase tracking-widest hover:underline"
            >
              {t('ctaButton')} &rarr;
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="max-w-3xl mx-auto px-4 mb-12">
      <h2 className="font-headline text-xl font-bold text-on-surface uppercase tracking-tight mb-4">
        {heading}
      </h2>
      {children}
    </section>
  )
}

function PersonCard({
  name,
  role,
  bio,
  imageSrc,
}: {
  name: string
  role: string
  bio: string
  imageSrc: string
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-5 glass-panel rounded-2xl border border-white/[0.06] p-6">
      <div
        className="shrink-0 w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/10 border border-white/10 flex items-center justify-center text-2xl font-bold text-on-surface"
        style={{
          backgroundImage: `url(${imageSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      >
        {!imageSrc.includes('.') && name.charAt(0)}
      </div>
      <div>
        <p className="font-headline text-lg font-bold text-on-surface">{name}</p>
        <p className="text-secondary font-label text-xs uppercase tracking-widest mb-2">{role}</p>
        <p className="text-on-surface-variant text-sm leading-relaxed">{bio}</p>
      </div>
    </div>
  )
}

function ValuesGrid() {
  const t = useTranslations('aboutPage')
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
        <p className="font-label text-xs font-bold uppercase tracking-widest text-primary mb-3">
          {t('willTitle')}
        </p>
        <ul className="space-y-2 text-on-surface-variant text-sm leading-relaxed">
          <li>• {t('willList1')}</li>
          <li>• {t('willList2')}</li>
          <li>• {t('willList3')}</li>
          <li>• {t('willList4')}</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
          {t('wontTitle')}
        </p>
        <ul className="space-y-2 text-on-surface-variant text-sm leading-relaxed">
          <li>· {t('wontList1')}</li>
          <li>· {t('wontList2')}</li>
          <li>· {t('wontList3')}</li>
          <li>· {t('wontList4')}</li>
        </ul>
      </div>
    </div>
  )
}

function ContactBody() {
  const t = useTranslations('aboutPage')
  return (
    <p className="text-on-surface-variant text-sm leading-relaxed">
      {t.rich('contactBody', {
        link: (chunks) => (
          <a
            href="mailto:hello@kickoracle.com"
            className="text-primary hover:underline font-medium"
          >
            {chunks}
          </a>
        ),
      })}
    </p>
  )
}

function MethodologyBlock() {
  const t = useTranslations('geo')
  return (
    <div className="space-y-6">
      <p className="text-on-surface-variant/60 text-xs uppercase tracking-widest">
        {t('methodologyAsOf')}
      </p>
      <div>
        <h3 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
          {t('methodologyDataSourcesHeading')}
        </h3>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          {t('methodologyDataSourcesBody')}
        </p>
      </div>
      <div>
        <h3 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
          {t('methodologyFormulaHeading')}
        </h3>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          {t('methodologyFormulaBody')}
        </p>
      </div>
      <div>
        <h3 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
          {t('methodologyExclusionsHeading')}
        </h3>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          {t('methodologyExclusionsBody')}
        </p>
      </div>
      <div>
        <h3 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
          {t('methodologyCadenceHeading')}
        </h3>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          {t('methodologyCadenceBody')}
        </p>
      </div>
      <div>
        <h3 className="font-label text-xs uppercase tracking-widest text-primary mb-3">
          {t('methodologyGlossaryHeading')}
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="font-mono font-bold text-on-surface">{t('methodologyGlossaryPacTerm')}</dt>
            <dd className="text-on-surface-variant leading-relaxed">{t('methodologyGlossaryPacDef')}</dd>
          </div>
          <div>
            <dt className="font-mono font-bold text-on-surface">{t('methodologyGlossaryShoTerm')}</dt>
            <dd className="text-on-surface-variant leading-relaxed">{t('methodologyGlossaryShoDef')}</dd>
          </div>
          <div>
            <dt className="font-mono font-bold text-on-surface">{t('methodologyGlossaryPasTerm')}</dt>
            <dd className="text-on-surface-variant leading-relaxed">{t('methodologyGlossaryPasDef')}</dd>
          </div>
          <div>
            <dt className="font-mono font-bold text-on-surface">{t('methodologyGlossaryPhyTerm')}</dt>
            <dd className="text-on-surface-variant leading-relaxed">{t('methodologyGlossaryPhyDef')}</dd>
          </div>
          <div>
            <dt className="font-mono font-bold text-on-surface">{t('methodologyGlossaryDefTerm')}</dt>
            <dd className="text-on-surface-variant leading-relaxed">{t('methodologyGlossaryDefDef')}</dd>
          </div>
          <div>
            <dt className="font-mono font-bold text-on-surface">{t('methodologyGlossaryOvrTerm')}</dt>
            <dd className="text-on-surface-variant leading-relaxed">{t('methodologyGlossaryOvrDef')}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
