import type { Team, Player } from '@/lib/types'
import { getTranslations } from 'next-intl/server'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import { BRAND } from '@/lib/brand-tokens'
import {
  computeChemistryWeb,
  type ChemistryEdge,
  type ChemistryLine,
  type ChemistryNode,
} from '@/lib/intelligence/chemistry-web'

interface ChemistryWebProps {
  team: Team
  players: Player[]
}

// SVG viewbox dimensions. Picked once; never animated.
const SVG_VIEW_W = 720
const SVG_VIEW_H = 440
const PADDING_X = 48
const PADDING_Y = 32
const NODE_RADIUS = 22
const EDGE_THRESHOLD = 0.5

// Subtle primary-green tints per line. No Night Match blue anywhere.
const LINE_FILL: Record<ChemistryLine, string> = {
  GK: `${BRAND.primary}33`, // lightest
  DEF: `${BRAND.primary}66`,
  MID: `${BRAND.primary}99`,
  FWD: BRAND.primary,
}

function projectX(x: number): number {
  return PADDING_X + x * (SVG_VIEW_W - 2 * PADDING_X)
}

function projectY(y: number): number {
  return PADDING_Y + y * (SVG_VIEW_H - 2 * PADDING_Y)
}

function findNode(nodes: ReadonlyArray<ChemistryNode>, id: string): ChemistryNode | undefined {
  return nodes.find((n) => n.playerId === id)
}

function formatScore(score: number): string {
  return score.toFixed(2)
}

export default async function ChemistryWeb({ team, players }: ChemistryWebProps) {
  const t = await getTranslations('chemistryWeb')
  const breakdown = computeChemistryWeb(team, players)
  const dossierId = `SCT-${team.slug.toUpperCase().slice(0, 3)}-CHEMISTRY-WEB-2026`

  if (breakdown.nodes.length === 0) {
    return (
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <IntelligenceModule
          title={t('heading')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          accentColor={BRAND.primary}
        >
          <p className="font-body text-sm text-on-surface-variant leading-relaxed">
            {t('stubFootnote')}
          </p>
        </IntelligenceModule>
      </section>
    )
  }

  const topPair = breakdown.strongestPairs[0]
  const topPairLabel = topPair
    ? `${findNode(breakdown.nodes, topPair.a)?.playerName ?? topPair.a} ↔ ${
        findNode(breakdown.nodes, topPair.b)?.playerName ?? topPair.b
      }`
    : team.name

  const visibleEdges = breakdown.edges.filter((edge) => edge.score >= EDGE_THRESHOLD)

  const lineLabel = (line: ChemistryLine): string => t(`lineLabels.${line}`)

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <IntelligenceModule
        title={t('heading')}
        subtitle={t('subtitle')}
        dossierId={dossierId}
        scoutVerdict={t('scoutVerdict', { team: team.name, topPair: topPairLabel })}
        signalCount={breakdown.signalCount}
        sourceCount={breakdown.sourceCount}
        accentColor={BRAND.primary}
      >
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
          <svg
            viewBox={`0 0 ${SVG_VIEW_W} ${SVG_VIEW_H}`}
            role="img"
            aria-label={t('heading')}
            className="w-full h-auto"
          >
            {/* Edges */}
            <g stroke={BRAND.primary} strokeLinecap="round">
              {visibleEdges.map((edge: ChemistryEdge) => {
                const a = findNode(breakdown.nodes, edge.a)
                const b = findNode(breakdown.nodes, edge.b)
                if (!a || !b) return null
                return (
                  <line
                    key={`${edge.a}-${edge.b}`}
                    x1={projectX(a.x)}
                    y1={projectY(a.y)}
                    x2={projectX(b.x)}
                    y2={projectY(b.y)}
                    strokeWidth={1 + edge.score * 2}
                    strokeOpacity={Math.max(0.15, edge.score * 0.75)}
                  />
                )
              })}
            </g>

            {/* Nodes */}
            <g>
              {breakdown.nodes.map((node) => {
                const cx = projectX(node.x)
                const cy = projectY(node.y)
                return (
                  <g key={node.playerId}>
                    <title>{t('nodeAriaLabel', { name: node.playerName, line: lineLabel(node.line) })}</title>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={NODE_RADIUS}
                      fill={LINE_FILL[node.line]}
                      stroke={BRAND.primary}
                      strokeWidth={1.5}
                    />
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fontSize={13}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fill="#0a390a"
                      fontWeight={700}
                    >
                      {node.number}
                    </text>
                    <text
                      x={cx}
                      y={cy + NODE_RADIUS + 14}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fill="#ffffff99"
                    >
                      {node.playerName.split(' ').slice(-1)[0]}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        </div>

        {/* Strongest pairs caption */}
        {breakdown.strongestPairs.length > 0 && (
          <div className="mt-6">
            <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest block mb-3">
              {t('strongestPairsLabel')}
            </span>
            <ol className="space-y-2">
              {breakdown.strongestPairs.map((pair, idx) => {
                const a = findNode(breakdown.nodes, pair.a)
                const b = findNode(breakdown.nodes, pair.b)
                if (!a || !b) return null
                return (
                  <li
                    key={`${pair.a}-${pair.b}`}
                    className="flex items-start gap-3 text-sm text-on-surface leading-relaxed"
                  >
                    <span
                      className="font-mono text-[10px] text-primary mt-1 shrink-0"
                      aria-hidden="true"
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span>
                      {t('pairScoreFormat', {
                        a: a.playerName,
                        b: b.playerName,
                        score: formatScore(pair.score),
                      })}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        <p className="mt-6 font-label text-[10px] text-on-surface-variant/70 uppercase tracking-widest leading-relaxed">
          {t('stubFootnote')}
        </p>
      </IntelligenceModule>
    </section>
  )
}
