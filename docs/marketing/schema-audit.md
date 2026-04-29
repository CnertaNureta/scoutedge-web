# Schema.org Structured Data Audit

> Source skill: `schema-markup` (esp. *Common Schema Types*, *Validation*, *Multiple Schema Types via @graph*).
>
> **Detection note** (per `seo-audit` §Schema Markup Detection Limitation): this audit is based on direct source-code inspection of `src/app/[locale]/**/page.tsx` and `src/lib/og-utils.ts`, not `web_fetch`. JSON-LD injected via `dangerouslySetInnerHTML` does ship to the static HTML output of Next.js App Router and IS visible to Google.

## 1. Coverage matrix

| Route | Schema rendered | File | Quality |
|---|---|---|---|
| `/` (homepage) | `WebSite` (+ SearchAction), `Organization` | `src/app/[locale]/page.tsx:73-74` | ✅ Good |
| `/teams` | `CollectionPage` | `src/app/[locale]/teams/page.tsx:27-33` | ✅ Good |
| `/teams/[slug]` | `SportsTeam` + `FAQPage` | `src/app/[locale]/teams/[slug]/page.tsx:63-94` | ⚠️ Partial — see §3.1 |
| `/teams/[slug]/players/[playerSlug]` | none verified | — | ❌ Missing — add `Person` |
| `/blog` | `CollectionPage` | `src/app/[locale]/blog/page.tsx:27-33` | ✅ Good |
| `/blog/[slug]` | `BlogPosting` + `FAQPage` | `src/app/[locale]/blog/[slug]/page.tsx:47-70` | ✅ Good |
| `/cities/[city]` | `breadcrumbJsonLd()` imported but render not verified; no `Place` schema | `src/app/[locale]/cities/[city]/page.tsx` | ❌ Missing `Place` / `TouristDestination` |
| `/predictions` | `breadcrumbJsonLd()` imported, render not verified | `src/app/[locale]/predictions/page.tsx` | ❌ No predictions-specific schema |
| `/matches`, `/compare/[matchup]` | `sportsEventJsonLd()` helper exists at `src/lib/og-utils.ts:113` but **no page calls it** | — | ❌ Missing — see §3.2 |
| `/schedule`, `/countdown`, `/bracket`, `/power-rankings`, `/play/*`, `/lingo/*`, `/gear/*`, `/stickers/*` | none beyond layout defaults | various | ❌ Missing |
| **Breadcrumbs visible in HTML** | none rendered | — | ❌ See `internal-linking.md` §3 |

**Helpers defined but underused** (in `src/lib/og-utils.ts`):
- `websiteJsonLd()` — line 58 — used ✅
- `organizationJsonLd()` — line 76 — used ✅
- `breadcrumbJsonLd()` — line 97 — defined, **not rendered anywhere visible**
- `sportsEventJsonLd()` — line 113 — defined, **not called anywhere**

## 2. P0 fixes (ship this week)

### 2.1 OG locale is hardcoded `'en_US'` for every locale

**Bug**: `src/lib/og-utils.ts:35` always emits `locale: 'en_US'` in `openGraph` regardless of which language the page is actually in. Facebook, LinkedIn, and other OG consumers will think your Arabic, Korean, and Farsi pages are English.

**Fix**: Accept a locale parameter and map to OG locale codes.

```ts
// src/lib/og-utils.ts

const OG_LOCALES: Record<string, string> = {
  en: 'en_US', es: 'es_ES', zh: 'zh_CN', pt: 'pt_BR', ar: 'ar_AR',
  fr: 'fr_FR', ja: 'ja_JP', ko: 'ko_KR', de: 'de_DE', it: 'it_IT',
  nl: 'nl_NL', tr: 'tr_TR', pl: 'pl_PL', id: 'id_ID', ru: 'ru_RU',
  fa: 'fa_IR', th: 'th_TH', vi: 'vi_VN', hu: 'hu_HU',
}

export interface OGMeta {
  title: string
  description: string
  url: string
  locale?: string  // <-- add
  type?: 'website' | 'article'
  // ...existing
}

export function buildOGMeta(meta: OGMeta) {
  // ...
  return {
    openGraph: {
      // ...
      locale: OG_LOCALES[meta.locale ?? 'en'] ?? 'en_US',
      // ...
    },
    // ...
  }
}
```

Then update every `buildOGMeta(...)` call site to pass the page's locale.

### 2.2 `SportsTeam` schema is too thin

Current at `src/app/[locale]/teams/[slug]/page.tsx:63-71`:

```ts
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsTeam',
  name: team.name,
  sport: 'Football',
  coach: { '@type': 'Person', name: team.coachName },
  memberOf: { '@type': 'SportsOrganization', name: 'FIFA World Cup 2026' },
  location: { '@type': 'Country', name: team.name },  // ← wrong: a team isn't a country
}
```

**Issues**:
1. `location.@type=Country` with `team.name` ("Brazil") happens to work because national teams share the country name, but it should explicitly use `Country.name` or use `addressCountry`.
2. Missing `url` (canonical URL of the team page).
3. Missing `logo` / `image`.
4. Missing `athlete` array (already loaded as `players` line 61!).
5. `memberOf` should reference FIFA, not "FIFA World Cup 2026" (an event, not an organization).

**Fix**:

```ts
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsTeam',
  name: team.name,
  alternateName: `${team.name} national football team`,
  url: `https://kickoracle.com/teams/${slug}`,
  sport: 'Association Football',
  logo: `https://kickoracle.com/team-logos/${slug}.png`,  // verify path
  image: getTeamHeroImage(slug),
  coach: { '@type': 'Person', name: team.coachName },
  memberOf: [
    { '@type': 'SportsOrganization', name: 'FIFA' },
    { '@type': 'SportsOrganization', name: team.confederation },  // e.g. 'CONMEBOL'
  ],
  athlete: players.slice(0, 23).map((p) => ({
    '@type': 'Person',
    name: p.name,
    url: `https://kickoracle.com/teams/${slug}/players/${p.slug}`,
  })),
  location: { '@type': 'Country', name: team.country ?? team.name },
}
```

### 2.3 Add `SoftwareApplication` to homepage (AI-Overview leverage)

KickOracle is a free predictive web app. `SoftwareApplication` schema makes it eligible for the "Apps" knowledge panel and helps AI-search citation for "AI football prediction tool" queries (see `keyword-strategy.md` §9).

```ts
// new helper in src/lib/og-utils.ts
export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'KickOracle',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web, iOS, Android',  // PWA
    url: 'https://kickoracle.com',
    description: 'AI-powered World Cup 2026 predictions, host city guides, and fan intelligence.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {  // OPTIONAL — only include if you have real ratings
      '@type': 'AggregateRating',
      ratingValue: '4.7',
      reviewCount: '120',
    },
  }
}
```

Render alongside `websiteJsonLd()` and `organizationJsonLd()` in `src/app/[locale]/page.tsx:73`.

> ⚠️ Do **not** include `aggregateRating` unless the ratings are real and visible on-page. Google can issue a manual action for fake ratings.

### 2.4 Render `BreadcrumbList` (helper exists, not used)

The helper at `src/lib/og-utils.ts:97-108` is correct. Implementation: render it via the new `Breadcrumbs.tsx` component — full implementation in [`internal-linking.md`](./internal-linking.md#3-implementation-breadcrumblist-rendering).

## 3. P1 fixes (next sprint)

### 3.1 `SportsEvent` for matches and `/compare/[matchup]`

`sportsEventJsonLd()` is defined at `src/lib/og-utils.ts:113` but no page renders it. Match pages (and compare pages with a scheduled fixture) should include it.

```tsx
// src/app/[locale]/compare/[matchup]/page.tsx
import { sportsEventJsonLd } from '@/lib/og-utils'

// inside the component, when `match.scheduledAt` exists:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventJsonLd({
    homeName: home.name,
    awayName: away.name,
    venue: match.venue,
    city: match.city,
    kickoffUtc: match.scheduledAt,
  })) }}
/>
```

Also extend the helper to include score (post-match), competitor URLs, and `eventStatus`:

```ts
export function sportsEventJsonLd(match: {
  homeName: string
  homeSlug: string
  awayName: string
  awaySlug: string
  venue: string
  city: string
  kickoffUtc: string
  status?: 'EventScheduled' | 'EventPostponed' | 'EventCancelled'
  homeScore?: number
  awayScore?: number
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeName} vs ${match.awayName} — FIFA World Cup 2026`,
    startDate: match.kickoffUtc,
    eventStatus: `https://schema.org/${match.status ?? 'EventScheduled'}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: match.venue,
      address: { '@type': 'PostalAddress', addressLocality: match.city, addressCountry: 'US' },  // adjust per match
    },
    competitor: [
      { '@type': 'SportsTeam', name: match.homeName, url: `https://kickoracle.com/teams/${match.homeSlug}` },
      { '@type': 'SportsTeam', name: match.awayName, url: `https://kickoracle.com/teams/${match.awaySlug}` },
    ],
    organizer: { '@type': 'Organization', name: 'FIFA', url: 'https://www.fifa.com' },
    superEvent: {
      '@type': 'SportsEvent',
      name: 'FIFA World Cup 2026',
      startDate: '2026-06-11',
      endDate: '2026-07-19',
    },
  }
}
```

### 3.2 `Person` schema on player pages

Currently no schema rendered on `/teams/[slug]/players/[playerSlug]`. Add:

```ts
const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: player.name,
  url: `https://kickoracle.com/teams/${teamSlug}/players/${player.slug}`,
  jobTitle: player.position,  // 'Forward', 'Midfielder', etc.
  nationality: { '@type': 'Country', name: team.country },
  affiliation: {
    '@type': 'SportsTeam',
    name: team.name,
    url: `https://kickoracle.com/teams/${teamSlug}`,
  },
  birthDate: player.birthDate,  // ISO 8601, only if you have it
  image: player.photoUrl,
}
```

### 3.3 `Place` / `TouristDestination` for host city pages

Currently `cities/[city]/page.tsx` imports `breadcrumbJsonLd` but no city-specific schema.

```ts
const cityJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TouristDestination',
  name: city.name,
  url: `https://kickoracle.com/cities/${city.slug}`,
  description: city.description,
  geo: { '@type': 'GeoCoordinates', latitude: city.lat, longitude: city.lng },
  containedInPlace: { '@type': 'Country', name: city.country },
  touristType: 'Football fans, World Cup 2026 attendees',
  includesAttraction: city.stadiums.map((s) => ({
    '@type': 'StadiumOrArena',
    name: s.name,
    geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
  })),
}
```

### 3.4 `DefinedTerm` on `/lingo/terms`

Lingo entries are dictionary entries — make them eligible for the dictionary rich result:

```ts
const termJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  name: term.headword,
  description: term.definition,
  inDefinedTermSet: {
    '@type': 'DefinedTermSet',
    name: 'KickOracle Football Lingo',
    url: 'https://kickoracle.com/lingo/terms',
  },
}
```

## 4. P2 / nice-to-have

| Schema | Where | Why |
|---|---|---|
| `HowTo` | Tutorial blog posts (e.g. "How to predict World Cup matches") | Step-extraction in AI search |
| `VideoObject` | Once you embed YouTube reels in posts | Video carousel eligibility |
| `Quiz` | `/play/quiz` | Quiz-result rich snippet (limited browser support today) |
| `Event` for sticker album launch / draw watchparty | Marketing pages | Eligible for Events panel |
| `Article` (instead of `BlogPosting`) on Daily Briefing | `/daily-briefing` | News-style ranking signal; pair with `news-sitemap.xml` (already exists at `src/app/news-sitemap.xml/route.ts`) |
| `BroadcastEvent` for live-tweet schedule pages | New | Niche but signals freshness |

## 5. `@graph` consolidation pattern

When a page has 3+ schema blocks (homepage, blog post, team page), combine into a single `@graph` object — fewer parser passes, cleaner output:

```tsx
// src/app/[locale]/page.tsx — after fixes
const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    websiteJsonLd(),
    organizationJsonLd(),
    softwareApplicationJsonLd(),
  ],
}
return (
  <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
    {/* ...page */}
  </>
)
```

## 6. Sitemap fix (the highest-leverage SEO change in this audit)

`src/app/sitemap.ts` emits English URLs only. Of the 19 locales configured, **18 lose all their internal URLs from the sitemap** (only the locale homepage is emitted at line 102–107). Conservative estimate: **~27,000 URLs missing**.

**Fix**: wrap the URL list in a per-locale loop. Per `seo-audit` international section, use `<xhtml:link>` alternates so each URL declares its full hreflang cluster.

```ts
// src/app/sitemap.ts (sketch)
import { SUPPORTED_LOCALES } from '@/i18n/locales'

const localizedPath = (locale: string, path: string) =>
  locale === 'en' ? `${BASE}${path}` : `${BASE}/${locale}${path}`

const buildEntry = (path: string, opts: Pick<MetadataRoute.Sitemap[number], 'changeFrequency' | 'priority'>) =>
  SUPPORTED_LOCALES.map((locale) => ({
    url: localizedPath(locale, path),
    lastModified: new Date(),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: {
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((l) => [l, localizedPath(l, path)])
          .concat([['x-default', localizedPath('en', path)]]),
      ),
    },
  }))

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...buildEntry('', { changeFrequency: 'daily', priority: 1.0 }),
    ...buildEntry('/teams', { changeFrequency: 'daily', priority: 0.95 }),
    ...buildEntry('/predictions', { changeFrequency: 'daily', priority: 0.9 }),
    // ...etc for every static page
    ...teams.flatMap((t) => buildEntry(`/teams/${t.slug}`, { changeFrequency: 'daily', priority: 0.9 })),
    // ...etc for player, group, compare, blog, lingo
  ]
}
```

> Tradeoff: this multiplies sitemap size by ~19. Once entry count exceeds 50k URLs (Google's per-sitemap limit), split via `MetadataRoute.Sitemap` *generateSitemaps* — Next.js supports this natively. Recommend splitting by section (teams, players, compare, blog, lingo) once the file hits 30k entries.

> Per `seo-audit` international SEO findings: hreflang alternates must be reciprocal (every locale points to every other in its cluster). The `Object.fromEntries` block above guarantees this.

## 7. Validation checklist

After deploying any of the above:

- [ ] Run [Google Rich Results Test](https://search.google.com/test/rich-results) on one page per pattern (homepage, team, blog, city, compare, player).
- [ ] Run [Schema.org Validator](https://validator.schema.org/) on the same set — catches schema-internal validity issues Google's tool ignores.
- [ ] Verify `dangerouslySetInnerHTML` produces valid JSON (no unescaped quotes from team/player names with apostrophes — e.g. "Côte d'Ivoire").
- [ ] In Search Console → Enhancements: monitor `FAQ`, `Sitelinks searchbox`, `Breadcrumbs`, `Product`, `Organization` reports for errors.
- [ ] Manually test the homepage in Twitter/X Card Validator and Facebook Sharing Debugger — surfaces the OG locale fix from §2.1.

## 8. Priority summary

| # | Change | Effort | Impact | Owner |
|---|---|---|---|---|
| 1 | OG locale parameter (§2.1) | S | Medium (social sharing in 18 locales) | FE |
| 2 | Localized sitemap (§6) | M | **Highest** (indexes 27,000 URLs that are currently invisible) | FE |
| 3 | Breadcrumb component + render (§2.4 + `internal-linking.md` §3) | S | High (rich snippet + UX) | FE |
| 4 | SportsTeam schema enrichment (§2.2) | S | Medium (richer team panels) | FE |
| 5 | SoftwareApplication on homepage (§2.3) | XS | Medium (AI Overview citation) | FE |
| 6 | SportsEvent on match/compare pages (§3.1) | M | High (live event rich result) | FE |
| 7 | Person schema on player pages (§3.2) | S | Medium (entity recognition) | FE |
| 8 | TouristDestination on city pages (§3.3) | S | Medium (travel intent surfacing) | FE |
| 9 | DefinedTerm on lingo (§3.4) | S | Low–medium (dictionary rich result) | FE |
| 10 | `@graph` consolidation (§5) | XS | Low (cleanliness) | FE |
