import type { Player } from '@/lib/types'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { positionOrder, getPlayerPhoto } from '@/lib/utils'
import { getPlayerActionImage } from '@/lib/unsplash'
import ChemistryBar from '@/components/ui/ChemistryBar'
import FitnessIndicator from '@/components/ui/FitnessIndicator'
import SectionHeader from '@/components/ui/SectionHeader'
import PositionBadge, { getPositionColor } from '@/components/ui/PositionBadge'

interface SquadRosterProps {
  players: Player[]
  teamSlug: string
}

type PlayerPosition = Player['position']
type SquadTranslator = ReturnType<typeof useTranslations<'squadRoster'>>

function assertUnreachable(value: never): never {
  throw new Error(`Unexpected player position: ${value}`)
}

function positionLabelKey(position: PlayerPosition): 'goalkeepers' | 'defenders' | 'midfielders' | 'forwards' {
  switch (position) {
    case 'GK': return 'goalkeepers'
    case 'DEF': return 'defenders'
    case 'MID': return 'midfielders'
    case 'FWD': return 'forwards'
    default: return assertUnreachable(position)
  }
}

function getKeyStat(player: Player, t: SquadTranslator): string {
  switch (player.position) {
    case 'GK': return t('capsShort', { caps: player.caps })
    case 'DEF': return t('capsAndGoals', { caps: player.caps, goals: player.goals })
    case 'MID': return t('goalsAndAssists', { goals: player.goals, assists: player.assists })
    case 'FWD': return t('goalsAndAssists', { goals: player.goals, assists: player.assists })
    default: return t('capsShort', { caps: player.caps })
  }
}

function getFeaturedPlayer(players: Player[]): Player | null {
  if (players.length < 2) return null
  return players.reduce((best, p) => (p.rating > best.rating ? p : best), players[0])
}

function FeaturedPlayerCard({ player, teamSlug }: { player: Player; teamSlug: string }) {
  const t = useTranslations('squadRoster')
  const photo = getPlayerPhoto(player)
  const posColor = getPositionColor(player.position)

  return (
    <Link
      href={`/teams/${teamSlug}/players/${player.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-container hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(160,212,148,0.08)] col-span-full"
      aria-label={`Key player: ${player.name} — ${player.position}, ${player.club}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr]">
        {/* Image side */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          <Image
            src={getPlayerActionImage(player.name)}
            alt={player.name}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover brightness-[0.35] group-hover:scale-105 group-hover:brightness-[0.45] transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/40 to-transparent" />
          <div
            className="absolute inset-0 opacity-20"
            style={{ background: `linear-gradient(135deg, ${posColor}30, transparent 60%)` }}
          />
          {photo && (
            <div className="absolute -bottom-2 right-4 md:right-8 z-10">
              <Image
                src={photo}
                alt={player.name}
                width={160}
                height={224}
                className="h-40 md:h-56 w-auto object-contain drop-shadow-2xl"
              />
            </div>
          )}
          <span className="absolute bottom-3 left-4 font-headline text-7xl text-white/[0.06]">
            #{player.number}
          </span>
        </div>

        {/* Info side */}
        <div className="p-5 md:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="font-label text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: posColor }}
            >
              {t('keyPlayer')}
            </span>
            <PositionBadge position={player.position} variant="pill" />
          </div>
          <h4 className="font-headline text-2xl md:text-3xl tracking-wide group-hover:text-primary transition-colors">
            {player.name}
          </h4>
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-medium mt-1">
            {player.club}
          </p>

          <div className="grid grid-cols-3 gap-4 mt-5">
            <div>
              <span className="font-headline text-2xl text-on-surface">{player.caps}</span>
              <span className="block font-label text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">{t('caps')}</span>
            </div>
            <div>
              <span className="font-headline text-2xl text-on-surface">{player.goals}</span>
              <span className="block font-label text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">{t('goals')}</span>
            </div>
            <div>
              <span className="font-headline text-2xl text-on-surface">{player.assists}</span>
              <span className="block font-label text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">{t('assists')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <div className="flex-1">
              <ChemistryBar value={player.rating * 10} showValue label={t('rating')} size="sm" />
            </div>
            <FitnessIndicator status={player.fitnessStatus} />
          </div>
        </div>
      </div>
      {/* Team-color top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(to right, transparent, ${posColor}80, transparent)` }}
      />
    </Link>
  )
}

export default function SquadRoster({ players, teamSlug }: SquadRosterProps) {
  const t = useTranslations('squadRoster')
  const grouped = players.reduce<Partial<Record<PlayerPosition, Player[]>>>((acc, p) => {
    const key = p.position
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const sortedGroups = (Object.entries(grouped) as [PlayerPosition, Player[]][]).sort(
    ([a], [b]) => positionOrder(a) - positionOrder(b)
  )

  return (
    <section className="page-container mb-16">
      <SectionHeader className="mb-10">{t('squad')}</SectionHeader>
      {sortedGroups.map(([position, posPlayers]) => {
        const posColor = getPositionColor(position)
        const featured = getFeaturedPlayer(posPlayers)
        const otherPlayers = featured
          ? posPlayers.filter((p) => p.slug !== featured.slug)
          : posPlayers

        return (
          <div key={position} className="mb-12">
            {/* Position header with color accent */}
            <h3 className="font-label text-sm font-semibold uppercase tracking-widest mb-5 flex items-center gap-3">
              <span
                className="w-1 h-6 rounded-full"
                style={{ backgroundColor: posColor }}
              />
              <span style={{ color: posColor }}>{t(positionLabelKey(position))}</span>
              <span className="font-mono text-xs text-on-surface-variant/60">
                {posPlayers.length}
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: `linear-gradient(to right, ${posColor}30, transparent)` }}
              />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Featured player -- wider card spanning full width */}
              {featured && (
                <FeaturedPlayerCard player={featured} teamSlug={teamSlug} />
              )}

              {/* Remaining players */}
              {otherPlayers.map((player) => {
                const photo = getPlayerPhoto(player)
                return (
                  <Link
                    key={player.slug}
                    href={`/teams/${teamSlug}/players/${player.slug}`}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-container hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(160,212,148,0.08)]"
                  >
                    {/* Position color top accent */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px] z-20"
                      style={{ background: `linear-gradient(to right, ${posColor}60, transparent 80%)` }}
                    />

                    <div className="relative h-32 overflow-hidden">
                      <Image
                        src={getPlayerActionImage(player.name)}
                        alt={player.name}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover brightness-[0.35] group-hover:scale-105 group-hover:brightness-[0.45] transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent" />
                      <span className="absolute bottom-2 left-4 font-headline text-5xl text-white/[0.06]">
                        #{player.number}
                      </span>
                      {photo && (
                        <div className="absolute -bottom-2 right-2 z-10">
                          <Image
                            src={photo}
                            alt={player.name}
                            width={112}
                            height={112}
                            className="h-28 w-auto object-contain drop-shadow-lg"
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-headline text-xl tracking-wide group-hover:text-primary transition-colors truncate">
                          {player.name}
                        </h4>
                        <FitnessIndicator status={player.fitnessStatus} />
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <PositionBadge position={player.position} variant="dot" />
                        <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-medium">
                          {player.club}
                        </p>
                      </div>
                      <p className="font-body text-xs text-on-surface-variant">
                        {getKeyStat(player, t)}
                      </p>
                      <div className="mt-3">
                        <ChemistryBar value={player.rating * 10} showValue={false} size="sm" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
