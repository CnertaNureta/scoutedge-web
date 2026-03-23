import type { Player } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import GlassCard from '@/components/ui/GlassCard'
import ChemistryBar from '@/components/ui/ChemistryBar'
import FitnessIndicator from '@/components/ui/FitnessIndicator'
import { Newspaper, MessageSquare, BarChart3, FlaskConical, Lock } from 'lucide-react'

interface PlayerIntelProps {
  player: Player
}

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
  training: <Newspaper className="w-5 h-5 text-primary shrink-0" />,
  quote: <MessageSquare className="w-5 h-5 text-tertiary shrink-0" />,
  data: <BarChart3 className="w-5 h-5 text-on-surface-variant shrink-0" />,
}

export default function PlayerIntel({ player }: PlayerIntelProps) {
  const colors = getTeamColors(player.teamSlug)

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <GlassCard hover={false} className="p-8 relative overflow-hidden">
        {/* Neon accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${colors.glow}, transparent)` }}
        />

        <div className="flex items-center gap-3 mb-6">
          <FlaskConical className="w-6 h-6" style={{ color: colors.glow }} />
          <h2 className="font-headline text-2xl tracking-wide uppercase">ScoutEdge Intelligence Report</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Fitness */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-label text-sm font-semibold text-on-surface-variant uppercase tracking-widest">Fitness Status</span>
                <FitnessIndicator status={player.fitnessStatus} showLabel size="md" />
              </div>
              <p className="text-on-surface-variant italic">&ldquo;{player.fitnessNote}&rdquo;</p>
            </div>

            {/* Sentiment */}
            <div>
              <span className="font-label text-sm font-semibold text-on-surface-variant uppercase tracking-widest block mb-2">
                Sentiment Analysis
              </span>
              <ChemistryBar value={player.sentimentScore} label={player.sentimentLabel} />
            </div>
          </div>

          {/* Recent signals */}
          <div className="space-y-4">
            <span className="font-label text-sm font-semibold text-on-surface-variant uppercase tracking-widest block">
              Recent Signals
            </span>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                {SIGNAL_ICONS.training}
                <p className="text-sm text-on-surface">Participated in full squad training session ahead of tournament preparations</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                {SIGNAL_ICONS.quote}
                <p className="text-sm text-on-surface">Coach praised player&apos;s leadership during pre-tournament camp</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl opacity-40 blur-[2px] border border-white/[0.06]">
                {SIGNAL_ICONS.data}
                <p className="text-sm">Advanced tactical analysis and positional data...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/[0.08] flex items-center justify-between">
          <p className="text-on-surface-variant text-sm">2 more signals available with Premium access</p>
          <button
            className="cursor-pointer flex items-center gap-2 px-6 py-3 rounded-xl font-label font-semibold uppercase tracking-widest text-sm transition-all duration-200 hover:scale-105"
            style={{
              background: colors.glow,
              color: '#0a0e1a',
              boxShadow: `0 0 20px ${colors.glow}30`,
            }}
          >
            <Lock className="w-4 h-4" />
            Subscribe to Unlock
          </button>
        </div>
      </GlassCard>
    </section>
  )
}
