export default function ScheduleLoading() {
  return (
    <div className="page-container pb-24 animate-pulse">
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-2xl h-20 bg-white/[0.04]" />
        ))}
      </div>

      {/* Filter chips skeleton */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-white/[0.05]" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-white/[0.04]" />
        ))}
      </div>

      {/* Match card skeletons */}
      {Array.from({ length: 5 }).map((_, g) => (
        <div key={g} className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
            <div className="h-5 w-40 rounded bg-white/[0.05]" />
          </div>
          <div className="ml-14 grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 3 }).map((_, c) => (
              <div key={c} className="glass-panel rounded-xl h-24 bg-white/[0.04]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
