/**
 * Open Graph / social sharing metadata helpers.
 * Since we use static export (no Edge runtime), we generate
 * OG metadata with descriptive titles/descriptions that work
 * well without custom images. The structured data below
 * maximizes rich snippet appearance in search results.
 */

const BASE_URL = 'https://scoutedge.ai'

export interface OGMeta {
  title: string
  description: string
  url: string
  type?: 'website' | 'article'
  section?: string
  publishedTime?: string
}

/** Generate consistent Open Graph metadata for any page */
export function buildOGMeta(meta: OGMeta) {
  return {
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.url,
      siteName: 'ScoutEdge',
      type: meta.type ?? 'website',
      locale: 'en_US',
      ...(meta.section && { section: meta.section }),
      ...(meta.publishedTime && { publishedTime: meta.publishedTime }),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: meta.title,
      description: meta.description,
      site: '@scoutedge_ai',
    },
  }
}

/** Build canonical URL from path */
export function canonical(path: string): string {
  return `${BASE_URL}${path}`
}

/**
 * WebSite structured data for the homepage (enables sitelinks search box in Google).
 */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ScoutEdge',
    url: BASE_URL,
    description: 'AI-powered World Cup 2026 predictions and squad analysis for all 48 teams.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/teams?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Organization structured data (establishes brand entity in Google Knowledge Panel).
 */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ScoutEdge',
    url: BASE_URL,
    description: 'AI-powered football analytics and World Cup 2026 predictions platform.',
    foundingDate: '2025',
    sameAs: [],
  }
}

/**
 * BreadcrumbList structured data for improved navigation display in search results.
 */
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * SportsEvent structured data for individual matches.
 */
export function sportsEventJsonLd(match: {
  homeName: string
  awayName: string
  venue: string
  city: string
  kickoffUtc: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeName} vs ${match.awayName} — FIFA World Cup 2026`,
    startDate: match.kickoffUtc,
    location: {
      '@type': 'Place',
      name: match.venue,
      address: { '@type': 'PostalAddress', addressLocality: match.city },
    },
    competitor: [
      { '@type': 'SportsTeam', name: match.homeName },
      { '@type': 'SportsTeam', name: match.awayName },
    ],
    organizer: { '@type': 'Organization', name: 'FIFA' },
  }
}
