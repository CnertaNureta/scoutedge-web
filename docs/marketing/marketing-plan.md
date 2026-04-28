# KickOracle Marketing & Launch Plan

> Source skills: `launch-strategy`, `marketing-ideas`, `social-content`, `community-marketing`, `email-sequence`, `content-strategy`.

## 1. Positioning

**One-line**: *AI-powered World Cup 2026 intelligence — predictions, host-city guides, and squad analysis in 19 languages.*

**Differentiators** (what to emphasize in every asset):
1. **AI predictions for all 48 teams** — not just the top contenders; long tail catches fans of every nation.
2. **Host-city travel layer** — `/cities/[city]` pages cover hotels/visas/transport. Most prediction sites don't.
3. **19-locale coverage** — `en, es, zh, pt, ar, fr, ja, ko, de, it, nl, tr, pl, id, ru, fa, th, vi, hu`. Almost no competitor speaks Farsi or Indonesian.
4. **Free interactive tools** — `/predict`, `/bracket`, `/schedule/converter`, `/travel/budget-calculator`, `/play/quiz` — build engagement before kickoff.
5. **Daily Briefing** — `/daily-briefing` is a recurring touchpoint (compounding habit).

**What to de-emphasize until proven**: paywall (`/pricing`) and Pro tier — keep above the fold but don't lead with it. Build the audience first; monetize the engaged minority.

## 2. Stage of launch (per `launch-strategy` 5-phase framework)

The product is already deployed (kickoracle.com is live, 19 locales, hundreds of pages). You are in **Phase 4 → Phase 5**: from controlled growth to full launch. Your "launch event" is **the tournament itself**, not a single Product Hunt day.

| Phase | Window | Focus |
|---|---|---|
| **Phase 4 — Build authority** | now → Feb 2026 (~10 mo) | SEO compounding, content depth, distribution partnerships |
| **Phase 5a — Pre-tournament push** | Mar – May 2026 | Sticker/jersey/qualification SEO; press; influencer seeding |
| **Phase 5b — In-tournament** | Jun 11 – Jul 19, 2026 | Real-time engagement, daily briefing, social-first |
| **Phase 6 — Post-tournament** | Jul 20+ | Retention pivot to Copa America 2027, Euro qualifiers, club football |

## 3. ORB channel strategy

Distribution model from `launch-strategy`. Owned ⟵ feed every Rented and Borrowed touchpoint.

### 3.1 Owned (compound; build now)

| Asset | Status | Action |
|---|---|---|
| **Newsletter** (Beehiiv at `kickoracle.beehiiv.com`) | Live | Make it the #1 CTA. Sticky exit-intent on every locale homepage. Goal: **10k subs by May 2026**. |
| **Daily Briefing** (`/daily-briefing`) | Live | Anchor the email — 1 paragraph + 1 prediction + 1 link. Drives habit. |
| **Blog** (`/blog/[slug]`) | Live | 2 posts/week through Feb; 4/week Mar–Jul. See `keyword-strategy.md` for topics. |
| **PWA** (manifest live in `layout.tsx:45`) | Live | Push the install banner harder during qualifiers. Push notifications via `web-push` (already a dep) for kickoff alerts. |
| **AI Predictions tool** (`/predict`, `/predictions`) | Live | Gamify: "What's your hit-rate vs. KickOracle's AI?" — share-card after every prediction. |

### 3.2 Rented (use to drive Owned signups)

Pick **two** platforms maximum and own them. Football audiences cluster on:

| Platform | Audience fit | Tactics |
|---|---|---|
| **X / Twitter** (`@KickOracle`) | High — football X is loud and global | Threaded match previews 6h before kickoff, share AI-pick threads. Quote-tweet refs for engagement. |
| **TikTok / Reels** (`@scoutedge`) | High — younger fans, short clips | "AI predicted X, here's what happened" recap reels (45s). Player-trivia clips from `/lingo/players`. |
| **Reddit** | High — `/r/soccer`, `/r/worldcup`, country subs (`/r/Brasil`, `/r/argentina`) | NEVER post predictions raw — get banned. Instead: data-rich AMAs ("We ran 10k Monte Carlo sims, here's what won"). Link sparingly. |
| **YouTube Shorts** (`@scoutedge`) | Medium — need editorial bandwidth | Repurpose TikToks. Long-form: 5-min "Group X explained" videos around draw moments. |
| **LinkedIn** | Low priority for football | Skip. |
| **Instagram** (`@scoutedge`) | Medium | Visual-first — sticker album guides, jersey reviews from `/gear/jerseys`. Stories during matches. |

**Rule**: every social post links to a *destination URL on kickoracle.com*, never directly to the newsletter signup. Let the page do the conversion.

### 3.3 Borrowed (highest-leverage, lowest-frequency)

Pre-tournament window is when football media will publish *anything* World Cup. Pitch in **Jan–Apr 2026**.

| Borrowed channel | Pitch angle |
|---|---|
| **Football podcasts** (Men in Blazers, The Athletic FC, Tifo Football) | "We have AI predictions on all 48 teams — here are the 3 surprise picks." Bring data, not opinions. |
| **Tier-1 publications** (The Athletic, ESPN FC, BBC Sport) | "Exclusive: AI model picks the 2026 dark horse" — give them a one-week embargo + raw numbers. |
| **Country-specific media** (one per locale) | Pitch the local-language host city guide + national team page in their language. Easy to publish. |
| **YouTube creators** (Tifo, Athletic Bilbao, COPA90) | Free Pro accounts + custom data exports → they make a video. No payment. (Pattern: TRMNL → Snazzy Labs in `launch-strategy` skill.) |
| **Reddit AMA** | "I built an AI World Cup predictor — AMA" in `/r/IAmA` or `/r/worldcup` ~30 days pre-kickoff. |

## 4. 14-month calendar (high-level)

| Month | Owned | Rented | Borrowed |
|---|---|---|---|
| **Apr–Jun 2025** *(now)* | Fix internal links + schema (this package). Publish 2 posts/week. | X: 1 post/day. TikTok: 2/week. | — |
| **Jul–Sep 2025** | Build `/cities/[city]` depth. Newsletter to 2.5k. | Reddit AMA in country subs around qualifiers. | Pitch 5 podcasts. |
| **Oct–Dec 2025** | "Year ahead" pillar content. Newsletter to 5k. | Increase X to 3/day during fixture release (Dec). | Pitch The Athletic / ESPN. |
| **Jan–Feb 2026** | Group-stage draw (Dec '25) → publish "Group X breakdown" × 12 immediately. | TikTok daily during draw week. | Influencer seeding — send Pro accounts to 20 creators. |
| **Mar–Apr 2026** | Pre-tournament push: sticker tracker, budget calculator, host-city guides spike. | Reddit AMA (high effort, one shot). | Press release: "AI vs. bookmakers" comparison. |
| **May 2026** | Email cadence → 2x/week. Final predictions live. | Daily X threads. | Coverage in football mags. |
| **Jun 11 – Jul 19, 2026** *(tournament)* | Daily briefing + push notifications for every match. | Live-tweet every match (auto-scheduled). TikTok recap 30min after every game. | "Real-time AI predictions" — pitch to FiveThirtyEight-style bloggers. |
| **Jul 20+ 2026** | Pivot retention email sequence to Copa America 2027 + club football. | Wind down to 1/day. | "What our AI got right/wrong" post-mortem → very shareable. |

## 5. Email & onboarding

Newsletter signup → 5-email welcome sequence (use `email-sequence` skill for templates):

1. **Day 0** — "Welcome. Your first AI prediction for this weekend's qualifier." + link to `/predict`.
2. **Day 2** — "How our AI ranks the 48 teams" + link to `/power-rankings`.
3. **Day 5** — "Where the World Cup happens — your travel guide" + link to `/cities`.
4. **Day 9** — "Test your predictions vs. friends" + link to `/leagues/create`.
5. **Day 14** — "Read the daily briefing free" + link to `/daily-briefing` + soft Pro upsell.

Drop unengaged subs (no opens in 60d) — they hurt deliverability.

## 6. Launch moments to manufacture

Per `launch-strategy`, momentum compounds. Manufacture publishable events:

| Moment | When | Asset |
|---|---|---|
| **Group-stage draw** (FIFA-set, ~Dec 2025) | Dec 2025 | 12 hub pages + 1 mega-thread per locale |
| **100 days to kickoff** | ~Mar 3, 2026 | Countdown lands; sticker album page peaks; press release |
| **Squad announcements** (May–Jun 2026) | Rolling | A SquadAnnouncement post per team within 1h of release |
| **Opening match (Jun 11)** | Jun 11, 2026 | Live AI prediction page → push notification → newsletter blast |
| **Knockouts begin** (Jun 30) | Jun 30, 2026 | Bracket predictor (`/bracket`) campaign |
| **Final** (Jul 19) | Jul 19, 2026 | Final prediction post; collect email from every visitor |

## 7. Product Hunt: skip or strategic?

`launch-strategy` is honest about Product Hunt — short spike, hard to rank, niche audience. **For KickOracle: skip.** Football fans aren't on PH. Spend that prep time on Reddit AMA + 2 podcast pitches instead — better ROI for a sports product.

## 8. KPIs (what to actually measure)

| KPI | Baseline | Target by May 2026 | Stretch |
|---|---|---|---|
| Organic traffic (monthly) | TBD (instrument GA4 + GSC) | 250k | 1M |
| Newsletter subscribers | TBD | 10k | 25k |
| Indexed pages (GSC) | ~1,500 (sitemap) | 8,000+ (with localized URLs added — see `schema-audit.md`) | — |
| Predictions made (signed-in) | TBD | 50k | 200k |
| Top-10 keyword rankings | TBD | 200 | 500 |
| AI Overview citations | unmeasured | track in Otterly/Peec | 50+ queries citing kickoracle |

## 9. Quick-win priority list (do this week)

1. Fix the OG-locale bug in `src/lib/og-utils.ts:35` (hardcoded `'en_US'`) → see `schema-audit.md` §2.
2. Add localized URLs to `src/app/sitemap.ts` (currently only English URLs are indexed; you're invisible in 18 languages) → see `schema-audit.md` §6.
3. Implement breadcrumb component + render `BreadcrumbList` JSON-LD → see `internal-linking.md` §3.
4. Add `SoftwareApplication` schema on homepage to surface in "AI football prediction" queries → see `schema-audit.md` §3.
5. Stand up the Beehiiv exit-intent popup (off the footer link is not enough).

## 10. Risk register

| Risk | Mitigation |
|---|---|
| FIFA / sports IP takedown | Use only public stats, FIFA-permitted team logos. Avoid official "World Cup" wordmark in title — use "World Cup 2026" descriptively. (Already correct in current copy.) |
| Google AI Overviews eat clicks (~58% reduction per `ai-seo` skill) | Prioritize being the *cited source*, not just ranked. Statistics, freshness, schema = 40%+ citation lift. |
| 18 thin locale pages drag site quality (per `seo-audit` E-E-A-T section) | Either translate the main content (not just chrome) or noindex thin locales until ready. |
| Tournament ends → traffic cliff | Pre-build the Copa America 2027 / club football pivot during the tournament so it ships Jul 20. |
