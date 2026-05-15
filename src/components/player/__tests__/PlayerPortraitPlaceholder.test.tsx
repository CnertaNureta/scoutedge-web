import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlayerPortraitPlaceholder from '../PlayerPortraitPlaceholder'
import type { Player, Team } from '@/lib/types'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    slug: 'kylian-mbappe',
    name: 'Kylian Mbappé',
    teamSlug: 'france',
    position: 'FWD',
    number: 10,
    age: 27,
    club: 'Real Madrid',
    caps: 80,
    goals: 50,
    assists: 30,
    rating: 92,
    fitnessStatus: 'green',
    fitnessNote: 'Sharp.',
    sentimentScore: 80,
    sentimentLabel: 'positive',
    seoArticle: '',
    ...overrides,
  }
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    slug: 'france',
    name: 'France',
    flag: '🇫🇷',
    group: 'A',
    confederation: 'UEFA',
    fifaRanking: 2,
    coachName: 'Didier Deschamps',
    chemistry: 88,
    familiarity: 85,
    stability: 84,
    morale: 87,
    archetypeMatch: 'Elite Attack',
    keyInsight: 'Star-led.',
    seoArticle: '',
    ...overrides,
  }
}

describe('PlayerPortraitPlaceholder', () => {
  it('renders the monogram from first and last name', () => {
    render(
      <PlayerPortraitPlaceholder
        player={makePlayer({ name: 'Kylian Mbappé' })}
        team={makeTeam()}
      />,
    )
    expect(screen.getByText('KM')).toBeInTheDocument()
  })

  it('renders a single-letter monogram for single-word names', () => {
    render(
      <PlayerPortraitPlaceholder
        player={makePlayer({ name: 'Vinicius' })}
        team={makeTeam()}
      />,
    )
    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('renders the team flag and team name', () => {
    render(
      <PlayerPortraitPlaceholder
        player={makePlayer()}
        team={makeTeam({ flag: '🇫🇷', name: 'France' })}
      />,
    )
    expect(screen.getByText('🇫🇷')).toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
  })

  it('renders the archive stamp with SCT- prefix, uppercase team slug prefix, and PORTRAIT-PENDING-2026', () => {
    render(
      <PlayerPortraitPlaceholder
        player={makePlayer()}
        team={makeTeam({ slug: 'france' })}
      />,
    )
    const stamp = screen.getByText(/SCT-FRA-PORTRAIT-PENDING-2026/)
    expect(stamp).toBeInTheDocument()
  })

  it('handles team slugs with hyphens by stripping non-letters before slicing', () => {
    render(
      <PlayerPortraitPlaceholder
        player={makePlayer({ teamSlug: 'south-korea' })}
        team={makeTeam({ slug: 'south-korea', name: 'South Korea' })}
      />,
    )
    expect(screen.getByText(/SCT-SOU-PORTRAIT-PENDING-2026/)).toBeInTheDocument()
  })

  it.each(['GK', 'DEF', 'MID', 'FWD'] as const)(
    'renders without crashing for position %s',
    (position) => {
      const { container } = render(
        <PlayerPortraitPlaceholder
          player={makePlayer({ position })}
          team={makeTeam()}
        />,
      )
      expect(container.querySelector('[data-testid="portrait-placeholder"]')).toBeTruthy()
      expect(container.querySelector('svg')).toBeTruthy()
    },
  )
})
