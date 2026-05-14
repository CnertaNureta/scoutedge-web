import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import {
  linkifyText,
  linkifyHtml,
  buildTeamEntities,
  buildCityEntities,
  type LinkEntity,
} from '@/lib/auto-link'

const SAMPLE_TEAMS: LinkEntity[] = [
  { name: 'Brazil', href: '/en/teams/brazil' },
  { name: 'Argentina', href: '/en/teams/argentina' },
  { name: 'France', href: '/en/teams/france' },
  { name: 'South Korea', href: '/en/teams/south-korea' },
  { name: 'Korea', href: '/en/teams/korea' },
]

const SAMPLE_CITIES: LinkEntity[] = [
  { name: 'Los Angeles', href: '/en/cities/los-angeles' },
  { name: 'Mexico City', href: '/en/cities/mexico-city' },
]

describe('linkifyText', () => {
  it('wraps a single occurrence of a known team in a Link', () => {
    const nodes = linkifyText('Brazil play at noon.', SAMPLE_TEAMS)
    expect(nodes).toHaveLength(2)
    const linkNode = nodes[0]
    expect(isValidElement(linkNode)).toBe(true)
    // String tail should follow.
    expect(nodes[1]).toBe(' play at noon.')
  })

  it('respects word boundaries — "Brazil" inside "Brazilian" should NOT match', () => {
    const nodes = linkifyText('The Brazilian winger is great.', SAMPLE_TEAMS)
    // Single string node, no React elements.
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toBe('The Brazilian winger is great.')
  })

  it('respects word boundaries — "France" inside "Frances" should NOT match', () => {
    const nodes = linkifyText('Frances had a great game.', SAMPLE_TEAMS)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toBe('Frances had a great game.')
  })

  it('matches only first occurrence of each entity per call', () => {
    const nodes = linkifyText('Brazil beat Brazil again.', SAMPLE_TEAMS)
    // First "Brazil" becomes a Link, second stays as text.
    const linkCount = nodes.filter((n) => isValidElement(n)).length
    expect(linkCount).toBe(1)
    // Tail string contains the second "Brazil".
    expect(nodes.some((n) => typeof n === 'string' && n.includes('Brazil'))).toBe(true)
  })

  it('honors maxLinks limit (default 3)', () => {
    const nodes = linkifyText(
      'Brazil and Argentina and France and South Korea all play.',
      SAMPLE_TEAMS,
    )
    const linkCount = nodes.filter((n) => isValidElement(n)).length
    expect(linkCount).toBeLessThanOrEqual(3)
  })

  it('honors custom maxLinks=1', () => {
    const nodes = linkifyText('Brazil and Argentina and France play.', SAMPLE_TEAMS, {
      maxLinks: 1,
    })
    const linkCount = nodes.filter((n) => isValidElement(n)).length
    expect(linkCount).toBe(1)
  })

  it('matches longer name first ("South Korea" beats "Korea")', () => {
    const nodes = linkifyText('South Korea will surprise.', SAMPLE_TEAMS)
    const link = nodes.find((n) => isValidElement(n))
    expect(link).toBeDefined()
    // Child text should be "South Korea", not just "Korea".
    if (isValidElement(link)) {
      // @ts-expect-error - children on ReactElement
      expect(link.props.children).toBe('South Korea')
    }
  })

  it('returns original text wrapped in array when no entities', () => {
    const nodes = linkifyText('hello world', [])
    expect(nodes).toEqual(['hello world'])
  })

  it('returns single-string array when no matches', () => {
    const nodes = linkifyText('no teams here', SAMPLE_TEAMS)
    expect(nodes).toEqual(['no teams here'])
  })

  it('returns ReactNode array (mix of strings and elements)', () => {
    const nodes = linkifyText('Brazil vs Argentina at Mexico City.', [
      ...SAMPLE_TEAMS,
      ...SAMPLE_CITIES,
    ])
    // 3 entity matches → 3 Links + 4 strings (head/middles/tail).
    const linkCount = nodes.filter((n) => isValidElement(n)).length
    expect(linkCount).toBeGreaterThanOrEqual(2) // at least Brazil + Argentina before maxLinks=3
    expect(linkCount).toBeLessThanOrEqual(3)
  })

  it('handles city names that contain a team-like substring without bleeding', () => {
    const nodes = linkifyText('Mexico City has nightlife.', [
      { name: 'Mexico', href: '/en/teams/mexico' },
      { name: 'Mexico City', href: '/en/cities/mexico-city' },
    ])
    // "Mexico City" (longer) should win, not "Mexico".
    const link = nodes.find((n) => isValidElement(n))
    if (isValidElement(link)) {
      // @ts-expect-error - children on ReactElement
      expect(link.props.children).toBe('Mexico City')
    }
  })
})

describe('linkifyHtml', () => {
  it('returns HTML string with anchor tag for first match', () => {
    const html = linkifyHtml('Brazil is strong.', SAMPLE_TEAMS)
    expect(html).toContain('<a href="/en/teams/brazil">Brazil</a>')
  })

  it('respects word boundaries in HTML output', () => {
    const html = linkifyHtml('The Brazilian winger.', SAMPLE_TEAMS)
    expect(html).toBe('The Brazilian winger.')
    expect(html).not.toContain('<a')
  })

  it('caps at maxLinks', () => {
    const html = linkifyHtml(
      'Brazil and Argentina and France and South Korea play.',
      SAMPLE_TEAMS,
      { maxLinks: 2 },
    )
    const anchorCount = (html.match(/<a /g) || []).length
    expect(anchorCount).toBe(2)
  })

  it('preserves non-matching text unchanged', () => {
    const html = linkifyHtml('hello world no matches', SAMPLE_TEAMS)
    expect(html).toBe('hello world no matches')
  })

  it('emits class attribute when provided', () => {
    const html = linkifyHtml('Brazil wins.', SAMPLE_TEAMS, {
      className: 'auto-link',
    })
    expect(html).toContain('class="auto-link"')
  })
})

describe('buildTeamEntities / buildCityEntities', () => {
  it('builds locale-prefixed team hrefs and excludes current slug', () => {
    const entities = buildTeamEntities(
      [
        { slug: 'brazil', name: 'Brazil' },
        { slug: 'france', name: 'France' },
        { slug: 'argentina', name: 'Argentina' },
      ],
      'en',
      'brazil',
    )
    expect(entities).toHaveLength(2)
    expect(entities.map((e) => e.name).sort()).toEqual(['Argentina', 'France'])
    expect(entities[0].href.startsWith('/en/teams/')).toBe(true)
  })

  it('builds locale-prefixed city hrefs', () => {
    const entities = buildCityEntities(
      [
        { slug: 'los-angeles', name: 'Los Angeles' },
        { slug: 'mexico-city', name: 'Mexico City' },
      ],
      'es',
    )
    expect(entities).toHaveLength(2)
    expect(entities[0].href.startsWith('/es/cities/')).toBe(true)
  })
})
