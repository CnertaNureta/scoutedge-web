import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import IntelligenceModule from '../IntelligenceModule'
import enMessages from '../../../../messages/en.json'
import zhMessages from '../../../../messages/zh.json'

function renderWithIntl(
  ui: React.ReactNode,
  locale: 'en' | 'zh' = 'en',
  messages: Record<string, unknown> = enMessages,
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('IntelligenceModule', () => {
  it('renders the title', () => {
    renderWithIntl(
      <IntelligenceModule title="ScoutEdge Score" dossierId="SCT-MEX-T1-W21-2026">
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(screen.getByText('ScoutEdge Score')).toBeInTheDocument()
  })

  it('renders the dossier stamp', () => {
    renderWithIntl(
      <IntelligenceModule title="ScoutEdge Score" dossierId="SCT-MEX-T1-W21-2026">
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(screen.getByText('SCT-MEX-T1-W21-2026')).toBeInTheDocument()
  })

  it('renders the optional subtitle when provided', () => {
    renderWithIntl(
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
    renderWithIntl(
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
    renderWithIntl(
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
    renderWithIntl(
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
    renderWithIntl(
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
    renderWithIntl(
      <IntelligenceModule title="ScoutEdge Score" dossierId="SCT-MEX-T1-W21-2026">
        <p>Body</p>
      </IntelligenceModule>,
    )
    expect(screen.queryByText(/Computed from/)).not.toBeInTheDocument()
    expect(screen.queryByText(/refreshed/)).not.toBeInTheDocument()
  })

  it('omits sources segment when sourceCount is undefined but signalCount is set', () => {
    renderWithIntl(
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

  it('localizes confidence footer copy and relative time', () => {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    renderWithIntl(
      <IntelligenceModule
        title="球探总评"
        dossierId="SCT-MEX-T1-W21-2026"
        signalCount={5}
        sourceCount={2}
        lastUpdatedAt={sixHoursAgo}
        scoutVerdict="样本量充足"
      >
        <p>Body</p>
      </IntelligenceModule>,
      'zh',
      zhMessages,
    )

    expect(screen.getByText(/基于 5 条信号计算 · 2 个来源 · 刷新于/)).toBeInTheDocument()
    expect(screen.getByText(/样本量充足\s*— Kick Oracle 数据台/)).toBeInTheDocument()
    expect(screen.queryByText(/Computed from|refreshed/)).not.toBeInTheDocument()
  })

  it('renders children inside the content slot', () => {
    renderWithIntl(
      <IntelligenceModule title="ScoutEdge Score" dossierId="SCT-MEX-T1-W21-2026">
        <p data-testid="content-slot">child body</p>
      </IntelligenceModule>,
    )
    expect(screen.getByTestId('content-slot')).toHaveTextContent('child body')
  })
})
