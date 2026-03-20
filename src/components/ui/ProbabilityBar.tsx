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
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1.5">
        <span className="font-label text-xs text-primary font-bold">{homeLabel} {Math.round(homeProb * 100)}%</span>
        <span className="font-label text-xs text-on-surface-variant font-bold">Draw {Math.round(drawProb * 100)}%</span>
        <span className="font-label text-xs text-secondary font-bold">{awayLabel} {Math.round(awayProb * 100)}%</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden flex">
        <div className="bg-primary h-full" style={{ width: `${homeProb * 100}%` }} />
        <div className="bg-outline h-full" style={{ width: `${drawProb * 100}%` }} />
        <div className="bg-secondary h-full" style={{ width: `${awayProb * 100}%` }} />
      </div>
    </div>
  )
}
