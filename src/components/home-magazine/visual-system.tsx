import type { CSSProperties, ReactNode } from 'react'

export interface Team {
  name: string
  code: string
  colors: [string, string, string]
  slug?: string
}

export const TEAMS: Record<string, Team> = {
  BRA: { name: 'Brazil',      code: 'BRA', colors: ['#009C3B', '#FFDF00', '#002776'] },
  ARG: { name: 'Argentina',   code: 'ARG', colors: ['#75AADB', '#FFFFFF', '#75AADB'] },
  FRA: { name: 'France',      code: 'FRA', colors: ['#002395', '#FFFFFF', '#ED2939'] },
  ENG: { name: 'England',     code: 'ENG', colors: ['#FFFFFF', '#CE1124', '#FFFFFF'] },
  GER: { name: 'Germany',     code: 'GER', colors: ['#000000', '#DD0000', '#FFCE00'] },
  ESP: { name: 'Spain',       code: 'ESP', colors: ['#AA151B', '#F1BF00', '#AA151B'] },
  POR: { name: 'Portugal',    code: 'POR', colors: ['#046A38', '#DA291C', '#FFE900'] },
  NED: { name: 'Netherlands', code: 'NED', colors: ['#AE1C28', '#FFFFFF', '#21468B'] },
  USA: { name: 'USA',         code: 'USA', colors: ['#B22234', '#FFFFFF', '#3C3B6E'] },
  JPN: { name: 'Japan',       code: 'JPN', colors: ['#FFFFFF', '#BC002D', '#FFFFFF'] },
}

interface FlagProps {
  colors: readonly string[]
  style?: CSSProperties
}

export function Flag({ colors, style }: FlagProps) {
  const stops = colors
    .map((c, i) => `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`)
    .join(', ')
  return <span className="ko-flag" style={{ background: `linear-gradient(90deg, ${stops})`, ...style }} />
}

interface PhotoPlaceholderProps {
  caption?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
  noCaption?: boolean
  /**
   * Background photo. When set, replaces the striped placeholder fill.
   * All gradient overlay children and the .ko-grain layer continue to
   * render on top so the cinematic treatment is preserved.
   */
  src?: string
  alt?: string
}

export function PhotoPlaceholder({
  caption,
  className = '',
  style,
  children,
  noCaption = false,
  src,
  alt = '',
}: PhotoPlaceholderProps) {
  return (
    <div
      className={`ko-photo ${noCaption ? 'no-caption' : ''} ${className}`}
      data-caption={caption}
      style={style}
    >
      {src && <img src={src} alt={alt} className="ko-photo-img" loading="lazy" />}
      <div className="ko-grain" />
      {children}
    </div>
  )
}

export function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: '2px solid var(--cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--f-display)',
          fontStyle: 'italic',
          fontSize: 18,
          color: 'var(--gold)',
        }}
      >
        K
      </div>
      <div style={{ fontFamily: 'var(--f-condensed)', fontWeight: 900, letterSpacing: '0.06em', fontSize: 18 }}>
        KICK <span style={{ color: 'var(--green)' }}>ORACLE</span>
      </div>
    </div>
  )
}

interface StatProps {
  n: string
  unit?: string
  label: string
}

export function Stat({ n, unit, label }: StatProps) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--f-condensed)', fontWeight: 900, fontSize: 26, color: 'var(--gold)', lineHeight: 1 }}>
        {n}
        {unit && <span style={{ fontSize: 13, color: 'var(--cream)' }}>{unit}</span>}
      </div>
      <div
        className="ko-mono ko-muted"
        style={{ fontSize: 9, marginTop: 4, letterSpacing: '0.16em', textTransform: 'uppercase' }}
      >
        {label}
      </div>
    </div>
  )
}
