import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { TEAMS } from '@/data/teams-meta'
import MatchesClient from '../MatchesClient'
import enMessages from '../../../../../messages/en.json'

const groups = [...new Set(TEAMS.map((team) => team.group))].sort()
const teamsBySlug = Object.fromEntries(TEAMS.map((team) => [team.slug, team]))
const teamsByGroup = Object.fromEntries(
  groups.map((group) => [group, TEAMS.filter((team) => team.group === group)])
)

const props = {
  fixtures: MATCH_FIXTURES,
  groups,
  teamsByGroup,
  teamsBySlug,
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('MatchesClient', () => {
  it('renders the narrative-first match board sections', () => {
    renderWithIntl(<MatchesClient {...props} />)

    expect(screen.getByText('Narrative-first match board')).toBeInTheDocument()
    expect(screen.getByText('Matchday Narratives')).toBeInTheDocument()
    expect(screen.getByText('Group Board')).toBeInTheDocument()
    expect(screen.getByText('First reads, first leverage')).toBeInTheDocument()
    expect(screen.getAllByText('Travel watch').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/13-hour body-clock shift/i).length).toBeGreaterThan(0)
  })

  it('filters the board down to a single group', async () => {
    const user = userEvent.setup()

    renderWithIntl(<MatchesClient {...props} />)
    await user.click(screen.getByRole('button', { name: /group a/i }))

    expect(screen.getByText('Showing Group A only')).toBeInTheDocument()
    expect(screen.queryByText('Showing all groups')).not.toBeInTheDocument()
  })
})
