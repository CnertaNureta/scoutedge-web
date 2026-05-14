/**
 * SEO Meta Descriptions — World Cup 2026
 *
 * Provides title tags and meta descriptions for:
 *   - 12 group analysis pages (/groups/[group])
 *   - 46 confirmed team pages (/teams/[slug])
 *
 * All meta descriptions target 150-160 characters.
 * All title tags target 50-60 characters (including " | KickOracle").
 *
 * Implementation note for engineer:
 *   1. Import GROUP_SEO_META on the group analysis route (once created)
 *   2. Import TEAM_SEO_META on /teams/[slug]/page.tsx
 *   3. Use Next.js Metadata API: export const metadata = { title, description }
 *   4. The description field is ready to drop directly into <meta name="description">
 */

export type PageSEOMeta = {
  title: string       // Full title tag value (with " | KickOracle" suffix)
  description: string // Meta description (150-160 chars target)
  ogTitle?: string    // Optional: Open Graph title (can be more descriptive)
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP ANALYSIS PAGES — /groups/[group]
// ─────────────────────────────────────────────────────────────────────────────

export const GROUP_SEO_META: Record<string, PageSEOMeta> = {
  A: {
    title: "World Cup 2026 Group A Analysis & Predictions | KickOracle",
    description:
      "Group A World Cup 2026: Mexico co-hosts alongside South Korea, Denmark, and South Africa. Full predictions, key matches, and AI-powered KickOracle analysis.",
    ogTitle: "World Cup 2026 Group A: Mexico, South Korea, Denmark & South Africa — Who Advances?",
  },
  B: {
    title: "World Cup 2026 Group B Analysis & Predictions | KickOracle",
    description:
      "Group B World Cup 2026: Italy return after missing 2022, Switzerland stay dangerous, Canada play at home. Full analysis and predictions for every match.",
    ogTitle: "World Cup 2026 Group B: Italy's Return, Canada's Dream & Switzerland's Quality",
  },
  C: {
    title: "World Cup 2026 Group C Analysis & Predictions | KickOracle",
    description:
      "Group C is the Group of Death: Brazil vs Morocco's 2022 semi-finalists. Scotland return after 28 years. Full World Cup 2026 Group C predictions and analysis.",
    ogTitle: "World Cup 2026 Group C: Brazil, Morocco, Scotland & Haiti — The Group of Death",
  },
  D: {
    title: "World Cup 2026 Group D Analysis & Predictions | KickOracle",
    description:
      "Group D World Cup 2026: Co-hosts USA face Turkey's dark horse quality, Australia's 2022 pedigree, and Paraguay's CONMEBOL grit. Full AI predictions inside.",
    ogTitle: "World Cup 2026 Group D: USA on Home Soil vs Turkey, Australia & Paraguay",
  },
  E: {
    title: "World Cup 2026 Group E Analysis & Predictions | KickOracle",
    description:
      "Group E World Cup 2026: Germany seek redemption after two group exits. Ivory Coast AFCON champions add African quality. Full predictions and match analysis.",
    ogTitle: "World Cup 2026 Group E: Germany's Redemption, Ivory Coast, Ecuador & Curaçao",
  },
  F: {
    title: "World Cup 2026 Group F Analysis & Predictions | KickOracle",
    description:
      "Group F World Cup 2026: Netherlands vs Japan's giant-killers meets Ukraine's resilience and Tunisia's discipline. Full AI-powered analysis and match predictions.",
    ogTitle: "World Cup 2026 Group F: Netherlands, Japan, Ukraine & Tunisia — Who Advances?",
  },
  G: {
    title: "World Cup 2026 Group G Analysis & Predictions | KickOracle",
    description:
      "Group G World Cup 2026: Portugal and Belgium — two elite generations — collide with Iran and Salah's Egypt. Full predictions for every match in this Group of Death.",
    ogTitle: "World Cup 2026 Group G: Portugal, Belgium, Iran & Egypt — Elite Generations Collide",
  },
  H: {
    title: "World Cup 2026 Group H Analysis & Predictions | KickOracle",
    description:
      "Group H World Cup 2026: Spain — Euro 2024 champions — face Serbia, Saudi Arabia (who shocked Argentina), and Cabo Verde's debut. Full predictions inside.",
    ogTitle: "World Cup 2026 Group H: Spain's Dominance, Serbia's Danger & Saudi Arabia's Sting",
  },
  I: {
    title: "World Cup 2026 Group I Analysis & Predictions | KickOracle",
    description:
      "Group I World Cup 2026: France are heavy favorites. Haaland's Norway vs AFCON champions Senegal is the tournament's best second-place battle. Full analysis.",
    ogTitle: "World Cup 2026 Group I: France's Dominance and Haaland vs Senegal's Battle",
  },
  J: {
    title: "World Cup 2026 Group J Analysis & Predictions | KickOracle",
    description:
      "Group J World Cup 2026: Defending champions Argentina face Algeria's Mahrez, Austria's high-press, and Jordan's historic debut. Full World Cup 2026 predictions.",
    ogTitle: "World Cup 2026 Group J: Champions Argentina, Algeria, Austria & Jordan's Debut",
  },
  K: {
    title: "World Cup 2026 Group K Analysis & Predictions | KickOracle",
    description:
      "Group K World Cup 2026: Colombia's flair vs Cameroon's physicality. Uzbekistan make Central Asian World Cup history. Full AI-powered predictions and analysis.",
    ogTitle: "World Cup 2026 Group K: Colombia, Cameroon, Uzbekistan's Historic Debut",
  },
  L: {
    title: "World Cup 2026 Group L Analysis & Predictions | KickOracle",
    description:
      "Group L World Cup 2026: England and Croatia — two title contenders — collide in one group. Ghana's Kudus and Panama add competitive fire. Full predictions.",
    ogTitle: "World Cup 2026 Group L: England vs Croatia, Ghana & Panama — Two Contenders Clash",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM PAGES — /teams/[slug]
// ─────────────────────────────────────────────────────────────────────────────

export const TEAM_SEO_META: Record<string, PageSEOMeta> = {
  // ─── GROUP A ──────────────────────────────────────────────────────────────
  mexico: {
    title: "Mexico World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Mexico co-host World Cup 2026 with squad chemistry of 72/100. Can El Tri finally break the Round of 16 curse on home soil? AI analysis, predictions, and squad depth.",
    ogTitle: "Mexico World Cup 2026: Breaking the Quinto Partido Barrier at Home",
  },
  "south-africa": {
    title: "South Africa World Cup 2026 Prediction | KickOracle",
    description:
      "South Africa return to the World Cup for the first time since 2010. Hugo Broos's rebuilt Bafana Bafana squad analyzed by KickOracle AI for Group A 2026.",
    ogTitle: "South Africa World Cup 2026: Bafana Bafana's Return After 16 Years",
  },
  "south-korea": {
    title: "South Korea World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Son Heung-min's farewell tournament. South Korea's pressing intensity and World Cup pedigree analyzed. Will they advance from Group A? Full KickOracle prediction.",
    ogTitle: "South Korea World Cup 2026: Son's Farewell and the Taegeuk Warriors' Chances",
  },
  denmark: {
    title: "Denmark World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Denmark's collective machine: chemistry 80/100, Eriksen's creativity, and tournament pedigree. Full Group A analysis and World Cup 2026 prediction from KickOracle.",
    ogTitle: "Denmark World Cup 2026: Europe's Most Underrated Team Analyzed",
  },

  // ─── GROUP B ──────────────────────────────────────────────────────────────
  switzerland: {
    title: "Switzerland World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Switzerland: Europe's eternal dark horse. Xhaka's leadership, tactical solidity, and tournament pedigree analyzed. KickOracle Group B 2026 prediction.",
    ogTitle: "Switzerland World Cup 2026: The Team That Always Overachieves",
  },
  canada: {
    title: "Canada World Cup 2026 Prediction & Squad Analysis | KickOracle",
    description:
      "Canada co-host 2026 with Alphonso Davies and Jonathan David leading the charge. Full Group B analysis, squad chemistry, and KickOracle World Cup 2026 prediction.",
    ogTitle: "Canada World Cup 2026: Alphonso Davies and the Home Nation Dream",
  },
  qatar: {
    title: "Qatar World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Qatar return to the World Cup without home advantage. Can the 2022 hosts compete in Group B? Full KickOracle analysis, squad depth, and group stage prediction.",
    ogTitle: "Qatar World Cup 2026: Can the 2022 Hosts Compete Without Home Advantage?",
  },
  italy: {
    title: "Italy World Cup 2026 Prediction & Squad Analysis | KickOracle",
    description:
      "Italy return after missing the 2022 World Cup. Spalletti's rebuilt Azzurri analyzed by KickOracle AI. Group B prediction, squad depth, and title chances for 2026.",
    ogTitle: "Italy World Cup 2026: The Azzurri's Grand Return After Missing Qatar",
  },

  // ─── GROUP C ──────────────────────────────────────────────────────────────
  morocco: {
    title: "Morocco World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Morocco: 2022 semi-finalists back for more. Hakimi, Amrabat, and Regragui's tactical genius analyzed. KickOracle AI prediction for Morocco's World Cup 2026 Group C campaign.",
    ogTitle: "Morocco World Cup 2026: Can the Atlas Lions Reach the Final?",
  },
  brazil: {
    title: "Brazil World Cup 2026 Prediction & Squad Analysis | KickOracle",
    description:
      "Vinicius Junior leads Brazil's title charge. Five-time champions' chemistry, squad depth, and tactical DNA analyzed by KickOracle AI for World Cup 2026 Group C.",
    ogTitle: "Brazil World Cup 2026: Can the Seleção End Their 24-Year Title Drought?",
  },
  scotland: {
    title: "Scotland World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Scotland return to the World Cup after 28 years. Robertson, McTominay, and Clarke's system analyzed. Full Group C prediction and World Cup 2026 squad review.",
    ogTitle: "Scotland World Cup 2026: The 28-Year Wait Is Over — Can They Advance?",
  },
  haiti: {
    title: "Haiti World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Haiti's second-ever World Cup appearance. The Caribbean nation's 2026 campaign in Group C analyzed by KickOracle. Squad depth, history, and group stage prediction.",
    ogTitle: "Haiti World Cup 2026: Carrying the Legacy of 1974's Emmanuel Sanon",
  },

  // ─── GROUP D ──────────────────────────────────────────────────────────────
  usa: {
    title: "USA World Cup 2026 Prediction & Squad Analysis | KickOracle",
    description:
      "USMNT co-hosts their home World Cup. Pulisic, Bellingham-rival Reyna, Pochettino's system. Full Group D prediction and KickOracle AI analysis for USA 2026.",
    ogTitle: "USA World Cup 2026: America's Football Moment Has Finally Arrived",
  },
  paraguay: {
    title: "Paraguay World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Paraguay in Group D 2026: CONMEBOL's grinders face USA, Turkey, and Australia. Full KickOracle squad analysis, chemistry index, and group stage prediction.",
    ogTitle: "Paraguay World Cup 2026: South America's Resilient Qualifiers Analyzed",
  },
  australia: {
    title: "Australia World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Socceroos target another deep tournament run after 2022's quarter-finals. Mitchell Duke and the Australian squad analyzed. KickOracle Group D 2026 prediction.",
    ogTitle: "Australia World Cup 2026: Can the Socceroos Repeat Their 2022 Magic?",
  },
  turkey: {
    title: "Turkey World Cup 2026 Prediction & Squad Analysis | KickOracle",
    description:
      "Çalhanoğlu, Kadıoğlu, Montella's system — Turkey are Group D's most dangerous dark horse. Full KickOracle analysis and World Cup 2026 prediction for the Crescent Stars.",
    ogTitle: "Turkey World Cup 2026: The Sleeping Giant Ready to Make Noise Again",
  },

  // ─── GROUP E ──────────────────────────────────────────────────────────────
  germany: {
    title: "Germany World Cup 2026 Prediction & Squad Analysis | KickOracle",
    description:
      "Musiala, Wirtz, Nagelsmann's high-press system. Germany seek redemption after two consecutive group exits. Full Group E prediction and KickOracle AI analysis.",
    ogTitle: "Germany World Cup 2026: Can Musiala and Nagelsmann End the Group-Stage Curse?",
  },
  "ivory-coast": {
    title: "Ivory Coast World Cup 2026 Prediction | KickOracle",
    description:
      "Ivory Coast — AFCON 2023 champions — bring Haller, Adingra, and African grit to Group E. Full KickOracle analysis, squad chemistry, and World Cup 2026 prediction.",
    ogTitle: "Ivory Coast World Cup 2026: AFCON Champions Target Group Stage Progression",
  },
  ecuador: {
    title: "Ecuador World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Ecuador in Group E: Enner Valencia's experience meets Beccacece's tactical rigor. Full KickOracle AI analysis, squad depth, and World Cup 2026 group stage prediction.",
    ogTitle: "Ecuador World Cup 2026: South American Resilience Meets European Quality",
  },
  curacao: {
    title: "Curaçao World Cup 2026 Debut Prediction | KickOracle",
    description:
      "Curaçao make World Cup history — 150,000 people, one epic debut in Group E. Full KickOracle analysis of the Caribbean island's maiden World Cup 2026 campaign.",
    ogTitle: "Curaçao World Cup 2026: The World's Smallest World Cup Nation Debuts",
  },

  // ─── GROUP F ──────────────────────────────────────────────────────────────
  netherlands: {
    title: "Netherlands World Cup 2026 Prediction | KickOracle",
    description:
      "Van Dijk, Gakpo, Koeman's Oranje — can the Netherlands finally win the title that has eluded them three times? Full Group F analysis and KickOracle 2026 prediction.",
    ogTitle: "Netherlands World Cup 2026: Three Finals, Zero Titles — Is 2026 Their Year?",
  },
  japan: {
    title: "Japan World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Japan beat Germany AND Spain in 2022. Can they go deeper in 2026? Moriyasu's system, European squad depth analyzed by KickOracle AI for World Cup 2026 Group F.",
    ogTitle: "Japan World Cup 2026: The Giant-Killers Return for Another Deep Run",
  },
  tunisia: {
    title: "Tunisia World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Tunisia in Group F: defensive discipline against Netherlands, Japan, and Ukraine. Full KickOracle squad analysis, chemistry index, and World Cup 2026 group prediction.",
    ogTitle: "Tunisia World Cup 2026: Africa's Organized Defenders Face Europe's Elite",
  },
  ukraine: {
    title: "Ukraine World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Mudryk, Zinchenko, and Ukraine's emotional World Cup return. Full KickOracle AI analysis of their squad chemistry, Group F chances, and what this tournament means.",
    ogTitle: "Ukraine World Cup 2026: Football as Defiance — Mudryk's Time to Shine",
  },

  // ─── GROUP G ──────────────────────────────────────────────────────────────
  portugal: {
    title: "Portugal World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Bernardo Silva, Leão, Dias — Portugal's talent has never been deeper. Can they finally win a World Cup? Full Group G analysis and KickOracle AI prediction for 2026.",
    ogTitle: "Portugal World Cup 2026: The New Generation's Best Shot at World Cup Glory",
  },
  iran: {
    title: "Iran World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Iran in Group G: Azmoun's quality, Ghalenoei's defensive system vs Portugal and Belgium. Full KickOracle squad analysis and World Cup 2026 group stage prediction.",
    ogTitle: "Iran World Cup 2026: Middle East's Most Organized Nation Targets Points",
  },
  belgium: {
    title: "Belgium World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "De Bruyne, Lukaku, Courtois — Belgium's golden generation's last World Cup? Full KickOracle AI analysis of their chemistry, Group G chances, and title potential.",
    ogTitle: "Belgium World Cup 2026: The Golden Generation's Final Dance",
  },
  egypt: {
    title: "Egypt World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Mohamed Salah's World Cup stage, finally. Egypt's 2026 campaign in Group G analyzed by KickOracle AI — squad chemistry, key players, and group stage prediction.",
    ogTitle: "Egypt World Cup 2026: Salah's Last Chance to Shine on Football's Biggest Stage",
  },

  // ─── GROUP H ──────────────────────────────────────────────────────────────
  spain: {
    title: "Spain World Cup 2026 Prediction & Squad Analysis | KickOracle",
    description:
      "Euro 2024 champions Spain with Lamine Yamal, Pedri, Rodri. Are they the 2026 World Cup favorites? Full Group H analysis and KickOracle AI prediction.",
    ogTitle: "Spain World Cup 2026: Euro Champions Gunning for a Second World Cup Title",
  },
  "cabo-verde": {
    title: "Cabo Verde World Cup 2026 Debut Prediction | KickOracle",
    description:
      "Cabo Verde make their historic World Cup debut in Group H. 550,000 people, one grand stage. Full KickOracle analysis of their 2026 World Cup campaign.",
    ogTitle: "Cabo Verde World Cup 2026: The Atlantic Islands' Football Fairy Tale",
  },
  "saudi-arabia": {
    title: "Saudi Arabia World Cup 2026 Prediction | KickOracle",
    description:
      "Saudi Arabia shocked Argentina in 2022. Can they do it again in 2026? Renard's system, Al-Dawsari's impact analyzed. Full Group H KickOracle prediction.",
    ogTitle: "Saudi Arabia World Cup 2026: The Team That Shocked Argentina Returns",
  },
  serbia: {
    title: "Serbia World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Vlahović, Milinković-Savić, Stojković's system — Serbia's talent pool is enormous. Will they finally match it with results? Full Group H KickOracle AI prediction.",
    ogTitle: "Serbia World Cup 2026: World-Class Talent Searching for World-Class Results",
  },

  // ─── GROUP I ──────────────────────────────────────────────────────────────
  france: {
    title: "France World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Kylian Mbappé and France target a record third World Cup title. Defending finalists' squad chemistry, depth, and Group I analysis from KickOracle AI.",
    ogTitle: "France World Cup 2026: Can Mbappé Finally Win It as the Undisputed Leader?",
  },
  senegal: {
    title: "Senegal World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "AFCON champions Senegal with Sadio Mané, Édouard Mendy, and Aliou Cissé's system. Full Group I analysis and KickOracle AI World Cup 2026 prediction.",
    ogTitle: "Senegal World Cup 2026: Africa's Most Complete Team Target Deep Run",
  },
  norway: {
    title: "Norway World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Erling Haaland and Ødegaard lead Norway's first World Cup in 28 years. Full Group I analysis, chemistry index, and KickOracle AI prediction for Norway 2026.",
    ogTitle: "Norway World Cup 2026: Haaland Arrives at the World's Greatest Stage",
  },

  // ─── GROUP J ──────────────────────────────────────────────────────────────
  argentina: {
    title: "Argentina World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Defending champions Argentina with Álvarez, Martínez, and Scaloni's proven system. Full Group J analysis and KickOracle AI prediction for Argentina's title defense.",
    ogTitle: "Argentina World Cup 2026: Can the Champions Make It Back-to-Back?",
  },
  algeria: {
    title: "Algeria World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Riyad Mahrez at a World Cup — finally. Algeria's 2026 Group J campaign, squad depth, and title ambitions analyzed by KickOracle AI. Can they go deeper than 2014?",
    ogTitle: "Algeria World Cup 2026: Mahrez's Last Chance at a World Cup Statement",
  },
  austria: {
    title: "Austria World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Rangnick's high-press Austria in Group J: a tactically sophisticated challenger to Argentina and Algeria. Full KickOracle squad analysis and 2026 World Cup prediction.",
    ogTitle: "Austria World Cup 2026: Rangnick's Pressing Machine Targets Advancement",
  },
  jordan: {
    title: "Jordan World Cup 2026 Debut Prediction | KickOracle",
    description:
      "Jordan make their historic World Cup debut in Group J. Asian football's milestone moment analyzed by KickOracle AI — squad, history, and group stage predictions.",
    ogTitle: "Jordan World Cup 2026: The Nashama's Historic First World Cup Appearance",
  },

  // ─── GROUP K ──────────────────────────────────────────────────────────────
  colombia: {
    title: "Colombia World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Luis Díaz, James Rodríguez, Copa América finalists — Colombia are Group K's dominant force. Full KickOracle AI analysis, squad chemistry, and World Cup 2026 prediction.",
    ogTitle: "Colombia World Cup 2026: Copa América Finalists Target Quarter-Final and Beyond",
  },
  cameroon: {
    title: "Cameroon World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Onana, Mbeumo, and Africa's most storied World Cup nation. Cameroon's Group K campaign analyzed by KickOracle AI — squad depth, chemistry, and 2026 prediction.",
    ogTitle: "Cameroon World Cup 2026: The Indomitable Lions Target Another Deep Run",
  },
  uzbekistan: {
    title: "Uzbekistan World Cup 2026 Historic Debut | KickOracle",
    description:
      "Uzbekistan make World Cup history as Central Asia's first-ever qualifier. Full KickOracle analysis of their Group K campaign, Shomurodov's role, and debut prediction.",
    ogTitle: "Uzbekistan World Cup 2026: Central Asia's First World Cup Nation Analyzed",
  },

  // ─── GROUP L ──────────────────────────────────────────────────────────────
  england: {
    title: "England World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Jude Bellingham, Harry Kane, Thomas Tuchel's system — England's best squad in decades. Full Group L analysis and KickOracle AI prediction. Is 2026 coming home?",
    ogTitle: "England World Cup 2026: 60 Years of Hurt and the Squad to End It",
  },
  ghana: {
    title: "Ghana World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Mohammed Kudus, Thomas Partey, and the Black Stars' 2026 ambitions in Group L. Full KickOracle squad analysis, chemistry index, and World Cup group stage prediction.",
    ogTitle: "Ghana World Cup 2026: Kudus and Partey Target a 2010 Repeat and Beyond",
  },
  croatia: {
    title: "Croatia World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Modrić's farewell tournament. Croatia — 2018 finalists, 2022 third place — analyzed by KickOracle AI. Full Group L prediction and title chances for the 2026 World Cup.",
    ogTitle: "Croatia World Cup 2026: Modrić's Final Act and One More Deep Run",
  },
  panama: {
    title: "Panama World Cup 2026 Prediction & Analysis | KickOracle",
    description:
      "Panama return to the World Cup for only their second appearance. Group L campaign with England, Croatia, and Ghana analyzed by KickOracle AI. Full 2026 prediction.",
    ogTitle: "Panama World Cup 2026: CONCACAF's Passionate Warriors Return to the Stage",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMMATIC DESCRIPTION GENERATORS
// ─────────────────────────────────────────────────────────────────────────────
//
// Surfaces with hundreds-to-thousands of pages need unique meta descriptions
// per page to avoid Google's "duplicate description" CTR penalty. These
// helpers take small typed inputs (data we already have in this repo) and
// emit descriptions that:
//   1. stay under MAX_META_DESCRIPTION_LENGTH characters (155),
//   2. vary phrasing across rows so the descriptions are not identical
//      templates,
//   3. include the high-value entities (player name, team, position, city,
//      country, etc.) that Google uses for snippet relevance.
//
// We deliberately avoid machine-translating to all 19 locales. For non-English
// locales, downstream callers can wire next-intl message keys or, until those
// translations land, fall back to the English description (better than the
// homepage default).

/** Hard cap for meta descriptions — Google truncates around 155–160 chars. */
export const MAX_META_DESCRIPTION_LENGTH = 155

/** Truncate to <= max chars at a word boundary, appending "…" when cut. */
export function truncateForMeta(input: string, max = MAX_META_DESCRIPTION_LENGTH): string {
  if (input.length <= max) return input
  // Reserve room for the ellipsis.
  const room = max - 1
  const sliced = input.slice(0, room)
  const lastSpace = sliced.lastIndexOf(' ')
  const cut = lastSpace > room * 0.6 ? sliced.slice(0, lastSpace) : sliced
  return `${cut.replace(/[\s\.,;:!?-]+$/, '')}…`
}

/**
 * Deterministically pick one entry from a list given a string key. We use a
 * tiny FNV-1a-ish hash so descriptions stay stable across builds for the
 * same player/team/etc. (deterministic SSR, no flicker).
 */
function pickVariant<T>(key: string, variants: readonly T[]): T {
  if (variants.length === 0) {
    throw new Error('pickVariant requires at least one variant')
  }
  let hash = 2166136261
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }
  return variants[hash % variants.length]
}

// ─── PLAYER (canonical: /teams/{slug}/players/{playerSlug}) ────────────────

export interface PlayerDescriptionInput {
  name: string
  position: string // 'GK' | 'DEF' | 'MID' | 'FWD'
  team: string
  club?: string
  age?: number
  caps?: number
  goals?: number
  rating?: number
  /** Stable key for variant selection — usually the player's slug. */
  slug: string
}

const POSITION_PHRASE: Record<string, string> = {
  GK: 'goalkeeper',
  DEF: 'defender',
  MID: 'midfielder',
  FWD: 'forward',
}

const PLAYER_VARIANTS: ReadonlyArray<(p: PlayerDescriptionInput) => string> = [
  (p) => {
    const role = POSITION_PHRASE[p.position] ?? p.position
    const ageBlurb = p.age ? `${p.age}-year-old ` : ''
    const extras = p.rating ? `, KickOracle rating ${p.rating}/10` : ''
    return `${p.name}: ${ageBlurb}${role} for ${p.team}${p.club ? ` (${p.club})` : ''}${extras}. World Cup 2026 scouting report and form analysis.`
  },
  (p) => {
    const role = POSITION_PHRASE[p.position] ?? p.position
    const stats = p.caps && p.goals !== undefined ? `${p.caps} caps, ${p.goals} goals` : 'full stats'
    return `${p.team} ${role} ${p.name} at World Cup 2026 — ${stats}, fitness signals, and AI tactical breakdown from KickOracle.`
  },
  (p) => {
    const role = POSITION_PHRASE[p.position] ?? p.position
    const clubLine = p.club ? `Plays his club football at ${p.club}.` : 'Squad role and key matchups inside.'
    return `Scouting ${p.name}, ${p.team}'s ${role} for World Cup 2026. ${clubLine} Read the full KickOracle profile.`
  },
  (p) => {
    const role = POSITION_PHRASE[p.position] ?? p.position
    return `${p.name} (${p.team}, ${role}) World Cup 2026 profile: form, fitness, expected role, and predicted impact — AI scouting by KickOracle.`
  },
  (p) => {
    const ageBlurb = p.age ? `Age ${p.age}.` : ''
    const role = POSITION_PHRASE[p.position] ?? p.position
    return `Inside ${p.name}'s World Cup 2026 case for ${p.team}. ${ageBlurb} ${role.charAt(0).toUpperCase()}${role.slice(1)} stats, club form, and selection risk.`
  },
  (p) => {
    const role = POSITION_PHRASE[p.position] ?? p.position
    const club = p.club ? `${p.club} ` : ''
    return `${club}${role} ${p.name} for ${p.team} — World Cup 2026 ratings, key numbers, and tactical fit, scouted by KickOracle.`
  },
]

export function playerDescriptionEn(player: PlayerDescriptionInput): string {
  const variant = pickVariant(`player:${player.slug}`, PLAYER_VARIANTS)
  return truncateForMeta(variant(player))
}

// ─── "Is X playing in WC 2026?" (status pages) ──────────────────────────────

export interface PlayerStatusDescriptionInput {
  name: string
  team: string
  statusLabel: string // e.g. 'Confirmed', 'Doubtful'
  reason?: string
  updatedLabel?: string // human-formatted date
}

export function playerStatusDescriptionEn(input: PlayerStatusDescriptionInput): string {
  const reason = input.reason ? ` ${input.reason.replace(/\s+/g, ' ').trim()}` : ''
  const updated = input.updatedLabel ? ` Last updated ${input.updatedLabel}.` : ''
  const base = `Is ${input.name} playing at the 2026 World Cup? Status: ${input.statusLabel} for ${input.team}.${reason}${updated}`
  return truncateForMeta(base)
}

// ─── CITY (canonical detail page) ───────────────────────────────────────────

export interface CityDescriptionInput {
  name: string
  country: string
  venueNames?: string[]
  matchCount?: number
  highlight?: string
}

const CITY_VARIANTS: ReadonlyArray<(c: CityDescriptionInput) => string> = [
  (c) => {
    const venue = c.venueNames?.[0] ? ` Hosted at ${c.venueNames[0]}.` : ''
    const matches = c.matchCount ? ` ${c.matchCount} matches.` : ''
    return `${c.name}, ${c.country} — World Cup 2026 host city guide.${venue}${matches} Travel, tickets, hotels, food.`
  },
  (c) => {
    const venue = c.venueNames?.[0] ? `${c.venueNames[0]}, ` : ''
    return `Plan your World Cup 2026 trip to ${c.name}: ${venue}stadium info, transport, ticket tiers, and where to stay.`
  },
  (c) => {
    const matches = c.matchCount ? `${c.matchCount} fixtures` : 'every fixture'
    return `${c.name} (${c.country}) at World Cup 2026 — ${matches}, venue logistics, fan zones, and KickOracle's local guide.`
  },
]

export function cityDescriptionEn(input: CityDescriptionInput, slugKey: string): string {
  const variant = pickVariant(`city:${slugKey}`, CITY_VARIANTS)
  return truncateForMeta(variant(input))
}

// ─── CITY SUBPAGES (tickets/hotels/transport/food/stadium/schedule/costs) ──

export type CitySubpageKind =
  | 'tickets'
  | 'costs'
  | 'schedule'
  | 'transport'
  | 'hotels'
  | 'stadium'
  | 'food'

export interface CitySubpageDescriptionInput {
  cityName: string
  country: string
  /** Optional surface-specific detail to vary copy. */
  hotelAvgUsd?: number
  airportCode?: string
  venueName?: string
  matchCount?: number
  foodSpecialty?: string
  tipPercentage?: number
}

export function citySubpageDescriptionEn(
  kind: CitySubpageKind,
  input: CitySubpageDescriptionInput
): string {
  switch (kind) {
    case 'tickets':
      return truncateForMeta(
        `World Cup 2026 ticket prices for ${input.cityName} (${input.country}): Category 1–4 tiers, group stage to final pricing, and FIFA portal walkthrough.`
      )
    case 'costs': {
      const hotel = input.hotelAvgUsd ? ` Hotels avg $${input.hotelAvgUsd}/night.` : ''
      return truncateForMeta(
        `7-night World Cup 2026 trip cost for ${input.cityName}: lodging, food, transport, and ticket spend broken down by budget tier.${hotel}`
      )
    }
    case 'schedule': {
      const matches = input.matchCount ? `${input.matchCount} matches` : 'every match'
      return truncateForMeta(
        `${input.cityName} World Cup 2026 schedule: ${matches} with kickoff times (local), teams, groups, and venue notes.`
      )
    }
    case 'transport': {
      const airport = input.airportCode ? `${input.airportCode} airport, ` : ''
      return truncateForMeta(
        `Getting around ${input.cityName} during World Cup 2026: ${airport}public transit, rideshare, stadium access, and walkability tips.`
      )
    }
    case 'hotels': {
      const avg = input.hotelAvgUsd ? `~$${input.hotelAvgUsd}/night` : 'pricing tiers'
      return truncateForMeta(
        `Best ${input.cityName} hotels for World Cup 2026: ${avg}, fan-zone proximity, and neighborhoods to book before prices surge.`
      )
    }
    case 'stadium': {
      const venue = input.venueName ?? 'the host stadium'
      return truncateForMeta(
        `${venue} guide for World Cup 2026 in ${input.cityName}: capacity, climate, fixtures, gates, and the smartest way in.`
      )
    }
    case 'food': {
      const specialty = input.foodSpecialty ? ` Try the ${input.foodSpecialty}.` : ''
      const tip = input.tipPercentage ? ` Tipping ${input.tipPercentage}%.` : ''
      return truncateForMeta(
        `What and where to eat in ${input.cityName} during World Cup 2026.${specialty}${tip} Local picks beyond the tourist trail.`
      )
    }
  }
}

// ─── /cities/from/{country} ─────────────────────────────────────────────────

export interface FromCountryDescriptionInput {
  countryName: string
  needsUsVisa: boolean
  flightHours: number
  flightCostBudget: number
  nearestCity?: string
}

export function citiesFromCountryDescriptionEn(input: FromCountryDescriptionInput): string {
  const visa = input.needsUsVisa ? 'US visa required' : 'no US visa needed'
  const cost = input.flightCostBudget > 0 ? ` from ~$${input.flightCostBudget}` : ''
  const nearest = input.nearestCity ? ` ${input.nearestCity} is the closest hub.` : ''
  return truncateForMeta(
    `Best World Cup 2026 host cities for fans from ${input.countryName}: ${visa}, ~${input.flightHours}h flights${cost}.${nearest}`
  )
}

// ─── /travel/from/{country} ─────────────────────────────────────────────────

export function travelFromCountryDescriptionEn(input: FromCountryDescriptionInput): string {
  const visa = input.needsUsVisa ? 'visa, ' : ''
  const cost = input.flightCostBudget > 0 ? `flights from ~$${input.flightCostBudget}` : 'short-haul flights'
  return truncateForMeta(
    `World Cup 2026 trip planner for ${input.countryName} fans: ${visa}${cost}, full 7-night budget, and the smartest base cities.`
  )
}

// ─── MATCH (live) ───────────────────────────────────────────────────────────

export interface MatchDescriptionInput {
  homeTeam: string
  awayTeam: string
  group: string
  venue: string
  city: string
  kickoffLocal?: string
  matchKey: string
}

const MATCH_VARIANTS: ReadonlyArray<(m: MatchDescriptionInput) => string> = [
  (m) => {
    const ko = m.kickoffLocal ? ` Kickoff ${m.kickoffLocal}.` : ''
    return `${m.homeTeam} vs ${m.awayTeam} (Group ${m.group}) at ${m.venue}, ${m.city}.${ko} Live predictions, lineups, and stats from KickOracle.`
  },
  (m) => `Group ${m.group} World Cup 2026: ${m.homeTeam} face ${m.awayTeam} at ${m.venue} in ${m.city}. AI predictions, real-time stats, and head-to-head.`,
  (m) => `${m.homeTeam}-${m.awayTeam} preview, lineups, and live predictions. World Cup 2026 Group ${m.group}, ${m.city} (${m.venue}).`,
]

export function matchDescriptionEn(input: MatchDescriptionInput): string {
  const variant = pickVariant(`match:${input.matchKey}`, MATCH_VARIANTS)
  return truncateForMeta(variant(input))
}

// ─── STADIUM ────────────────────────────────────────────────────────────────

export interface StadiumDescriptionInput {
  name: string
  city: string
  country: string
  capacity?: number
  matchCount?: number
}

export function stadiumDescriptionEn(input: StadiumDescriptionInput): string {
  const cap = input.capacity ? `, capacity ${input.capacity.toLocaleString()}` : ''
  const matches = input.matchCount ? `, ${input.matchCount} fixtures` : ''
  return truncateForMeta(
    `${input.name} in ${input.city}, ${input.country} — World Cup 2026 venue${cap}${matches}. Climate, access, and what to expect on matchday.`
  )
}

// ─── TEAM QUALIFIED page ────────────────────────────────────────────────────

export interface TeamQualifiedDescriptionInput {
  teamName: string
  group: string
  qualLabel: string // 'Qualified' | 'Playoff Entry'
  fifaRanking?: number
}

export function teamQualifiedDescriptionEn(input: TeamQualifiedDescriptionInput): string {
  const rank = input.fifaRanking ? `, FIFA rank #${input.fifaRanking}` : ''
  return truncateForMeta(
    `Is ${input.teamName} in the 2026 World Cup? Status: ${input.qualLabel}. Group ${input.group}${rank}. Squad availability and key player tracker.`
  )
}

// ─── BLOG fallback (when post lacks .description) ───────────────────────────

/**
 * Best-effort excerpt from a blog post body for use as a meta description.
 * Strips HTML/Markdown noise and trims to MAX_META_DESCRIPTION_LENGTH.
 */
export function blogExcerptFallback(rawBody: string): string {
  const text = rawBody
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~\[\]\(\)]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return truncateForMeta(text)
}

