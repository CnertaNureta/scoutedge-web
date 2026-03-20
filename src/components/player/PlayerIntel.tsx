import type { Player } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import GlassCard from '@/components/ui/GlassCard'
import ChemistryBar from '@/components/ui/ChemistryBar'
import FitnessIndicator from '@/components/ui/FitnessIndicator'

interface PlayerIntelProps {
  player: Player
}

function SignalIcon({ type }: { type: 'training' | 'quote' | 'data' }) {
  if (type === 'training') {
    return (
      <svg className="w-5 h-5 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    )
  }
  if (type === 'quote') {
    return (
      <svg className="w-5 h-5 text-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5 text-on-surface-variant shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
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
          <svg className="w-6 h-6" style={{ color: colors.glow }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.317 48.317 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight">ScoutEdge Intelligence Report</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Fitness */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-label text-sm font-bold text-on-surface-variant uppercase tracking-widest">Fitness Status</span>
                <FitnessIndicator status={player.fitnessStatus} showLabel size="md" />
              </div>
              <p className="text-on-surface-variant italic">&ldquo;{player.fitnessNote}&rdquo;</p>
            </div>

            {/* Sentiment */}
            <div>
              <span className="font-label text-sm font-bold text-on-surface-variant uppercase tracking-widest block mb-2">
                Sentiment Analysis
              </span>
              <ChemistryBar value={player.sentimentScore} label={player.sentimentLabel} />
            </div>
          </div>

          {/* Recent signals */}
          <div className="space-y-4">
            <span className="font-label text-sm font-bold text-on-surface-variant uppercase tracking-widest block">
              Recent Signals
            </span>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg border border-white/5">
                <SignalIcon type="training" />
                <p className="text-sm text-on-surface">Participated in full squad training session ahead of tournament preparations</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg border border-white/5">
                <SignalIcon type="quote" />
                <p className="text-sm text-on-surface">Coach praised player&apos;s leadership during pre-tournament camp</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg opacity-40 blur-[2px] border border-white/5">
                <SignalIcon type="data" />
                <p className="text-sm">Advanced tactical analysis and positional data...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant/20 flex items-center justify-between">
          <p className="text-on-surface-variant text-sm">2 more signals available with Premium access</p>
          <button className="cursor-pointer flex items-center gap-2 px-6 py-3 rounded-sm font-label font-bold uppercase tracking-widest text-sm transition-all duration-200 hover:brightness-110" style={{ background: colors.glow, color: '#000' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Subscribe to Unlock
          </button>
        </div>
      </GlassCard>
    </section>
  )
}
