/**
 * Client-side chat engine that answers World Cup 2026 questions
 * using the existing data (teams, players, matches, venues, etc.)
 */

import { TEAMS } from '@/data/teams-meta'
import { PLAYERS } from '@/data/players-data'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import type { Team, Player, MatchFixture } from '@/lib/types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// Normalize text for matching
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
}

// Find a team by name, slug, or partial match
function findTeam(query: string): Team | undefined {
  const q = normalize(query)
  return (
    TEAMS.find((t) => normalize(t.name) === q || normalize(t.slug) === q) ||
    TEAMS.find((t) => normalize(t.name).includes(q) || q.includes(normalize(t.name)))
  )
}

// Find teams in a group
function findTeamsByGroup(group: string): Team[] {
  return TEAMS.filter((t) => t.group.toUpperCase() === group.toUpperCase())
}

// Find players by team
function findPlayersByTeam(teamSlug: string): Player[] {
  return PLAYERS.filter((p) => p.teamSlug === teamSlug)
}

// Find a player by name
function findPlayer(query: string): Player | undefined {
  const q = normalize(query)
  return (
    PLAYERS.find((p) => normalize(p.name) === q) ||
    PLAYERS.find((p) => normalize(p.name).includes(q) || q.includes(normalize(p.name)))
  )
}

// Find matches for a team
function findMatchesForTeam(teamSlug: string): MatchFixture[] {
  return MATCH_FIXTURES.filter((f) => f.homeTeamSlug === teamSlug || f.awayTeamSlug === teamSlug)
}

// Format a team summary
function teamSummary(team: Team): string {
  return `**${team.flag} ${team.name}** (Group ${team.group})
- FIFA Ranking: #${team.fifaRanking}
- Coach: ${team.coachName}
- Chemistry Index: ${team.chemistry}/100
- Squad Morale: ${team.morale}/100
- Tactical Profile: ${team.archetypeMatch}

**Key Insight:** ${team.keyInsight}`
}

// Format a player summary
function playerSummary(player: Player): string {
  const team = findTeam(player.teamSlug)
  return `**${player.name}** (${player.position}) — ${team?.flag || ''} ${team?.name || player.teamSlug}
- Club: ${player.club}
- Age: ${player.age} | Caps: ${player.caps} | Goals: ${player.goals} | Assists: ${player.assists}
- Rating: ${player.rating}/100
- Fitness: ${player.fitnessStatus === 'green' ? 'Fit' : player.fitnessStatus === 'amber' ? 'Minor concern' : 'Injury risk'} — ${player.fitnessNote}
- Sentiment: ${player.sentimentLabel} (${player.sentimentScore}/100)`
}

// Format a match
function matchSummary(match: MatchFixture): string {
  const home = findTeam(match.homeTeamSlug)
  const away = findTeam(match.awayTeamSlug)
  const date = new Date(match.kickoffUtc)
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${home?.flag || ''} **${home?.name || match.homeTeamSlug}** vs ${away?.flag || ''} **${away?.name || match.awayTeamSlug}**
- ${match.round} | Group ${match.group}
- ${dateStr} at ${match.venue}, ${match.city}
- Win Probabilities: ${home?.name} ${match.homeWinProb}% | Draw ${match.drawProb}% | ${away?.name} ${match.awayWinProb}%`
}

// Get top contenders
function topContenders(): string {
  const top = [...TEAMS].sort((a, b) => a.fifaRanking - b.fifaRanking).slice(0, 10)
  const lines = top.map((t, i) => `${i + 1}. ${t.flag} **${t.name}** — FIFA #${t.fifaRanking}, Chemistry ${t.chemistry}/100`)
  return `**Top 10 Contenders for World Cup 2026:**\n\n${lines.join('\n')}`
}

// Dark horse teams
function darkHorses(): string {
  const horses = TEAMS.filter((t) => t.fifaRanking > 15 && t.fifaRanking <= 40 && t.chemistry >= 70)
    .sort((a, b) => b.chemistry - a.chemistry)
    .slice(0, 5)
  const lines = horses.map((t) => `- ${t.flag} **${t.name}** — FIFA #${t.fifaRanking}, Chemistry ${t.chemistry}/100. ${t.keyInsight.split(';')[0]}`)
  return `**Dark Horses to Watch:**\n\n${lines.join('\n')}`
}

// Group overview
function groupOverview(group: string): string {
  const teams = findTeamsByGroup(group)
  if (teams.length === 0) return `No teams found for Group ${group}.`

  const matches = MATCH_FIXTURES.filter((f) => f.group === group.toUpperCase())
  const teamLines = teams.map((t) => `- ${t.flag} **${t.name}** (FIFA #${t.fifaRanking}, Chemistry ${t.chemistry})`)
  const matchLines = matches.slice(0, 6).map((m) => {
    const h = findTeam(m.homeTeamSlug)
    const a = findTeam(m.awayTeamSlug)
    return `- ${h?.flag || ''} ${h?.name} vs ${a?.flag || ''} ${a?.name} (${h?.name} ${m.homeWinProb}% | Draw ${m.drawProb}% | ${a?.name} ${m.awayWinProb}%)`
  })

  return `**Group ${group.toUpperCase()}**\n\n**Teams:**\n${teamLines.join('\n')}\n\n**Fixtures:**\n${matchLines.join('\n')}`
}

// Quick stats
function quickStats(): string {
  return `**World Cup 2026 Quick Facts:**

- **48 teams** competing across **16 host cities** in 3 countries (USA, Canada, Mexico)
- **104 matches** from June 11 to July 19, 2026
- **12 groups** of 4 teams each
- First World Cup with 48 teams (expanded from 32)
- Co-hosted by United States, Canada, and Mexico
- Final at MetLife Stadium, New Jersey

Explore our [Teams](/teams), [Predictions](/predictions), and [Power Rankings](/power-rankings) for deeper analysis.`
}

// Suggested questions
const SUGGESTIONS = [
  'Who are the favorites to win?',
  'Tell me about Argentina',
  'Show me Group A',
  'Who are the dark horses?',
  'World Cup 2026 quick facts',
  'Compare Brazil and France',
]

export function getSuggestions(): string[] {
  return SUGGESTIONS
}

// Main answer function
export function generateAnswer(input: string): string {
  const q = normalize(input)

  // Greeting
  if (/^(hi|hello|hey|hola|bonjour|sup|yo)\b/.test(q)) {
    return `Hey! I'm the ScoutEdge AI assistant. Ask me anything about World Cup 2026 — teams, players, groups, predictions, or match schedules.

**Try asking:**
- "Who will win the World Cup?"
- "Tell me about Brazil"
- "Show me Group C"
- "Who are the dark horses?"`
  }

  // Quick stats / overview
  if (/quick\s*fact|overview|about\s*(the\s*)?world\s*cup|how\s*many\s*teams|when\s*(is|does)|where\s*is/.test(q)) {
    return quickStats()
  }

  // Favorites / who will win
  if (/favou?rite|who\s*(will|gonna|going\s*to)\s*win|top\s*teams?|contenders?|best\s*teams?|strongest/.test(q)) {
    return topContenders()
  }

  // Dark horses
  if (/dark\s*horse|underdog|surprise|sleeper|upset/.test(q)) {
    return darkHorses()
  }

  // Group query
  const groupMatch = q.match(/group\s+([a-l])\b/i) || q.match(/\b([a-l])\s*group\b/i)
  if (groupMatch) {
    return groupOverview(groupMatch[1])
  }

  // Compare two teams
  const compareMatch = q.match(/compare\s+(.+?)\s+(and|vs|versus|against|with)\s+(.+)/)
  if (compareMatch) {
    const team1 = findTeam(compareMatch[1])
    const team2 = findTeam(compareMatch[3])
    if (team1 && team2) {
      const h2h = MATCH_FIXTURES.find(
        (f) =>
          (f.homeTeamSlug === team1.slug && f.awayTeamSlug === team2.slug) ||
          (f.homeTeamSlug === team2.slug && f.awayTeamSlug === team1.slug)
      )
      let response = `**${team1.flag} ${team1.name} vs ${team2.flag} ${team2.name}**

| | ${team1.name} | ${team2.name} |
|---|---|---|
| FIFA Ranking | #${team1.fifaRanking} | #${team2.fifaRanking} |
| Chemistry | ${team1.chemistry}/100 | ${team2.chemistry}/100 |
| Morale | ${team1.morale}/100 | ${team2.morale}/100 |
| Stability | ${team1.stability}/100 | ${team2.stability}/100 |
| Group | ${team1.group} | ${team2.group} |`

      if (h2h) {
        response += `\n\n**Scheduled Match:**\n${matchSummary(h2h)}`
      }

      response += `\n\nFor a full head-to-head breakdown, visit [Compare](/compare).`
      return response
    }
    if (team1 && !team2) return `I found ${team1.flag} ${team1.name} but couldn't identify the other team. Could you try again with the full name?`
    if (!team1 && team2) return `I found ${team2.flag} ${team2.name} but couldn't identify the other team. Could you try again with the full name?`
  }

  // Schedule / matches for a team
  if (/schedule|fixture|match|game|play\s*(against|vs|who)|when\s*do/.test(q)) {
    // Try to extract a team name
    const words = q.replace(/schedule|fixture|match|game|play|against|when|do|does|the|for|of|show|me|what|is|are/g, '').trim()
    const team = findTeam(words)
    if (team) {
      const matches = findMatchesForTeam(team.slug)
      if (matches.length > 0) {
        const matchLines = matches.map((m) => matchSummary(m))
        return `**${team.flag} ${team.name} — Group Stage Fixtures:**\n\n${matchLines.join('\n\n')}`
      }
      return `${team.flag} ${team.name} is in Group ${team.group}, but I don't have specific fixture details loaded for them yet.`
    }
  }

  // Players of a team
  if (/players?\s*(of|for|on|from|in)|squad|roster|lineup/.test(q)) {
    const words = q.replace(/players?|of|for|on|from|in|squad|roster|lineup|the|show|me|who|are|what|is/g, '').trim()
    const team = findTeam(words)
    if (team) {
      const players = findPlayersByTeam(team.slug)
      if (players.length > 0) {
        const byPos = { GK: [] as Player[], DEF: [] as Player[], MID: [] as Player[], FWD: [] as Player[] }
        players.forEach((p) => byPos[p.position]?.push(p))
        const sections = (['GK', 'DEF', 'MID', 'FWD'] as const)
          .filter((pos) => byPos[pos].length > 0)
          .map((pos) => {
            const label = { GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards' }[pos]
            const lines = byPos[pos].map((p) => `- **${p.name}** (${p.club}) — Rating ${p.rating}, ${p.caps} caps, ${p.goals} goals`)
            return `**${label}:**\n${lines.join('\n')}`
          })
        return `**${team.flag} ${team.name} Squad:**\n\n${sections.join('\n\n')}\n\nVisit [${team.name}](/teams/${team.slug}) for full scouting reports.`
      }
      return `I don't have detailed squad data for ${team.name} yet. Check the [Teams page](/teams) for available teams.`
    }
  }

  // Specific player lookup
  const player = findPlayer(q.replace(/tell\s*me\s*about|who\s*is|player|info/g, '').trim())
  if (player) {
    return playerSummary(player)
  }

  // Specific team lookup (catch-all for team names)
  const team = findTeam(q.replace(/tell\s*me\s*about|what\s*about|info\s*on|how\s*(is|are)|analysis|preview/g, '').trim())
  if (team) {
    return teamSummary(team)
  }

  // Prediction / who will win specific group
  if (/who\s*(will|gonna)\s*(win|top|qualify|advance)\s*(from\s*)?group\s*([a-l])/i.test(q)) {
    const gm = q.match(/group\s*([a-l])/i)
    if (gm) {
      return groupOverview(gm[1])
    }
  }

  // General prediction question
  if (/predict|who\s*(will|gonna)|champion|winner|golden\s*boot/.test(q)) {
    return `Based on our AI analysis combining FIFA rankings, squad chemistry, and form data:

**Top 5 Title Contenders:**
${[...TEAMS].sort((a, b) => {
  const scoreA = (100 - a.fifaRanking) * 0.4 + a.chemistry * 0.3 + a.morale * 0.3
  const scoreB = (100 - b.fifaRanking) * 0.4 + b.chemistry * 0.3 + b.morale * 0.3
  return scoreB - scoreA
}).slice(0, 5).map((t, i) => `${i + 1}. ${t.flag} **${t.name}** — Chemistry ${t.chemistry}, Morale ${t.morale}`).join('\n')}

Try our [Prediction Challenge](/predictions) to make your own picks and compete against the AI.`
  }

  // Help / what can you do
  if (/help|what\s*can\s*you|how\s*to\s*use|commands?|options?/.test(q)) {
    return `I can help you with:

- **Team info** — "Tell me about Brazil" or just type a country name
- **Player lookups** — "Who is Mbappe?" or search by name
- **Group analysis** — "Show me Group A"
- **Match schedules** — "When does Argentina play?"
- **Comparisons** — "Compare Spain and Germany"
- **Predictions** — "Who will win the World Cup?"
- **Dark horses** — "Who are the underdogs?"
- **Quick facts** — "World Cup overview"

Just type naturally and I'll find the answer.`
  }

  // Fallback
  return `I'm not sure about that one. Try asking about a specific team, player, group, or match — or check out these popular topics:

- "Who are the favorites?"
- "Tell me about [team name]"
- "Show me Group [A-L]"
- "Compare [team] and [team]"

You can also explore the full site: [Teams](/teams) | [Predictions](/predictions) | [Power Rankings](/power-rankings)`
}
