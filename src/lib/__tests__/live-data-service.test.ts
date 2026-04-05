import { describe, expect, it } from 'vitest'

import { getLiveTeamDetails, slugToApiName } from '../live-data-service'

describe('live data service aliases', () => {
  it('resolves provider aliases when reading cached live team details', () => {
    const usa = getLiveTeamDetails('USA')
    const unitedStates = getLiveTeamDetails('United States')
    const southKorea = getLiveTeamDetails('South Korea')
    const koreaRepublic = getLiveTeamDetails('Korea Republic')

    expect(usa).not.toBeNull()
    expect(unitedStates?.id).toBe(usa?.id)
    expect(southKorea).not.toBeNull()
    expect(koreaRepublic?.id).toBe(southKorea?.id)
  })

  it('maps canonical slugs to provider display names', () => {
    expect(slugToApiName('usa')).toBe('USA')
    expect(slugToApiName('south-korea')).toBe('South Korea')
    expect(slugToApiName('cabo-verde')).toBe('Cabo Verde')
  })
})
