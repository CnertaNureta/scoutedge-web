import { BRAND } from '@/lib/brand-tokens'

interface ProbabilityBarProps {
  homeProb: number
  drawProb: number
  awayProb: number
  homeLabel?: string
  awayLabel?: string
}

export default function ProbabilityBar({
  homeProb,
  drawProb,
  awayProb,
  homeLabel = 'Home',
  awayLabel = 'Away',
}: ProbabilityBarProps) {
  const ariaLabel = `Match probability: ${homeLabel} ${Math.round(homeProb * 100)}%, Draw ${Math.round(drawProb * 100)}%, ${awayLabel} ${Math.round(awayProb * 100)}%`

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1.5">
        <span className="font-label text-xs text-primary font-semibold">{homeLabel} {Math.round(homeProb * 100)}%</span>
        <span className="font-label text-xs text-on-surface-variant font-semibold">Draw {Math.round(drawProb * 100)}%</span>
        <span className="font-label text-xs text-secondary font-semibold">{awayLabel} {Math.round(awayProb * 100)}%</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden flex bg-white/[0.06]" role="img" aria-label={ariaLabel}>
        <div className="h-full rounded-l-full" style={{ width: `${homeProb * 100}%`, background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryFixed})` }} />
        <div className="bg-white/10 h-full" style={{ width: `${drawProb * 100}%` }} />
        <div className="h-full rounded-r-full" style={{ width: `${awayProb * 100}%`, background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.secondaryFixed})` }} />
      </div>
    </div>
  )
}
