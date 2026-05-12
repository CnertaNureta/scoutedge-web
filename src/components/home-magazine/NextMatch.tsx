'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Flag, PhotoPlaceholder, TEAMS } from './visual-system'

type Tab = 'prob' | 'form' | 'h2h' | 'narr'

interface NextMatchFixture {
  homeName: string
  homeCode: string
  homeColors: [string, string, string]
  awayName: string
  awayCode: string
  awayColors: [string, string, string]
  group: string
  round: string
  venue: string
  city: string
  kickoffLabel: string
  homeWinProb: number
  drawProb: number
  awayWinProb: number
}

interface NextMatchModuleProps {
  fixture?: NextMatchFixture
}

function toPct(value: number): number {
  return value > 1 ? value : value * 100
}

export function NextMatchModule({ fixture }: NextMatchModuleProps = {}) {
  const [tab, setTab] = useState<Tab>('prob')
  const t = useTranslations('magazine.nextMatch')

  const m = fixture ?? {
    homeName: 'Brazil',
    homeCode: 'BRA',
    homeColors: TEAMS.BRA.colors,
    awayName: 'Argentina',
    awayCode: 'ARG',
    awayColors: TEAMS.ARG.colors,
    group: 'D',
    round: 'M14',
    venue: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
    kickoffLabel: '09:00 PM ET · ATL',
    homeWinProb: 58,
    drawProb: 14,
    awayWinProb: 28,
  }
  const homePct = toPct(m.homeWinProb)
  const drawPct = toPct(m.drawProb)
  const awayPct = toPct(m.awayWinProb)
  // The center bignum slot shows win probabilities directly (honest read of
  // the available data). When an expected-score model ships, swap to model
  // outputs and label `EXPECTED` instead of `WIN PROBABILITY`.
  const homeProbInt = Math.round(homePct)
  const awayProbInt = Math.round(awayPct)
  const drawProbInt = Math.max(0, 100 - homeProbInt - awayProbInt)

  return (
    <div
      data-testid="next-match"
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--ink)',
        color: 'var(--cream)',
        padding: 48,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(60% 50% at 80% 0%, rgba(168,224,99,0.10), transparent 60%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 32,
        }}
      >
        <div>
          <div className="ko-eyebrow ko-gold" style={{ marginBottom: 12 }}>
            {t('sectionLabel')}
          </div>
          <div className="ko-display" style={{ fontSize: 80, lineHeight: 0.9 }}>
            {t('titleLine1')}
            <br />
            <em style={{ color: 'var(--green)' }}>{t('titleEmphasis')}</em>
          </div>
        </div>
        <div
          className="ko-mono ko-muted"
          style={{ fontSize: 12, textAlign: 'right', letterSpacing: '0.18em' }}
        >
          {m.round.toUpperCase()}
          <br />
          {t('groupVenuePrefix')} {m.group} · {m.venue.toUpperCase()}
          <br />
          {m.kickoffLabel.toUpperCase()}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1.3fr 1fr',
          gap: 28,
        }}
      >
        {/* Main panel */}
        <div
          className="ko-card"
          style={{
            background: 'var(--soft)',
            borderColor: 'var(--line-strong)',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          {/* Hero strip with two team photos */}
          <div
            style={{
              position: 'relative',
              height: 240,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
            }}
          >
            <PhotoPlaceholder
              caption="[BRA · #10 · attack]"
              noCaption
              className="no-caption"
              src="/images/kick-oracle/next-match-bra.jpg"
              alt="Brazil player in attacking action"
              style={{ position: 'relative' }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(135deg, rgba(0,156,59,0.4) 0%, transparent 60%)',
                }}
              />
            </PhotoPlaceholder>
            <PhotoPlaceholder
              caption="[ARG · #10 · attack]"
              noCaption
              className="no-caption"
              src="/images/kick-oracle/next-match-arg.jpg"
              alt="Argentina player in attacking action"
              style={{ position: 'relative' }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(225deg, rgba(117,170,219,0.4) 0%, transparent 60%)',
                }}
              />
            </PhotoPlaceholder>

            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--ink)',
                padding: '0 32px',
                borderLeft: '1px solid var(--line)',
                borderRight: '1px solid var(--line)',
              }}
            >
              <span className="ko-eyebrow ko-gold" style={{ marginBottom: 6 }}>{t('winProbLabel')}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span className="ko-bignum ko-green" style={{ fontSize: 56 }}>{homeProbInt}</span>
                <span
                  className="ko-display"
                  style={{ fontSize: 28, fontStyle: 'italic', color: 'var(--muted)' }}
                >
                  —
                </span>
                <span className="ko-bignum" style={{ fontSize: 56, color: 'var(--cream)' }}>{awayProbInt}</span>
              </div>
              <span
                className="ko-mono ko-muted"
                style={{ fontSize: 10, marginTop: 6, letterSpacing: '0.18em' }}
              >
                {t('drawSuffix', { pct: drawProbInt })}
              </span>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 24,
                bottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                zIndex: 3,
              }}
            >
              <Flag colors={m.homeColors} style={{ width: 42, height: 30 }} />
              <div>
                <div style={{ fontFamily: 'var(--f-condensed)', fontWeight: 900, fontSize: 24 }}>
                  {m.homeName.toUpperCase()}
                </div>
                <div
                  className="ko-mono ko-muted"
                  style={{ fontSize: 10, letterSpacing: '0.16em' }}
                >
                  {t('homeWinSuffix', { pct: Math.round(homePct) })}
                </div>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                right: 24,
                bottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                zIndex: 3,
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--f-condensed)', fontWeight: 900, fontSize: 24 }}>
                  {m.awayName.toUpperCase()}
                </div>
                <div
                  className="ko-mono ko-muted"
                  style={{ fontSize: 10, letterSpacing: '0.16em' }}
                >
                  {t('awayWinSuffix', { pct: Math.round(awayPct) })}
                </div>
              </div>
              <Flag colors={m.awayColors} style={{ width: 42, height: 30 }} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', padding: '0 28px' }}>
            {(
              [
                ['prob', t('tabProbability')],
                ['form', t('tabForm')],
                ['h2h', t('tabH2h')],
                ['narr', t('tabNarrative')],
              ] satisfies Array<[Tab, string]>
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: '16px 0',
                  marginRight: 32,
                  cursor: 'pointer',
                  fontFamily: 'var(--f-condensed)',
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  fontSize: 12,
                  color: tab === k ? 'var(--green)' : 'var(--cream)',
                  borderBottom: tab === k ? '2px solid var(--green)' : '2px solid transparent',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <div style={{ padding: 28, minHeight: 200 }}>
            {tab === 'prob' && (
              <ProbabilityView
                homeCode={m.homeCode}
                awayCode={m.awayCode}
                homePct={homePct}
                drawPct={drawPct}
                awayPct={awayPct}
              />
            )}
            {tab === 'form' && <FormView homeCode={m.homeCode} awayCode={m.awayCode} />}
            {tab === 'h2h' && <H2HView homeCode={m.homeCode} awayCode={m.awayCode} />}
            {tab === 'narr' && <NarrativeView />}
          </div>
        </div>

        {/* Side rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="ko-card-paper" style={{ padding: 24, position: 'relative' }}>
            <div
              className="ko-eyebrow"
              style={{ color: 'var(--green-deep)', marginBottom: 12 }}
            >
              {t('editorEyebrow')}
            </div>
            <div className="ko-display" style={{ fontSize: 28, color: 'var(--ink)', marginBottom: 14 }}>
              {t('editorQuoteLine1')}
              <br />
              {t('editorQuoteLine2')}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: '#2a2a2a', margin: 0 }}>
              {t('editorBody')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2a2a' }} />
              <div>
                <div className="ko-label" style={{ fontSize: 11, color: 'var(--ink)' }}>
                  {t('editorByline')}
                </div>
                <div className="ko-mono" style={{ fontSize: 10, color: '#666' }}>
                  {t('editorUpdated')}
                </div>
              </div>
            </div>
          </div>

          <div
            className="ko-card"
            style={{ padding: 20, background: 'var(--green)', color: 'var(--ink)', border: 0 }}
          >
            <div className="ko-eyebrow" style={{ color: 'var(--ink)', opacity: 0.7, marginBottom: 8 }}>
              {t('castEyebrow')}
            </div>
            <div className="ko-display" style={{ fontSize: 26, lineHeight: 1, color: 'var(--ink)' }}>
              {t('castHeadline')}
            </div>
            <p style={{ fontSize: 13, marginTop: 10, color: 'var(--ink)', opacity: 0.85, lineHeight: 1.5 }}>
              {t('castBody')}
            </p>
            <Link
              href="/predict"
              className="ko-btn"
              style={{
                marginTop: 14,
                background: 'var(--ink)',
                color: 'var(--green)',
                display: 'inline-flex',
              }}
            >
              {t('castCta')}
            </Link>
          </div>

          <div className="ko-card" style={{ padding: 18, background: 'var(--surface)' }}>
            <div className="ko-eyebrow ko-muted" style={{ marginBottom: 10 }}>{t('modelDetails')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Bit label="Elo Δ" v="+47" pos />
              <Bit label="xG home" v="1.94" />
              <Bit label="xG away" v="1.12" />
              <Bit label="Rest days" v="6 vs 4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface BitProps {
  label: string
  v: string
  pos?: boolean
}

function Bit({ label, v, pos = false }: BitProps) {
  return (
    <div>
      <div
        className="ko-mono ko-muted"
        style={{ fontSize: 9, letterSpacing: '0.18em', marginBottom: 2 }}
      >
        {label.toUpperCase()}
      </div>
      <div className="ko-label" style={{ fontSize: 16, color: pos ? 'var(--green)' : 'var(--cream)' }}>
        {v}
      </div>
    </div>
  )
}

interface ProbabilityViewProps {
  homeCode: string
  awayCode: string
  homePct: number
  drawPct: number
  awayPct: number
}

function ProbabilityView({
  homeCode,
  awayCode,
  homePct,
  drawPct,
  awayPct,
}: ProbabilityViewProps) {
  const t = useTranslations('magazine.nextMatch')
  // TODO Phase 4: secondary metrics (BTTS, over 2.5, etc.) from model
  const metrics = [
    { label: t('metricBtts'), v: 68 },
    { label: t('metricOver25'), v: 61 },
    { label: t('metricCleanSheet', { code: homeCode }), v: 22 },
    { label: t('metricFirstHalf'), v: 79 },
  ]
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div
          className="ko-mono ko-muted"
          style={{ fontSize: 11, marginBottom: 8, letterSpacing: '0.16em' }}
        >
          {t('winProbabilityLabel')}
        </div>
        <div
          style={{
            display: 'flex',
            height: 14,
            borderRadius: 7,
            overflow: 'hidden',
            background: 'var(--surface)',
          }}
        >
          <div style={{ width: `${homePct}%`, background: 'linear-gradient(90deg, var(--green), #c8f08a)' }} />
          <div style={{ width: `${drawPct}%`, background: 'var(--surface-2)' }} />
          <div style={{ width: `${awayPct}%`, background: 'linear-gradient(90deg, #e8a060, var(--gold))' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span className="ko-mono" style={{ fontSize: 12, color: 'var(--green)' }}>{homeCode} · {Math.round(homePct)}%</span>
          <span className="ko-mono ko-muted" style={{ fontSize: 12 }}>{t('drawLabel')} · {Math.round(drawPct)}%</span>
          <span className="ko-mono ko-gold" style={{ fontSize: 12 }}>{awayCode} · {Math.round(awayPct)}%</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ padding: 14, border: '1px solid var(--line)' }}>
            <div className="ko-label" style={{ fontSize: 18, color: 'var(--gold)' }}>{m.v}%</div>
            <div
              className="ko-mono ko-muted"
              style={{ fontSize: 9, letterSpacing: '0.14em', marginTop: 6, lineHeight: 1.4 }}
            >
              {m.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface FormViewProps {
  homeCode: string
  awayCode: string
}

function FormView({ homeCode, awayCode }: FormViewProps) {
  // TODO Phase 4: real recent-form feed
  const rows: Array<{ team: string; form: Array<'W' | 'L' | 'D'>; goals: string }> = [
    { team: homeCode, form: ['W', 'W', 'D', 'W', 'W'], goals: '11-3' },
    { team: awayCode, form: ['W', 'L', 'W', 'W', 'D'], goals: '8-5' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {rows.map((r) => (
        <div
          key={r.team}
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 90px',
            gap: 20,
            alignItems: 'center',
          }}
        >
          <div className="ko-label" style={{ fontSize: 16 }}>{r.team}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {r.form.map((f, i) => (
              <span
                key={i}
                style={{
                  width: 32,
                  height: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--f-condensed)',
                  fontWeight: 900,
                  background:
                    f === 'W' ? 'var(--green)' : f === 'L' ? 'rgba(255,68,68,0.2)' : 'var(--surface-2)',
                  color: f === 'W' ? 'var(--ink)' : f === 'L' ? 'var(--red)' : 'var(--cream)',
                }}
              >
                {f}
              </span>
            ))}
          </div>
          <div className="ko-mono" style={{ fontSize: 13, textAlign: 'right' }}>{r.goals}</div>
        </div>
      ))}
    </div>
  )
}

interface H2HViewProps {
  homeCode: string
  awayCode: string
}

function H2HView({ homeCode, awayCode }: H2HViewProps) {
  const t = useTranslations('magazine.nextMatch')
  // TODO Phase 4: real H2H from src/data/h2h-history.ts
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 20,
        alignItems: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div className="ko-bignum ko-green" style={{ fontSize: 64 }}>—</div>
        <div className="ko-mono ko-muted" style={{ fontSize: 10, letterSpacing: '0.18em' }}>{t('h2hHomeWins', { code: homeCode })}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="ko-bignum" style={{ fontSize: 64, color: 'var(--cream)' }}>—</div>
        <div className="ko-mono ko-muted" style={{ fontSize: 10, letterSpacing: '0.18em' }}>{t('h2hDraws')}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="ko-bignum ko-gold" style={{ fontSize: 64 }}>—</div>
        <div className="ko-mono ko-muted" style={{ fontSize: 10, letterSpacing: '0.18em' }}>{t('h2hAwayWins', { code: awayCode })}</div>
      </div>
      <div style={{ gridColumn: '1 / 4', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <div className="ko-mono ko-muted" style={{ fontSize: 10, letterSpacing: '0.18em' }}>
          {t('h2hHistoryLabel')}
        </div>
        <div className="ko-display" style={{ fontSize: 20, marginTop: 6, fontStyle: 'italic', color: 'var(--muted)' }}>
          {t('h2hPlaceholder')}
        </div>
      </div>
    </div>
  )
}

function NarrativeView() {
  const t = useTranslations('magazine.nextMatch')
  // TODO Phase 4: model-driven narrative bullets
  const items = [
    { t: t('narrativeItem1Body'), a: t('narrativeItem1Tag') },
    { t: t('narrativeItem2Body'), a: t('narrativeItem2Tag') },
    { t: t('narrativeItem3Body'), a: t('narrativeItem3Tag') },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((n, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 14,
            padding: '12px 0',
            borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none',
          }}
        >
          <div
            className="ko-display"
            style={{ fontSize: 32, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1, minWidth: 30 }}
          >
            {i + 1}
          </div>
          <div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{n.t}</div>
            <div
              className="ko-mono"
              style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--green)', marginTop: 4 }}
            >
              {n.a.toUpperCase()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
