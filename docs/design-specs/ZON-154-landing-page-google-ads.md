# ZON-154: Landing Page Optimization for Google Ads — Ad-to-Page Alignment

**Author:** UI Designer
**Date:** 2026-04-18
**Deadline:** 2026-04-28
**Status:** Design Spec — Pending Board Approval

---

## Problem Statement

The current homepage (`/`) is an editorial showcase optimized for organic discovery — cinematic hero, six content sections, 15+ navigation targets. This is wrong for paid traffic. Google Ads visitors arrive with a specific intent shaped by the ad copy they clicked. When the landing page doesn't immediately mirror that promise, bounce rates spike and Quality Score tanks.

**Current gaps:**
- No message match — hero copy ("Narrative-first team dossiers...") doesn't reflect specific ad promises
- Too many CTAs — 15+ links compete for attention; paid landing pages need 1-2 focused actions
- No social proof — zero trust signals (user count, data freshness, coverage scope)
- No urgency — tournament countdown is on a separate page, not reinforcing conversion pressure
- No conversion tracking — no UTM capture, no `gclid` persistence, no Google Ads pixel
- No campaign-specific variants — all traffic hits the same homepage regardless of ad group
- Hero subheading is product-speak, not benefit-speak

---

## Strategy: Dedicated Landing Pages, Not Homepage Tweaks

**Do not modify the homepage.** The editorial homepage serves organic and direct traffic well. Instead, create **3 focused landing page variants** at `/lp/[variant]` that Google Ads campaigns will point to. Each variant maps to a specific ad group with tight message match.

### Landing Page Variants

| Route | Ad Group | Primary CTA | Target Conversion |
|-------|----------|-------------|-------------------|
| `/lp/predictions` | AI predictions, odds, World Cup picks | "Get AI Predictions" | Newsletter signup |
| `/lp/teams` | Team analysis, squad chemistry, scouting | "Explore 48 Teams" | Team page visit |
| `/lp/briefing` | World Cup news, daily intelligence | "Subscribe Free" | Newsletter signup |

---

## Design Spec: Landing Page Template

All three variants share a common layout template with swappable content blocks. This is one page component with prop-driven content, not three separate pages.

### Layout Structure (top to bottom)

```
┌─────────────────────────────────────────────┐
│  Sticky Mini-Header (logo + single CTA)     │
├─────────────────────────────────────────────┤
│                                             │
│  Hero Block                                 │
│  ├─ Badge (trust signal)                    │
│  ├─ H1 (mirrors ad headline)               │
│  ├─ Subheading (benefit, not feature)       │
│  ├─ Primary CTA (single, prominent)         │
│  └─ Trust Strip (below CTA)                 │
│                                             │
├─────────────────────────────────────────────┤
│  Social Proof Bar                           │
│  (48 teams · 1,200+ players · updated daily)│
├─────────────────────────────────────────────┤
│                                             │
│  Value Proposition Grid (3 cards)           │
│  (what you get, fast scan)                  │
│                                             │
├─────────────────────────────────────────────┤
│  Feature Showcase                           │
│  (screenshot/preview of actual product)     │
├─────────────────────────────────────────────┤
│  Urgency Bar                                │
│  (countdown to tournament kickoff)          │
├─────────────────────────────────────────────┤
│  Bottom CTA (repeats primary action)        │
├─────────────────────────────────────────────┤
│  Minimal Footer (privacy + terms only)      │
└─────────────────────────────────────────────┘
```

### Section-by-Section Design

---

#### 1. Sticky Mini-Header

**Purpose:** Persistent brand + CTA without full navigation. Landing pages should minimize exit paths.

**Layout:**
- Height: `56px` (mobile), `64px` (desktop)
- Background: `bg-background/95 backdrop-blur-md border-b border-white/[0.06]`
- Left: ScoutEdge logo (link to `/`, opens in new tab)
- Right: Primary CTA button (small, matches hero CTA text)
- No navigation menu, no hamburger, no search

**Key decisions:**
- Logo links to homepage in `target="_blank"` — preserves the landing page session
- CTA button uses `scroll-to` to the hero CTA or newsletter form, not a page navigation
- Appears after scrolling past hero (use IntersectionObserver, `sticky top-0 z-50`)

**Tailwind sketch:**
```
<header class="sticky top-0 z-50 h-14 md:h-16 flex items-center justify-between
  px-4 md:px-8 bg-background/95 backdrop-blur-md border-b border-white/[0.06]">
```

---

#### 2. Hero Block

**Purpose:** Instant message match with ad copy. This is the single most important section.

**Layout:**
- Full viewport width, min-height `80vh` (not 100vh — we want the social proof bar to peek)
- Same cinematic background treatment as homepage (reuse `HOMEPAGE_HERO_IMAGE`, dark overlay)
- Content centered, max-width `720px`
- No secondary CTA — one button only

**Content per variant:**

| Element | `/lp/predictions` | `/lp/teams` | `/lp/briefing` |
|---------|--------------------|-------------|-----------------|
| Badge | "AI-Powered Analysis" | "48 Nations Covered" | "Free Daily Email" |
| H1 | "World Cup 2026 AI Predictions & Match Intelligence" | "Every Squad. Every Player. Every Match." | "World Cup 2026 Intelligence — Delivered Daily" |
| Subheading | "AI-driven win probabilities, chemistry scores, and squad analysis for all 48 teams. No paywalls, no forum noise." | "Team chemistry reads, tactical profiles, and player scouting reports for all 48 nations competing in 2026." | "AI-curated match previews, injury updates, and prediction shifts in your inbox every morning. Free forever." |
| CTA text | "Get AI Predictions" | "Explore All 48 Teams" | "Subscribe — It's Free" |
| CTA action | Scroll to newsletter form | Link to `/teams` | Scroll to newsletter form |

**Badge styling:**
```
inline-flex items-center gap-2 px-4 py-1.5 rounded-full
bg-primary/10 border border-primary/20
font-label text-xs font-semibold tracking-widest uppercase text-primary
```

**H1 styling:**
```
font-headline text-[clamp(2rem,7vw,5rem)] leading-[0.95] tracking-wide
uppercase text-on-surface
```
Note: Smaller than homepage H1 (5rem max vs 9rem). Landing pages need room for the subheading and CTA above the fold.

**Subheading:**
```
text-on-surface-variant text-base md:text-lg max-w-xl mx-auto
mt-4 mb-8 leading-relaxed
```

**Primary CTA button:**
```
bg-primary text-on-primary px-12 py-4 rounded-2xl
font-label font-bold text-base uppercase tracking-widest
hover:scale-105 transition-all animate-neon-glow
shadow-[0_0_30px_rgba(160,212,148,0.25)]
```
Make it larger and more prominent than homepage CTAs. Add a subtle glow shadow.

**Trust strip (directly below CTA):**
Small text line: "Free to use · No account required · Updated daily"
```
text-on-surface-variant/60 text-xs font-label tracking-wide mt-4
```

---

#### 3. Social Proof Bar

**Purpose:** Fast credibility scan. Numbers that make the product feel real and comprehensive.

**Layout:**
- Full-width bar, `py-6`, `bg-surface-container-low border-y border-white/[0.04]`
- 3-4 stats in a horizontal row, centered
- Use `AnimatedNumber` component for each stat (already exists in design system)
- Dividers between stats (vertical `border-r border-white/[0.08]`)

**Stats:**
| Stat | Value | Label |
|------|-------|-------|
| Teams | 48 | nations analyzed |
| Players | 1,200+ | player profiles |
| Matches | 104 | fixtures covered |
| Updates | Daily | AI-refreshed intelligence |

**Stat item layout:**
```
<div class="text-center px-6 md:px-10">
  <div class="font-display text-3xl md:text-4xl text-primary">48</div>
  <div class="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">
    nations analyzed
  </div>
</div>
```

Use the `font-display` (Bebas Neue) for the numbers — it's already in the font system and gives the stats punch.

---

#### 4. Value Proposition Grid

**Purpose:** Three fast-scan benefit cards that answer "what do I get?"

**Layout:**
- `max-w-[1200px] mx-auto px-6 py-16`
- 3-column grid on desktop, stack on mobile
- `grid grid-cols-1 md:grid-cols-3 gap-6`

**Cards use existing `glass-panel` style** with these additions:
- Large icon (existing emoji pattern from homepage, `text-4xl`)
- Bold title in accent color (`font-headline text-lg uppercase tracking-wide`)
- 2-line description (`text-on-surface-variant text-sm leading-relaxed`)
- No link — these are informational, not navigational

**Card content per variant:**

For `/lp/predictions`:
1. "Win Probabilities" — AI-modeled match predictions with chemistry and form weighting
2. "Squad Chemistry" — How well players connect, measured across 48 squads
3. "Daily Shifts" — Predictions that update as news, injuries, and form evolve

For `/lp/teams`:
1. "Deep Team Profiles" — Tactical DNA, coaching philosophy, and squad identity reads
2. "Player Intelligence" — Fitness, form, and scouting reports for every player
3. "Head-to-Head" — Compare any two teams across 15+ statistical dimensions

For `/lp/briefing`:
1. "Morning Delivery" — AI-curated headlines, injury updates, and prediction moves
2. "No Noise" — Signal extracted from hundreds of sources, distilled to what matters
3. "Always Free" — No premium tier, no paywall, no credit card required

---

#### 5. Feature Showcase

**Purpose:** Show, don't tell. A product screenshot or preview that makes the intelligence tangible.

**Layout:**
- `max-w-[1200px] mx-auto px-6 py-16`
- Large rounded container (`rounded-2xl overflow-hidden border border-white/[0.08]`)
- Background: subtle gradient or `bg-surface-container`
- Contains a browser-frame-style mockup showing a real page

**Content:**
- For `/lp/predictions`: Screenshot of the power rankings page or a match prediction card
- For `/lp/teams`: Screenshot of a team detail page (e.g., Brazil or Argentina) showing the hero, chemistry bar, roster
- For `/lp/briefing`: Screenshot of the daily briefing email or page

**Implementation note:** Use Next.js `<Image>` with static screenshots placed in `/public/lp/`. These should be actual captures of the product, not mockups. Size: `1200x675` (16:9), with a decorative border/shadow treatment.

**Browser frame mockup styling:**
```
<div class="rounded-2xl border border-white/[0.08] overflow-hidden
  shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
  <!-- Fake browser chrome -->
  <div class="h-8 bg-surface-container-high flex items-center px-3 gap-1.5">
    <div class="w-2.5 h-2.5 rounded-full bg-white/10" />
    <div class="w-2.5 h-2.5 rounded-full bg-white/10" />
    <div class="w-2.5 h-2.5 rounded-full bg-white/10" />
    <div class="flex-1 mx-8 h-4 rounded-full bg-white/[0.04]" />
  </div>
  <!-- Screenshot -->
  <Image src="/lp/preview-teams.png" ... />
</div>
```

---

#### 6. Urgency Bar

**Purpose:** Tournament countdown creates natural urgency without being sleazy.

**Layout:**
- Full-width, `py-8`, `bg-tertiary/[0.04] border-y border-tertiary/10`
- Centered content, max-width `600px`
- Countdown numbers using `font-display` (Bebas Neue) in `text-tertiary`
- Format: `XX days · XX hours · XX minutes`
- Subtext: "Until the opening match — Mexico City, June 11"

**Styling:**
```
<div class="text-center">
  <p class="font-label text-xs uppercase tracking-widest text-tertiary/80 mb-2">
    Tournament Kickoff
  </p>
  <div class="font-display text-4xl md:text-5xl text-tertiary tracking-wider">
    54d · 12h · 38m
  </div>
  <p class="text-on-surface-variant text-sm mt-2">
    Opening match — Estadio Azteca, Mexico City
  </p>
</div>
```

Use the existing `CountdownTimer` component logic but with the landing page's more compact visual treatment.

---

#### 7. Bottom CTA

**Purpose:** Repeat the primary action for users who scrolled the full page.

**Layout:**
- `py-16 px-6`, centered
- Same CTA button as hero (identical text, style, and action)
- Add a one-line reinforcement above: "Join 48 nations of analysis. Free and instant."
- Background: reuse the `bg-gradient-to-br from-primary-container via-background to-background` from the homepage CTA section

---

#### 8. Minimal Footer

**Purpose:** Legal compliance without exit temptation.

**Layout:**
- `py-6 px-6 border-t border-white/[0.04]`
- Single line: "ScoutEdge © 2026 · Privacy Policy · Terms of Service"
- Links open in new tab
- No social links, no sitemap, no navigation

---

## Conversion Infrastructure (non-visual, but design-critical)

These aren't visual changes but they determine whether the design works commercially.

### UTM Parameter Capture

The landing page must read and persist UTM parameters from the URL:
- `utm_source` (e.g., google)
- `utm_medium` (e.g., cpc)
- `utm_campaign` (e.g., wc2026-predictions)
- `utm_content` (e.g., hero-v1)
- `utm_term` (search keyword)
- `gclid` (Google click ID — critical for conversion tracking)

Store in `sessionStorage` on page load. Attach to newsletter signup and any conversion event.

### Dynamic Headline Matching

For maximum ad-to-page alignment, support a `?headline=` query parameter that overrides the H1. This lets the ads team test headline variants without deploying code:

- `/lp/predictions?headline=AI+World+Cup+Predictions+%E2%80%94+Free+Access`
- Sanitize the input (strip HTML, limit to 120 chars)
- Fall back to the default variant headline if absent

### Newsletter Form on Landing Pages

For `/lp/predictions` and `/lp/briefing`, the newsletter form IS the primary conversion. Embed the `NewsletterSignup` component inline (not the banner variant) directly below the hero CTA area, with these modifications:

- Add `source: 'lp-predictions'` or `source: 'lp-briefing'` to the signup payload
- After successful signup, show a redirect CTA: "You're subscribed! Explore the teams while you wait →"
- Pass UTM params with the signup for attribution

---

## Responsive Behavior

### Mobile (320px - 640px)
- Hero min-height: `85vh` (shorter to ensure social proof bar peeks)
- H1 max size: `2.5rem` (via clamp)
- CTA button full-width: `w-full`
- Social proof bar: 2x2 grid instead of horizontal row
- Value prop cards: single column stack
- Feature showcase: hide browser chrome, show screenshot only
- Urgency bar: same layout, slightly smaller text

### Tablet (641px - 1024px)
- Hero min-height: `80vh`
- Social proof bar: horizontal row
- Value prop cards: 3-column grid
- Feature showcase: full browser frame

### Desktop (1025px+)
- Max content width: `1200px` centered
- All sections at full fidelity

---

## Accessibility Requirements

- **Contrast:** All text meets WCAG 2.1 AA (4.5:1 body, 3:1 large text). Current `#c2c9bb` on `#121412` = 9.4:1 — passes. `#a0d494` on `#121412` = 7.8:1 — passes.
- **Touch targets:** CTA buttons minimum 48x48px tap area
- **Keyboard:** All interactive elements focusable, visible focus ring (`focus-visible:ring-2 ring-primary`)
- **Reduced motion:** Respect `prefers-reduced-motion` — disable countdown animation, hero fade-in
- **Screen reader:** Countdown uses `aria-live="polite"` for dynamic updates
- **No autoplay:** No video or audio autoplay on landing pages

---

## Performance Budget

Landing pages must score 90+ on Lighthouse (mobile). This means:

- **LCP < 2.0s** (stricter than homepage — paid traffic is impatient)
- Hero image: preload, AVIF/WebP, max 200KB
- Feature screenshot: lazy loaded, below fold
- Zero third-party scripts until post-conversion (defer analytics)
- Total JS budget: < 100KB gzipped (landing pages are simpler than full app pages)
- Use static generation (`generateStaticParams`) for all 3 variants

---

## What NOT to Change

- **Homepage (`/`)** — Leave untouched. Organic traffic pattern is different.
- **Navigation header** — Landing pages get the mini-header, not the full nav
- **Existing components** — Reuse `GlassCard`, `AnimatedNumber`, `CountdownTimer`, `NewsletterSignup`, `NeonAccentBar` as-is
- **Color palette** — Stay within brand tokens
- **Font system** — Use existing font families only

---

## Implementation Priority

1. **P0 — Landing page template component** with variant prop system
2. **P0 — UTM capture utility** (sessionStorage, attach to conversions)
3. **P0 — `/lp/predictions` variant** (highest likely ad spend)
4. **P1 — `/lp/teams` variant**
5. **P1 — `/lp/briefing` variant**
6. **P1 — Product screenshots** for feature showcase section
7. **P2 — Dynamic headline override** via query param
8. **P2 — Google Ads conversion pixel** integration (separate from this spec)

---

## Measuring Success

Once live, the Founding Engineer should instrument:

| Metric | Target | Tool |
|--------|--------|------|
| Bounce rate | < 40% (from paid) | Google Ads / Analytics |
| Newsletter signup rate | > 8% of lp/predictions visitors | Supabase query |
| Time on page | > 30 seconds | Analytics |
| Scroll depth | > 60% reach urgency bar | Scroll tracking |
| Quality Score | 7+ across ad groups | Google Ads dashboard |
| LCP (mobile) | < 2.0s | Lighthouse CI |

---

## Board Approval Required

Per standing policy: **no UI changes ship without board pre-approval with before/after screenshots.** Since these are net-new pages (not modifications to existing UI), the "before" state is "page does not exist." The approval request should include:
- This design spec
- A Figma-equivalent screenshot or rendered prototype of the `/lp/predictions` variant
- Mobile and desktop views

Once the Founding Engineer builds the first variant, capture screenshots at 375px and 1440px for board review before the page goes live or receives ad traffic.
