import Link from 'next/link'

interface ScoutEdgeLogoProps {
  href?: string
}

export default function ScoutEdgeLogo({ href = '/' }: ScoutEdgeLogoProps) {
  const content = (
    <>
      <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
        <span className="text-primary font-headline text-lg leading-none">S</span>
      </div>
      <span className="font-headline text-2xl tracking-wider text-on-surface">
        SCOUT<span className="text-primary">EDGE</span>
      </span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="flex items-center gap-2 group">
        {content}
      </Link>
    )
  }

  return <div className="flex items-center gap-2">{content}</div>
}
