/**
 * Compare matchup helpers — schema, FAQ, TL;DR, key differences.
 *
 * Co-located with the route so it can stay self-contained without
 * touching shared lib code. All functions are pure derivations from
 * the data already loaded by `getHeadToHead()` in compare-utils.
 */
import type { HeadToHeadData } from '@/lib/compare-utils'
import type { H2HRecord } from '@/data/h2h-history'
import type { Team } from '@/lib/types'

/* -------------------------------------------------------------------------- */
/*                                Site URL                                    */
/* -------------------------------------------------------------------------- */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  'https://kickoracle.com'

function urlFor(locale: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}/${locale}${normalized === '/' ? '' : normalized}`
}

/* -------------------------------------------------------------------------- */
/*                                  Verbal                                    */
/* -------------------------------------------------------------------------- */

/** Determine the favored team given the win-probability split. */
export function favoredTeam(data: HeadToHeadData): { name: string; slug: string; margin: number } {
  const { teamA, teamB, prediction } = data
  const margin = Math.abs(prediction.teamAWin - prediction.teamBWin)
  const aIsFav = prediction.teamAWin >= prediction.teamBWin
  return {
    name: aIsFav ? teamA.name : teamB.name,
    slug: aIsFav ? teamA.slug : teamB.slug,
    margin: Math.round(margin * 100),
  }
}

/** 2-3 sentence answer to "Who's better, A or B?" — for AI Overview / snippet quoting. */
export function buildTldr(data: HeadToHeadData): string {
  const { teamA, teamB, prediction, squadA, squadB } = data
  const fav = favoredTeam(data)
  const underdog = fav.slug === teamA.slug ? teamB : teamA
  const favWinPct = Math.round(
    (fav.slug === teamA.slug ? prediction.teamAWin : prediction.teamBWin) * 100,
  )
  const drawPct = Math.round(prediction.draw * 100)
  const ratingDelta = Math.abs(squadA.avgRating - squadB.avgRating).toFixed(1)
  const closer = fav.margin < 5

  if (closer) {
    return `${teamA.name} and ${teamB.name} are nearly inseparable on paper for the 2026 World Cup. Our model gives ${fav.name} a slim ${favWinPct}% win probability versus ${underdog.name}, with a ${drawPct}% chance of a draw — average squad ratings differ by just ${ratingDelta} points. Expect a tight, tactical encounter where in-match decisions and individual quality decide it.`
  }
  return `${fav.name} are favored over ${underdog.name} at the 2026 World Cup, with our AI model projecting a ${favWinPct}% win probability for ${fav.name} versus ${100 - favWinPct - drawPct}% for ${underdog.name} (and ${drawPct}% for a draw). The edge is driven primarily by ${fav.name}'s ${(fav.slug === teamA.slug ? teamA : teamB).chemistry > (underdog.chemistry) ? 'higher squad chemistry' : 'stronger FIFA ranking'}, though ${underdog.name} remain capable of an upset on tournament form.`
}

/* -------------------------------------------------------------------------- */
/*                              Key differences                               */
/* -------------------------------------------------------------------------- */

export interface KeyDifference {
  label: string
  detail: string
}

/** 5-6 bullet "key differences" for the on-page list. */
export function buildKeyDifferences(data: HeadToHeadData, h2h?: H2HRecord): KeyDifference[] {
  const { teamA, teamB, squadA, squadB, historyA, historyB } = data
  const bullets: KeyDifference[] = []

  // FIFA ranking
  const rankBetter = teamA.fifaRanking < teamB.fifaRanking ? teamA : teamB
  const rankGap = Math.abs(teamA.fifaRanking - teamB.fifaRanking)
  bullets.push({
    label: 'FIFA Ranking',
    detail:
      rankGap === 0
        ? `Both teams are level on the FIFA ranking (${teamA.fifaRanking}).`
        : `${rankBetter.name} sit ${rankGap} place${rankGap === 1 ? '' : 's'} higher on the FIFA ranking (#${rankBetter.fifaRanking} vs #${rankBetter.slug === teamA.slug ? teamB.fifaRanking : teamA.fifaRanking}).`,
  })

  // Chemistry
  const chemBetter = teamA.chemistry > teamB.chemistry ? teamA : teamB
  const chemGap = Math.abs(teamA.chemistry - teamB.chemistry)
  bullets.push({
    label: 'Squad Chemistry',
    detail:
      chemGap < 3
        ? `Squad chemistry is essentially tied (${teamA.name} ${teamA.chemistry}, ${teamB.name} ${teamB.chemistry}).`
        : `${chemBetter.name} have stronger squad cohesion (${chemBetter.chemistry}/100 vs ${chemBetter.slug === teamA.slug ? teamB.chemistry : teamA.chemistry}/100).`,
  })

  // Average squad rating
  const avgBetter = squadA.avgRating > squadB.avgRating ? teamA : teamB
  const avgGap = Math.abs(squadA.avgRating - squadB.avgRating)
  bullets.push({
    label: 'Average Squad Rating',
    detail:
      avgGap < 0.2
        ? `The two squads are rated within 0.2 of each other on average (${teamA.name} ${squadA.avgRating}, ${teamB.name} ${squadB.avgRating}).`
        : `${avgBetter.name} carry the higher average player rating (${avgBetter.slug === teamA.slug ? squadA.avgRating : squadB.avgRating} vs ${avgBetter.slug === teamA.slug ? squadB.avgRating : squadA.avgRating}).`,
  })

  // Total caps (experience)
  const capsBetter = squadA.totalCaps > squadB.totalCaps ? teamA : teamB
  bullets.push({
    label: 'International Experience',
    detail: `${capsBetter.name} bring more combined caps to the squad (${capsBetter.slug === teamA.slug ? squadA.totalCaps : squadB.totalCaps} vs ${capsBetter.slug === teamA.slug ? squadB.totalCaps : squadA.totalCaps}).`,
  })

  // Titles / history
  const titlesA = historyA?.titlesWon ?? 0
  const titlesB = historyB?.titlesWon ?? 0
  if (titlesA !== titlesB) {
    const titleBetter = titlesA > titlesB ? teamA : teamB
    bullets.push({
      label: 'World Cup Titles',
      detail: `${titleBetter.name} have won ${Math.max(titlesA, titlesB)} World Cup${Math.max(titlesA, titlesB) === 1 ? '' : 's'}; ${titleBetter.slug === teamA.slug ? teamB.name : teamA.name} have ${Math.min(titlesA, titlesB)}.`,
    })
  } else if (titlesA > 0) {
    bullets.push({
      label: 'World Cup Titles',
      detail: `Both nations are former World Cup winners (${titlesA} title${titlesA === 1 ? '' : 's'} apiece).`,
    })
  } else {
    bullets.push({
      label: 'World Cup Titles',
      detail: `Neither side has won a World Cup; both are chasing a first title in 2026.`,
    })
  }

  // H2H
  if (h2h) {
    const isAFirst = h2h.teamA === teamA.slug
    const aWins = isAFirst ? h2h.teamAWins : h2h.teamBWins
    const bWins = isAFirst ? h2h.teamBWins : h2h.teamAWins
    bullets.push({
      label: 'Head-to-Head History',
      detail: `In ${h2h.totalMatches} all-time meetings, ${teamA.name} have won ${aWins}, ${teamB.name} have won ${bWins}, with ${h2h.draws} draws (last result: ${h2h.lastResult}).`,
    })
  }

  return bullets.slice(0, 6)
}

/* -------------------------------------------------------------------------- */
/*                                   FAQ                                      */
/* -------------------------------------------------------------------------- */

export interface MatchupFAQ {
  question: string
  answer: string
}

/** Build 4-6 FAQs tailored to this matchup. All answers derive from real data. */
export function buildMatchupFaqs(data: HeadToHeadData, h2h?: H2HRecord): MatchupFAQ[] {
  const { teamA, teamB, prediction, squadA, squadB, historyA, historyB, keyPlayerMatchups } = data
  const fav = favoredTeam(data)
  const favTeam: Team = fav.slug === teamA.slug ? teamA : teamB
  const otherTeam: Team = fav.slug === teamA.slug ? teamB : teamA
  const favWinPct = Math.round(
    (fav.slug === teamA.slug ? prediction.teamAWin : prediction.teamBWin) * 100,
  )
  const otherWinPct = Math.round(
    (otherTeam.slug === teamA.slug ? prediction.teamAWin : prediction.teamBWin) * 100,
  )
  const drawPct = Math.round(prediction.draw * 100)

  const faqs: MatchupFAQ[] = []

  // Q1: Who is favored?
  faqs.push({
    question: `Who is favored to win between ${teamA.name} and ${teamB.name} at the 2026 World Cup?`,
    answer:
      fav.margin < 5
        ? `${teamA.name} and ${teamB.name} are essentially even. Our AI model gives ${fav.name} a slight ${favWinPct}% win probability versus ${otherWinPct}% for ${otherTeam.name}, with a ${drawPct}% chance of a draw — within the model's noise range.`
        : `${fav.name} are favored, with a ${favWinPct}% projected win probability versus ${otherWinPct}% for ${otherTeam.name} and a ${drawPct}% chance of a draw. The edge comes from a combination of FIFA ranking, squad chemistry, and current form.`,
  })

  // Q2: Strongest attributes comparison
  const stats: Array<[string, number, number]> = [
    ['squad chemistry', teamA.chemistry, teamB.chemistry],
    ['team familiarity', teamA.familiarity, teamB.familiarity],
    ['tactical stability', teamA.stability, teamB.stability],
    ['squad morale', teamA.morale, teamB.morale],
  ]
  const aWinsCount = stats.filter(([, a, b]) => a > b).length
  const bWinsCount = stats.filter(([, a, b]) => b > a).length
  const aWinsList = stats.filter(([, a, b]) => a > b).map(([l]) => l)
  const bWinsList = stats.filter(([, a, b]) => b > a).map(([l]) => l)
  faqs.push({
    question: `What are ${teamA.name}'s strongest attributes versus ${teamB.name}?`,
    answer:
      aWinsCount === 0
        ? `${teamA.name} do not lead ${teamB.name} in any of the four chemistry metrics (chemistry, familiarity, stability, morale). ${teamA.name} will need to rely on individual quality and tactical execution to overcome ${teamB.name}'s edge in team cohesion.`
        : `${teamA.name} lead ${teamB.name} in ${aWinsList.join(', ')}. ${bWinsCount > 0 ? `${teamB.name}, in turn, have the edge in ${bWinsList.join(', ')}.` : `${teamB.name} do not lead in any of the four chemistry metrics.`}`,
  })

  // Q3: World Cup history / titles
  const titlesA = historyA?.titlesWon ?? 0
  const titlesB = historyB?.titlesWon ?? 0
  const appsA = historyA?.totalAppearances ?? 0
  const appsB = historyB?.totalAppearances ?? 0
  faqs.push({
    question: `What is the World Cup history of ${teamA.name} versus ${teamB.name}?`,
    answer: `${teamA.name} have appeared in ${appsA} FIFA World Cups and won ${titlesA} title${titlesA === 1 ? '' : 's'}; ${teamB.name} have appeared in ${appsB} World Cups and won ${titlesB} title${titlesB === 1 ? '' : 's'}. ${historyA?.bestFinish ? `${teamA.name}'s best finish is ${historyA.bestFinish}` : `${teamA.name} have not yet recorded a World Cup result we track`}; ${historyB?.bestFinish ? `${teamB.name}'s best finish is ${historyB.bestFinish}.` : `${teamB.name} have not yet recorded a tracked finish.`}`,
  })

  // Q4: Have they played each other?
  if (h2h) {
    const isAFirst = h2h.teamA === teamA.slug
    const aWins = isAFirst ? h2h.teamAWins : h2h.teamBWins
    const bWins = isAFirst ? h2h.teamBWins : h2h.teamAWins
    faqs.push({
      question: `Have ${teamA.name} and ${teamB.name} played each other before?`,
      answer: `Yes — ${teamA.name} and ${teamB.name} have met ${h2h.totalMatches} times in all competitions, including ${h2h.worldCupMeetings} World Cup encounter${h2h.worldCupMeetings === 1 ? '' : 's'}. ${teamA.name} have won ${aWins}, ${teamB.name} have won ${bWins}, and ${h2h.draws} ended in draws. The most recent meeting was ${h2h.lastResult}.`,
    })
  } else {
    faqs.push({
      question: `Have ${teamA.name} and ${teamB.name} faced each other in major international competition?`,
      answer: `${teamA.name} and ${teamB.name} have not been frequent opponents in our tracked head-to-head record set, which focuses on the most consequential international rivalries. The 2026 World Cup could provide one of their first high-stakes meetings on the global stage.`,
    })
  }

  // Q5: Key player matchup
  const topMatchup = keyPlayerMatchups.find((m) => m.position === 'Attack') ?? keyPlayerMatchups[0]
  if (topMatchup) {
    faqs.push({
      question: `Which players will define the ${teamA.name} versus ${teamB.name} match?`,
      answer: `${topMatchup.teamAPlayer.name} (${teamA.name}, ${topMatchup.teamAPlayer.club}, rated ${topMatchup.teamAPlayer.rating}/10) and ${topMatchup.teamBPlayer.name} (${teamB.name}, ${topMatchup.teamBPlayer.club}, rated ${topMatchup.teamBPlayer.rating}/10) are the standout ${topMatchup.position.toLowerCase()} players in this fixture. Their individual duel — and the ability of each side's defense to contain the other's top attacker — is likely to determine the outcome.`,
    })
  }

  // Q6: Squad-size / experience question
  faqs.push({
    question: `Which squad has more international experience: ${teamA.name} or ${teamB.name}?`,
    answer: `${squadA.totalCaps > squadB.totalCaps ? teamA.name : teamB.name} carry the more experienced squad, with ${Math.max(squadA.totalCaps, squadB.totalCaps)} combined senior caps versus ${Math.min(squadA.totalCaps, squadB.totalCaps)} for ${squadA.totalCaps > squadB.totalCaps ? teamB.name : teamA.name}. Average squad rating is ${squadA.avgRating} for ${teamA.name} and ${squadB.avgRating} for ${teamB.name}.`,
  })

  return faqs.slice(0, 6)
}

/* -------------------------------------------------------------------------- */
/*                                  Schema                                    */
/* -------------------------------------------------------------------------- */

/**
 * Build a SportsTeam node referencing the canonical team page via @id.
 * The link form (vs an inline copy) lets crawlers consolidate signals to the
 * authoritative team page.
 */
function buildSportsTeamNode(team: Team, locale: string) {
  const teamUrl = urlFor(locale, `/teams/${team.slug}`)
  return {
    '@type': 'SportsTeam',
    '@id': teamUrl,
    url: teamUrl,
    name: team.name,
    alternateName: `${team.name} national football team`,
    sport: 'Soccer',
    memberOf: [
      { '@type': 'SportsOrganization', name: 'FIFA', url: 'https://www.fifa.com' },
      { '@type': 'SportsOrganization', name: team.confederation },
    ],
    location: { '@type': 'Country', name: team.name },
    ...(team.coachName && { coach: { '@type': 'Person', name: team.coachName } }),
  }
}

function buildBreadcrumbNode(
  data: HeadToHeadData,
  matchup: string,
  locale: string,
) {
  const items = [
    { name: 'Home', path: '/' },
    { name: 'Predictions', path: '/predictions' },
    { name: 'Compare', path: '/compare' },
    { name: `${data.teamA.name} vs ${data.teamB.name}`, path: `/compare/${matchup}` },
  ]
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: urlFor(locale, c.path),
    })),
  }
}

function buildFaqNode(faqs: MatchupFAQ[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

function buildArticleNode(
  data: HeadToHeadData,
  matchup: string,
  locale: string,
  tldr: string,
) {
  const url = urlFor(locale, `/compare/${matchup}`)
  return {
    '@type': 'Article',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: `${data.teamA.name} vs ${data.teamB.name}: World Cup 2026 Head-to-Head`,
    description: tldr,
    inLanguage: locale,
    author: { '@type': 'Organization', name: 'KickOracle', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'KickOracle',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` },
    },
    about: [
      { '@id': urlFor(locale, `/teams/${data.teamA.slug}`) },
      { '@id': urlFor(locale, `/teams/${data.teamB.slug}`) },
    ],
  }
}

/**
 * Compose the full @graph for a compare-matchup page.
 * Emits SportsTeam × 2 + BreadcrumbList + FAQPage + Article, with @id
 * cross-references so Google can resolve the entities.
 */
export function buildMatchupGraph(args: {
  data: HeadToHeadData
  matchup: string
  locale: string
  faqs: MatchupFAQ[]
  tldr: string
  extraNodes?: Array<Record<string, unknown> | null | undefined>
}) {
  const { data, matchup, locale, faqs, tldr, extraNodes = [] } = args
  const blocks: Array<Record<string, unknown> | null | undefined> = [
    buildArticleNode(data, matchup, locale, tldr),
    buildSportsTeamNode(data.teamA, locale),
    buildSportsTeamNode(data.teamB, locale),
    buildBreadcrumbNode(data, matchup, locale),
    buildFaqNode(faqs),
    ...extraNodes,
  ]
  return {
    '@context': 'https://schema.org',
    '@graph': blocks
      .filter((b): b is Record<string, unknown> => Boolean(b))
      .map((b) => {
        const { ['@context']: _ctx, ...rest } = b
        return rest
      }),
  }
}
