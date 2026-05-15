import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import IntelligenceModule from '../IntelligenceModule'

describe('IntelligenceModule', () => {
  it('renders the title', () => {
    render(
      <IntelligenceModule title="ScoutEdge Score" dossierId="SCT-MEX-T1-W21-2026">
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(screen.getByText('ScoutEdge Score')).toBeInTheDocument()
  })

  it('renders the dossier stamp', () => {
    render(
      <IntelligenceModule title="ScoutEdge Score" dossierId="SCT-MEX-T1-W21-2026">
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(screen.getByText('SCT-MEX-T1-W21-2026')).toBeInTheDocument()
  })

  it('renders the optional subtitle when provided', () => {
    render(
      <IntelligenceModule
        title="ScoutEdge Score"
        subtitle="Intelligence Brief"
        dossierId="SCT-MEX-T1-W21-2026"
      >
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(screen.getByText('Intelligence Brief')).toBeInTheDocument()
  })

  it('renders the verdict with auto-appended Kick Oracle Desk signature', () => {
    render(
      <IntelligenceModule
        title="ScoutEdge Score"
        dossierId="SCT-MEX-T1-W21-2026"
        scoutVerdict="A dark horse forged by tournament chaos"
      >
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(
      screen.getByText(/A dark horse forged by tournament chaos\s*— Kick Oracle Desk/),
    ).toBeInTheDocument()
  })

  it('does not duplicate the signature if the verdict already ends with it', () => {
    render(
      <IntelligenceModule
        title="ScoutEdge Score"
        dossierId="SCT-MEX-T1-W21-2026"
        scoutVerdict="Already signed — Kick Oracle Desk"
      >
        <p>Body</p>
      </IntelligenceModule>,
    )
    const matches = screen.getAllByText(/— Kick Oracle Desk/)
    // Verdict only — footer masthead renders uppercase so the case-sensitive
    // regex must not match it. Verifies the signature is not appended twice.
    expect(matches).toHaveLength(1)
  })

  it('renders the confidence footer with signal and source counts', () => {
    render(
      <IntelligenceModule
        title="ScoutEdge Score"
        dossierId="SCT-MEX-T1-W21-2026"
        signalCount={42}
        sourceCount={7}
      >
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(
      screen.getByText(/Computed from 42 signals · 7 sources/),
    ).toBeInTheDocument()
  })

  it('includes refreshed relative time when lastUpdatedAt is provided', () => {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    render(
      <IntelligenceModule
        title="ScoutEdge Score"
        dossierId="SCT-MEX-T1-W21-2026"
        signalCount={5}
        lastUpdatedAt={sixHoursAgo}
      >
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(screen.getByText(/refreshed .* ago/)).toBeInTheDocument()
  })

  it('omits the confidence footer line entirely when all confidence values are undefined', () => {
    render(
      <IntelligenceModule title="ScoutEdge Score" dossierId="SCT-MEX-T1-W21-2026">
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(screen.queryByText(/Computed from/)).not.toBeInTheDocument()
    expect(screen.queryByText(/refreshed/)).not.toBeInTheDocument()
  })

  it('omits sources segment when sourceCount is undefined but signalCount is set', () => {
    render(
      <IntelligenceModule
        title="ScoutEdge Score"
        dossierId="SCT-MEX-T1-W21-2026"
        signalCount={3}
      >
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(screen.getByText(/Computed from 3 signals/)).toBeInTheDocument()
    expect(screen.queryByText(/sources/)).not.toBeInTheDocument()
  })

  it('renders children inside the content slot', () => {
    render(
      <IntelligenceModule title="ScoutEdge Score" dossierId="SCT-MEX-T1-W21-2026">
        <p data-testid="content-slot">child body</p>
      </IntelligenceModule>,
    )
    expect(screen.getByTestId('content-slot')).toHaveTextContent('child body')
  })
})
