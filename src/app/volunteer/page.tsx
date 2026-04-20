import type { Metadata } from 'next'
import Link from 'next/link'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'

export const revalidate = 86400

const VOLUNTEER_PROGRAM = {
  description:
    'FIFA is recruiting over 30,000 volunteers across all 16 host cities for the 2026 World Cup. Volunteers play a vital role in delivering the tournament experience — from welcoming fans at airports to assisting with stadium operations.',
  deadline: 'Applications expected to open late 2025 — register on FIFA+ for notifications.',
  link: 'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026',
  requirements: [
    'Must be 18+ by June 2026',
    'Fluency in English required; Spanish and French are strong advantages',
    'Available for at least 10 days during the tournament (June 11 – July 19, 2026)',
    'Background check required for all positions',
    'Legally authorized to volunteer in the host country (USA, Canada, or Mexico)',
    'Previous event or sports volunteer experience preferred but not required',
  ],
  benefits: [
    'Official FIFA volunteer uniform and accreditation',
    'Free meals during shifts',
    'Free public transit pass for match days in your city',
    'FIFA World Cup 2026 volunteer certificate',
    'Access to volunteer celebration events',
    'Once-in-a-lifetime experience at the largest World Cup in history',
  ],
  roles: [
    { name: 'Spectator Services', description: 'Welcome fans, assist with wayfinding, answer questions at stadiums and fan zones.', commitment: '8-hour shifts on match days' },
    { name: 'Transport & Logistics', description: 'Help manage fan flows at transit hubs, airports, and parking areas near venues.', commitment: '8-hour shifts, match & travel days' },
    { name: 'Media Operations', description: 'Assist media representatives, manage press areas, support broadcast operations.', commitment: '10-hour shifts, full tournament' },
    { name: 'Protocol & Hospitality', description: 'Support VIP and hospitality areas, assist with ceremonies and official events.', commitment: '10-hour shifts on event days' },
    { name: 'Technology & IT Support', description: 'Assist with Wi-Fi, digital signage, VAR systems, and fan app troubleshooting.', commitment: '8-hour shifts + pre-tournament training' },
    { name: 'Language Services', description: 'Provide interpretation and translation for international fans and delegations.', commitment: '8-hour shifts on match days' },
  ],
  faqs: [
    { question: 'When do volunteer applications open?', answer: 'FIFA has not announced the exact date, but based on previous tournaments (Qatar 2022 opened 18 months before), applications are expected to open in late 2025. Register on FIFA+ to be notified.' },
    { question: "Can I volunteer if I'm not a US/Canada/Mexico citizen?", answer: 'You must be legally authorized to volunteer in the host country. Check with your embassy for specifics on visa requirements for volunteer activity.' },
    { question: 'Do volunteers get free tickets?', answer: 'Volunteers do not receive free match tickets, but you will be inside the stadium during matches in your assigned role.' },
    { question: 'Can I choose which city to volunteer in?', answer: 'You can indicate your preferred city during the application, but assignments are based on need. Living near your chosen city improves your chances.' },
    { question: 'Is accommodation provided?', answer: 'FIFA does not provide accommodation for volunteers. You are responsible for your own housing. Some cities may organize volunteer housing networks closer to the event.' },
    { question: 'What training is provided?', answer: 'All volunteers receive online training modules and in-person orientation sessions 2-4 weeks before the tournament begins. Role-specific training is provided for specialized positions.' },
  ],
}

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
  ...ogData,
}

const QUICK_STATS = [
  { label: 'Volunteers Needed', value: '30,000+', sub: 'across all venues' },
  { label: 'Host Cities', value: '16', sub: 'USA, Canada, Mexico' },
  { label: 'Tournament Dates', value: 'Jun 11 – Jul 19', sub: '2026' },
  { label: 'Min. Age', value: '18+', sub: 'by June 2026' },
]

export default function VolunteerPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Volunteer', url: 'https://kickoracle.com/volunteer' },
  ])

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: VOLUNTEER_PROGRAM.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/8 blur-[180px]" />
        <div className="relative z-10 max-w-[1100px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Get Involved</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            Volunteer<br /><span className="gradient-text">World Cup 2026</span>
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl max-w-3xl mx-auto">
            {VOLUNTEER_PROGRAM.description}
          </p>
        </div>
      </section>

      {/* Quick stats */}
      <section className="max-w-[1100px] mx-auto px-6 -mt-8 relative z-20 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_STATS.map((stat) => (
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
              <h2 className="font-headline text-xl uppercase tracking-tight mb-1">Application Timeline</h2>
              <p className="text-on-surface-variant text-sm mb-4">{VOLUNTEER_PROGRAM.deadline}</p>
              <a
                href={VOLUNTEER_PROGRAM.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:scale-105 transition-transform"
              >
                Register on FIFA+ →
              </a>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Requirements & Benefits */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-10">Requirements & Benefits</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Requirements</h3>
            <ul className="space-y-3">
              {VOLUNTEER_PROGRAM.requirements.map((req) => (
                <li key={req} className="flex items-start gap-2 text-on-surface-variant text-sm">
                  <span className="text-primary mt-0.5">●</span>
                  {req}
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Benefits</h3>
            <ul className="space-y-3">
              {VOLUNTEER_PROGRAM.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-on-surface-variant text-sm">
                  <span className="text-tertiary mt-0.5">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </section>

      {/* Roles */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-10">Volunteer Roles</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {VOLUNTEER_PROGRAM.roles.map((role) => (
            <GlassCard key={role.name} className="p-6" hover>
              <h3 className="font-headline text-base uppercase tracking-tight mb-2">{role.name}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-3">{role.description}</p>
              <Badge variant="outline" size="sm">{role.commitment}</Badge>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-10">Frequently Asked Questions</SectionHeader>
        <div className="space-y-4">
          {VOLUNTEER_PROGRAM.faqs.map((faq) => (
            <GlassCard key={faq.question} className="p-6 md:p-7">
              <h3 className="font-headline text-base uppercase tracking-tight mb-2">{faq.question}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{faq.answer}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1100px] mx-auto px-6 pb-20">
        <GlassCard className="p-8 md:p-12 text-center">
          <h2 className="font-headline text-3xl md:text-4xl uppercase tracking-tight mb-4">Planning Your Trip Too?</h2>
          <p className="text-on-surface-variant text-sm max-w-xl mx-auto mb-8">
            Explore travel guides, visa requirements, and budget tools for all 16 host cities.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/travel" className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform inline-block">
              Travel Guide
            </Link>
            <Link href="/cities" className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:bg-white/5 transition-colors inline-block">
              Host Cities
            </Link>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
