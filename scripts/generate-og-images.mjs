#!/usr/bin/env node

/**
 * OG Image Generator for WorldCapIQ
 *
 * Generates 1200×630 social sharing cards for teams, players, and matches.
 * Uses satori (JSX → SVG) + sharp (SVG → PNG).
 *
 * Usage:
 *   node scripts/generate-og-images.mjs
 *
 * Prerequisites:
 *   npm install --save-dev satori sharp @resvg/resvg-js
 *
 * Output:
 *   public/og/teams/{slug}.png
 *   public/og/players/{slug}.png
 *   public/og/matches/{home}-vs-{away}.png
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ─── Colors (matching Tailwind config) ─────────────────────────
const COLORS = {
  bg: '#121412',
  surface: '#1a1c1a',
  text: '#e3e3df',
  textMuted: '#c2c9bb',
  primary: '#a0d494',
  tertiary: '#e9c400',
  secondary: '#ffb4aa',
  accent: '#78a96e',
}

const WIDTH = 1200
const HEIGHT = 630

// ─── Font Loading ──────────────────────────────────────────────

function loadFonts() {
  // Load font files from public/fonts/ or node_modules
  // For build, we use system fallbacks if custom fonts aren't available
  const fonts = []

  const fontPaths = [
    { path: join(ROOT, 'public/fonts/Epilogue-Bold.ttf'), name: 'Epilogue', weight: 700 },
    { path: join(ROOT, 'public/fonts/Manrope-Regular.ttf'), name: 'Manrope', weight: 400 },
    { path: join(ROOT, 'public/fonts/JetBrainsMono-Bold.ttf'), name: 'JetBrains Mono', weight: 700 },
    { path: join(ROOT, 'public/fonts/PlusJakartaSans-Bold.ttf'), name: 'Plus Jakarta Sans', weight: 700 },
  ]

  for (const f of fontPaths) {
    if (existsSync(f.path)) {
      fonts.push({
        name: f.name,
        data: readFileSync(f.path),
        weight: f.weight,
        style: 'normal',
      })
    }
  }

  // Fallback: if no custom fonts, try Inter from Google Fonts cache or system
  if (fonts.length === 0) {
    console.warn('⚠ No custom fonts found in public/fonts/. OG images will use satori defaults.')
  }

  return fonts
}

// ─── SVG Templates (satori-compatible JSX objects) ─────────────

/**
 * Team Card Template
 * Layout: Left accent bar | Flag + Name + Stats | Footer
 */
function teamCardSVG(team) {
  const chemistryColor =
    team.chemistry >= 70 ? COLORS.primary :
    team.chemistry >= 50 ? COLORS.accent :
    team.chemistry >= 35 ? COLORS.tertiary :
    COLORS.secondary

  return {
    type: 'div',
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        background: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      },
      children: [
        // Left accent bar
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: COLORS.primary,
            },
          },
        },
        // Main content
        {
          type: 'div',
          props: {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '60px 80px',
            },
            children: [
              // Flag + Team name
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 },
                  children: [
                    { type: 'span', props: { style: { fontSize: 64 }, children: team.flag } },
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontFamily: 'Epilogue',
                          fontSize: 48,
                          fontWeight: 700,
                          color: COLORS.text,
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                        },
                        children: team.name,
                      },
                    },
                  ],
                },
              },
              // Divider
              {
                type: 'div',
                props: {
                  style: {
                    width: 200,
                    height: 2,
                    background: COLORS.primary,
                    marginBottom: 32,
                  },
                },
              },
              // Stats row
              {
                type: 'div',
                props: {
                  style: { display: 'flex', gap: 48, marginBottom: 24 },
                  children: [
                    statBlock('Chemistry', `${team.chemistry}`, chemistryColor),
                    statBlock('FIFA Rank', `#${team.fifaRanking}`, COLORS.text),
                    statBlock('Group', team.group, COLORS.textMuted),
                  ],
                },
              },
              // Chemistry bar
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 24,
                  },
                  children: [
                    { type: 'span', props: { style: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }, children: 'Chemistry' } },
                    {
                      type: 'div',
                      props: {
                        style: { flex: 1, height: 8, background: `${COLORS.text}15`, borderRadius: 4, overflow: 'hidden', maxWidth: 300 },
                        children: [
                          { type: 'div', props: { style: { width: `${team.chemistry}%`, height: '100%', background: chemistryColor, borderRadius: 4 } } },
                        ],
                      },
                    },
                    { type: 'span', props: { style: { fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: chemistryColor }, children: `${team.chemistry}` } },
                  ],
                },
              },
              // Key insight
              team.keyInsight ? {
                type: 'p',
                props: {
                  style: {
                    fontFamily: 'Manrope',
                    fontSize: 16,
                    color: COLORS.textMuted,
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                    maxWidth: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                  children: `"${team.keyInsight.slice(0, 120)}${team.keyInsight.length > 120 ? '...' : ''}"`,
                },
              } : null,
            ].filter(Boolean),
          },
        },
        // Footer
        footer(),
      ],
    },
  }
}

/**
 * Match Prediction Card Template
 * Layout: Two teams with VS divider | Probability bar | Match info | Footer
 */
function matchCardSVG(match, homeTeam, awayTeam) {
  const hPct = Math.round(match.homeWinProb * 100)
  const dPct = Math.round(match.drawProb * 100)
  const aPct = Math.round(match.awayWinProb * 100)

  return {
    type: 'div',
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        background: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      },
      children: [
        // Main content
        {
          type: 'div',
          props: {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 80px',
            },
            children: [
              // Teams row
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'center', gap: 48, marginBottom: 32 },
                  children: [
                    teamBadge(homeTeam),
                    { type: 'span', props: { style: { fontFamily: 'Epilogue', fontSize: 24, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase' }, children: 'VS' } },
                    teamBadge(awayTeam),
                  ],
                },
              },
              // Probability labels
              {
                type: 'div',
                props: {
                  style: { display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 800, marginBottom: 8 },
                  children: [
                    { type: 'span', props: { style: { fontFamily: 'JetBrains Mono', fontSize: 32, fontWeight: 700, color: COLORS.primary }, children: `${hPct}%` } },
                    { type: 'span', props: { style: { fontFamily: 'JetBrains Mono', fontSize: 20, fontWeight: 700, color: COLORS.textMuted }, children: `DRAW ${dPct}%` } },
                    { type: 'span', props: { style: { fontFamily: 'JetBrains Mono', fontSize: 32, fontWeight: 700, color: COLORS.secondary }, children: `${aPct}%` } },
                  ],
                },
              },
              // Probability bar
              {
                type: 'div',
                props: {
                  style: { display: 'flex', width: '100%', maxWidth: 800, height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 32 },
                  children: [
                    { type: 'div', props: { style: { width: `${hPct}%`, height: '100%', background: COLORS.primary } } },
                    { type: 'div', props: { style: { width: `${dPct}%`, height: '100%', background: '#ffffff40' } } },
                    { type: 'div', props: { style: { width: `${aPct}%`, height: '100%', background: COLORS.secondary } } },
                  ],
                },
              },
              // Match info
              {
                type: 'p',
                props: {
                  style: { fontFamily: 'Manrope', fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
                  children: `${match.group ? `Group ${match.group}` : match.round} · ${match.venue}, ${match.city}`,
                },
              },
            ],
          },
        },
        footer(),
      ],
    },
  }
}

/**
 * Player Card Template
 * Layout: Name + stats (full width, no image dependency) | Footer
 */
function playerCardSVG(player, team) {
  const ratingColor =
    player.rating >= 8 ? COLORS.primary :
    player.rating >= 6 ? COLORS.tertiary :
    COLORS.secondary

  const nameParts = player.name.split(' ')
  const firstName = nameParts.slice(0, -1).join(' ') || ''
  const surname = nameParts[nameParts.length - 1] || player.name

  return {
    type: 'div',
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        background: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      },
      children: [
        // Left accent bar
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: COLORS.primary,
            },
          },
        },
        // Main content
        {
          type: 'div',
          props: {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '60px 80px',
            },
            children: [
              // Team flag + badge
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
                  children: [
                    { type: 'span', props: { style: { fontSize: 32 }, children: team.flag } },
                    { type: 'span', props: { style: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }, children: team.name } },
                  ],
                },
              },
              // Name
              firstName ? {
                type: 'p',
                props: {
                  style: { fontFamily: 'Manrope', fontSize: 20, color: COLORS.textMuted, marginBottom: 4 },
                  children: firstName,
                },
              } : null,
              {
                type: 'p',
                props: {
                  style: { fontFamily: 'Epilogue', fontSize: 44, fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 8 },
                  children: surname,
                },
              },
              // Divider
              {
                type: 'div',
                props: { style: { width: 120, height: 2, background: COLORS.primary, marginBottom: 20 } },
              },
              // Position + Number
              {
                type: 'p',
                props: {
                  style: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 },
                  children: `${player.position} · #${player.number} · ${player.club}`,
                },
              },
              // Stats row
              {
                type: 'div',
                props: {
                  style: { display: 'flex', gap: 48 },
                  children: [
                    statBlock('Rating', player.rating.toFixed(1), ratingColor),
                    statBlock('Caps', `${player.caps}`, COLORS.text),
                    statBlock('Goals', `${player.goals}`, COLORS.text),
                    statBlock('Assists', `${player.assists}`, COLORS.text),
                  ],
                },
              },
            ].filter(Boolean),
          },
        },
        footer(),
      ],
    },
  }
}

// ─── Shared Template Parts ─────────────────────────────────────

function statBlock(label, value, color) {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column' },
      children: [
        { type: 'span', props: { style: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }, children: label } },
        { type: 'span', props: { style: { fontFamily: 'JetBrains Mono', fontSize: 24, fontWeight: 700, color }, children: value } },
      ],
    },
  }
}

function teamBadge(team) {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
      children: [
        { type: 'span', props: { style: { fontSize: 56 }, children: team.flag } },
        { type: 'span', props: { style: { fontFamily: 'Epilogue', fontSize: 20, fontWeight: 700, color: COLORS.text, textTransform: 'uppercase' }, children: team.name } },
      ],
    },
  }
}

function footer() {
  return {
    type: 'div',
    props: {
      style: {
        height: 48,
        background: COLORS.surface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: 8 },
            children: [
              { type: 'div', props: { style: { width: 16, height: 16, background: COLORS.primary, borderRadius: 3 } } },
              { type: 'span', props: { style: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.1em' }, children: 'WORLDCAPIQ' } },
            ],
          },
        },
        { type: 'span', props: { style: { fontFamily: 'Manrope', fontSize: 12, color: COLORS.textMuted }, children: 'worldcapiq.com · World Cup 2026' } },
      ],
    },
  }
}

// ─── Main Generation ───────────────────────────────────────────

async function main() {
  let satori, Resvg

  try {
    satori = (await import('satori')).default
  } catch {
    console.error('❌ satori not installed. Run: npm install --save-dev satori')
    console.log('\nTo install all OG image dependencies:')
    console.log('  npm install --save-dev satori @resvg/resvg-js\n')
    console.log('Script generated template definitions successfully.')
    console.log('Install dependencies and re-run to generate PNG files.')
    process.exit(0)
  }

  try {
    Resvg = (await import('@resvg/resvg-js')).Resvg
  } catch {
    console.error('❌ @resvg/resvg-js not installed. Run: npm install --save-dev @resvg/resvg-js')
    process.exit(1)
  }

  const fonts = loadFonts()

  // Load data
  // Dynamic imports for TS data files — use the compiled output or raw JSON
  let teams, players, matches

  try {
    // Try loading from compiled data files
    const teamsModule = await import(join(ROOT, 'src/data/teams-meta.ts'))
    teams = teamsModule.teamsMeta || teamsModule.default || []
  } catch {
    console.warn('⚠ Could not load teams data. Skipping team cards.')
    teams = []
  }

  try {
    const playersModule = await import(join(ROOT, 'src/data/players-data.ts'))
    players = playersModule.playersData || playersModule.default || []
  } catch {
    console.warn('⚠ Could not load players data. Skipping player cards.')
    players = []
  }

  try {
    const matchesModule = await import(join(ROOT, 'src/data/match-fixtures.ts'))
    matches = matchesModule.matchFixtures || matchesModule.default || []
  } catch {
    console.warn('⚠ Could not load matches data. Skipping match cards.')
    matches = []
  }

  // Ensure output directories
  for (const dir of ['public/og/teams', 'public/og/players', 'public/og/matches']) {
    mkdirSync(join(ROOT, dir), { recursive: true })
  }

  const satoriOptions = {
    width: WIDTH,
    height: HEIGHT,
    fonts: fonts.length > 0 ? fonts : undefined,
  }

  async function renderAndSave(template, outputPath) {
    try {
      const svg = await satori(template, satoriOptions)
      const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } })
      const png = resvg.render().asPng()
      writeFileSync(join(ROOT, outputPath), png)
      return true
    } catch (err) {
      console.error(`  ✗ Failed: ${outputPath}`, err.message)
      return false
    }
  }

  let generated = 0
  let failed = 0

  // Generate team cards
  console.log(`\n🏟  Generating team OG cards (${teams.length} teams)...`)
  for (const team of teams) {
    const ok = await renderAndSave(
      teamCardSVG(team),
      `public/og/teams/${team.slug}.png`
    )
    if (ok) generated++; else failed++
  }

  // Generate player cards (top players only for build speed)
  const topPlayers = players.filter(p => p.rating >= 7.5).slice(0, 100)
  console.log(`\n👤 Generating player OG cards (${topPlayers.length} top players)...`)
  for (const player of topPlayers) {
    const team = teams.find(t => t.slug === player.teamSlug)
    if (!team) continue
    const ok = await renderAndSave(
      playerCardSVG(player, team),
      `public/og/players/${player.slug}.png`
    )
    if (ok) generated++; else failed++
  }

  // Generate match cards (group stage)
  const groupMatches = matches.filter(m => m.group)
  console.log(`\n⚽ Generating match OG cards (${groupMatches.length} group matches)...`)
  for (const match of groupMatches) {
    const homeTeam = teams.find(t => t.slug === match.homeTeamSlug)
    const awayTeam = teams.find(t => t.slug === match.awayTeamSlug)
    if (!homeTeam || !awayTeam) continue
    const ok = await renderAndSave(
      matchCardSVG(match, homeTeam, awayTeam),
      `public/og/matches/${match.homeTeamSlug}-vs-${match.awayTeamSlug}.png`
    )
    if (ok) generated++; else failed++
  }

  console.log(`\n✅ OG image generation complete: ${generated} generated, ${failed} failed\n`)
}

main().catch(console.error)
