import type { Metadata } from 'next'
import { Providers } from '../providers'

// Login / register / password-recovery / OAuth callback. None of these belong
// in SERPs. Keep follow=true so any internal links still pass PageRank.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
    <div className="relative min-h-[calc(100vh-72px)] w-full overflow-hidden">
      {/* Deep background matching site theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#040812] via-background to-[#060a18]" />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(160,212,148,0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 30%, rgba(96,165,250,0.04) 0%, transparent 40%)
          `,
        }}
      />

      {/* Grass texture */}
      <div className="absolute inset-0 grass-texture opacity-[0.03] pointer-events-none" />

      {/* Scanlines */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
    </Providers>
  )
}
