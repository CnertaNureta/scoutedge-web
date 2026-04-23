import type { Player } from '@/lib/types'

export interface BattleResult {
  playerA: Player
  playerB: Player
  scoreA: number
  scoreB: number
  winnerSlug: string | null
  verdict: string
  factors: BattleFactor[]
}

export interface BattleFactor {
  label: string
  valueA: number
  valueB: number
  weight: number
}

function hashSeed(a: string, b: string): number {
  const combined = a < b ? `${a}:${b}` : `${b}:${a}`
  let h = 5381
  for (let i = 0; i < combined.length; i++) {
    h = ((h << 5) + h + combined.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function seededRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

const POSITION_MATCHUP_BONUS: Record<string, Record<string, number>> = {
  FWD: { GK: 5, DEF: -3, MID: 0, FWD: 0 },
  MID: { GK: 3, DEF: 0, MID: 0, FWD: 0 },
  DEF: { GK: 0, DEF: 0, MID: 0, FWD: 3 },
  GK: { GK: 0, DEF: 0, MID: -3, FWD: -5 },
}

export function computeBattle(playerA: Player, playerB: Player): BattleResult {
  const rng = seededRng(hashSeed(playerA.slug, playerB.slug))

  const factors: BattleFactor[] = []

  const ratingA = playerA.rating * 10
  const ratingB = playerB.rating * 10
  factors.push({ label: 'Rating', valueA: playerA.rating, valueB: playerB.rating, weight: 35 })

  const expA = Math.min(playerA.caps, 150)
  const expB = Math.min(playerB.caps, 150)
  factors.push({ label: 'Experience', valueA: playerA.caps, valueB: playerB.caps, weight: 20 })

  const outputA = playerA.goals + playerA.assists
  const outputB = playerB.goals + playerB.assists
  factors.push({ label: 'Output', valueA: outputA, valueB: outputB, weight: 15 })

  const fitnessMap = { green: 90, amber: 60, red: 30 } as const
  const fitA = fitnessMap[playerA.fitnessStatus]
  const fitB = fitnessMap[playerB.fitnessStatus]
  factors.push({ label: 'Fitness', valueA: fitA, valueB: fitB, weight: 15 })

  const sentA = playerA.sentimentScore
  const sentB = playerB.sentimentScore
  factors.push({ label: 'Morale', valueA: sentA, valueB: sentB, weight: 10 })

  const posBonus = POSITION_MATCHUP_BONUS[playerA.position]?.[playerB.position] ?? 0
  factors.push({ label: 'Matchup Edge', valueA: posBonus > 0 ? posBonus : 0, valueB: posBonus < 0 ? Math.abs(posBonus) : 0, weight: 5 })

  const normalize = (v: number, max: number) => Math.min(v / max, 1) * 100

  const rawA =
    normalize(ratingA, 100) * 0.35 +
    normalize(expA, 150) * 0.20 +
    normalize(outputA, 80) * 0.15 +
    normalize(fitA, 100) * 0.15 +
    normalize(sentA, 100) * 0.10 +
    Math.max(posBonus, 0) * 0.05

  const rawB =
    normalize(ratingB, 100) * 0.35 +
    normalize(expB, 150) * 0.20 +
    normalize(outputB, 80) * 0.15 +
    normalize(fitB, 100) * 0.15 +
    normalize(sentB, 100) * 0.10 +
    Math.max(-posBonus, 0) * 0.05

  const jitter = (rng() - 0.5) * 4
  const scoreA = Math.round((rawA + jitter) * 10) / 10
  const scoreB = Math.round((rawB - jitter) * 10) / 10

  const diff = scoreA - scoreB
  const winnerSlug = Math.abs(diff) < 1 ? null : diff > 0 ? playerA.slug : playerB.slug

  const winner = winnerSlug === playerA.slug ? playerA : winnerSlug === playerB.slug ? playerB : null
  const loser = winner === playerA ? playerB : winner === playerB ? playerA : null

  let verdict: string
  if (!winner || !loser) {
    verdict = `Dead heat! ${playerA.name} and ${playerB.name} are virtually inseparable — this one goes to the wire.`
  } else if (Math.abs(diff) > 15) {
    verdict = `${winner.name} dominates this matchup. Superior ${winner.rating > loser.rating ? 'quality' : 'experience'} gives ${winner.name} a commanding edge.`
  } else if (Math.abs(diff) > 7) {
    verdict = `${winner.name} holds the advantage. ${winner.fitnessStatus === 'green' && loser.fitnessStatus !== 'green' ? 'Better fitness' : 'Stronger form'} could prove decisive.`
  } else {
    verdict = `Razor-thin margin in favor of ${winner.name}. On their day, ${loser.name} could easily flip this result.`
  }

  return { playerA, playerB, scoreA, scoreB, winnerSlug, verdict, factors }
}

export interface Bo5Round {
  scoreA: number
  scoreB: number
  winnerSlug: string | null
}

export interface Bo5Result {
  playerA: Player
  playerB: Player
  rounds: Bo5Round[]
  winsA: number
  winsB: number
  seriesWinner: string | null
  verdict: string
}

export function computeBo5(playerA: Player, playerB: Player): Bo5Result {
  const baseSeed = hashSeed(playerA.slug, playerB.slug)
  const rounds: Bo5Round[] = []
  let winsA = 0
  let winsB = 0

  for (let i = 0; i < 5 && winsA < 3 && winsB < 3; i++) {
    const rng = seededRng(baseSeed + i * 7919)
    const jitter = (rng() - 0.5) * 8

    const base = computeBattle(playerA, playerB)
    const scoreA = Math.round((base.scoreA + jitter) * 10) / 10
    const scoreB = Math.round((base.scoreB - jitter) * 10) / 10
    const diff = scoreA - scoreB
    const winnerSlug = Math.abs(diff) < 0.5 ? null : diff > 0 ? playerA.slug : playerB.slug

    if (winnerSlug === playerA.slug) winsA++
    else if (winnerSlug === playerB.slug) winsB++

    rounds.push({ scoreA, scoreB, winnerSlug })
  }

  const seriesWinner = winsA >= 3 ? playerA.slug : winsB >= 3 ? playerB.slug : (winsA > winsB ? playerA.slug : winsB > winsA ? playerB.slug : null)
  const winner = seriesWinner === playerA.slug ? playerA : seriesWinner === playerB.slug ? playerB : null

  let verdict: string
  if (!winner) {
    verdict = `Incredible! ${playerA.name} and ${playerB.name} couldn't be separated across ${rounds.length} rounds.`
  } else if (winsA === 3 && winsB === 0 || winsB === 3 && winsA === 0) {
    verdict = `${winner.name} sweeps the series! A dominant display across all three rounds.`
  } else {
    verdict = `${winner.name} takes the series ${Math.max(winsA, winsB)}-${Math.min(winsA, winsB)}. Every round was a battle.`
  }

  return { playerA, playerB, rounds, winsA, winsB, seriesWinner, verdict }
}

const ALL_DUELS: [string, string][] = [
  ['kylian-mbappe', 'vinicius-jr'],
  ['lionel-messi', 'cristiano-ronaldo'],
  ['jude-bellingham', 'pedri'],
  ['erling-haaland', 'harry-kane'],
  ['virgil-van-dijk', 'ruben-dias'],
  ['bukayo-saka', 'lamine-yamal'],
  ['mohamed-salah', 'sadio-mane'],
  ['kevin-de-bruyne', 'luka-modric'],
  ['thibaut-courtois', 'alisson'],
  ['bruno-fernandes', 'bernardo-silva'],
  ['antoine-griezmann', 'jamal-musiala'],
  ['phil-foden', 'florian-wirtz'],
  ['romelu-lukaku', 'son-heung-min'],
  ['rodrygo', 'raphinha'],
  ['declan-rice', 'aurelien-tchouameni'],
]

export function getDailyDuel(): [string, string] {
  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000)
  return ALL_DUELS[daysSinceEpoch % ALL_DUELS.length]
}

export function getPositionPair(
  players: Player[],
  posA: Player['position'],
  posB: Player['position'],
): [Player, Player] {
  const poolA = players.filter((p) => p.position === posA && p.fitnessStatus !== 'red')
  const poolB = players.filter((p) => p.position === posB && p.fitnessStatus !== 'red')
  const a = poolA[Math.floor(Math.random() * poolA.length)]
  let b = poolB.filter((p) => p.slug !== a.slug)
  if (b.length === 0) b = poolB
  return [a, b[Math.floor(Math.random() * b.length)]]
}

export function getRandomPair(players: Player[]): [Player, Player] {
  const outfield = players.filter((p) => p.position !== 'GK' && p.fitnessStatus !== 'red')
  const i = Math.floor(Math.random() * outfield.length)
  let j = Math.floor(Math.random() * (outfield.length - 1))
  if (j >= i) j++
  return [outfield[i], outfield[j]]
}

export function buildShareText(result: BattleResult): string {
  const { playerA, playerB, scoreA, scoreB, winnerSlug } = result
  const winner = winnerSlug === playerA.slug ? playerA : winnerSlug === playerB.slug ? playerB : null
  const icon = !winner ? '🤝' : Math.abs(scoreA - scoreB) > 10 ? '💥' : '⚔️'
  const scoreLine = `${playerA.name} ${scoreA.toFixed(1)} vs ${scoreB.toFixed(1)} ${playerB.name}`
  const verdict = winner ? `${winner.name} wins!` : 'Dead heat!'
  return `${icon} PK Battle: ${scoreLine}\n${verdict}\n\nTry it yourself 👇\nhttps://kickoracle.com/play/pk-battle`
}

const HISTORY_KEY = 'pk-battle-history'
const MAX_HISTORY = 20

export interface BattleHistoryEntry {
  playerASlug: string
  playerAName: string
  playerBSlug: string
  playerBName: string
  scoreA: number
  scoreB: number
  winnerSlug: string | null
  timestamp: number
}

export function saveBattleToHistory(result: BattleResult): void {
  if (typeof window === 'undefined') return
  const entry: BattleHistoryEntry = {
    playerASlug: result.playerA.slug,
    playerAName: result.playerA.name,
    playerBSlug: result.playerB.slug,
    playerBName: result.playerB.name,
    scoreA: result.scoreA,
    scoreB: result.scoreB,
    winnerSlug: result.winnerSlug,
    timestamp: Date.now(),
  }
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const history: BattleHistoryEntry[] = raw ? JSON.parse(raw) : []
    history.unshift(entry)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch { /* quota or parse error — silently skip */ }
}

export function loadBattleHistory(): BattleHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getBattleStats(history: BattleHistoryEntry[]): {
  totalBattles: number
  wins: number
  draws: number
  winRate: string
} {
  const totalBattles = history.length
  const draws = history.filter((h) => !h.winnerSlug).length
  const wins = totalBattles - draws
  const winRate = totalBattles > 0 ? `${Math.round((wins / totalBattles) * 100)}%` : '0%'
  return { totalBattles, wins, draws, winRate }
}

const DAILY_LIMIT_KEY = 'pk-battle-daily'
const FREE_DAILY_LIMIT = 5

export interface DailyUsage {
  date: string
  count: number
}

export function getDailyUsage(): DailyUsage {
  if (typeof window === 'undefined') return { date: '', count: 0 }
  const today = new Date().toISOString().slice(0, 10)
  try {
    const raw = localStorage.getItem(DAILY_LIMIT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DailyUsage
      if (parsed.date === today) return parsed
    }
  } catch { /* parse error */ }
  return { date: today, count: 0 }
}

export function incrementDailyUsage(): DailyUsage {
  if (typeof window === 'undefined') return { date: '', count: 0 }
  const usage = getDailyUsage()
  const today = new Date().toISOString().slice(0, 10)
  const updated: DailyUsage = { date: today, count: (usage.date === today ? usage.count : 0) + 1 }
  try { localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify(updated)) } catch { /* quota */ }
  return updated
}

export function canBattleFree(): boolean {
  return getDailyUsage().count < FREE_DAILY_LIMIT
}

export function getRemainingFree(): number {
  return Math.max(0, FREE_DAILY_LIMIT - getDailyUsage().count)
}

const SESSION_KEY = 'pk-battle-session-id'

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export async function logBattleToServer(result: BattleResult): Promise<void> {
  try {
    await fetch('/api/pk-battle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerASlug: result.playerA.slug,
        playerAName: result.playerA.name,
        playerBSlug: result.playerB.slug,
        playerBName: result.playerB.name,
        scoreA: result.scoreA,
        scoreB: result.scoreB,
        winnerSlug: result.winnerSlug,
        sessionId: getSessionId(),
      }),
    })
  } catch { /* network error — non-critical, skip */ }
}

export interface LeaderboardEntry {
  slug: string
  name: string
  total_battles: number
  total_wins: number
  win_rate: number
  rank: number
}

export interface CommunityStats {
  totalBattles: number
  uniqueSessions: number
  totalDraws: number
  uniquePlayersUsed: number
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`/api/pk-battle/leaderboard?limit=${limit}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.leaderboard ?? []
  } catch {
    return []
  }
}

export async function fetchCommunityStats(): Promise<CommunityStats> {
  try {
    const res = await fetch('/api/pk-battle/stats')
    if (!res.ok) return { totalBattles: 0, uniqueSessions: 0, totalDraws: 0, uniquePlayersUsed: 0 }
    return await res.json()
  } catch {
    return { totalBattles: 0, uniqueSessions: 0, totalDraws: 0, uniquePlayersUsed: 0 }
  }
}
