import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { Link } from '@/i18n/navigation'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'

export const revalidate = 86400

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const alternates = buildAlternates(locale, '/travel/visa')

  return {
    title: 'World Cup 2026 Visa Requirements — USA, Canada & Mexico Entry Guide',
    description:
      'Complete visa guide for World Cup 2026 travelers. ESTA for USA, eTA for Canada, FMM for Mexico. Requirements by nationality, processing times, and tips.',
    keywords:
      'World Cup 2026 visa, USA visa World Cup, Canada eTA, Mexico FMM, ESTA World Cup 2026, travel requirements',
    alternates,
    ...buildOGMeta({
      title: 'World Cup 2026 Visa Requirements',
      description: 'Entry requirements for the USA, Canada, and Mexico.',
      url: alternates.canonical,
      locale,
    }),
  }
}

interface VisaCategory {
  title: string
  description: string
  processingTime: string
  cost: string
  validity: string
  requirements: string[]
  tips: string[]
}

const USA_VISA: VisaCategory[] = [
  {
    title: 'ESTA (Visa Waiver Program)',
    description: 'Citizens of 41 VWP countries can apply for an ESTA online. Covers tourism stays up to 90 days.',
    processingTime: 'Usually instant — up to 72 hours',
    cost: '$21 USD',
    validity: '2 years or until passport expires',
    requirements: [
      'Valid passport from a VWP country (e.g., UK, Japan, Australia, most EU countries)',
      'Return or onward ticket',
      'No previous visa denials or overstays',
      'No travel to certain restricted countries since 2011',
    ],
    tips: [
      'Apply at least 72 hours before travel',
      'ESTA is valid for multiple entries within 2 years',
      'If denied, you must apply for a B1/B2 visa instead',
    ],
  },
  {
    title: 'B1/B2 Tourist Visa',
    description: 'Required for citizens of countries not in the Visa Waiver Program. Involves an embassy interview.',
    processingTime: 'Weeks to months — book early',
    cost: '$185 USD (non-refundable application fee)',
    validity: 'Typically 10 years, multiple entry',
    requirements: [
      'Valid passport with at least 6 months validity',
      'DS-160 online application form',
      'Embassy/consulate interview appointment',
      'Proof of ties to home country (employment, property, family)',
      'Proof of sufficient funds for travel',
      'Match tickets or tournament itinerary (recommended)',
    ],
    tips: [
      'Book your interview NOW — World Cup demand will create long waits',
      'Bring match tickets and hotel reservations to your interview',
      'Demonstrate strong ties to your home country',
      'Financial statements showing you can cover trip expenses',
    ],
  },
]

const CANADA_VISA: VisaCategory[] = [
  {
    title: 'eTA (Electronic Travel Authorization)',
    description: 'Citizens of visa-exempt countries (most EU, Australia, Japan, etc.) need an eTA to fly to Canada.',
    processingTime: 'Usually minutes — up to 72 hours',
    cost: 'CAD $7',
    validity: '5 years or until passport expires',
    requirements: [
      'Valid passport from a visa-exempt country',
      'Email address for confirmation',
      'Credit or debit card for payment',
    ],
    tips: [
      'US citizens and permanent residents do not need an eTA',
      'If entering Canada by land, eTA is not required',
      'Apply online at the official Government of Canada website',
    ],
  },
  {
    title: 'Visitor Visa (Temporary Resident Visa)',
    description: 'Required for citizens of countries that are not visa-exempt. Involves an online or paper application.',
    processingTime: 'Varies — weeks to months depending on country',
    cost: 'CAD $100 (application fee)',
    validity: 'Up to 10 years or passport expiry',
    requirements: [
      'Valid passport',
      'Completed application form (online or paper)',
      'Two passport-sized photos',
      'Proof of financial support',
      'Travel itinerary and purpose of visit',
      'Biometrics (fingerprints and photo) at a VAC',
    ],
    tips: [
      'Apply as early as possible — processing times vary by country',
      'Include World Cup tickets and accommodation proof',
      'Some nationalities may need a medical exam',
    ],
  },
]

const MEXICO_VISA: VisaCategory[] = [
  {
    title: 'Visa-Free Entry',
    description: 'Citizens of 65+ countries can enter Mexico visa-free for up to 180 days. An FMM tourist permit is issued on arrival.',
    processingTime: 'Issued at port of entry',
    cost: 'Included in airline ticket (air arrivals) or ~$38 USD (land arrivals)',
    validity: 'Up to 180 days',
    requirements: [
      'Valid passport with at least 6 months validity',
      'FMM (Forma Migratoria Múltiple) — filled out on arrival or online beforehand',
      'Proof of accommodation and return ticket (may be requested)',
    ],
    tips: [
      'Keep your FMM safe — you need it to exit Mexico',
      'You can fill out the FMM online before traveling (INM website)',
      'Citizens with valid US, Canada, Japan, UK, or Schengen visas may also enter visa-free',
    ],
  },
  {
    title: 'Tourist Visa',
    description: 'Required for citizens of countries not in Mexico\'s visa-free list.',
    processingTime: '2–10 business days',
    cost: 'Varies — typically $36–$44 USD',
    validity: 'Up to 180 days, single or multiple entry',
    requirements: [
      'Valid passport',
      'Completed visa application form',
      'Passport photo',
      'Proof of economic solvency (bank statements)',
      'Hotel reservations and travel itinerary',
      'Proof of employment or study',
    ],
    tips: [
      'Apply at your nearest Mexican consulate',
      'World Cup ticket proof strengthens your application',
      'Check if you qualify for visa-free entry through another visa (US/Canada/Schengen)',
    ],
  },
]

function CountrySection({
  country,
  flag,
  categories,
  bgAccent,
}: {
  country: string
  flag: string
  categories: VisaCategory[]
  bgAccent: string
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{flag}</span>
        <h2 className="font-headline text-3xl uppercase tracking-wide text-on-surface">{country}</h2>
      </div>

      {categories.map((cat) => (
        <GlassCard key={cat.title} className={`p-6 md:p-8 border-l-4 ${bgAccent}`}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h3 className="font-headline text-xl text-on-surface">{cat.title}</h3>
          </div>
          <p className="font-body text-on-surface-variant mb-6">{cat.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/[0.03] rounded-xl p-4">
              <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant block mb-1">Processing</span>
              <span className="font-mono text-sm text-on-surface">{cat.processingTime}</span>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4">
              <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant block mb-1">Cost</span>
              <span className="font-mono text-sm text-on-surface">{cat.cost}</span>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4">
              <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant block mb-1">Validity</span>
              <span className="font-mono text-sm text-on-surface">{cat.validity}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-label text-xs uppercase tracking-wider text-primary mb-3">Requirements</h4>
              <ul className="space-y-2">
                {cat.requirements.map((req) => (
                  <li key={req} className="flex items-start gap-2 font-body text-sm text-on-surface-variant">
                    <span className="text-primary mt-0.5">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-label text-xs uppercase tracking-wider text-tertiary mb-3">Tips</h4>
              <ul className="space-y-2">
                {cat.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 font-body text-sm text-on-surface-variant">
                    <span className="text-tertiary mt-0.5">★</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

export default function VisaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: 'https://kickoracle.com' },
        { name: 'Travel', url: 'https://kickoracle.com/travel' },
        { name: 'Visa Guide', url: 'https://kickoracle.com/travel/visa' },
      ])) }} />

      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[140px] animate-float" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-primary/6 blur-[120px] animate-float" style={{ animationDelay: '3s' }} />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary">Travel Essentials</Badge>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,6rem)] leading-[0.9] tracking-wide uppercase mt-4 mb-4">
            <span className="block text-on-surface">Visa</span>
            <span className="block text-tertiary">Guide</span>
          </h1>

          <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto mb-8">
            Entry requirements for the USA, Canada, and Mexico. The 2026 World Cup spans three countries —
            check what you need before booking flights.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/cities" className="px-5 py-2.5 rounded-xl bg-surface-container-high border border-white/10 font-label text-sm text-on-surface hover:border-white/20 transition-all">
              Host Cities
            </Link>
            <Link href="/travel/budget-calculator" className="px-5 py-2.5 rounded-xl bg-surface-container-high border border-white/10 font-label text-sm text-on-surface hover:border-white/20 transition-all">
              Budget Calculator
            </Link>
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="max-w-[1440px] mx-auto px-6 pb-8">
        <GlassCard className="p-5 border-l-4 border-l-tertiary">
          <p className="font-body text-sm text-on-surface-variant">
            <strong className="text-tertiary">Important:</strong> Visa requirements can change. Always verify current requirements
            with the official embassy or consulate of each country before traveling. Information below is general guidance for
            World Cup 2026 travelers and may not cover every nationality.
          </p>
        </GlassCard>
      </section>

      {/* Three Countries */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20 space-y-16">
        <CountrySection country="United States" flag="🇺🇸" categories={USA_VISA} bgAccent="border-l-primary" />
        <CountrySection country="Mexico" flag="🇲🇽" categories={MEXICO_VISA} bgAccent="border-l-secondary" />
        <CountrySection country="Canada" flag="🇨🇦" categories={CANADA_VISA} bgAccent="border-l-tertiary" />
      </section>

      {/* Multi-Country Tips */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <GlassCard className="p-8">
          <h2 className="font-headline text-2xl uppercase tracking-wide text-on-surface mb-6">
            Traveling Between Host Countries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-body text-sm text-on-surface-variant">
            <div>
              <h3 className="font-label text-xs uppercase tracking-wider text-primary mb-2">Multi-Country Travel</h3>
              <p className="mb-3">
                If attending matches in multiple countries, ensure you have valid entry documents for each.
                US, Mexico, and Canada have separate visa systems.
              </p>
              <p>
                Some travelers may qualify for visa-free entry to Mexico if they hold a valid US, Canadian,
                Japanese, UK, or Schengen visa — even if their nationality normally requires a Mexican visa.
              </p>
            </div>
            <div>
              <h3 className="font-label text-xs uppercase tracking-wider text-primary mb-2">Key Dates</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Start applying now</strong> — embassy wait times increase closer to the tournament</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Tournament dates: <strong>June 11 — July 19, 2026</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Allow extra passport validity beyond your travel dates (6 months recommended)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Keep digital and printed copies of all travel documents</span>
                </li>
              </ul>
            </div>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
