import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import { getCityBySlug } from '@/data/cities-data'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'

export const revalidate = 3600

interface FoodPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: FoodPageProps): Promise<Metadata> {
  const { locale, city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) return {}

  const title = `${city.name} Food Guide — Local Specialties & Tipping Etiquette`
  const description = `Where to eat in ${city.name} during World Cup 2026. Local specialty: ${city.food.localSpecialty}. Tipping: ${city.food.tipPercentage}%.`
  const alternates = buildAlternates(locale, `/cities/${slug}/food`)

  return {
    title,
    description,
    alternates,
    ...buildOGMeta({ title, description, url: alternates.canonical, locale }),
  }
}

const PRICE_LABEL: Record<string, { label: string; symbols: string }> = {
  budget: { label: 'Budget-friendly', symbols: '$' },
  moderate: { label: 'Moderate', symbols: '$$' },
  expensive: { label: 'Expensive', symbols: '$$$' },
}

export default async function CityFoodPage({ params }: FoodPageProps) {
  const { locale, city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) notFound()

  const priceInfo = PRICE_LABEL[city.food.priceLevel]
  const isMexico = city.countryCode === 'MX'
  const isCanada = city.countryCode === 'CA'

  const tippingGuide = isMexico
    ? `${city.food.tipPercentage}% is customary at restaurants. Porters and housekeeping appreciate 20–50 MXN. Most locals tip in cash.`
    : isCanada
      ? `${city.food.tipPercentage}% is standard. Most places accept CAD cards but carry some cash for tips. Many restaurants pre-set tip options (15/18/20%) on terminals.`
      : `${city.food.tipPercentage}% is standard for services. Bartenders get $1–2 per drink, baristas appreciate rounding up, and delivery drivers expect 15%.`

  const diningTips = isMexico
    ? ['Lunch (comida) is the biggest meal — 2–4 PM', 'Street tacos are safe and cheap at busy stalls', 'Drink only sealed bottled water', 'Markets (mercados) offer the most authentic local food']
    : isCanada
      ? ['Most restaurants seat until 10 PM; book ahead near venues', 'Food courts offer affordable international options', 'Tap water is safe and free everywhere', 'Breakfast diners are a great budget pick']
      : ['Reserve dinner 1–2 weeks ahead during tournament', 'Food halls offer better value than restaurant rows', 'Sales tax (varies by state) is added at the register', 'Fast-casual chains are budget-friendly and consistent']

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Cities', url: canonicalForLocale(locale, '/cities') },
    { name: city.name, url: canonicalForLocale(locale, `/cities/${slug}`) },
    { name: 'Food', url: canonicalForLocale(locale, `/cities/${slug}/food`) },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <section className="relative py-20 md:py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-[1100px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Food & Culture</Badge>
          <h1 className="font-headline text-4xl md:text-7xl tracking-wide uppercase mt-4 mb-3">
            {city.name} <span className="gradient-text">Food</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Local specialties, dining etiquette, and price expectations for World Cup 2026 visitors.
          </p>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 -mt-4 mb-12 relative z-20">
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-3xl text-primary">{priceInfo.symbols}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">{priceInfo.label}</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-3xl text-tertiary">{city.food.tipPercentage}%</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Standard Tip</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-3xl text-on-surface">{city.currency.split(' ')[0]}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Currency</p>
          </GlassCard>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-6">Must-Try Local Specialties</SectionHeader>
        <GlassCard className="p-6 md:p-8">
          <p className="text-on-surface-variant leading-relaxed">{city.food.localSpecialty}</p>
        </GlassCard>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Tipping Guide</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">{tippingGuide}</p>
          </GlassCard>
          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Dining Tips</h3>
            <ul className="space-y-2">
              {diningTips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-on-surface-variant text-sm">
                  <span className="text-primary mt-0.5">●</span>
                  {tip}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 pb-20">
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href={`/cities/${city.slug}`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">City Overview</Link>
          <Link href={`/cities/${city.slug}/costs`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">Costs</Link>
          <Link href={`/cities/${city.slug}/stadium`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">Stadium</Link>
          <Link href={`/cities/${city.slug}/transport`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">Transport</Link>
        </div>
      </section>
    </>
  )
}
