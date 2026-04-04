import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MatchesClient from '../MatchesClient'

describe('MatchesClient', () => {
  it('renders the narrative-first match board sections', () => {
    render(<MatchesClient />)

    expect(screen.getByText('Narrative-first match board')).toBeInTheDocument()
    expect(screen.getByText('Matchday Narratives')).toBeInTheDocument()
    expect(screen.getByText('Group Board')).toBeInTheDocument()
    expect(screen.getByText('First reads, first leverage')).toBeInTheDocument()
    expect(screen.getAllByText('Travel watch').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/13-hour body-clock shift/i).length).toBeGreaterThan(0)
  })

  it('filters the board down to a single group', async () => {
    const user = userEvent.setup()

    render(<MatchesClient />)
    await user.click(screen.getByRole('button', { name: /group a/i }))

    expect(screen.getByText('Showing Group A only')).toBeInTheDocument()
    expect(screen.queryByText('Showing all groups')).not.toBeInTheDocument()
  })
})
