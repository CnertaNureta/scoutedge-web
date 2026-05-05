'use client'

import { Profiler, type ReactNode, type ProfilerOnRenderCallback } from 'react'

const ENABLED = process.env.NEXT_PUBLIC_PROFILE_RENDERS === '1'
const SLOW_RENDER_THRESHOLD_MS = 50

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  if (actualDuration < SLOW_RENDER_THRESHOLD_MS) return
  console.warn(`[render-profiler] ${id} ${phase}: ${actualDuration.toFixed(1)}ms`)
}

export default function RenderProfiler({ children }: { children: ReactNode }) {
  if (!ENABLED) return <>{children}</>
  return (
    <Profiler id="root" onRender={onRender}>
      {children}
    </Profiler>
  )
}
