import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

interface ArchivedPageAction {
  href: string
  label: string
}

interface ArchivedPageNoticeProps {
  badge?: string
  title: string
  description: string
  reasons: string[]
  primaryAction: ArchivedPageAction
  secondaryAction?: ArchivedPageAction
  note?: string
}

export default function ArchivedPageNotice({
  badge = 'Archived Surface',
  title,
  description,
  reasons,
  primaryAction,
  secondaryAction,
  note,
}: ArchivedPageNoticeProps) {
  return (
    <section className="relative overflow-hidden px-6 py-20 md:py-24">
      <div className="absolute inset-0 mesh-gradient opacity-60" />
      <div className="absolute left-[10%] top-[18%] h-[320px] w-[320px] rounded-full bg-primary/10 blur-[140px]" />
      <div className="absolute bottom-[8%] right-[12%] h-[260px] w-[260px] rounded-full bg-secondary/10 blur-[120px]" />
      <div className="absolute inset-0 pitch-lines opacity-10 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-[960px]">
        <div className="mb-8 text-center">
          <Badge variant="outline" size="md">{badge}</Badge>
          <SectionHeader as="h1" className="mt-6 justify-center">
            {title}
          </SectionHeader>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-on-surface-variant">
            {description}
          </p>
        </div>

        <GlassCard className="p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-headline text-2xl uppercase tracking-wide text-on-surface mb-4">
                Why This Route Was Archived
              </h2>
              <div className="space-y-3">
                {reasons.map((reason) => (
                  <div
                    key={reason}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm leading-7 text-on-surface-variant"
                  >
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h3 className="font-label text-xs font-bold uppercase tracking-widest text-primary mb-4">
                Narrative-First Paths
              </h3>
              <div className="space-y-3">
                <Link
                  href={primaryAction.href}
                  className="flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-label font-bold uppercase tracking-widest text-on-primary hover:brightness-110 transition-all"
                >
                  {primaryAction.label}
                </Link>
                {secondaryAction && (
                  <Link
                    href={secondaryAction.href}
                    className="flex items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-label font-bold uppercase tracking-widest text-on-surface hover:border-white/20 hover:bg-white/[0.06] transition-all"
                  >
                    {secondaryAction.label}
                  </Link>
                )}
              </div>
              {note && (
                <p className="mt-4 text-sm leading-6 text-on-surface-variant">
                  {note}
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  )
}
