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

The product is already deployed (kickoracle.com is live, 19 locales, hundreds of pages). You are deep in **Phase 5 — full launch**. Your "launch event" is **the tournament itself**, not a single Product Hunt day. As of late April 2026, kickoff is ~6 weeks away — there is no time left for "build authority over 10 months." Every week now is execution.

| Phase | Window | Focus |
|---|---|---|
| **Phase 5a — Pre-tournament sprint** | now → Jun 10, 2026 (~6 wk) | Ship the schema/sitemap/breadcrumb fixes from `schema-audit.md` so the tournament traffic spike captures localized URLs. Squad-announcement coverage. Daily social cadence. |
| **Phase 5b — In-tournament** | Jun 11 – Jul 19, 2026 (39 days) | Real-time engagement, daily briefing, social-first, push notifications |
| **Phase 6 — Post-tournament** | Jul 20+ 2026 | Retention pivot to Copa America 2027, Euro qualifiers, club football |

## 3. ORB channel strategy

Distribution model from `launch-strategy`. Owned ⟵ feed every Rented and Borrowed touchpoint.

### 3.1 Owned (compound; build now)

| Asset | Status | Action |
|---|---|---|
| **Newsletter** (Beehiiv at `kickoracle.beehiiv.com`) | Live | Make it the #1 CTA. Sticky exit-intent on every locale homepage. Goal: **double subscriber count by Jun 11 kickoff**, then convert tournament spike to email at the highest possible rate. |
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

You're inside the 6-week window where football media will publish *anything* World Cup. Tier-1 long-leads (The Athletic, ESPN FC features) are likely too late for a pre-tournament feature placement, but daily/weekly desks are still publishing constantly. Pitch this week.

| Borrowed channel | Realistic in 6 weeks? | Pitch angle |
|---|---|---|
| **Football podcasts** (Men in Blazers, The Athletic FC, Tifo Football) | Yes — they're booking weekly preview episodes now | "We ran 10k Monte Carlo sims on all 48 teams — here are 3 picks the consensus is wrong about." Lead with data, not interview. |
| **Tier-1 publications, daily desks** (The Athletic, ESPN FC) | Maybe — long features no, but data-led news yes | "Exclusive: our AI says [counter-intuitive pick]." Give them numbers + chart, not a press release. |
| **Country-specific media** (one per locale) | Yes — easiest fit | Pitch the local-language host city guide + national team page. They publish in 24-48h. |
| **YouTube creators** (Tifo, Athletic Bilbao, COPA90) | Yes for short-form; long-form maybe too late | DM them: free Pro account + raw data export. They make a video. No payment. Pattern: TRMNL → Snazzy Labs in `launch-strategy`. |
| **Reddit AMA** | Yes — schedule for ~2 weeks pre-kickoff | "I built an AI World Cup predictor — AMA" in `/r/soccer` or `/r/worldcup`. Country subs (`/r/Brasil`, `/r/argentina`) are even higher-converting but require local-language fluency. |

## 4. Six-week sprint + tournament calendar

Today is late April 2026. Kickoff Jun 11. Final Jul 19. This is a 6-week sprint into a 39-day tournament window, then post-tournament wind-down.

| Window | Owned | Rented | Borrowed |
|---|---|---|---|
| **Week 1** *(Apr 28 – May 4, this week)* | **Ship the P0 fixes from `schema-audit.md`**: localized sitemap (the single biggest pre-tournament SEO move — currently 27k URLs invisible), OG locale, breadcrumbs, SoftwareApplication schema. Newsletter exit-intent live. 3 blog posts. | X: 2/day. TikTok: 4/week. Pin pre-tournament prediction thread. | DM 10 YouTube creators with free Pro accounts. Pitch 5 podcasts for May recording. |
| **Weeks 2–3** *(May 5 – May 18)* | Squad-announcement landing pattern ready for every team (mostly announced May 14–Jun 1). Daily Briefing → daily, not weekly. SportsEvent + Person schema shipped (P1 fixes). | X: 3/day. Reddit: prep AMA for week 5. Email cadence → 2x/week. | First podcast appearances. Country-language press: pitch one outlet per top-10 locale. |
| **Weeks 4–5** *(May 19 – Jun 1)* | Squads land — react within 1 hour per team with locale-specific posts. Final pre-tournament predictions go live. Push-notification opt-in campaign. | X: 4-5/day. TikTok: daily. Newsletter: 3x/week. | Reddit AMA mid-window in `/r/soccer` or `/r/worldcup`. Tier-1 daily-desk pitch with the "AI vs. consensus" angle. |
| **Week 6** *(Jun 2 – Jun 10, kickoff eve)* | "100 hours to kickoff" countdown campaign. Bracket predictor (`/bracket`) push. Email blast: "Make your final predictions." | X: 5+/day. Live-tweet schedule prepared. TikTok: daily preview reels. | Country-language press: every locale's national team gets a pitch. |
| **Group stage** *(Jun 11 – Jun 27)* | Daily briefing email day-of every match. Push notification 1h before kickoff. Prediction-vs-result share cards. | Auto-tweet every match preview/recap. TikTok recap < 30min after every full-time. Reddit: data-rich post-match comments. | "Real-time AI predictions" — feed live data to a FiveThirtyEight-style blogger / Athletic data desk. |
| **Knockouts** *(Jun 28 – Jul 18)* | Bracket-update emails after each round. Quarterfinal-onward: 2 emails per match (preview + recap). | X live-thread every knockout. TikTok recap. | Embargoed final-prediction exclusive to one tier-1 outlet 24h before final. |
| **Final & post-mortem** *(Jul 19 – Jul 26)* | Final-day live blog. "What our AI got right/wrong" data post within 48h of final whistle (very shareable per `content-strategy`). Begin Copa America 2027 / Euro qualifiers content for retention. | Wind down to 2/day. Repurpose tournament best-of into evergreen TikTok library. | Pitch the post-mortem to The Athletic / FiveThirtyEight as a data feature. |
| **Aug 2026+** | Pivot retention email sequence to club football + Copa America 2027 / 2028 Euros. Document playbook for next tournament. | 1-2/day on club football angles. | — |

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
| ~~Group-stage draw~~ ~~100 days to kickoff~~ | (already passed — Dec 2025 / early Mar 2026) | If you missed publishing during these moments, refresh the existing group/countdown pages now with fresh stats and republish to your existing audience. |
| **Squad announcements** (rolling) | May 14 – Jun 1, 2026 | Templated SquadAnnouncement post per team within 1h of release. Drives 48 spikes of branded long-tail. |
| **30 days to kickoff** | May 12, 2026 | "30 days out" newsletter + countdown campaign |
| **Reddit AMA** | ~May 28, 2026 | "I built an AI World Cup predictor — AMA" — single big Reddit moment |
| **Opening match** | Jun 11, 2026 | Live AI prediction page → push notification → newsletter blast. The signup-conversion peak. |
| **Knockouts begin** | Jun 28, 2026 (last group fixtures Jun 27) | Bracket predictor (`/bracket`) campaign — predictions reset, second engagement peak |
| **Final** | Jul 19, 2026 | Final prediction post; collect email from every visitor |
| **Post-mortem** | Jul 21–22, 2026 | "What our AI got right/wrong" data post — very shareable |

## 7. Product Hunt: skip or strategic?

`launch-strategy` is honest about Product Hunt — short spike, hard to rank, niche audience. **For KickOracle: skip.** Football fans aren't on PH. Spend that prep time on Reddit AMA + 2 podcast pitches instead — better ROI for a sports product.

## 8. KPIs (what to actually measure)

| KPI | Baseline | Target by Jun 11 (kickoff) | Target by Jul 19 (final) |
|---|---|---|---|
| Organic traffic (monthly) | TBD (instrument GA4 + GSC) | +50% over baseline | 5–10x baseline (tournament spike) |
| Newsletter subscribers | TBD (current) | 2x current | 5x current |
| Indexed pages (GSC) | ~1,500 (English-only sitemap) | 8,000+ (after localized sitemap ships — see `schema-audit.md`) | 10k+ steady-state |
| Predictions made (signed-in, weekly) | TBD | 5x baseline | 20x baseline (peaks during knockouts) |
| Top-10 keyword rankings | TBD | +50 | +150 |
| AI Overview citations | unmeasured | instrument now (Otterly/Peec) | 30+ queries citing kickoracle |

## 9. Quick-win priority list (the next 14 days are decisive)

With 6 weeks to kickoff, anything that doesn't ship by **mid-May** won't have time for Google to crawl, index, and start ranking before the tournament traffic spike. In priority order:

1. **Localized sitemap** — `src/app/sitemap.ts` currently emits English URLs only. 27,000 indexable URLs in 18 languages are invisible to Google. Highest-leverage single change in this whole package. See `schema-audit.md` §6.
2. **OG-locale bug** — `src/lib/og-utils.ts:35` is hardcoded `'en_US'`. Social shares of every non-English page misrepresent the language. See `schema-audit.md` §2.1.
3. **Breadcrumbs + `BreadcrumbList` JSON-LD** — render visible breadcrumbs and the schema. See `internal-linking.md` §3.
4. **`SoftwareApplication` schema** on homepage — leaves "AI football prediction" AI Overview citations on the table. See `schema-audit.md` §2.3.
5. **Beehiiv exit-intent popup** — footer link is not enough; tournament traffic without conversion is wasted spend.
6. **`SportsEvent` schema on match/compare pages** — eligible for Google's live-event rich result *during* the tournament, but only if Google has already indexed the markup before kickoff. Ship by May 25. See `schema-audit.md` §3.1.
7. **Push-notification opt-in flow** — `web-push` is already a dep; make sure the install banner converts during squad-announcement spikes.

## 10. Risk register

| Risk | Mitigation |
|---|---|
| FIFA / sports IP takedown | Use only public stats, FIFA-permitted team logos. Avoid official "World Cup" wordmark in title — use "World Cup 2026" descriptively. (Already correct in current copy.) |
| Google AI Overviews eat clicks (~58% reduction per `ai-seo` skill) | Prioritize being the *cited source*, not just ranked. Statistics, freshness, schema = 40%+ citation lift. |
| 18 thin locale pages drag site quality (per `seo-audit` E-E-A-T section) | Either translate the main content (not just chrome) or noindex thin locales until ready. |
| Tournament ends → traffic cliff | Pre-build the Copa America 2027 / club football pivot during the tournament so it ships Jul 20. |
