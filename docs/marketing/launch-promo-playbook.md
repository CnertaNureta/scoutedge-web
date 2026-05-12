# KickOracle Launch-Promo Playbook (Week of May 12, 2026)

> Ready-to-paste copy for Reddit, Hacker News, X/Twitter, and outreach email — designed for an owner working solo this week, with World Cup kickoff exactly 30 days out (June 11, 2026).

**How to use this doc**: each block is copy-paste-then-lightly-edit. Square-bracket placeholders like `[OWNER: ...]` mark the only spots you must touch. Everything else is shippable as-written.

**One-line positioning to keep consistent across channels**:
*KickOracle is an independent, AI-powered World Cup 2026 player-intelligence platform: FIFA-style ratings (PAC/SHO/PAS/PHY/DEF/OVR) generated from public match data, for all 48 teams and ~1,100 players, in 19 languages.*

---

## 1. Reddit posts

Reddit is the highest-leverage channel this week, but it punishes self-promo. **All three posts below lead with insight; the link goes in a stickied first comment, never in the OP.** Use a real personal account with non-zero karma. Don't post the same week from a new throwaway.

---

### 1A. r/soccer — "I built X, here's what surprised me"

**Subreddit**: r/soccer (3.6M members, very anti-self-promo, mod-enforced 1:10 self-promo ratio)
**Recommended slot**: **Sunday evening US Eastern** (avoids match-day churn, catches Monday-morning EU readers)
**Post format**: text post, no link in OP
**Title** (149 chars):

> I built an AI rating model for every player at the 2026 World Cup. Five things genuinely surprised me — including who the model rates higher than the public consensus.

**Body** (Reddit markdown, paste as-is):

```markdown
Quick context before anything else: I built this thing, so flag this as a self-promo if you want — I'm sharing the surprises here, not the link. If a mod asks me to take it down I will. Link is in the first comment if anyone wants to poke at the model.

I spent the last few months pointing an AI rating pipeline at every player called up by the 48 nations going to the World Cup this summer. The rating itself is FIFA-style — PAC, SHO, PAS, PHY, DEF, OVR — but built from public per-club performance data, age, minutes load, fitness signals, and a sentiment layer (basically: what are journalists in the player's country writing this week).

After staring at ~1,100 player cards for too many hours, here are the five things that genuinely surprised me. None of these are hot takes for the sake of hot takes — they're places the model's output diverged from what I'd assumed before I started.

**1. Yamal is closer to Mbappé than the discourse suggests.**
At 18 years old, with a fraction of the international caps, the model has Lamine Yamal's overall sitting only a tier below Mbappé. The reason is that the inputs aren't reputation-weighted — they're per-90 output, age-curve, and fitness. Yamal's per-90 numbers at Barcelona this season are absurd, and the model doesn't care that he was born after Messi's first Ballon d'Or.

**2. Bellingham's England number is *still* meaningfully lower than his Real Madrid number.**
Even after Tuchel rebuilt the system around him, the model's contribution score for Bellingham-in-an-England-shirt is below his Madrid score. Six weeks of tournament football with a halfspace role might close it. It hasn't yet.

**3. Veteran goalkeepers are the most over-rated cohort in public discourse.**
The model penalises age aggressively for outfield players but is far more forgiving for keepers. Even so, several big-name 35+ keepers come out below their backups once you account for the season's actual minute load. (Yes, including the one you're about to type in the comments. Probably.)

**4. The "weakest" group on paper has the smallest spread between teams.**
I won't name it because group letters change with every draw revision and I'll get yelled at. But when I plotted average squad OVR with a confidence interval per group, one group's bars overlap so heavily that the model basically refuses to call a favourite. Could be the best group-stage drama of the tournament.

**5. Sentiment moves the rating less than I expected.**
I built in a media-sentiment input thinking it'd be a big lever — turns out it shifts overall by ±2 points at most for any player who has a real performance baseline. Performance data dominates. That actually made me trust the output more, not less.

**On methodology — for the people who'll ask:**
- Inputs: club minutes & per-90 outputs, international caps & goals, position, age, fitness status, sentiment score from a news-pass over the last 14 days.
- The OVR is a clamped 40-99 scale derived from a base rating × 10, modulated by sentiment. Positional priors set the floor for PAC/DEF.
- Backtested on Euro 2024 and Copa America 2024 — calibration curve is on the site, comparison vs FiveThirtyEight and market-implied benchmark probabilities is on the same page.
- I am one person. If the model says something dumb about your striker, it's because the inputs said something dumb about your striker. Tell me and I'll look.

Happy to argue any of these in the comments. AMA-style if there's interest.
```

**Stickied first comment** (post immediately after the OP, then upvote your own comment once):

```markdown
Link if you want to look at the cards yourself: kickoracle.com — ratings sit on every player page, the methodology breakdown is at /accuracy. No paywall on player pages.
```

**Image suggestion**: none in the OP. r/soccer text posts with no image perform measurably better in self-promo-adjacent threads. If you must, add a single radar-chart screenshot of one player to the first comment, not the OP.

**WHAT NOT TO DO**: do not link kickoracle.com anywhere in the OP body — r/soccer mods auto-remove first-time posters whose top-level post links to a domain they don't recognise.

---

### 1B. r/FantasyPL — utility-first

**Subreddit**: r/FantasyPL (1.4M members, more tolerant of tools that help managers)
**Recommended slot**: **Tuesday morning UK** (Mondays are deadline-anxiety chaos; Tuesday is the "what should I do with my team" slot)
**Title** (108 chars):

> I built FIFA-style ratings (PAC/SHO/PAS/PHY/DEF/OVR) for every WC26 player — useful for FPL international-break planning?

**Body**:

```markdown
Long-time FPL player, first-time tool-builder. The World Cup is going to wreck FPL planning for the entire 2026/27 season opener — minutes, fatigue, knock-ons, returning-from-injury risk. So I built a player-intelligence site for the World Cup to help me think about it earlier.

Every called-up player has FIFA-style PAC/SHO/PAS/PHY/DEF/OVR cards generated from real club data plus a fitness flag (green/amber/red) and a sentiment read from country-language press over the last 14 days. There's a comparison tool so you can put two players side-by-side, and team pages with squad chemistry indexes.

What I think might be useful for FPL specifically:

- **Fitness-status flags before pre-season starts**. The amber/red flags catch players whose end-of-season minutes load makes them a bench-bait risk for the first two FPL gameweeks.
- **Squad role under their international manager vs. their club role**. A player who's a starter for his club but a 60-minute sub for his country is a different fatigue profile coming into August.
- **The "high cap-load, going deep in the tournament" cohort**. If your premium pick plays for a likely semifinalist, they're going to have a brutal August.

Not pretending it replaces an FPL tool — it doesn't, and there's no FPL price data on the site. But for the international-football half of the brain that has to start picking a 100m squad in three weeks, it's been useful for me.

If anyone wants to stress-test it, the link's in the first comment. The whole site is free; there's a Pro tier I'm not pushing here because it doesn't add anything FPL-specific.

What angle would actually be useful that I haven't built yet? Genuinely asking.
```

**Stickied first comment**:

```markdown
Link: kickoracle.com — start at /teams to see the squad cards, /compare for the side-by-side. Feedback welcome, brutal feedback more welcome.
```

**Image suggestion**: a single screenshot of a player card showing the radar (Bellingham or Saka — both English players r/FantasyPL audience knows). Attach to the first comment, not the OP.

**WHAT NOT TO DO**: do not promise the tool replaces an FPL planner — r/FantasyPL detects overclaim instantly and you'll get downvoted into the sub's basement.

---

### 1C. r/SoccerAnalytics — methodology-forward

**Subreddit**: r/SoccerAnalytics (~80K members, small but engaged, methodology-literate)
**Recommended slot**: **Wednesday afternoon US Eastern** (this sub reads slowly; midweek catches the steady viewer)
**Title** (135 chars):

> Built FIFA-style player ratings (PAC/SHO/PAS/PHY/DEF/OVR) for all 1,100+ WC26 players from public data — methodology + open questions

**Body**:

```markdown
Putting this in front of this sub specifically because the methodology is the part I'm least confident in, and you're the audience that'll catch what I'm doing wrong.

**The pipeline:**

1. **Base rating** is a 0-10 score per player derived from club per-90 outputs, international per-cap outputs, age curve, and a position prior. Roughly: how would I rank this player if I were a video-game studio doing it manually.
2. **Six derived attributes (PAC/SHO/PAS/PHY/DEF/OVR)** are clamped 40-99 scales computed deterministically from base rating, position, age, fitness status, and per-cap goals/assists.
3. **OVR** = clamp(rating × 10 + (sentimentScore - 50) × 0.05, 40, 99). The sentiment score is a 0-100 read from country-language news over the last 14 days.
4. **PAC** has a strong positional prior (FWD 85, MID 78, DEF 68, GK 55) modulated by age and fitness.
5. **SHO** leans heavily on goals-per-cap (capped at 120 caps so Messi and Ronaldo don't break the scale).
6. **PAS** uses assists-per-cap with a similar cap.

**What I'm aware are weaknesses:**

- No xG or xA inputs. These are private-data-heavy; I'm using the public per-90 outputs as a proxy. If StatsBomb open data covered 2025/26 fully I'd swap immediately.
- Position is a single tag per player. A modern halfspace 8 has the same prior as a deep-lying 6; that's wrong but I haven't found a clean public source for granular tactical roles for 1,100 players.
- The sentiment input is doing less than I expected (±2 OVR at most). I left it in because the calibration improved by a small but consistent margin on the Euro 2024 backtest, but I'd be open to ablating it.
- Fitness status is a manual three-tier flag (green/amber/red), refreshed weekly from press. I'd love to automate it from injury-tracker APIs but every public injury feed has license-restricted commercial use.

**Backtest**: Euro 2024 and Copa America 2024, measured by Brier score, top-1 accuracy, and calibration curve. Comparison page is on the site at /accuracy with a head-to-head vs FiveThirtyEight and market-implied benchmark probabilities. Top-line: comparable to FiveThirtyEight on top-1, slightly better calibrated, worse on extreme-tail outcomes.

**Open questions I'd love this sub's view on:**

1. Is there a defensible way to derive PAS that doesn't lean as hard on assists-per-cap? (Assists are a famously noisy signal.)
2. Has anyone seen a public-data approximation of progressive carries that would survive being aggregated across 48 different leagues?
3. Is the right move to go "rating per role" (8-as-creator, 8-as-destroyer, etc.) or is that overfitting given the public-data ceiling?

Link in the first comment. Genuinely here to learn — if the methodology has a hole, I'd rather find it now than during the group stage.
```

**Stickied first comment**:

```markdown
Site: kickoracle.com — methodology page is at /accuracy. Player JSON is exposed at /api/players/[slug] if you want to look at the raw inputs.
```

**Image suggestion**: optional. If you include one, make it the calibration curve from the backtest page — this sub is the one audience that'll actually read it.

**WHAT NOT TO DO**: do not frame this as "look at my cool product" — frame it as "here's my methodology, please find the holes." This sub respects asks, distrusts pitches.

---

## 2. Hacker News — Show HN

**Recommended slot**: **Tuesday or Wednesday, 8-10am US Eastern** (HN's documented best window). Avoid Monday (queue is full), Friday (front page rolls fast into the weekend).

**Title** (78 chars including prefix):

> Show HN: KickOracle – FIFA-style player ratings for every World Cup 2026 player

**Opening paragraph**:

> Hi HN. KickOracle generates FIFA-style player ratings (PAC/SHO/PAS/PHY/DEF/OVR) for all ~1,100 players called up by the 48 nations going to the 2026 World Cup. Every rating is a deterministic function of public inputs — base club output per 90, age, position, international caps, fitness flag, and a media-sentiment read — so the same inputs always produce the same card. The tournament starts in 30 days; this is the moment to put it in front of people who'll actually stress-test it.
>
> [OWNER: insert one paragraph here on the rating pipeline if you want to go deeper than the bullets below — e.g., "the OVR is `clamp(rating * 10 + (sentiment - 50) * 0.05, 40, 99)`; positional priors set PAC/DEF floors; goals-per-cap and assists-per-cap drive SHO and PAS with a 120-cap ceiling." This block is optional — the bullets cover most of it.]

**Bullet list — features that resonate with HN**:

- **Every rating is reproducible from public match data.** No hand-tuned per-player overrides. The function is in `src/lib/player-derived-stats.ts` and runs the same way for Messi as for the third-string keeper from Curaçao.
- **Player JSON is exposed at `/api/players/[slug]`.** No API key, no rate limit beyond Cloudflare's edge. If you want to grab the raw inputs and rebuild a different model on top, go.
- **Backtested before launch on Euro 2024 and Copa America 2024.** Head-to-head vs FiveThirtyEight and market-implied benchmark probabilities is at `/accuracy` — calibration curve, Brier score, top-1 accuracy. We didn't ship the public model until the backtest was within a respectable margin.
- **Server-rendered, 19 locales, no SPA hydration on the player pages.** The marginal cost of a player view is a single Next.js RSC render plus an edge-cached HTML response. Lighthouse perf is in the 90s on a throttled 4G profile.
- **No login required to see any rating.** Pro tier exists but it's behind a `/pricing` link; the entire 1,100-player rating set is public.

**Honest disclaimer**:

> What's missing — being upfront because HN sniffs out hedging:
> - **No xG / xA inputs.** Public-data ceiling. We use per-90 goals and assists as proxies and we know it's lossy.
> - **Position is a single tag per player.** A deep-lying playmaker and a destroyer-8 have the same midfielder prior. We'd love granular tactical roles; the public data doesn't support it across 48 leagues.
> - **Fitness flag is manually maintained.** Three-tier (green/amber/red), refreshed weekly. We've looked at every public injury API and they're all commercial-license-restricted.
> - **The sentiment-score input shifts OVR by ±2 at most.** It improved the Euro 2024 backtest by a small but consistent margin. Some of you will (correctly) push to ablate it; we left it in because the backtest said keep it.
> - **The site is brand new.** This is week one of public traffic. Bugs are likely. The feedback form on every page goes to a real human (me).

**One-line "things to look out for in comments" note for the owner**:

> Watch for: (a) anyone asking why you don't use xG — answer "public-data ceiling, see disclaimer"; (b) anyone asking about FIFA's IP — answer "public stats only, no FIFA logos, World Cup is used descriptively"; (c) anyone asking how this differs from Football Manager / EA FC — answer "every rating is reproducible from inputs you can audit, ours isn't a designer's opinion." Reply within the first 2 hours or the thread dies.

---

## 3. Twitter/X threads

Two threads, posted 36-48 hours apart so they don't cannibalise each other's reach. Each tweet under 280 chars, hashtags only on the final tweet.

---

### Thread A — "10 most surprising results"

**Recommended slot**: **Thursday 9am US Eastern** (catches the football-X morning wave and the European afternoon)

**Tweet 1** (243 chars):

> We pointed an AI rating model at every player called up to the 2026 World Cup. ~1,100 players, FIFA-style PAC/SHO/PAS/PHY/DEF/OVR cards, all generated from public per-90 data.
>
> Here are the 10 most surprising results from staring at the cards. /1

**Tweet 2** (276 chars):

> 1. Lamine Yamal's OVR is closer to Mbappé than the discourse suggests. He's 18, has a fraction of the caps, and the model doesn't care — Barcelona per-90 output dominates the inputs and his per-90 output this season is absurd.
>
> Reputation isn't an input. /2

**Tweet 3** (273 chars):

> 2. Bellingham-in-an-England-shirt still rates lower than Bellingham-at-Real-Madrid, even after Tuchel rebuilt the system around him. The gap has narrowed; it hasn't closed.
>
> 3. Haaland's per-90 is so absurd that the model wants to give him a 99 SHO. We capped it at 95. /3

**Tweet 4** (267 chars):

> 4. Veteran goalkeepers are the most over-rated cohort in public discourse. The model penalises age aggressively and several big-name 35+ keepers come out below their backups.
>
> 5. Saka's PAS rating is higher than his SHO. Arsenal fans aren't surprised. Pundits should be. /4

**Tweet 5** (276 chars):

> 6-10 + the methodology + every player card is at kickoracle.com. The OVR formula is in the open at /accuracy. Player JSON is exposed at /api/players/[slug] if you want to rebuild it yourself.
>
> 30 days to kickoff. /end
>
> #WorldCup2026 #FIFA #Football #SoccerAnalytics

---

### Thread B — methodology

**Recommended slot**: **Saturday 10am US Eastern** (Saturday morning is football-X's most engaged window; the technical audience is also reading)

**Tweet 1** (267 chars):

> How we generated FIFA-style PAC/SHO/PAS/PHY/DEF/OVR ratings for 1,100+ World Cup 2026 players from public data only.
>
> No hand-tuning. No per-player overrides. Same function for Messi as for the third-string keeper from Curaçao.
>
> Methodology thread. /1

**Tweet 2** (272 chars):

> Inputs per player: club minutes & per-90 outputs, international caps & goals, position, age, fitness flag (green/amber/red), 14-day country-language news sentiment.
>
> Output: 6 attributes on a 40-99 scale.
>
> The whole derivation function is in one file, ~60 lines. /2

**Tweet 3** (276 chars):

> OVR = clamp(rating × 10 + (sentiment − 50) × 0.05, 40, 99). The sentiment lever is small on purpose — performance data dominates.
>
> PAC has a positional prior (FWD 85, MID 78, DEF 68, GK 55) modulated by age & fitness.
>
> SHO leans on goals-per-cap, capped at 120 caps. /3

**Tweet 4** (271 chars):

> Backtested before launch on Euro 2024 and Copa America 2024. Head-to-head against FiveThirtyEight and market-implied benchmark probabilities.
>
> Top-line: comparable on top-1 accuracy, slightly better calibrated, worse on extreme-tail outcomes.
>
> Calibration curve is at /accuracy. /4

**Tweet 5** (274 chars):

> Known weaknesses: no xG (public-data ceiling), single position tag per player (no role granularity), manual fitness flag.
>
> Player JSON is open at /api/players/[slug]. Rebuild a better model on top — please.
>
> kickoracle.com /end
>
> #SoccerAnalytics #WorldCup2026 #Football #AI

---

## 4. Outreach email — football data bloggers

**Subject line** (52 chars):

> Quick question on your [TOPIC] piece — and a data offer

**Email body**:

```
Hi [BLOGGER NAME],

I read your piece on [SPECIFIC ARTICLE TITLE — e.g., "the calibration problem in public football models"] last week and the bit about [ONE CONCRETE THING THEY SAID — e.g., "why Brier score alone is misleading without a reliability diagram"] is the cleanest articulation of that point I've seen anywhere. It's the reason I'm writing.

I'm the person behind KickOracle (kickoracle.com), an independent World Cup 2026 player-intelligence site that generates FIFA-style PAC/SHO/PAS/PHY/DEF/OVR ratings for every player called up by the 48 nations, all derived from public per-90 data. Every rating is reproducible from inputs you can audit, and the player JSON is exposed at /api/players/[slug] without an API key.

One specific ask: I'd love to send you the full ratings dataset (~1,100 players, six attributes each, plus a sentiment read) under embargo before the tournament starts on June 11. You'd be the only outlet with the full set in machine-readable form, and you're free to publish whatever analysis you want from it — counter-intuitive picks, methodology critiques, backtest replications, anything. No approval rights on my end. The dataset is yours.

If that's interesting, just reply with "send it" and I'll have the file in your inbox within 24 hours. If it's not the right fit, no problem at all — please consider this a thank-you for the [TOPIC] piece either way.

Cheers,
[OWNER NAME]
hello@kickoracle.com
```

**5 example bloggers/sites to target**:

| Target | Why they're a fit |
|---|---|
| **StatsBomb blog** | They care about open methodology and have a strong public-data ethic; the "every rating is reproducible from public inputs" angle lands. |
| **The Athletic FC data desk (e.g., John Muller)** | Daily-desk capacity for data-led pieces and a real audience; the embargoed dataset gives them something they can publish exclusively. |
| **Tifo Football (now Athletic Bilbao on YouTube/Newsletter)** | Methodology-first audience; they've done explainer pieces on rating systems before and would credit the source. |
| **FiveThirtyEight (sports vertical, where it survives)** | Comparison-vs-538 is built into our backtest page; an exchange of methodology notes would be a fair trade. |
| **Country-language football data bloggers (one per top-5 locale: ES, PT, AR, MX, FR)** | Local-language analysis of "what your country's squad looks like in the model" is the highest-converting borrowed-channel angle pre-tournament; one outlet per country is enough. |

---

## 5. Posting schedule + benchmarks (Mon May 11 – Sun May 17, 2026)

| Day | Channel | Action | Honest expected outcome |
|---|---|---|---|
| **Mon May 11** | Outreach email | Send 5 personalised emails to the bloggers above. Spread sends across the day so replies don't pile up at once. | Realistic: 1-2 replies in 7 days. 1 actual placement in 14 days is a win. |
| **Tue May 12** | Hacker News | Post Show HN at 8-10am US Eastern. Sit on the post for the first 90 min and answer every comment. | Realistic: 5-30 points. Front page (>50 points) is a 10-15% shot for a Show HN with a real working product. |
| **Wed May 13** | r/SoccerAnalytics | Post the methodology version Wed afternoon US Eastern. | Realistic: 30-100 upvotes, 10-30 comments. This sub rewards earnest methodology posts. |
| **Thu May 14** | X/Twitter | Post Thread A (10 most surprising) at 9am US Eastern. | Realistic: 200-2,000 impressions for a fresh account, 1,000-10,000 if any football-X account with >5k followers quote-tweets. |
| **Fri May 15** | (rest day for posting) | Catch up on r/SoccerAnalytics + HN comments. Reply to any blogger emails. | — |
| **Sat May 16** | X/Twitter | Post Thread B (methodology) at 10am US Eastern. | Realistic: lower top-line than Thread A but higher engagement-per-impression. Saves are the metric. |
| **Sun May 17** | r/soccer | Post the "5 things surprised me" version Sunday evening US Eastern. | Realistic: most r/soccer launches get under 50 upvotes. 100+ is a great day. 500+ means front page and is a 5% shot. Removal by mods is also a real possibility — see decision tree below. |
| **(Bonus — Tue May 19)** | r/FantasyPL | If r/soccer goes well, post the FPL version Tuesday morning UK. If r/soccer bombs, post it anyway — this is a different audience with low overlap. | Realistic: 20-150 upvotes. FPL audience is clicky if the tool actually helps them. |

### Decision tree

**If r/soccer post is removed by mods within 60 minutes**: do NOT repost. Modmail the mods (politely) once asking what specifically violated the rules, and don't repost the same content under a different title. Move that energy into the FPL post on Tuesday.

**If r/soccer post is under 20 upvotes after 6 hours**: don't bump it, don't comment-spam it. Treat it as buried. Use the same hook on r/FantasyPL Tuesday with the FPL angle. Do NOT cross-post the same body to r/worldcup, r/MLS, country subs etc. in the same week — Reddit's anti-spam treats that as one violation across all subs.

**If HN goes to the front page (>50 points)**: cancel everything else for the next 36 hours. Sit on the comments full-time. Replies to comments are the single highest-leverage thing you can do. Answer every technical question; concede every legitimate critique without hedging. The comment thread is the actual product demo.

**If HN flatlines under 5 points in the first hour**: don't repost. HN's algorithm penalises duplicate URLs heavily. Pivot to making sure Thread A on X performs.

**If a blogger replies positively**: send the dataset within 24 hours. Don't follow up with "any update?" emails — wait 14 days minimum, then a single "circling back" reply is fine.

**If everything bombs across the board**: that's a normal week-one outcome. The point of this week is to get the first 5-10 backlinks indexed and the first 200 organic visitors through the door. Compounding starts at week 3.

---

## 6. What absolutely NOT to do

- **Do not link kickoracle.com as the first line of any Reddit post.** First-time domain submissions trigger automod removal in r/soccer specifically.
- **Do not cross-post the same body to multiple subs the same day.** Reddit's anti-spam treats this as a single violation across all subs and can shadowban the account.
- **Do not call KickOracle "the FIFA killer", "the Football Manager killer", "the EA FC killer", or any other "X killer" framing.** It will get torn apart in comments and you'll spend the thread defending the claim instead of demoing the product.
- **Do not post the day before, day of, or day after a real World Cup news event** (squad announcement, qualifier, FIFA announcement). Your post will be buried under match-thread traffic.
- **Do not buy upvotes, comment services, or "Reddit marketing packages".** r/soccer's mods detect this within hours and will shadowban the account permanently. The damage to the domain reputation is not recoverable.
- **Do not mass-DM bloggers.** A personalised email beats 50 DMs. If you don't have time to write a personal first paragraph for a blogger, skip them.
- **Do not respond to bad-faith comments with hedging.** If the methodology has a real hole, concede it directly ("you're right, here's why we made that tradeoff"). If it's a bad-faith pile-on, don't engage; downvote and move on.
- **Do not cite a specific KickOracle rating for any player you haven't double-checked in the data file.** "Yamal is rated 92 OVR" is the kind of claim that gets fact-checked in real time and will tank your credibility if the actual number is different. Refer to relative comparisons ("higher than", "closer to") instead of specific numbers in launch copy.
- **Do not promise features that aren't shipped.** If a commenter asks "do you have xG?", the answer is "no, public-data ceiling" — never "we're working on it" unless you actually are.
- **Do not push the Pro tier in any launch-week post.** Free product first, monetisation later. r/soccer especially will detect a paywall pitch and downvote the post on principle.

---

## Appendix: Owner checklist for the 30 minutes before each post

- [ ] Re-read the title once for typos. Reddit and HN don't let you edit titles after posting.
- [ ] Double-check the username you're posting from has non-zero karma and an account age >30 days.
- [ ] Have the first comment with the link copied to your clipboard before you hit "post".
- [ ] Open the post in an incognito tab immediately after submitting to confirm it's visible (not auto-removed).
- [ ] Set a 90-minute timer to babysit the comment thread. Replies in the first 90 minutes drive the algorithm.
- [ ] Have `/accuracy`, `/api/players/[slug]`, and one or two specific player pages bookmarked so you can paste links into replies fast.
- [ ] Don't drink before posting. The thread will need clean answers.
