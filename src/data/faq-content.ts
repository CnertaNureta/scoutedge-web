/**
 * Hand-tuned FAQ content for hub pages.
 *
 * These FAQs are surfaced both:
 *   1. As FAQPage JSON-LD (FAQ rich result in Google + AI-search citations).
 *   2. As visible <details>/<summary> blocks on the page (Google requires
 *      FAQ content be visible to users, not only in structured data).
 *
 * Answer rules:
 *   - 50–300 characters each
 *   - Include the core entity (World Cup 2026 / KickOracle / host city / team)
 *   - Direct factual statements, no hedging
 *   - Known facts hard-coded: kickoff 2026-06-11 (Mexico City),
 *     final 2026-07-19 (MetLife Stadium, NJ), 48 teams, 104 matches,
 *     16 host cities, 3 host countries (USA, Canada, Mexico).
 *
 * TODO i18n: English only in this pass. The 18 other locales currently fall
 * back to English. Human translators should localize these strings via the
 * `faq.<hub>.q<n>` namespace in src/i18n/messages/<locale>.json.
 */

export interface FaqEntry {
  question: string
  answer: string
}

export const HOMEPAGE_FAQS: FaqEntry[] = [
  {
    question: 'What is KickOracle?',
    answer:
      'KickOracle is an AI-powered intelligence platform for the 2026 FIFA World Cup. It delivers daily predictions, squad analysis, and host-city guides for all 48 teams across 19 languages.',
  },
  {
    question: 'When does the 2026 World Cup start?',
    answer:
      'The 2026 FIFA World Cup kicks off on 11 June 2026 at Estadio Azteca in Mexico City and concludes with the final on 19 July 2026 at MetLife Stadium in New Jersey.',
  },
  {
    question: 'How many teams play in the 2026 World Cup?',
    answer:
      'The 2026 World Cup is the first edition with 48 teams, expanded from 32. The teams play 104 matches across 16 host cities, organized into 12 groups of four during the first round.',
  },
  {
    question: 'Which countries host the 2026 World Cup?',
    answer:
      'The 2026 World Cup is co-hosted by the United States, Canada, and Mexico — the first three-nation host arrangement in tournament history, spanning 16 host cities and 16 stadiums.',
  },
  {
    question: 'How accurate are KickOracle predictions?',
    answer:
      'KickOracle blends FIFA ranking, squad chemistry, morale, stability, and familiarity into each win probability. Models are backtested against 2022 and 2024 tournament data and refreshed daily as new intel lands.',
  },
]

export const PREDICTIONS_FAQS: FaqEntry[] = [
  {
    question: 'How does KickOracle predict World Cup 2026 matches?',
    answer:
      'KickOracle weighs FIFA ranking (40%), squad chemistry (30%), team morale (15%), tactical stability (10%), and player familiarity (5%) to produce a win probability for every team in the 2026 World Cup field.',
  },
  {
    question: 'Who will win the 2026 World Cup according to AI?',
    answer:
      'The KickOracle model rotates the top contenders daily, but the consistent leaders for the 2026 World Cup are Spain, France, Argentina, England, and Brazil — all sitting above a 70% knockout-stage advance probability.',
  },
  {
    question: 'What data feeds the KickOracle prediction model?',
    answer:
      'Predictions use FIFA rankings, qualifying results, club-form data, injury intel from our scouting feed, recent friendlies, and head-to-head history — refreshed continuously across the 2026 World Cup cycle.',
  },
  {
    question: 'How often are KickOracle predictions updated?',
    answer:
      'Win probabilities recalculate at least daily and immediately after every World Cup 2026 fixture, friendly, or significant squad announcement. Live matches trigger an in-game probability refresh.',
  },
  {
    question: 'Are KickOracle predictions free?',
    answer:
      'Top-five contenders, daily briefings, and team pages are free. The full 48-team prediction grid, deep bracket simulator, and historical model accuracy view are part of the KickOracle Premium tier.',
  },
]

export const TEAMS_FAQS: FaqEntry[] = [
  {
    question: 'Which 48 teams qualified for the 2026 World Cup?',
    answer:
      'The 2026 World Cup field includes the three hosts (USA, Canada, Mexico) plus 45 qualifiers from UEFA, CAF, CONMEBOL, AFC, CONCACAF, and OFC — the first 48-team tournament in FIFA history.',
  },
  {
    question: 'How are teams seeded in the 2026 World Cup draw?',
    answer:
      'For the 2026 World Cup, the 48 qualified teams were divided into four pots of 12 based on FIFA ranking, with the three hosts placed in Pot 1. The draw produced 12 groups of four labeled A through L.',
  },
  {
    question: 'Which team is favorite to win the 2026 World Cup?',
    answer:
      'Spain enter the 2026 World Cup as model favorites, with France, Argentina, England, and Brazil rounding out the top five. KickOracle updates the contender order daily as squads and form shift.',
  },
  {
    question: 'When was the 2026 World Cup draw held?',
    answer:
      'The official 2026 FIFA World Cup draw took place on 5 December 2025 at the Kennedy Center in Washington, D.C., assigning all 48 teams into the 12 first-round groups.',
  },
]

export const CITIES_FAQS: FaqEntry[] = [
  {
    question: 'Which 16 cities host the 2026 World Cup?',
    answer:
      'The 16 host cities are: in the USA — Atlanta, Boston, Dallas, Houston, Kansas City, Los Angeles, Miami, New York/New Jersey, Philadelphia, San Francisco Bay Area, Seattle; in Mexico — Guadalajara, Mexico City, Monterrey; and in Canada — Toronto, Vancouver.',
  },
  {
    question: 'Which city hosts the 2026 World Cup final?',
    answer:
      'The 2026 World Cup final is at MetLife Stadium in East Rutherford, New Jersey, on 19 July 2026 — the metro New York/New Jersey host city.',
  },
  {
    question: 'How are matches distributed across 2026 World Cup host cities?',
    answer:
      'The 104 matches of the 2026 World Cup spread across 16 host cities, with USA stadiums hosting 78 matches, Mexico 13, and Canada 13 — including every match from the quarter-finals onwards on US soil.',
  },
  {
    question: 'Which is the largest 2026 World Cup stadium?',
    answer:
      'AT&T Stadium in Dallas — capacity approximately 92,967 — is the largest dedicated World Cup 2026 stadium and will host nine matches, including a semi-final.',
  },
]

export const TRAVEL_FAQS: FaqEntry[] = [
  {
    question: 'Do I need a visa for the 2026 World Cup?',
    answer:
      'Visa requirements depend on your passport and the host country. For the 2026 World Cup, USA visitors typically need an ESTA or B1/B2 visa, Canada an eTA or visitor visa, and Mexico a tourist visa or FMM permit.',
  },
  {
    question: 'What is the FIFA Fan ID / ESTA / eTA process for the 2026 World Cup?',
    answer:
      'For the 2026 World Cup, ticket holders should apply for ESTA (USA) or eTA (Canada) at least 72 hours before travel. Mexico requires the FMM tourist permit on arrival. A FIFA Fan ID may also be required for cross-border stadium access.',
  },
  {
    question: 'How much does it cost to attend the 2026 World Cup?',
    answer:
      'A 2026 World Cup trip averages USD 3,000–8,000 per fan for a week, covering flights, hotels (USD 200–500/night), match tickets (USD 60–6,730 face value), local transport, and food across the three host countries.',
  },
  {
    question: 'What is the best way to travel between 2026 World Cup host cities?',
    answer:
      'Domestic flights are the fastest option between 2026 World Cup host cities given the 5,000+ km tournament footprint. Amtrak serves the US East Coast corridor, and Mexico City–Guadalajara–Monterrey is best connected by air.',
  },
  {
    question: 'Where can I buy 2026 World Cup tickets safely?',
    answer:
      'Buy 2026 World Cup tickets exclusively through FIFA.com/tickets, FIFA-authorized hospitality partners, or your national football association. Avoid third-party resellers — FIFA invalidates non-original tickets at the gate.',
  },
]

export const ABOUT_FAQS: FaqEntry[] = [
  {
    question: 'Who is behind KickOracle?',
    answer:
      'KickOracle is built by a small editorial and engineering team obsessed with football intelligence. The platform fuses live data, AI models, and human analysis to deliver clear 2026 World Cup signals to fans worldwide.',
  },
  {
    question: 'How is the KickOracle prediction model built?',
    answer:
      'KickOracle blends weighted inputs — FIFA ranking, squad chemistry, morale, tactical stability, and player familiarity — and validates the model against 2022 and 2024 results before scoring every 2026 World Cup fixture.',
  },
  {
    question: 'Is KickOracle affiliated with FIFA?',
    answer:
      'No, KickOracle is an independent analytics platform and is not affiliated with FIFA, any national federation, or the 2026 World Cup organizing committee. All data is sourced and analyzed independently.',
  },
  {
    question: 'How can I contact KickOracle?',
    answer:
      'Reach the KickOracle team at hello@kickoracle.com for editorial questions, press, partnerships, or feedback on World Cup 2026 coverage. Newsletter subscribers also receive direct-reply support.',
  },
]
