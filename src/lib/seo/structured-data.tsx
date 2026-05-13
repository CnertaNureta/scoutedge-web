/**
 * Centralized JSON-LD structured data builders for KickOracle.
 *
 * All builders return plain objects (no `@context` wrapper on inner blocks) so
 * they compose cleanly into a single `@graph` via {@link buildGraph}. Use
 * {@link renderJsonLd} from pages to emit a script tag, or call
 * `JSON.stringify(buildGraph([...]))` directly inside an existing
 * `<script type="application/ld+json">` tag.
 *
 * Conventions:
 *  - Every URL is absolute and locale-prefixed via {@link buildAlternates}.
 *  - `@id` of each entity equals its canonical page URL — this lets Google
 *    cross-reference nodes in the same graph (helps Knowledge Graph linking).
 *  - Properties absent from source data are OMITTED, never faked.
 */
import type React from 'react'
import { buildAlternates, siteUrl } from '@/lib/seo/build-alternates'
import type { HostCity } from '@/data/cities-data'
import type { MatchFixture, Player, Team, Venue } from '@/lib/types'

const BASE_URL = siteUrl()

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function canonicalFor(locale: string, path: string): string {
  return buildAlternates(locale, path).canonical
}

/**
 * Wrap a list of entity objects into a single `@graph` document with a shared
 * `@context`. Strips any per-block `@context` to keep the output clean.
 */
export function buildGraph(blocks: Array<Record<string, unknown> | null | undefined>) {
  const filtered = blocks.filter((b): b is Record<string, unknown> => Boolean(b))
  return {
    '@context': 'https://schema.org',
    '@graph': filtered.map((b) => {
      const { ['@context']: _ctx, ...rest } = b
      return rest
    }),
  }
}

/**
 * Render a JSON-LD graph (or a single block) as a `<script>` JSX element.
 * Use directly in a server component's JSX tree.
 */
export function renderJsonLd(graph: Record<string, unknown>): React.JSX.Element {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*                              Site-wide schemas                             */
/* -------------------------------------------------------------------------- */

/**
 * Organization entity for KickOracle. Establishes brand identity in Google
 * Knowledge Panel and links the social accounts already used by the marketing
 * site. The `sameAs` URLs match the Open Graph helper in `og-utils.ts`.
 */
export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'KickOracle',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/icons/icon-512.png`,
      width: 512,
      height: 512,
    },
    description:
      'AI-powered football analytics and World Cup 2026 predictions platform.',
    foundingDate: '2025',
    sameAs: [
      'https://twitter.com/KickOracle',
      'https://www.tiktok.com/@scoutedge',
      'https://www.instagram.com/scoutedge',
      'https://www.youtube.com/@scoutedge',
    ],
  }
}

/**
 * WebSite entity for the current locale's homepage. No SearchAction is
 * emitted because the codebase does not expose a `/{locale}/search` route
 * yet — adding a faked SearchAction would get the entity flagged.
 */
export function buildWebSiteSchema(locale: string) {
  const homeUrl = canonicalFor(locale, '/')
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${homeUrl}#website`,
    name: 'KickOracle',
    url: homeUrl,
    inLanguage: locale,
    description:
      'AI-powered World Cup 2026 predictions and squad analysis for all 48 teams.',
    publisher: { '@id': `${BASE_URL}/#organization` },
  }
}

/* -------------------------------------------------------------------------- */
/*                               Breadcrumbs                                  */
/* -------------------------------------------------------------------------- */

export interface BreadcrumbInput {
  name: string
  /** Path WITHOUT locale prefix, e.g. `/teams/argentina`. Pass `'/'` for home. */
  path: string
}

/**
 * BreadcrumbList wrapper that prepends the locale to every URL and produces
 * the correct `position` indexing.
 */
export function buildBreadcrumbSchema(crumbs: BreadcrumbInput[], locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: canonicalFor(locale, c.path),
    })),
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Person                                    */
/* -------------------------------------------------------------------------- */

export interface PersonSchemaOptions {
  player: Player
  team?: Pick<Team, 'slug' | 'name'>
  locale: string
  /** Optional pre-generated image URL — falls back to `player.imageUrl`/`cutoutUrl`. */
  imageUrl?: string
}

/**
 * Build a Person block for an individual player.
 */
export function buildPersonSchema({
  player,
  team,
  locale,
  imageUrl,
}: PersonSchemaOptions) {
  const playerPath = team
    ? `/teams/${team.slug}/players/${player.slug}`
    : `/players/${player.slug}`
  const playerUrl = canonicalFor(locale, playerPath)
  const image = imageUrl ?? player.imageUrl ?? player.cutoutUrl

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': playerUrl,
    url: playerUrl,
    name: player.name,
    jobTitle: `Professional Football Player (${player.position})`,
    sport: 'Soccer',
  }

  if (image) schema.image = image

  if (team) {
    const teamUrl = canonicalFor(locale, `/teams/${team.slug}`)
    schema.nationality = { '@type': 'Country', name: team.name }
    schema.memberOf = {
      '@type': 'SportsTeam',
      '@id': teamUrl,
      name: team.name,
      url: teamUrl,
    }
  }

  if (player.club) {
    schema.affiliation = { '@type': 'SportsTeam', name: player.club }
  }

  return schema
}

/* -------------------------------------------------------------------------- */
/*                                SportsTeam                                  */
/* -------------------------------------------------------------------------- */

export interface SportsTeamSchemaOptions {
  team: Team
  squad: Player[]
  locale: string
  /** Optional absolute logo/hero URL (passed through unchanged). */
  logoUrl?: string
}

/**
 * Build a SportsTeam block. Includes up to 23 squad members (matching FIFA's
 * 26-player World Cup roster cap; we use 23 to stay conservative for legacy
 * data exports that may exceed it).
 */
export function buildSportsTeamSchema({
  team,
  squad,
  locale,
  logoUrl,
}: SportsTeamSchemaOptions) {
  const teamUrl = canonicalFor(locale, `/teams/${team.slug}`)

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    '@id': teamUrl,
    url: teamUrl,
    name: team.name,
    alternateName: `${team.name} national football team`,
    sport: 'Soccer',
    memberOf: [
      { '@type': 'SportsOrganization', name: 'FIFA', url: 'https://www.fifa.com' },
      { '@type': 'SportsOrganization', name: team.confederation },
    ],
    location: { '@type': 'Country', name: team.name },
  }

  if (logoUrl) schema.logo = logoUrl
  if (team.coachName) {
    schema.coach = { '@type': 'Person', name: team.coachName }
  }

  if (squad.length > 0) {
    schema.athlete = squad.slice(0, 23).map((p) => ({
      '@type': 'Person',
      name: p.name,
      url: canonicalFor(locale, `/teams/${team.slug}/players/${p.slug}`),
      ...(p.position && { jobTitle: p.position }),
    }))
  }

  return schema
}

/* -------------------------------------------------------------------------- */
/*                                   Place                                    */
/* -------------------------------------------------------------------------- */

export interface PlaceSchemaOptions {
  city: HostCity
  venues: Venue[]
  locale: string
}

/**
 * Build a TouristAttraction block for a World Cup host city. Includes geo
 * coordinates from the first stadium (cities themselves don't carry lat/lng
 * in the data, but every host city has at least one venue with coords).
 *
 * Each stadium is nested as a `containsPlace` of type `StadiumOrArena` with
 * its `maximumAttendeeCapacity`.
 */
export function buildPlaceSchema({ city, venues, locale }: PlaceSchemaOptions) {
  const cityUrl = canonicalFor(locale, `/cities/${city.slug}`)
  const primaryVenue = venues[0]

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Place', 'TouristAttraction'],
    '@id': cityUrl,
    url: cityUrl,
    name: `${city.name} — World Cup 2026 Host City`,
    description: city.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city.name,
      addressRegion: city.state,
      addressCountry: city.countryCode,
    },
    containedInPlace: {
      '@type': 'Country',
      name: city.country,
      identifier: city.countryCode,
    },
    touristType: 'Football fans, World Cup 2026 attendees',
  }

  if (primaryVenue?.coordinates) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: primaryVenue.coordinates.lat,
      longitude: primaryVenue.coordinates.lng,
    }
  }

  if (venues.length > 0) {
    schema.containsPlace = venues.map((v) => {
      const place: Record<string, unknown> = {
        '@type': ['Place', 'StadiumOrArena'],
        name: v.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: v.city,
          addressRegion: v.state,
          addressCountry: v.countryCode,
        },
      }
      if (v.capacity) place.maximumAttendeeCapacity = v.capacity
      if (v.coordinates) {
        place.geo = {
          '@type': 'GeoCoordinates',
          latitude: v.coordinates.lat,
          longitude: v.coordinates.lng,
        }
      }
      return place
    })
  }

  return schema
}

/* -------------------------------------------------------------------------- */
/*                                SportsEvent                                 */
/* -------------------------------------------------------------------------- */

export interface SportsEventSchemaOptions {
  fixture: MatchFixture
  homeTeam?: Pick<Team, 'slug' | 'name'>
  awayTeam?: Pick<Team, 'slug' | 'name'>
  locale: string
  /** Optional explicit URL for the event page (e.g. live match permalink). */
  url?: string
  /** Optional host city country code for the venue's PostalAddress. */
  countryCode?: 'US' | 'MX' | 'CA'
}

/**
 * Build a SportsEvent block for a World Cup fixture. Used both as the per-match
 * page schema and as an `itemListElement` entry on the matches index page.
 */
export function buildSportsEventSchema({
  fixture,
  homeTeam,
  awayTeam,
  locale,
  url,
  countryCode,
}: SportsEventSchemaOptions) {
  const homeName = homeTeam?.name ?? fixture.homeTeamSlug.replace(/-/g, ' ')
  const awayName = awayTeam?.name ?? fixture.awayTeamSlug.replace(/-/g, ' ')

  const homeTeamUrl = canonicalFor(locale, `/teams/${fixture.homeTeamSlug}`)
  const awayTeamUrl = canonicalFor(locale, `/teams/${fixture.awayTeamSlug}`)

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${homeName} vs ${awayName} — FIFA World Cup 2026`,
    startDate: fixture.kickoffUtc,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: fixture.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: fixture.city,
        ...(countryCode && { addressCountry: countryCode }),
      },
    },
    homeTeam: {
      '@type': 'SportsTeam',
      '@id': homeTeamUrl,
      name: homeName,
      url: homeTeamUrl,
    },
    awayTeam: {
      '@type': 'SportsTeam',
      '@id': awayTeamUrl,
      name: awayName,
      url: awayTeamUrl,
    },
    competitor: [
      { '@type': 'SportsTeam', name: homeName, url: homeTeamUrl },
      { '@type': 'SportsTeam', name: awayName, url: awayTeamUrl },
    ],
    organizer: {
      '@type': 'SportsOrganization',
      name: 'FIFA',
      url: 'https://www.fifa.com',
    },
  }

  if (url) {
    schema['@id'] = url
    schema.url = url
  }

  return schema
}

/* -------------------------------------------------------------------------- */
/*                                  FAQPage                                   */
/* -------------------------------------------------------------------------- */

export interface FAQEntry {
  question: string
  answer: string
}

/**
 * Build a FAQPage block. AI search engines (Perplexity, Gemini, ChatGPT
 * Search, Google AI Overview) preferentially extract Q&A pairs that appear
 * in BOTH the visible DOM and a FAQPage JSON-LD block, so the same array
 * passed here should be rendered as visible H2/paragraph pairs on the page.
 */
export function buildFAQPageSchema(entries: FAQEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  }
}

/* -------------------------------------------------------------------------- */
/*                          SportsEvent ItemList                              */
/* -------------------------------------------------------------------------- */

export interface SportsEventListOptions {
  fixtures: MatchFixture[]
  teamsBySlug: Record<string, Pick<Team, 'slug' | 'name'>>
  locale: string
  /** Cap the list — Google's ItemList rich result preview shows the top entries. */
  limit?: number
}

/**
 * Build an ItemList of upcoming SportsEvents — used on the /matches index.
 * Sorts by kickoff ascending and filters to fixtures whose kickoff is in the
 * future relative to `now`.
 */
export function buildSportsEventItemList({
  fixtures,
  teamsBySlug,
  locale,
  limit = 20,
}: SportsEventListOptions) {
  const now = Date.now()
  const upcoming = fixtures
    .filter((f) => new Date(f.kickoffUtc).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime()
    )
    .slice(0, limit)

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Upcoming FIFA World Cup 2026 Matches',
    numberOfItems: upcoming.length,
    itemListElement: upcoming.map((fixture, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: buildSportsEventSchema({
        fixture,
        homeTeam: teamsBySlug[fixture.homeTeamSlug],
        awayTeam: teamsBySlug[fixture.awayTeamSlug],
        locale,
      }),
    })),
  }
}
