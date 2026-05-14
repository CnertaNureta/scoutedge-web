import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

export const revalidate = 86400

interface BallData {
  year: number
  name: string
  host: string
  manufacturer: string
  panels: number
  material: string
  technology: string
  description: string
  funFact: string
  winner: string
}

const WORLD_CUP_BALLS: BallData[] = [
  { year: 1970, name: 'Telstar', host: 'Mexico', manufacturer: 'Adidas', panels: 32, material: 'Leather', technology: 'First branded World Cup ball', description: 'The iconic black-and-white design was created for television visibility. Named after the Telstar communications satellite.', funFact: 'Designed specifically to be visible on black-and-white TV broadcasts.', winner: 'Brazil' },
  { year: 1974, name: 'Telstar Durlast', host: 'West Germany', manufacturer: 'Adidas', panels: 32, material: 'Leather (polyurethane coated)', technology: 'Waterproof coating', description: 'An evolution of the 1970 Telstar with improved waterproofing. Available in all-white for snowy conditions.', funFact: 'First ball with a waterproof coating to handle European weather.', winner: 'West Germany' },
  { year: 1978, name: 'Tango', host: 'Argentina', manufacturer: 'Adidas', panels: 32, material: 'Leather', technology: 'Tango design pattern', description: 'Introduced the iconic Tango pattern of 20 identical panels creating an optical illusion of 12 circles. This design influenced every World Cup ball for the next 20 years.', funFact: 'The Tango design was so popular it lasted 5 World Cups.', winner: 'Argentina' },
  { year: 1982, name: 'Tango España', host: 'Spain', manufacturer: 'Adidas', panels: 32, material: 'Leather with rubber inlaid seams', technology: 'Water-resistant seams', description: 'The last genuine leather World Cup ball. Featured rubber-sealed seams to prevent water absorption.', funFact: 'This was the last leather ball ever used in a World Cup.', winner: 'Italy' },
  { year: 1986, name: 'Azteca', host: 'Mexico', manufacturer: 'Adidas', panels: 32, material: 'Synthetic (polyurethane)', technology: 'First fully synthetic ball', description: 'The first fully synthetic World Cup ball, designed to perform at altitude and in humid conditions. Featured Aztec-inspired decorations.', funFact: 'This was the ball Maradona used for the "Hand of God" and "Goal of the Century."', winner: 'Argentina' },
  { year: 1990, name: 'Etrusco Unico', host: 'Italy', manufacturer: 'Adidas', panels: 32, material: 'Synthetic', technology: 'Neoprene inner layer', description: 'Featured Etruscan lion heads as decoration. Internal neoprene foam layer improved touch and reduced water absorption.', funFact: 'Named after the ancient Etruscan civilization of Italy.', winner: 'West Germany' },
  { year: 1994, name: 'Questra', host: 'USA', manufacturer: 'Adidas', panels: 32, material: 'Synthetic with polyurethane foam', technology: 'Energy return foam', description: 'Designed for speed and control on American artificial surfaces. Polyurethane foam layer improved energy return on shots.', funFact: 'Named from the Spanish "quest for the stars" — fitting for USA 94.', winner: 'Brazil' },
  { year: 1998, name: 'Tricolore', host: 'France', manufacturer: 'Adidas', panels: 32, material: 'Syntactic foam', technology: 'First multi-colored ball', description: 'The first World Cup ball to use multiple colors, featuring the French tricolor. Syntactic foam microspheres improved feel.', funFact: 'First World Cup ball to break from the traditional Tango design.', winner: 'France' },
  { year: 2002, name: 'Fevernova', host: 'South Korea / Japan', manufacturer: 'Adidas', panels: 32, material: 'Refined syntactic foam', technology: 'Three-layer chassis', description: 'A radical design departure with an Asian-inspired pattern. Three-layer construction improved accuracy and predictability.', funFact: 'Criticized by many goalkeepers for its unpredictable movement.', winner: 'Brazil' },
  { year: 2006, name: 'Teamgeist', host: 'Germany', manufacturer: 'Adidas', panels: 14, material: 'Thermally bonded panels', technology: 'Reduced panels, thermal bonding', description: 'Revolutionary 14-panel design with no stitches — panels were thermally bonded for a smoother, more spherical surface.', funFact: 'The first World Cup ball with fewer than 32 panels since 1970.', winner: 'Italy' },
  { year: 2010, name: 'Jabulani', host: 'South Africa', manufacturer: 'Adidas', panels: 8, material: 'Thermally bonded, textured surface', technology: 'Grip\'n\'Groove texture', description: 'The most controversial World Cup ball ever. Its 8-panel construction and smooth surface caused erratic flight paths that frustrated players.', funFact: 'Goalkeepers famously called it "terrible" and "like a beach ball."', winner: 'Spain' },
  { year: 2014, name: 'Brazuca', host: 'Brazil', manufacturer: 'Adidas', panels: 6, material: 'Polyurethane with textured surface', technology: 'Symmetrical panel design', description: 'Developed over 2.5 years with 600+ player tests. Six identical panels provided consistent flight. Widely praised as a return to quality.', funFact: 'The name was chosen by a public vote of over 1 million Brazilians.', winner: 'Germany' },
  { year: 2018, name: 'Telstar 18', host: 'Russia', manufacturer: 'Adidas', panels: 6, material: 'Textured polyurethane', technology: 'NFC chip embedded', description: 'A tribute to the original 1970 Telstar with a modern twist. First World Cup ball to contain an embedded NFC chip for smartphone interaction.', funFact: 'Each ball had a unique NFC chip that unlocked exclusive content.', winner: 'France' },
  { year: 2022, name: 'Al Rihla', host: 'Qatar', manufacturer: 'Adidas', panels: 20, material: 'Water-based ink, textured polyurethane', technology: 'Fastest ball in WC history', description: 'Designed for speed in flight, with a 20-panel design and textured surface for aerodynamic stability. Used water-based inks for sustainability.', funFact: '"Al Rihla" means "The Journey" in Arabic — and it was the fastest World Cup ball ever.', winner: 'Argentina' },
  { year: 2026, name: 'TBD', host: 'USA / Mexico / Canada', manufacturer: 'Adidas', panels: 0, material: 'TBA', technology: 'TBA', description: 'The official match ball for the 2026 FIFA World Cup across North America. Details to be revealed closer to the tournament.', funFact: 'Will be the first ball used in a 48-team World Cup format.', winner: 'TBD' },
]

const BALL_MAP = new Map(WORLD_CUP_BALLS.map((b) => [String(b.year), b]))

interface Props {
  params: Promise<{ locale: string; year: string }>
}

export function generateStaticParams() {
  return WORLD_CUP_BALLS.map((b) => ({ year: String(b.year) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, year } = await params
  const ball = BALL_MAP.get(year)
  if (!ball) return {}

  const title = `${ball.name} — ${year} World Cup Match Ball`
  const description = `The ${ball.name}: official match ball of the ${year} FIFA World Cup in ${ball.host}. ${ball.manufacturer}, ${ball.panels} panels. ${ball.description.slice(0, 100)}...`
  const alternates = buildAlternates(locale, `/gear/ball/history/${year}`)

  return {
    title,
    description,
    keywords: `${ball.name} ball, ${year} World Cup ball, ${ball.manufacturer} ${ball.name}, World Cup match ball history`,
    alternates,
    ...buildOGMeta({ title, description, url: alternates.canonical, locale }),
  }
}

export default async function BallHistoryPage({ params }: Props) {
  const { year } = await params
  const ball = BALL_MAP.get(year)
  if (!ball) notFound()

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Gear', url: 'https://kickoracle.com/gear' },
    { name: 'Match Balls', url: 'https://kickoracle.com/gear/ball' },
    { name: `${ball.name} (${year})`, url: `https://kickoracle.com/gear/ball/history/${year}` },
  ])

  const idx = WORLD_CUP_BALLS.findIndex((b) => String(b.year) === year)
  const prevBall = idx > 0 ? WORLD_CUP_BALLS[idx - 1] : null
  const nextBall = idx < WORLD_CUP_BALLS.length - 1 ? WORLD_CUP_BALLS[idx + 1] : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="primary" size="md">{ball.host} {year}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-2">
            {ball.name}
          </h1>
          <p className="text-on-surface-variant text-xl">
            {ball.manufacturer} &middot; {year} FIFA World Cup
          </p>
        </div>
      </section>

      {/* Specs */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
            <p className="font-mono text-2xl text-primary">{ball.year}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Year</p>
          </div>
          <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
            <p className="font-mono text-2xl text-tertiary">{ball.panels > 0 ? ball.panels : '—'}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Panels</p>
          </div>
          <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
            <p className="font-mono text-lg text-on-surface">{ball.manufacturer}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Maker</p>
          </div>
          <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
            <p className="font-mono text-lg text-on-surface">{ball.winner}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Winner</p>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <SectionHeader className="mb-6">About the {ball.name}</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <p className="text-on-surface leading-relaxed mb-6">{ball.description}</p>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06]">
                  <span className="text-on-surface-variant text-sm">Material</span>
                  <span className="text-on-surface font-label text-sm text-right max-w-[60%]">{ball.material}</span>
                </div>
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06]">
                  <span className="text-on-surface-variant text-sm">Technology</span>
                  <span className="text-on-surface font-label text-sm text-right max-w-[60%]">{ball.technology}</span>
                </div>
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06]">
                  <span className="text-on-surface-variant text-sm">Host Nation</span>
                  <span className="text-on-surface font-label text-sm">{ball.host}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          <div>
            <SectionHeader className="mb-6">Did You Know?</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-start gap-4">
                <span className="text-3xl shrink-0" aria-hidden="true">&#9917;</span>
                <p className="text-on-surface leading-relaxed text-lg">{ball.funFact}</p>
              </div>
            </GlassCard>

            {ball.year !== 2026 && (
              <GlassCard className="p-6 md:p-8 mt-6">
                <p className="text-xs font-label uppercase tracking-widest text-primary mb-2">Tournament Winner</p>
                <p className="font-headline text-3xl uppercase tracking-tight">{ball.winner}</p>
                <p className="text-on-surface-variant text-sm mt-1">{ball.host} {ball.year}</p>
              </GlassCard>
            )}
          </div>
        </div>
      </section>

      {/* Timeline nav */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <SectionHeader className="mb-6">Ball Timeline</SectionHeader>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {WORLD_CUP_BALLS.map((b) => (
            <Link
              key={b.year}
              href={`/gear/ball/history/${b.year}`}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-label transition-all ${
                String(b.year) === year
                  ? 'bg-primary text-on-primary font-bold'
                  : 'glass-panel border border-white/[0.08] text-on-surface-variant hover:text-on-surface hover:border-white/20'
              }`}
            >
              {b.year}
            </Link>
          ))}
        </div>
      </section>

      {/* Prev / Next */}
      <section className="max-w-[1440px] mx-auto px-6 pb-24">
        <div className="flex flex-wrap justify-center gap-4">
          {prevBall && (
            <Link
              href={`/gear/ball/history/${prevBall.year}`}
              className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
            >
              &larr; {prevBall.year} {prevBall.name}
            </Link>
          )}
          <Link
            href="/gear/ball"
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            All Match Balls
          </Link>
          {nextBall && (
            <Link
              href={`/gear/ball/history/${nextBall.year}`}
              className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
            >
              {nextBall.year} {nextBall.name} &rarr;
            </Link>
          )}
        </div>
      </section>
    </>
  )
}
