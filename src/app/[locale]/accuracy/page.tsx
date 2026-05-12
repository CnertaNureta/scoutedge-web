import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import {
  buildOGMeta,
  canonical,
  articleJsonLd,
  breadcrumbJsonLd,
  jsonLdGraph,
} from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { buildFAQPageSchema } from '@/lib/seo/structured-data'
import backtest from '@/data/backtest-2024.json'

type Props = { params: Promise<{ locale: string }> }

interface ModelMetrics {
  brierScore: number
  top1Accuracy: number
  logLoss: number
  note?: string
}

interface TournamentResult {
  tournament: string
  matches: number
  kickoracle: ModelMetrics
  fivethirtyeight: ModelMetrics
  bookmakerConsensus: ModelMetrics
}

interface CalibrationPoint {
  predictedProb: number
  actualFreq: number
  sampleSize: number
}

const tournaments = backtest.tournaments as TournamentResult[]
const calibration = backtest.calibrationCurve as CalibrationPoint[]
const limitations = backtest.limitations as string[]

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'accuracyPage' })
  const alternates = buildAlternates(locale, '/accuracy')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates,
    ...buildOGMeta({
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: alternates.canonical,
      locale,
      type: 'article',
    }),
  }
}

export default async function AccuracyPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('accuracyPage')
  const geo = await getTranslations('geo')
  const url = canonical(`/${locale}/accuracy`)

  const article = articleJsonLd({
    headline: t('heading'),
    description: t('metaDescription'),
    url,
    authorName: 'KickOracle Methodology Team',
    datePublished: '2026-04-15',
    dateModified: '2026-04-15',
  })

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'KickOracle', url: canonical(`/${locale}`) },
    { name: t('badge'), url },
  ])

  const faqs = [
    { question: geo('accuracyFaqsHeading1'), answer: geo('accuracyFaqsAnswer1') },
    { question: geo('accuracyFaqsHeading2'), answer: geo('accuracyFaqsAnswer2') },
    { question: geo('accuracyFaqsHeading3'), answer: geo('accuracyFaqsAnswer3') },
    { question: geo('accuracyFaqsHeading4'), answer: geo('accuracyFaqsAnswer4') },
    { question: geo('accuracyFaqsHeading5'), answer: geo('accuracyFaqsAnswer5') },
    { question: geo('accuracyFaqsHeading6'), answer: geo('accuracyFaqsAnswer6') },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdGraph([article, breadcrumbs])),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFAQPageSchema(faqs)) }}
      />

      <main className="min-h-screen pb-24">
        <section className="relative pt-24 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-tertiary/[0.04] via-transparent to-transparent" />
          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <span className="inline-flex rounded-full bg-tertiary/10 border border-tertiary/20 px-3 py-1 mb-6 text-tertiary font-label text-[10px] font-bold uppercase tracking-[0.2em]">
              {t('badge')}
            </span>
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface leading-tight tracking-tight mb-5">
              {t('heading')}
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed">{t('intro')}</p>
            <p className="text-on-surface-variant/60 text-xs mt-4">{t('lastUpdated')}</p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 mb-16">
          <h2 className="font-headline text-xl font-bold text-on-surface uppercase tracking-tight mb-4">
            {t('tournamentTableHeading')}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant">
                    {t('colSource')}
                  </th>
                  <th className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant">
                    {t('colMatches')}
                  </th>
                  <th className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant">
                    {t('colBrier')}
                  </th>
                  <th className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant">
                    {t('colTop1')}
                  </th>
                  <th className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant">
                    {t('colLogloss')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tournaments.flatMap((tt) => [
                  <tr key={`${tt.tournament}-ko`} className="border-b border-white/[0.04] bg-primary/[0.04]">
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {tt.tournament} · <span className="text-primary font-bold">KickOracle</span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">{tt.matches}</td>
                    <td className="px-4 py-3 text-on-surface tabular-nums font-bold">
                      {tt.kickoracle.brierScore.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-on-surface tabular-nums font-bold">
                      {(tt.kickoracle.top1Accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-on-surface tabular-nums">
                      {tt.kickoracle.logLoss.toFixed(3)}
                    </td>
                  </tr>,
                  <tr key={`${tt.tournament}-538`} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3 text-on-surface-variant">
                      {tt.tournament} · FiveThirtyEight
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">{tt.matches}</td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                      {tt.fivethirtyeight.brierScore.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                      {(tt.fivethirtyeight.top1Accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                      {tt.fivethirtyeight.logLoss.toFixed(3)}
                    </td>
                  </tr>,
                  <tr key={`${tt.tournament}-bm`} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3 text-on-surface-variant">
                      {tt.tournament} · Bookmaker consensus
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">{tt.matches}</td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                      {tt.bookmakerConsensus.brierScore.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                      {(tt.bookmakerConsensus.top1Accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                      {tt.bookmakerConsensus.logLoss.toFixed(3)}
                    </td>
                  </tr>,
                ])}
              </tbody>
            </table>
          </div>
          <p className="text-on-surface-variant/70 text-xs mt-3 italic">{backtest.methodNote}</p>
        </section>

        <section className="max-w-3xl mx-auto px-4 mb-16">
          <h2 className="font-headline text-xl font-bold text-on-surface uppercase tracking-tight mb-3">
            {t('calibrationHeading')}
          </h2>
          <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
            {t('calibrationIntro')}
          </p>
          <CalibrationChart points={calibration} xLabel={t('calibrationXLabel')} yLabel={t('calibrationYLabel')} />
        </section>

        <section className="max-w-3xl mx-auto px-4 mb-16">
          <h2 className="font-headline text-xl font-bold text-on-surface uppercase tracking-tight mb-4">
            {t('limitationsHeading')}
          </h2>
          <ul className="space-y-3 text-on-surface-variant text-sm leading-relaxed list-disc pl-5">
            {limitations.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        <section id="methodology" className="max-w-3xl mx-auto px-4 mb-16">
          <h2 className="font-headline text-xl font-bold text-on-surface uppercase tracking-tight mb-2">
            {geo('methodologyHeading')}
          </h2>
          <p className="text-on-surface-variant/60 text-xs uppercase tracking-widest mb-6">
            {geo('methodologyAsOf')}
          </p>
          <div className="space-y-6">
            <div>
              <h3 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
                {geo('methodologyDataSourcesHeading')}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {geo('methodologyDataSourcesBody')}
              </p>
            </div>
            <div>
              <h3 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
                {geo('methodologyFormulaHeading')}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {geo('methodologyFormulaBody')}
              </p>
            </div>
            <div>
              <h3 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
                {geo('methodologyExclusionsHeading')}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {geo('methodologyExclusionsBody')}
              </p>
            </div>
            <div>
              <h3 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
                {geo('methodologyCadenceHeading')}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {geo('methodologyCadenceBody')}
              </p>
            </div>
            <div>
              <h3 className="font-label text-xs uppercase tracking-widest text-primary mb-3">
                {geo('methodologyGlossaryHeading')}
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="font-mono font-bold text-on-surface">
                    {geo('methodologyGlossaryPacTerm')}
                  </dt>
                  <dd className="text-on-surface-variant leading-relaxed">
                    {geo('methodologyGlossaryPacDef')}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono font-bold text-on-surface">
                    {geo('methodologyGlossaryShoTerm')}
                  </dt>
                  <dd className="text-on-surface-variant leading-relaxed">
                    {geo('methodologyGlossaryShoDef')}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono font-bold text-on-surface">
                    {geo('methodologyGlossaryPasTerm')}
                  </dt>
                  <dd className="text-on-surface-variant leading-relaxed">
                    {geo('methodologyGlossaryPasDef')}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono font-bold text-on-surface">
                    {geo('methodologyGlossaryPhyTerm')}
                  </dt>
                  <dd className="text-on-surface-variant leading-relaxed">
                    {geo('methodologyGlossaryPhyDef')}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono font-bold text-on-surface">
                    {geo('methodologyGlossaryDefTerm')}
                  </dt>
                  <dd className="text-on-surface-variant leading-relaxed">
                    {geo('methodologyGlossaryDefDef')}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono font-bold text-on-surface">
                    {geo('methodologyGlossaryOvrTerm')}
                  </dt>
                  <dd className="text-on-surface-variant leading-relaxed">
                    {geo('methodologyGlossaryOvrDef')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section id="faq" className="max-w-3xl mx-auto px-4 mb-16">
          <h2 className="font-headline text-xl font-bold text-on-surface uppercase tracking-tight mb-6">
            {geo('accuracyFaqHeading')}
          </h2>
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
        </section>

        <section className="max-w-3xl mx-auto px-4">
          <div className="glass-panel rounded-2xl border border-white/[0.08] p-8 text-center">
            <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-3">
              {t('ctaHeading')}
            </h2>
            <p className="text-on-surface-variant text-sm mb-5">{t('ctaBody')}</p>
            <Link
              href="/predictions#methodology"
              className="inline-block bg-primary text-on-primary font-label text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              {t('ctaLink')} &rarr;
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}

function CalibrationChart({
  points,
  xLabel,
  yLabel,
}: {
  points: CalibrationPoint[]
  xLabel: string
  yLabel: string
}) {
  const size = 320
  const padding = 40
  const innerSize = size - padding * 2

  function toPx(value: number) {
    return padding + value * innerSize
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Calibration curve: predicted probability vs observed frequency"
        className="w-full max-w-md mx-auto"
      >
        {[0.25, 0.5, 0.75].map((g) => (
          <g key={g}>
            <line
              x1={toPx(0)}
              x2={toPx(1)}
              y1={size - toPx(g)}
              y2={size - toPx(g)}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray="2 4"
            />
            <line
              x1={toPx(g)}
              x2={toPx(g)}
              y1={size - toPx(0)}
              y2={size - toPx(1)}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray="2 4"
            />
          </g>
        ))}
        <line
          x1={toPx(0)}
          y1={size - toPx(0)}
          x2={toPx(1)}
          y2={size - toPx(1)}
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeDasharray="4 4"
        />
        <polyline
          fill="none"
          stroke="rgb(160, 212, 148)"
          strokeWidth="2"
          points={points.map((p) => `${toPx(p.predictedProb)},${size - toPx(p.actualFreq)}`).join(' ')}
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toPx(p.predictedProb)}
            cy={size - toPx(p.actualFreq)}
            r={Math.max(2, Math.sqrt(p.sampleSize / 2))}
            fill="rgb(160, 212, 148)"
            opacity="0.85"
          />
        ))}
        <line x1={padding} y1={size - padding} x2={size - padding} y2={size - padding} stroke="currentColor" strokeOpacity="0.3" />
        <line x1={padding} y1={padding} x2={padding} y2={size - padding} stroke="currentColor" strokeOpacity="0.3" />
        <text x={size / 2} y={size - 8} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6">
          {xLabel}
        </text>
        <text
          x={12}
          y={size / 2}
          textAnchor="middle"
          fontSize="11"
          fill="currentColor"
          opacity="0.6"
          transform={`rotate(-90 12 ${size / 2})`}
        >
          {yLabel}
        </text>
      </svg>
    </div>
  )
}
