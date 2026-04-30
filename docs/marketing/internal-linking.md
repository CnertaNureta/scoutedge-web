# Internal Linking Plan

> Source skill: `site-architecture` (esp. *Internal Linking Strategy* + *Hub-and-Spoke Model*).

## 1. Current state

Findings from a code audit of `src/app/[locale]/`, `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, and the schema helpers in `src/lib/og-utils.ts`.

| Layer | Status |
|---|---|
| Header navigation (8 dropdowns covering Predictions, Teams, Cities/Travel, Tournament, Play, Pricing, Fan Zone, Lingo) | ✅ Comprehensive |
| Footer (6 columns mirroring header + newsletter CTA) | ✅ Comprehensive |
| Mobile bottom nav (Home / Predict / Teams / Cities / Menu) | ✅ Good IA |
| Visible breadcrumbs on any page | ❌ **Missing** |
| `BreadcrumbList` JSON-LD rendered | ❌ Helper exists in `src/lib/og-utils.ts:97` but not used in layouts |
| "Related teams" / "Related cities" / "Related matches" components | ❌ Only blog has 3 related posts (`src/app/[locale]/blog/[slug]/page.tsx:44`) |
| Cross-section linking (team → host city, city → team, compare → team) | ❌ Almost none |
| Hreflang / language switcher (in `Header.tsx:118` `LanguageSwitcher`) | ✅ Present |
| Sitemap coverage | ⚠️ English URLs only (see schema-audit §6) |

## 2. Hub-and-spoke architecture (target state)

Per `site-architecture` *Hub-and-Spoke Model*. Four hubs anchor the site. Every spoke must link back to its hub *and* sideways to peer spokes.

### Hub 1 — Predictions

```
/predictions (HUB)
├── /power-rankings ← linked from hub + every team page sidebar
├── /bracket ← linked from hub + tournament hub
├── /compare ← linked from hub + every team page
│   └── /compare/[matchup] (1,128) ← link to BOTH team pages + back to /compare
└── /predict ← linked from hub + bottom of every blog post
```

### Hub 2 — Teams

```
/teams (HUB — CollectionPage schema already present)
├── /teams/[slug] (48) ← link to:
│   ├── Group page (/groups/[group]) — "see Group X standings"
│   ├── Host cities they play in — "where they play" widget
│   ├── Compare page vs. group rivals — auto-generate 3 cards
│   ├── /lingo/players/[slug] for star players — "how to pronounce"
│   ├── /teams/[slug]/players/[playerSlug] — already linked from squad
│   └── /teams/[slug]/qualified — surface in hero
└── /groups/[group] (12) ← link to all 4 teams in group + group preview blog post
```

### Hub 3 — Cities & Travel

```
/cities (HUB)
├── /cities/[city] (16) ← link to:
│   ├── Stadium page — /stadiums/[stadium]
│   ├── Teams playing there — query matches by venue
│   ├── /travel/from/[country] for top 5 visitor origins
│   ├── /travel/visa, /travel/budget-calculator, /travel/tickets
│   └── Subpages: /schedule, /stadium, /hotels, /costs, /food, /transport, /tickets
└── /travel ← link to all city guides + travel sub-tools
```

### Hub 4 — Fan culture (Lingo + Gear + Stickers)

```
/lingo, /gear, /stickers ← orphan-prone today
├── /lingo/countries/[slug] ← cross-link from /teams/[slug]
├── /lingo/players/[slug] ← cross-link from player pages
├── /gear/jerseys/[team] ← cross-link from /teams/[slug]
└── /stickers ← link from sticker-related blog posts; cross-link to /gear
```

## 3. Implementation: BreadcrumbList rendering

The helper `breadcrumbJsonLd()` at `src/lib/og-utils.ts:97-108` is already correctly implemented. It just isn't called anywhere it's needed *and* there's no visible breadcrumb UI to match the schema (Google flags "schema-content mismatch" if you have one without the other).

### 3.1 Add a `Breadcrumbs` UI component

Create `src/components/layout/Breadcrumbs.tsx`:

```tsx
import { Link } from '@/i18n/navigation'
import { breadcrumbJsonLd } from '@/lib/og-utils'

export interface Crumb {
  name: string
  href: string  // path only; absolute URL built for schema
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const schemaItems = items.map((c) => ({
    name: c.name,
    url: `https://kickoracle.com${c.href}`,
  }))

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(schemaItems)) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-on-surface-variant py-3">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((c, i) => {
            const isLast = i === items.length - 1
            return (
              <li key={c.href} className="flex items-center gap-2">
                {isLast ? (
                  <span aria-current="page" className="text-on-surface">{c.name}</span>
                ) : (
                  <>
                    <Link href={c.href} className="hover:text-primary transition-colors">{c.name}</Link>
                    <span aria-hidden="true">/</span>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
```

### 3.2 Render on every section hub and detail page

Top of each route file:

```tsx
// src/app/[locale]/teams/[slug]/page.tsx — render after <TeamHero />
<Breadcrumbs items={[
  { name: 'Home', href: '/' },
  { name: 'Teams', href: '/teams' },
  { name: team.name, href: `/teams/${slug}` },
]} />
```

Pattern table for which routes need breadcrumbs:

| Route | Breadcrumbs |
|---|---|
| `/[locale]/teams/[slug]` | Home › Teams › {team} |
| `/[locale]/teams/[slug]/players/[playerSlug]` | Home › Teams › {team} › {player} |
| `/[locale]/cities/[city]` | Home › Cities › {city} |
| `/[locale]/cities/[city]/{hotels,visa,...}` | Home › Cities › {city} › {sub} |
| `/[locale]/blog/[slug]` | Home › Blog › {post.title} |
| `/[locale]/compare/[matchup]` | Home › Predictions › Compare › {team1 vs team2} |
| `/[locale]/groups/[group]` | Home › Tournament › Group {X} |
| `/[locale]/lingo/{countries,players,terms}/[slug]` | Home › Lingo › {section} › {item} |

## 4. Cross-section linking (the biggest gap)

### 4.1 On every team page (`src/app/[locale]/teams/[slug]/page.tsx`)

Add 4 contextual link blocks after the existing components:

| Block | Source | Link target | Anchor text pattern |
|---|---|---|---|
| **Group rivals** | `groupTeams` (already loaded line 61) | `/teams/[rival-slug]` × 3 + `/compare/{slug}-vs-{rival-slug}` | "Compare {team} vs {rival}" |
| **Where they play** | Match schedule → distinct host cities | `/cities/[city]` × 3-5 | "{team}'s World Cup 2026 host cities" |
| **Qualification recap** | `/teams/[slug]/qualified` | Internal | "How {team} qualified" |
| **How to pronounce key players** | `/lingo/players/[player-slug]` × 3 | Internal | "Pronounce {player}'s name" |

### 4.2 On every city page (`src/app/[locale]/cities/[city]/page.tsx`)

| Block | Source | Link target |
|---|---|---|
| **Teams playing here** | Match schedule filtered by venue | `/teams/[slug]` × N |
| **Other host cities** | Static city list, exclude current | `/cities/[city]` × 3 (geographically nearest) |
| **Travel from your country** | All `/travel/from/[country]` | Top 5 in popularity |
| **Stadium details** | Linked stadium | `/stadiums/[stadium]` |

### 4.3 On every compare page (`/compare/[matchup]`)

Already a comparison page — must link out to:
- Both team pages (`/teams/[home-slug]`, `/teams/[away-slug]`)
- Both teams' group pages
- The host city of the predicted match (if scheduled)
- One step up: `/compare` hub

## 5. Orphan-page audit

Pages NOT reachable in ≤3 clicks from the homepage based on Header/Footer review:

| Orphan page | Inbound links today | Fix |
|---|---|---|
| `/teams/[slug]/qualified` | 0 (only direct URL) | Surface in `TeamHero` as "Already qualified ✅" badge linking to page |
| `/teams/[slug]/players/[playerSlug]` | Only from squad list | Add to player Lingo page; cross-link from blog mentions |
| `/players/is-playing/[slug]` | 0 (only direct URL) | Add to player page; add to FAQ on team page |
| `/lingo/countries/[slug]` (48 pages) | 1 (only from `/lingo/countries` index) | Cross-link from each `/teams/[slug]` |
| `/lingo/players/[slug]` (~600) | 1 | Cross-link from each player page |
| `/gear/ball/history/[year]` | 1 (from `/gear/ball`) | Cross-link from blog posts about history |
| `/gear/jerseys/[team]` | 1 (from `/gear/jerseys`) | Cross-link from each `/teams/[slug]` ("Buy {team} jersey") |
| `/cities/from/[country]` | 0 | Link from `/travel/from/[country]` and locale homepages |
| `/groups/[group]` | 1 (Tournament dropdown only points to Group A) | Add a "Groups" sub-index `/groups` page; link from each team page |
| `/play/quiz`, `/play/pk-battle` | Only from `/play` hub | Add CTA in blog footer + email sequence |
| `/community/[category]` | 0 | If this is the forum, make it a primary nav item |
| `/fan-card`, `/stickers/cost-calculator`, `/stickers/tracker` | 1 each | Cross-link inside the relevant blog topical cluster |

## 6. Anchor text hygiene (per `seo-audit` §Internal Linking)

Replace generic anchors:

| ❌ Bad | ✅ Good |
|---|---|
| "Click here" | "View Brazil's World Cup 2026 squad" |
| "Read more" | "How Argentina qualified for World Cup 2026" |
| "Learn more" | "Hotels near MetLife Stadium" |
| Image-only links with no alt-text | Always include descriptive alt text matching the destination's H1 |

Audit script (run ad-hoc):

```bash
grep -rn 'click here\|read more\|learn more' src/app src/components | grep -v node_modules
```

## 7. Header navigation polish

Current header (`Header.tsx:54-115`) is well-structured but has 8 top-level items — `site-architecture` recommends 4–7 max. Suggested consolidation:

| Today | Consolidate to |
|---|---|
| Predictions, Teams, Cities & Travel, Tournament, Play, Pricing, Fan Zone, Lingo (8) | Predict, Teams, Tournament (merges Tournament + Cities/Travel), Play, Fan Zone (merges Fan Zone + Lingo), Pricing (6) |

Or, keep 8 but sort by user intent (most-clicked first via GA4 data):
1. Predictions (highest intent)
2. Teams (highest volume)
3. Tournament (logistics)
4. Cities & Travel (commercial)
5. Play (engagement)
6. Fan Zone (retention)
7. Lingo (long-tail SEO support, can drop into Fan Zone)
8. Pricing (always rightmost CTA-styled — already correctly handled)

## 8. Footer polish

`Footer.tsx` review — consider adding:
- A **"Tournament" column** with: All Teams, All Cities, Schedule, Bracket, Power Rankings (boost crawl signal to hubs)
- A **"By Language" column** (or footer row) listing all 19 hreflang locales as text links — passes link equity to localized homepages and helps Google discover them. Per `seo-audit`: this is the cheapest intl-SEO improvement available.
- An **XML sitemap link** in legal column ("Sitemap" → `/sitemap.xml`).

## 9. Implementation checklist (in priority order)

- [ ] Build `Breadcrumbs.tsx` component (§3.1)
- [ ] Render breadcrumbs on the 8 route patterns in §3.2 table
- [ ] Add **Group Rivals + Compare** widget to `/teams/[slug]` (§4.1)
- [ ] Add **Where They Play** widget to `/teams/[slug]` (§4.1)
- [ ] Add **Teams Playing Here** widget to `/cities/[city]` (§4.2)
- [ ] Cross-link `/teams/[slug]` ↔ `/lingo/countries/[slug]` and player ↔ `/lingo/players/[slug]` (§5)
- [ ] Surface `/qualified` and `/is-playing` answer-block links (§5)
- [ ] Add 19-locale link footer row (§8)
- [ ] Audit anchor text via grep (§6)
- [ ] Manual click-depth audit: pick 5 long-tail pages, count clicks from homepage; should be ≤ 3

## 10. Validation

After implementation:

1. **Schema** — Test 1 page per pattern in [Google Rich Results Test](https://search.google.com/test/rich-results). Breadcrumbs eligible should appear.
2. **Crawl simulation** — Run Screaming Frog (or `npx next-sitemap` analyze) on the production build. Look for orphan pages count → should drop to ~0.
3. **GSC indexation** — 4 weeks post-deploy, check `Coverage` report. Indexed page count should jump 5–10x once localized URLs are added to the sitemap (separate fix in `schema-audit.md` §6).
