import type { Player } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'
import ChemistryBar from '@/components/ui/ChemistryBar'
import FitnessIndicator from '@/components/ui/FitnessIndicator'

interface PlayerIntelProps {
  player: Player
}

export default function PlayerIntel({ player }: PlayerIntelProps) {
  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <GlassCard hover={false} className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🔍</span>
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight">ScoutEdge Intelligence Report</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-label text-sm font-bold text-on-surface-variant uppercase tracking-widest">Fitness Status</span>
                <FitnessIndicator status={player.fitnessStatus} showLabel size="md" />
              </div>
              <p className="text-on-surface-variant italic">&ldquo;{player.fitnessNote}&rdquo;</p>
            </div>

            <div>
              <span className="font-label text-sm font-bold text-on-surface-variant uppercase tracking-widest block mb-2">
                Sentiment Analysis
              </span>
              <ChemistryBar value={player.sentimentScore} label={player.sentimentLabel} />
            </div>
          </div>

          <div className="space-y-4">
            <span className="font-label text-sm font-bold text-on-surface-variant uppercase tracking-widest block">
              Recent Signals
            </span>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg">
                <span className="text-primary text-lg">📰</span>
                <p className="text-sm text-on-surface">Participated in full squad training session ahead of tournament preparations</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg">
                <span className="text-tertiary text-lg">💬</span>
                <p className="text-sm text-on-surface">Coach praised player&apos;s leadership during pre-tournament camp</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg opacity-40 blur-[2px]">
                <span className="text-lg">📊</span>
                <p className="text-sm">Advanced tactical analysis and positional data...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant/20 flex items-center justify-between">
          <p className="text-on-surface-variant text-sm">2 more signals available with Premium access</p>
          <button className="bg-primary text-on-primary px-6 py-3 rounded-full font-label font-bold uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform">
            🔒 Subscribe to Unlock
          </button>
        </div>
      </GlassCard>
    </section>
  )
}
