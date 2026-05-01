import { Link } from '@/i18n/navigation'
import type { LingoCountry } from '@/types/lingo'
import { DifficultyBadge } from './DifficultyBadge'

interface CountryCardProps {
  country: LingoCountry
}

export function CountryCard({ country }: CountryCardProps) {
  return (
    <Link
      href={`/lingo/countries/${country.id}`}
      className="group relative flex flex-col gap-3 rounded-2xl border border-lingo-border/50 bg-lingo-surface p-5 transition-all duration-200 hover:border-lingo-accent/30 hover:bg-lingo-surface-hover hover:shadow-[0_0_30px_-10px] hover:shadow-lingo-accent/10"
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl" aria-hidden="true">
          {country.flag}
        </span>
        <DifficultyBadge rating={country.difficultyRating} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-lingo-text group-hover:text-lingo-accent">
          {country.name}
        </h3>
        {country.localName !== country.name && (
          <p className="mt-0.5 text-xs text-lingo-text-muted">{country.localName}</p>
        )}
      </div>
      <p className="font-mono text-sm text-lingo-phonetic">{country.phonetic}</p>
      <p className="text-xs text-lingo-text-muted">{country.region}</p>
    </Link>
  )
}
