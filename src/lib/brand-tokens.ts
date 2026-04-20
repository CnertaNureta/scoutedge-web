/**
 * Brand color tokens — single source of truth for all hex values.
 *
 * These mirror the Tailwind `theme.extend.colors` in tailwind.config.ts.
 * Use Tailwind utility classes (`bg-primary`, `text-tertiary`, etc.)
 * in JSX markup wherever possible. Import from here ONLY when you
 * need a raw hex value: canvas drawing, OG ImageResponse, inline
 * `style={{}}` that cannot use Tailwind, or email HTML templates.
 */

// ── Core palette ──────────────────────────────────────────────
export const BRAND = {
  primary:            '#a0d494',
  primaryContainer:   '#0f3d0e',
  primaryFixed:       '#bcf0ae',
  primaryFixedDim:    '#a0d494',
  onPrimary:          '#0a390a',
  onPrimaryContainer: '#78a96e',
  inversePrimary:     '#3b6935',

  secondary:            '#ffb4aa',
  secondaryContainer:   '#e10211',
  secondaryFixed:       '#ffdad5',
  secondaryFixedDim:    '#ffb4aa',
  onSecondary:          '#690003',
  onSecondaryContainer: '#fff1ef',

  tertiary:            '#e9c400',
  tertiaryContainer:   '#c9a900',
  tertiaryFixed:       '#ffe16d',
  tertiaryFixedDim:    '#e9c400',
  onTertiary:          '#3a3000',
  onTertiaryContainer: '#4c3f00',

  error:            '#ffb4ab',
  errorContainer:   '#93000a',
  onError:          '#690005',
  onErrorContainer: '#ffdad6',
} as const

// ── Surfaces ──────────────────────────────────────────────────
export const SURFACE = {
  background:             '#121412',
  surface:                '#121412',
  surfaceContainerLowest: '#0d0f0d',
  surfaceContainerLow:    '#1a1c1a',
  surfaceContainer:       '#1e201e',
  surfaceContainerHigh:   '#292a28',
  surfaceContainerHighest:'#333533',
  surfaceVariant:         '#333533',
  surfaceTint:            '#a0d494',
  onSurface:              '#e3e3df',
  onSurfaceVariant:       '#c2c9bb',
  onBackground:           '#e3e3df',
  inverseSurface:         '#e3e3df',
  inverseOnSurface:       '#2f312e',
  outline:                '#8c9387',
  outlineVariant:         '#42493f',
} as const

// ── Position colors (for inline styles where Tailwind can't apply) ─
export const POSITION_HEX = {
  GK:  '#e9c400',
  DEF: '#60a5fa',
  MID: '#a0d494',
  FWD: '#ffb4aa',
} as const

// ── Convenience aliases for the most-used values ──────────────
export const COLOR = {
  green:  BRAND.primary,        // #a0d494 — wins, healthy, CTA
  yellow: BRAND.tertiary,       // #e9c400 — caution, yellow cards
  red:    BRAND.secondary,      // #ffb4aa — loss, injuries, red cards
  gold:   BRAND.tertiaryFixed,  // #ffe16d — premium/gold accent
  lime:   BRAND.primaryFixed,   // #bcf0ae — hover/highlight
  bg:     SURFACE.background,   // #121412
  text:   SURFACE.onSurface,    // #e3e3df
  muted:  SURFACE.onSurfaceVariant, // #c2c9bb
  border: SURFACE.outlineVariant,   // #42493f
} as const
