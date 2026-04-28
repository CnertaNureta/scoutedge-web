# KickOracle Keyword Strategy

> Source skills: `content-strategy`, `programmatic-seo`, `ai-seo`, `seo-audit`.

## 1. Strategy in one paragraph

KickOracle has **three keyword moats** that compound: (a) **all 48 teams × 19 locales** = ~900 entity pages competing for low-difficulty branded long-tail; (b) **16 host cities × travel intents** = a category competitors mostly ignore; (c) **48 × 47 ÷ 2 = 1,128 head-to-head comparison pages** at `/compare/[matchup]` — pure programmatic-SEO gold. Lead with the moats, layer in transactional and tool keywords on top.

## 2. Pillars (per `content-strategy`)

Five pillars, each tied to existing routes. Don't invent a sixth.

| Pillar | Search intent owned | Hub URL | Spoke URL pattern |
|---|---|---|---|
| **Predictions & analysis** | "world cup 2026 predictions", "[team] world cup chances" | `/predictions` | `/teams/[slug]`, `/power-rankings`, `/compare/[matchup]`, `/bracket` |
| **Tournament logistics** | "world cup 2026 schedule", "world cup 2026 groups" | `/schedule` | `/groups/[group]`, `/countdown`, `/schedule/converter`, `/matches` |
| **Host cities & travel** | "world cup 2026 host cities", "world cup tickets [city]" | `/cities` | `/cities/[city]`, `/cities/[city]/{hotels,visa,transport,food}`, `/travel/from/[country]`, `/travel/budget-calculator` |
| **Fan culture** | "world cup 2026 stickers", "world cup ball history", "[player] pronunciation" | `/gear` + `/lingo` | `/gear/{ball,jerseys,wallpapers}`, `/stickers/{tracker,cost-calculator}`, `/lingo/{countries,players,terms}` |
| **Play & community** | "world cup prediction game", "predict the bracket" | `/play` | `/predict`, `/leagues/create`, `/leaderboard`, `/challenges` |

## 3. Keyword map by buyer stage

`content-strategy` modifiers. Volume estimates are directional — validate in Ahrefs/Semrush before committing budget.

### 3.1 Awareness (highest volume, broadest intent)

| Keyword | Est. global volume | Difficulty | Target URL | Status |
|---|---|---|---|---|
| world cup 2026 | 1M+ | Very high | `/` | Compete via long-tail; not winnable on the head term |
| world cup 2026 schedule | 250k+ | High | `/schedule` | ✅ exists; needs unique data table & last-updated date |
| world cup 2026 groups | 200k+ | High | `/groups/[group]` × 12 | ✅ exists; underused — make each group a hub |
| world cup 2026 host cities | 50k | Medium | `/cities` | ✅ exists |
| world cup 2026 predictions | 80k | Medium-high | `/predictions` | ✅ exists; strengthen with weekly fresh content |
| world cup 2026 bracket | 30k | Medium | `/bracket` | ✅ exists |
| when is the world cup 2026 | 100k | Low | `/countdown` | ✅ exists; add definition block |
| how does world cup 2026 work | 20k | Low | new `/blog/world-cup-2026-format-explained` | Missing — write |

### 3.2 Consideration (commercial intent, comparisons)

| Keyword pattern | Volume signal | Target URL pattern | Notes |
|---|---|---|---|
| `[team] vs [team] world cup 2026` | Spikes around fixture release | `/compare/[matchup]` (1,128 pages) | Already programmatically generated. Make sure each renders unique AI prediction (not template-only). |
| `best world cup 2026 prediction tool` | Low constant + spike pre-tournament | `/predict` (with comparison page to bookmaker accuracy) | Missing — see comparison-pages section below |
| `[team] world cup 2026 squad` | Big when squads announced (May–Jun) | `/teams/[slug]` + sub-page `/teams/[slug]/squad-announcement` | Add the sub-page in May 2026 |
| `[team] world cup 2026 chances` | Moderate, brand-sensitive | `/teams/[slug]` (probability section) | Display `chemistry`, `fifaRanking`, win-prob in headings |
| `world cup 2026 dark horses` | Spikes pre-tournament | Blog post + linked from `/power-rankings` | Missing |

### 3.3 Decision / transactional

| Keyword pattern | Volume signal | Target URL | Status |
|---|---|---|---|
| `world cup 2026 tickets` | Very high | `/travel/tickets` + `/cities/[city]/tickets` | ✅ exists; ensure clear FAQ schema |
| `[city] world cup 2026 hotels` | High during 2026 | `/cities/[city]/hotels` | ✅ exists × 16 |
| `world cup 2026 visa [country]` | Medium | `/travel/visa` + `/travel/from/[country]` | ✅ exists; broaden to all 19 locales' source countries |
| `world cup 2026 budget [country] to [city]` | Long-tail | `/travel/budget-calculator` + locale | ✅ exists; gate by GA event tracking |

### 3.4 Implementation / tool intent

| Keyword | Volume | Target URL | Notes |
|---|---|---|---|
| world cup 2026 time converter | Low constant + spike at fixtures | `/schedule/converter` | ✅ exists |
| world cup 2026 sticker album | Spikes Apr–Jun 2026 | `/stickers` | ✅ exists; add Panini partnership pitch |
| world cup 2026 wallpaper | Medium | `/gear/wallpapers` | ✅ exists; ensure each wallpaper is its own URL with descriptive alt-text |
| how to predict world cup matches | Low | Blog + `/predict` | Missing — write tutorial |

## 4. Programmatic SEO playbook (existing + recommended)

Per `programmatic-seo`, you already have **3 strong programmatic patterns**. Add 2 more.

### 4.1 Already running (audit & strengthen)

| Pattern | Pages | URL | Audit |
|---|---|---|---|
| Comparisons | 1,128 | `/compare/[matchup]` | Verify each renders unique AI prediction (not just swapped names — that's the #1 thin-content trap from `programmatic-seo`). Each page should include: predicted score, win-prob bar, head-to-head record, both squads' chemistry, last 5 meetings. |
| Profiles (teams) | 48 × 19 = 912 | `/teams/[slug]` | Already strong (FAQ schema). Add per-locale unique copy beyond translation. |
| Profiles (players) | ~600 | `/teams/[slug]/players/[playerSlug]` | Verify Person schema (currently missing — see schema audit). |
| Profiles (cities) | 16 × subpages | `/cities/[city]/{hotels,visa,...}` | Already strong; add `Place` schema. |
| Glossary | ~50 | `/lingo/terms` and country/player pronunciation | Add `DefinedTerm` schema. |

### 4.2 Recommended additions (low effort, high yield)

| New pattern | Volume signal | URL pattern | Source data |
|---|---|---|---|
| **"World Cup 2026 from [country]"** | High in non-US locales | `/travel/from/[country]` | Use existing locale list as source |
| **"[team] qualified for World Cup 2026"** | Spikes around qualification | `/teams/[slug]/qualified` | Already exists — make sure it renders an `is-playing` answer block |
| **"Is [player] playing in World Cup 2026?"** | High intent, low difficulty | `/players/is-playing/[slug]` | Already exists — surface the binary YES/NO above the fold for AI Overviews |
| **"World Cup 2026 [city] vs [city]"** | Medium for travelers comparing | `/cities/compare/[city1]-vs-[city2]` | New — 16 × 15 ÷ 2 = 120 pages |
| **"World Cup 2026 group [group] preview"** | High around draw (Dec 2025) | `/groups/[group]/preview` | New per-group hub with chemistry comparison + predicted standings |

### 4.3 Anti-patterns to avoid (per `programmatic-seo`)

- ❌ Don't auto-generate `/players/[player]/vs/[player]` (~600² = 360k pages) — search demand doesn't exist for non-stars and you'll trigger thin-content penalties.
- ❌ Don't generate `/teams/[slug]/in-[year]` for years 1930–2022 unless you have unique research per year.
- ❌ Don't translate every page into 19 locales until you have *real translated content*, not just localized chrome (this is called out specifically in `seo-audit` international section as a site-wide quality drag).

## 5. Multilingual strategy (largest unrealized opportunity)

You have 19 hreflang locales configured but the sitemap only emits localized homepages — 18 languages × ~1,500 URLs each = **27,000 URLs missing from your sitemap**. Fix this before doing anything else (see `schema-audit.md` §6 for the patch).

**High-leverage non-English keywords** (low Western competition):

| Locale | Underserved keyword | Target URL |
|---|---|---|
| `pt` | "copa do mundo 2026 brasil" | `/pt/teams/brazil` |
| `es` | "mundial 2026 méxico ciudades" | `/es/cities` |
| `ar` | "كأس العالم 2026 المغرب" | `/ar/teams/morocco` |
| `fa` | "جام جهانی 2026 ایران" | `/fa/teams/iran` (huge — competition is very low) |
| `ko` | "월드컵 2026 대한민국" | `/ko/teams/south-korea` |
| `ja` | "ワールドカップ 2026 日本" | `/ja/teams/japan` |
| `de` | "WM 2026 Spielplan" | `/de/schedule` |
| `vi` | "world cup 2026 lịch thi đấu" | `/vi/schedule` |
| `id` | "piala dunia 2026 jadwal" | `/id/schedule` |

Per `seo-audit`: AI translation alone is fine (Google's 2025 stance), but main content must be translated, not only chrome. If you can't get the body translated, **noindex the locale until you can** — better than thin pages dragging site quality.

## 6. Comparison pages (highest-value `ai-seo` content type — 33% citation share)

`ai-seo` data: comparison articles get cited ~33% of the time AI cites anything. You already have `/compare/[matchup]` — extend the playbook:

### 6.1 New comparison pages to ship

| Page | URL | Why |
|---|---|---|
| KickOracle vs. FiveThirtyEight predictions | `/compare/kickoracle-vs-fivethirtyeight` | Brand-comparison; high commercial intent |
| KickOracle vs. bookmaker odds | `/compare/ai-predictions-vs-bookmakers` | Authority play |
| Best free World Cup prediction tools | `/blog/best-world-cup-prediction-tools-2026` | Self-aware listicle (we're #1 because…) |
| World Cup 2026 vs. World Cup 2022 | `/blog/world-cup-2026-vs-2022-format-changes` | Educational, evergreen |
| Best host cities for [persona] | `/blog/best-host-cities-for-budget-travelers` (and 4 more personas) | Persona-driven `programmatic-seo` |

### 6.2 Comparison-page structural rules (per `ai-seo`)

- Lead with a **definition block** (40–60 words, answers the query directly).
- **Comparison table** with specific criteria (not prose).
- Cite at least 3 external sources with URLs.
- Show "Last updated: [date]" at top.
- FAQ schema with 4–6 questions matching real query phrasing.

## 7. Editorial calendar (kickoff is ~6 weeks out)

Today is late April 2026. The calendar below is calibrated for the actual remaining window — there is no time for "foundation evergreen" or qualification-news cycles, those windows have closed. Lean into the highest-intent commercial and squad-announcement keywords now.

| Window | Top priority keywords | Posts/week | Theme |
|---|---|---|---|
| **Now → May 11** *(weeks 1–2)* | "world cup 2026 stickers", "world cup 2026 budget", "[city] hotels", "[city] tickets" | 4 | Travel + commerce intent — highest converting commercial queries |
| **May 12 – Jun 1** *(weeks 3–5, squad-announcement window)* | "[team] world cup squad", "[team] world cup roster", "[player] world cup", "is [player] playing" | 5–7 (one templated post per team within 1h of announcement) | Squad reactions — every squad drop = a fresh long-tail spike to capture |
| **Jun 2 – Jun 10** *(week 6, kickoff eve)* | "world cup 2026 predictions", "[team] vs [team] prediction", "world cup 2026 bracket" | 4–5 | Final predictions + bracket-fill push |
| **Jun 11 – Jun 27** *(group stage)* | Daily match previews/recaps; "[team] vs [team] result" | 7+ daily | Real-time match coverage |
| **Jun 28 – Jul 19** *(knockouts)* | "[team] vs [team] prediction", "world cup 2026 final prediction" | 7+ daily, plus 2x per knockout match (preview + recap) | Real-time, escalating intensity |
| **Jul 20+** *(post-mortem)* | "world cup 2026 predictions accuracy", "best ai world cup predictor" | 3 (transitioning) | Post-mortem + retention pivot to club football |

## 8. Brand vs. category focus

`launch-strategy`: don't fight to rank for "World Cup 2026" itself (FIFA's domain wins). Instead, win 1,000 long-tail queries that compound. Brand presence builds via:
- Wikipedia mention (per `ai-seo`, 7.8% of ChatGPT citations come via Wikipedia — get a page once you have press coverage).
- Reddit reputation (be a contributor, not a poster).
- Newsletter share-card branding ("Predicted by KickOracle AI").

## 9. AI SEO priority queries

Per `ai-seo` framework, test these queries monthly in ChatGPT, Perplexity, Google AI Overview. Track citation rate.

| Query | Why it matters | Where you should be cited |
|---|---|---|
| "AI predictions for World Cup 2026" | Category-defining | Top 3 sources |
| "Best free World Cup 2026 prediction tool" | Commercial intent | Cited in answer |
| "[team] World Cup 2026 chances" | Long-tail × 48 | Cited in team-specific answers |
| "How accurate are AI World Cup predictions" | Builds authority | Cited as data source |
| "Where is the World Cup 2026 final" | Logistics | Cited via `/cities/east-rutherford` (MetLife Stadium) |
| "World Cup 2026 host cities list" | High volume | Cited via `/cities` |

If you're not cited within 90 days for these, retest content extractability per `ai-seo` checklist (definition in first 100 words, statistics with sources, FAQ schema).
