/**
 * Open Graph / social sharing metadata helpers.
 * Since we use static export (no Edge runtime), we generate
 * OG metadata with descriptive titles/descriptions that work
 * well without custom images. The structured data below
 * maximizes rich snippet appearance in search results.
 */

const BASE_URL = 'https://kickoracle.com'

const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  es: 'es_ES',
  zh: 'zh_CN',
  pt: 'pt_BR',
  ar: 'ar_AR',
  fr: 'fr_FR',
  ja: 'ja_JP',
  ko: 'ko_KR',
  de: 'de_DE',
  it: 'it_IT',
  nl: 'nl_NL',
  tr: 'tr_TR',
  pl: 'pl_PL',
  id: 'id_ID',
  ru: 'ru_RU',
  fa: 'fa_IR',
  th: 'th_TH',
  vi: 'vi_VN',
  hu: 'hu_HU',
}

export interface OGMeta {
  title: string
  description: string
  url: string
  /** Page locale code (e.g. 'en', 'zh', 'ar') — maps to the correct OG locale */
  locale?: string
  type?: 'website' | 'article'
  section?: string
  publishedTime?: string
  /** Absolute URL to a pre-generated OG image (1200×630) */
  image?: string
}

/** Generate consistent Open Graph metadata for any page */
export function buildOGMeta(meta: OGMeta) {
  const images = meta.image
    ? [{ url: meta.image, width: 1200, height: 630, alt: meta.title }]
    : undefined

  return {
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.url,
      siteName: 'KickOracle',
      type: meta.type ?? 'website',
      locale: OG_LOCALES[meta.locale ?? 'en'] ?? 'en_US',
      ...(images && { images }),
      ...(meta.section && { section: meta.section }),
      ...(meta.publishedTime && { publishedTime: meta.publishedTime }),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: meta.title,
      description: meta.description,
      site: '@KickOracle',
      ...(meta.image && { images: [meta.image] }),
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
    name: 'KickOracle',
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
    name: 'KickOracle',
    url: BASE_URL,
    logo: `${BASE_URL}/icons/icon-512.png`,
    description: 'AI-powered football analytics and World Cup 2026 predictions platform.',
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
 * SoftwareApplication structured data — eligible for the "Apps" knowledge panel
 * and AI-search citation for "AI football prediction tool" queries.
 */
export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'KickOracle',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web, iOS, Android',
    url: BASE_URL,
    description: 'AI-powered World Cup 2026 predictions, host city guides, and fan intelligence in 19 languages.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
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
  homeSlug?: string
  awaySlug?: string
  venue: string
  city: string
  countryCode?: 'US' | 'MX' | 'CA'
  kickoffUtc: string
  status?: 'EventScheduled' | 'EventPostponed' | 'EventCancelled' | 'EventCompleted'
  homeScore?: number
  awayScore?: number
}) {
  const event: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeName} vs ${match.awayName} — FIFA World Cup 2026`,
    startDate: match.kickoffUtc,
    eventStatus: `https://schema.org/${match.status ?? 'EventScheduled'}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: match.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: match.city,
        ...(match.countryCode && { addressCountry: match.countryCode }),
      },
    },
    competitor: [
      {
        '@type': 'SportsTeam',
        name: match.homeName,
        ...(match.homeSlug && { url: `${BASE_URL}/teams/${match.homeSlug}` }),
      },
      {
        '@type': 'SportsTeam',
        name: match.awayName,
        ...(match.awaySlug && { url: `${BASE_URL}/teams/${match.awaySlug}` }),
      },
    ],
    organizer: { '@type': 'Organization', name: 'FIFA', url: 'https://www.fifa.com' },
  }
  return event
}

export interface PersonJsonLdInput {
  name: string
  jobTitle?: string
  description?: string
  image?: string
  url?: string
  sameAs?: string[]
}

export function personJsonLd(person: PersonJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    ...(person.jobTitle && { jobTitle: person.jobTitle }),
    ...(person.description && { description: person.description }),
    ...(person.image && { image: person.image }),
    ...(person.url && { url: person.url }),
    ...(person.sameAs && { sameAs: person.sameAs }),
    worksFor: { '@type': 'Organization', name: 'KickOracle', url: BASE_URL },
  }
}

export interface ProductOfferInput {
  name: string
  description: string
  priceCents: number
  currency?: string
  url: string
  category?: string
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
}

export function productOfferJsonLd(product: ProductOfferInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    brand: { '@type': 'Brand', name: 'KickOracle' },
    ...(product.category && { category: product.category }),
    offers: {
      '@type': 'Offer',
      url: product.url,
      priceCurrency: product.currency ?? 'USD',
      price: (product.priceCents / 100).toFixed(2),
      availability: `https://schema.org/${product.availability ?? 'InStock'}`,
      seller: { '@type': 'Organization', name: 'KickOracle', url: BASE_URL },
    },
  }
}

export interface ArticleJsonLdInput {
  headline: string
  description: string
  url: string
  authorName?: string
  datePublished?: string
  dateModified?: string
  image?: string
}

export function articleJsonLd(article: ArticleJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': article.url },
    publisher: {
      '@type': 'Organization',
      name: 'KickOracle',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/icons/icon-512.png` },
    },
    ...(article.authorName && { author: { '@type': 'Person', name: article.authorName } }),
    ...(article.datePublished && { datePublished: article.datePublished }),
    ...(article.dateModified && { dateModified: article.dateModified }),
    ...(article.image && { image: article.image }),
  }
}

/**
 * Helper to consolidate multiple JSON-LD blocks into a single `@graph` script.
 * Cleaner output than rendering many <script> tags separately.
 */
export function jsonLdGraph(blocks: Record<string, unknown>[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': blocks.map((b) => {
      const { ['@context']: _ctx, ...rest } = b as Record<string, unknown>
      return rest
    }),
  }
}
