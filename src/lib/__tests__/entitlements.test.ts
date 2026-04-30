import { describe, expect, it } from 'vitest'
import { hasAccess, type Entitlement } from '../entitlements'

function entitlement(overrides: Partial<Entitlement>): Entitlement {
  return {
    id: overrides.id ?? 'entitlement-1',
    entitlement_type: overrides.entitlement_type ?? 'match_pass',
    scope: overrides.scope ?? null,
    valid_from: overrides.valid_from ?? '2026-01-01T00:00:00.000Z',
    valid_until: overrides.valid_until ?? '2999-01-01T00:00:00.000Z',
  }
}

describe('hasAccess', () => {
  it('allows scoped prediction context with a matching match pass', () => {
    const entitlements = [
      entitlement({ entitlement_type: 'match_pass', scope: 'mexico-vs-denmark' }),
    ]

    expect(hasAccess(entitlements, 'prediction', 'mexico-vs-denmark')).toBe(true)
  })

  it('allows scoped prediction context with either team pass in the matchup', () => {
    const entitlements = [
      entitlement({ entitlement_type: 'team_pass', scope: 'denmark' }),
    ]

    expect(hasAccess(entitlements, 'prediction', 'mexico-vs-denmark')).toBe(true)
  })

  it('allows team-scoped prediction context with a matching team pass', () => {
    const entitlements = [
      entitlement({ entitlement_type: 'team_pass', scope: 'mexico' }),
    ]

    expect(hasAccess(entitlements, 'prediction', 'mexico')).toBe(true)
  })

  it('redacts scoped prediction context for unrelated passes', () => {
    const entitlements = [
      entitlement({ entitlement_type: 'match_pass', scope: 'usa-vs-canada' }),
      entitlement({ entitlement_type: 'team_pass', scope: 'canada' }),
    ]

    expect(hasAccess(entitlements, 'prediction', 'mexico-vs-denmark')).toBe(false)
  })

  it('keeps unscoped prediction context limited to tournament and scout passes', () => {
    const matchPass = [entitlement({ entitlement_type: 'match_pass', scope: 'mexico-vs-denmark' })]
    const tournamentPass = [entitlement({ entitlement_type: 'tournament_pass' })]

    expect(hasAccess(matchPass, 'prediction')).toBe(false)
    expect(hasAccess(tournamentPass, 'prediction')).toBe(true)
  })
})
