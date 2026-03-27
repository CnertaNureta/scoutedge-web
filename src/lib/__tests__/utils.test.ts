import { describe, it, expect } from 'vitest'
import {
  slugify,
  hashString,
  chemistryColor,
  chemistryColorClass,
  fitnessColorClass,
  positionOrder,
  positionLabel,
  getPlayerPhoto,
} from '../utils'

describe('slugify', () => {
  it('converts a name to a URL-safe slug', () => {
    expect(slugify('United States')).toBe('united-states')
  })

  it('strips diacritics', () => {
    expect(slugify('São Paulo')).toBe('sao-paulo')
    expect(slugify('Côte d\'Ivoire')).toBe('cote-d-ivoire')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('collapses consecutive special characters', () => {
    expect(slugify('foo   bar & baz')).toBe('foo-bar-baz')
  })
})

describe('hashString', () => {
  it('returns a deterministic number', () => {
    expect(hashString('abc')).toBe(hashString('abc'))
  })

  it('returns different values for different strings', () => {
    expect(hashString('abc')).not.toBe(hashString('xyz'))
  })
})

describe('chemistryColor', () => {
  it('returns green for high values (>=70)', () => {
    expect(chemistryColor(70)).toBe('#a0d494')
    expect(chemistryColor(90)).toBe('#a0d494')
  })

  it('returns light green for mid-high (50-69)', () => {
    expect(chemistryColor(50)).toBe('#bcf0ae')
  })

  it('returns gold for mid-low (35-49)', () => {
    expect(chemistryColor(35)).toBe('#e9c400')
  })

  it('returns red for low (<35)', () => {
    expect(chemistryColor(10)).toBe('#ffb4aa')
  })
})

describe('chemistryColorClass', () => {
  it('returns correct Tailwind classes per tier', () => {
    expect(chemistryColorClass(80)).toBe('bg-primary')
    expect(chemistryColorClass(55)).toBe('bg-accent')
    expect(chemistryColorClass(40)).toBe('bg-tertiary')
    expect(chemistryColorClass(20)).toBe('bg-secondary')
  })
})

describe('fitnessColorClass', () => {
  it('maps green/amber/red correctly', () => {
    expect(fitnessColorClass('green')).toBe('bg-primary')
    expect(fitnessColorClass('amber')).toContain('bg-tertiary')
    expect(fitnessColorClass('red')).toContain('bg-secondary')
  })
})

describe('positionOrder', () => {
  it('sorts GK < DEF < MID < FWD', () => {
    expect(positionOrder('GK')).toBeLessThan(positionOrder('DEF'))
    expect(positionOrder('DEF')).toBeLessThan(positionOrder('MID'))
    expect(positionOrder('MID')).toBeLessThan(positionOrder('FWD'))
  })

  it('unknown positions sort last', () => {
    expect(positionOrder('UNKNOWN')).toBeGreaterThan(positionOrder('FWD'))
  })
})

describe('positionLabel', () => {
  it('returns full labels for standard positions', () => {
    expect(positionLabel('GK')).toBe('Goalkeepers')
    expect(positionLabel('DEF')).toBe('Defenders')
    expect(positionLabel('MID')).toBe('Midfielders')
    expect(positionLabel('FWD')).toBe('Forwards')
  })

  it('passes through unknown positions', () => {
    expect(positionLabel('SUB')).toBe('SUB')
  })
})

describe('getPlayerPhoto', () => {
  it('prefers cutoutUrl over imageUrl', () => {
    expect(getPlayerPhoto({ cutoutUrl: 'a.png', imageUrl: 'b.png' })).toBe('a.png')
  })

  it('falls back to imageUrl', () => {
    expect(getPlayerPhoto({ imageUrl: 'b.png' })).toBe('b.png')
  })

  it('returns undefined when no photo available', () => {
    expect(getPlayerPhoto({})).toBeUndefined()
  })
})
