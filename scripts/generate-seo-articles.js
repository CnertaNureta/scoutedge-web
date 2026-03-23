/**
 * Generate SEO intro articles (~200 words) for every player.
 *
 * Style: passionate, professional, provocative.
 * Required keywords: 2026 World Cup, [National Team], Starting XI,
 *                    Key Stats, Performance Analysis.
 * Structure: Hook → Current form → Readiness → Outlook → CTA.
 */

const fs = require('fs')
const path = require('path')

// ── 1. Read teams-meta for slug → name mapping ────────────────────────
const teamsPath = path.join(__dirname, '..', 'src', 'data', 'teams-meta.ts')
const teamsRaw = fs.readFileSync(teamsPath, 'utf8')
const teamMap = {}
const teamRe = /slug:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"/g
let tm
while ((tm = teamRe.exec(teamsRaw)) !== null) teamMap[tm[1]] = tm[2]

// ── 2. Read players-data ───────────────────────────────────────────────
const playersPath = path.join(__dirname, '..', 'src', 'data', 'players-data.ts')
const playersRaw = fs.readFileSync(playersPath, 'utf8')

const eqBracket = playersRaw.indexOf('= [')
const arrayStart = eqBracket + 2
const arrayEnd = playersRaw.lastIndexOf(']') + 1
const jsonStr = playersRaw
  .slice(arrayStart, arrayEnd)
  .replace(/,\s*([\]}])/g, '$1') // strip trailing commas for valid JSON
const players = JSON.parse(jsonStr)

// ── 3. Helpers ─────────────────────────────────────────────────────────
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function pick(arr, seed) {
  return arr[seed % arr.length]
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function ratingTier(r) {
  if (r >= 8.5) return 'elite'
  if (r >= 7.5) return 'high'
  if (r >= 6.8) return 'solid'
  return 'developing'
}

function ageBracket(age) {
  if (age <= 22) return 'young'
  if (age <= 28) return 'prime'
  if (age <= 32) return 'experienced'
  return 'veteran'
}

const POS_LABELS = { GK: 'goalkeeper', DEF: 'defender', MID: 'midfielder', FWD: 'forward' }
const POS_LABELS_CAP = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' }

// ── 4. Template pools ──────────────────────────────────────────────────

const HOOKS = {
  GK: [
    (p, t) => `When the world's fiercest strikers line up their shots at the 2026 World Cup, <strong>${p.name}</strong> will be the last line of defense standing between ${t} and elimination—and he wouldn't have it any other way.`,
    (p, t) => `No ${t} Starting XI is complete without <strong>${p.name}</strong> commanding the penalty area. At the 2026 World Cup, his gloves could be the difference between glory and heartbreak.`,
    (p, t) => `The 2026 World Cup demands nerves of titanium, and <strong>${p.name}</strong> has proven time and again that ${t}'s goal is safest in his hands.`,
    (p, t) => `Behind every great defense stands an even greater goalkeeper. For ${t} at the 2026 World Cup, that man is <strong>${p.name}</strong>—irreplaceable, unshakeable, decisive.`,
    (p, t) => `When penalty shootouts loom and stadiums roar across North America, ${t} will look to one man: <strong>${p.name}</strong>, their 2026 World Cup wall.`,
    (p, t) => `<strong>${p.name}</strong> doesn't just keep goal for ${t}—he defines the identity of their 2026 World Cup Starting XI from the back.`,
    (p, t) => `In the cauldron of the 2026 World Cup, every save tells a story. <strong>${p.name}</strong> is ready to write ${t}'s chapter between the posts.`,
    (p, t) => `${t}'s 2026 World Cup ambitions are built on a foundation of world-class goalkeeping, and <strong>${p.name}</strong> is the cornerstone.`,
  ],
  DEF: [
    (p, t) => `Every legendary 2026 World Cup run begins with a fortress at the back, and <strong>${p.name}</strong> is the rock upon which ${t}'s dreams are built.`,
    (p, t) => `When the pressure mounts and the world's best attackers come calling, ${t}'s Starting XI trusts <strong>${p.name}</strong> to hold the line at the 2026 World Cup.`,
    (p, t) => `<strong>${p.name}</strong> is not merely a defender—he is ${t}'s defensive architect, the player who turns chaos into control on the 2026 World Cup stage.`,
    (p, t) => `Trophies are won by defenses. At the 2026 World Cup, <strong>${p.name}</strong> carries ${t}'s hopes on shoulders built for the biggest battles.`,
    (p, t) => `The 2026 World Cup will test every backline on the planet. For ${t}, <strong>${p.name}</strong> is the immovable force they cannot do without.`,
    (p, t) => `Strip away the glamour, and every World Cup winner shares one trait: defensive steel. <strong>${p.name}</strong> gives ${t} exactly that at the 2026 edition.`,
    (p, t) => `From bone-crunching tackles to surgical interceptions, <strong>${p.name}</strong> embodies everything ${t} need from their 2026 World Cup Starting XI anchor.`,
    (p, t) => `In the theater of the 2026 World Cup, <strong>${p.name}</strong> is ${t}'s guardian—the defender opponents fear and teammates trust unconditionally.`,
  ],
  MID: [
    (p, t) => `Control the midfield, control the 2026 World Cup—and there is no one ${t} trust more to dictate the tempo than <strong>${p.name}</strong>.`,
    (p, t) => `The heartbeat of ${t}'s 2026 World Cup Starting XI pulses through <strong>${p.name}</strong>'s boots. Lose him, and the entire system unravels.`,
    (p, t) => `<strong>${p.name}</strong> is the engine that makes ${t} tick on the 2026 World Cup stage—relentless, intelligent, and utterly indispensable.`,
    (p, t) => `At the 2026 World Cup, the margins between triumph and despair are razor-thin. <strong>${p.name}</strong> is the midfielder who tips those margins in ${t}'s favor.`,
    (p, t) => `Great midfielders don't just play the game—they command it. <strong>${p.name}</strong> is ${t}'s field marshal heading into the 2026 World Cup.`,
    (p, t) => `The 2026 World Cup's biggest matches will be won and lost in midfield. For ${t}, <strong>${p.name}</strong> is the non-negotiable name on the team sheet.`,
    (p, t) => `Between defense and attack, between structure and chaos, stands <strong>${p.name}</strong>—${t}'s midfield linchpin at the 2026 World Cup.`,
    (p, t) => `When ${t} need composure under fire at the 2026 World Cup, they look to <strong>${p.name}</strong>. He is the calm in every storm.`,
  ],
  FWD: [
    (p, t) => `Goals change games. <strong>${p.name}</strong> changes tournaments. ${t}'s 2026 World Cup destiny rests on his lethal instincts.`,
    (p, t) => `When ${t} need a moment of magic at the 2026 World Cup, eighty thousand eyes—and eleven teammates—turn to <strong>${p.name}</strong>.`,
    (p, t) => `The 2026 World Cup will crown heroes, and <strong>${p.name}</strong> has every weapon in his arsenal to become ${t}'s greatest.`,
    (p, t) => `Defenders will study him. Coaches will plan for him. But at the 2026 World Cup, <strong>${p.name}</strong> will still find a way to destroy ${t}'s opponents.`,
    (p, t) => `In a tournament where one goal can rewrite history, <strong>${p.name}</strong> is the sharpest blade in ${t}'s 2026 World Cup Starting XI.`,
    (p, t) => `<strong>${p.name}</strong> is the nightmare that keeps opposing defenders awake before facing ${t} at the 2026 World Cup.`,
    (p, t) => `Every great 2026 World Cup story needs a protagonist who scores when it matters most. For ${t}, that protagonist is <strong>${p.name}</strong>.`,
    (p, t) => `Fire, precision, and an insatiable hunger for goals—<strong>${p.name}</strong> brings it all to ${t}'s 2026 World Cup frontline.`,
  ],
}

// ── Module-level template function arrays (hoisted from per-call objects) ──

const CLUB_PHRASES = {
  elite: [
    (p, pos) => `This season at ${p.club}, ${p.name} has been operating at a level that few on the planet can match.`,
    (p, pos) => `${p.name}'s form at ${p.club} has been nothing short of sensational, delivering performances that demand 2026 World Cup selection.`,
    (p, pos) => `At ${p.club}, ${p.name} has cemented himself as one of the most dominant ${pos}s in world football this campaign.`,
  ],
  high: [
    (p, pos, t) => `His performances at ${p.club} this season have been consistently outstanding, making him a guaranteed starter in ${t}'s plans.`,
    (p, pos) => `${p.name} has elevated his game at ${p.club}, producing the kind of form that earns World Cup Starting XI spots.`,
    (p, pos) => `At ${p.club}, ${p.name} has delivered a campaign that perfectly positions him for 2026 World Cup glory.`,
  ],
  solid: [
    (p, pos) => `A reliable presence at ${p.club}, ${p.name} has shown steady improvement and the kind of dependability that tournament football demands.`,
    (p, pos, t) => `${p.name}'s contributions at ${p.club} have been the backbone of their season—exactly the consistency ${t} need.`,
    (p, pos) => `Plying his trade at ${p.club}, ${p.name} brings the week-in, week-out reliability that separates World Cup squads from pretenders.`,
  ],
  developing: [
    (p, pos) => `At ${p.club}, ${p.name} continues to develop, adding new dimensions to his game that could prove decisive in knockout football.`,
    (p, pos) => `${p.name}'s growth at ${p.club} has been encouraging, and his trajectory suggests the 2026 World Cup could be his breakout moment.`,
    (p, pos) => `Still sharpening his craft at ${p.club}, ${p.name} carries the hunger of a player with everything to prove on the biggest stage.`,
  ],
}

const AGE_PHRASES = {
  young: (p, t) => `At just ${p.age}, he represents the fearless future of ${t} football—a prodigy unafraid of the spotlight.`,
  prime: (p) => `At ${p.age}, he is entering the peak years of his career, perfectly timed for a statement tournament.`,
  experienced: (p) => `At ${p.age}, he combines peak-level quality with the battle-hardened mentality that only years of top-flight football can forge.`,
  veteran: (p) => `At ${p.age}, he brings irreplaceable veteran wisdom—the kind of composure that steadies an entire squad under World Cup pressure.`,
}

const VENUES = [
  'across the stadiums of the United States, Canada, and Mexico',
  'on the grandest stages of North America',
  'under the floodlights of MetLife, SoFi, and Azteca',
  'from coast to coast across the USA, Canada, and Mexico',
  'in the electric atmospheres of the 2026 host cities',
  'on pitches stretching from Toronto to Guadalajara',
]

const OUTLOOK_TEMPLATES = {
  GK: [
    (p, t, pos, venue) => `As the 2026 World Cup unfolds ${venue}, ${p.name}'s ability to produce match-defining saves could be the single factor that propels ${t} deep into the knockout rounds. His Performance Analysis profile reveals a ${pos} primed for the highest stage.`,
    (p, t, pos, venue) => `${capitalize(venue)}, ${p.name} will face the world's deadliest strikers—and ${t}'s tournament fate will hinge on his gloves. His Key Stats point to a ${pos} built for pressure.`,
    (p, t, pos, venue) => `When the pressure reaches boiling point ${venue}, ${t} will depend on ${p.name}'s composure between the posts. His Performance Analysis data confirms he thrives in exactly these moments.`,
  ],
  DEF: [
    (p, t, pos, venue) => `${capitalize(venue)}, ${p.name} will be tasked with neutralizing the world's most lethal attacking threats. His Key Stats and Performance Analysis paint the picture of a ${pos} who raises his level when it matters most.`,
    (p, t, pos, venue) => `As ${t} navigate the 2026 World Cup ${venue}, ${p.name}'s defensive intelligence could unlock the path to the latter rounds. His Performance Analysis profile is that of a player born for tournament football.`,
    (p, t, pos, venue) => `The 2026 World Cup knockout rounds demand defensive perfection. ${capitalize(venue)}, ${p.name} is ready to deliver it for ${t}—his Key Stats leave no doubt.`,
  ],
  MID: [
    (p, t, pos, venue) => `As the tournament intensifies ${venue}, ${p.name}'s ability to control possession and unlock defenses will determine how far ${t} can go. His Performance Analysis profile screams "big-game player."`,
    (p, t, pos, venue) => `${capitalize(venue)}, ${p.name} will be the player who dictates whether ${t} dominate or flounder. His Key Stats reveal a midfielder engineered for tournament supremacy.`,
    (p, t, pos, venue) => `When the 2026 World Cup's decisive moments arrive ${venue}, ${p.name}'s vision and passing range could be ${t}'s ultimate weapon. His Performance Analysis confirms: this is his stage.`,
  ],
  FWD: [
    (p, t, pos, venue) => `${capitalize(venue)}, ${p.name} will carry ${t}'s goal-scoring burden—and his Key Stats suggest he is more than ready to deliver under the brightest lights.`,
    (p, t, pos, venue) => `As the 2026 World Cup heats up ${venue}, ${p.name}'s finishing instincts could write ${t} into World Cup folklore. His Performance Analysis data reveals a forward operating at peak lethality.`,
    (p, t, pos, venue) => `When ${t} need a goal that changes everything at the 2026 World Cup, ${p.name} will be the man ${venue}. His Key Stats profile is that of a born match-winner.`,
  ],
}

const FIT_PHRASES = {
  green: [
    (p, t) => `${p.name} enters the 2026 World Cup in peak physical condition—fully fit, razor-sharp, and ready to deliver from matchday one. ${t}'s medical staff have confirmed he is primed for the grueling demands of tournament football across North America.`,
    (p, t) => `Fitness is the foundation of World Cup success, and ${p.name} arrives in outstanding shape. With a clean bill of health and match sharpness honed through a full club season, he gives ${t} the availability and intensity they need.`,
    (p, t) => `Physically, ${p.name} is in the best shape of the season. No injury concerns cloud his 2026 World Cup preparation, allowing ${t} to build their tactical framework with full confidence in his availability and stamina.`,
  ],
  amber: [
    (p, t) => `${p.name}'s fitness carries a cautionary note—${p.fitnessNote.toLowerCase()}—but his determination to be ready for the 2026 World Cup is unquestionable. ${t}'s coaching staff are managing his workload carefully, knowing that a fit ${p.name} transforms their Starting XI.`,
    (p, t) => `There is a minor fitness question mark—${p.fitnessNote.toLowerCase()}—but ${p.name} has overcome adversity before. ${t} know that even at 80%, his quality and big-game experience make him irreplaceable in their 2026 World Cup squad.`,
    (p, t) => `While ${p.fitnessNote.toLowerCase()} adds a layer of uncertainty, ${p.name}'s track record of performing through discomfort gives ${t} confidence. His presence in the 2026 World Cup Starting XI could hinge on smart load management in the group stage.`,
  ],
  red: [
    (p, t) => `${p.name} faces a race against time—${p.fitnessNote.toLowerCase()}—but ${t} refuse to rule him out. His quality is so transformative that even partial availability at the 2026 World Cup could prove decisive in the knockout rounds.`,
    (p, t) => `A significant fitness concern—${p.fitnessNote.toLowerCase()}—hangs over ${p.name}'s 2026 World Cup participation. But champions find a way, and ${t}'s medical team are exploring every option to get their key man onto the pitch.`,
    (p, t) => `The biggest threat to ${t}'s 2026 World Cup ambitions isn't an opponent—it's ${p.name}'s fitness. ${p.fitnessNote}. If he can overcome this challenge, the entire tournament calculus shifts in ${t}'s favor.`,
  ],
}

const CTA_TEMPLATES = [
  (p, t, pos) => `<strong>Dive into ${p.name}'s complete Key Stats breakdown and head-to-head Performance Analysis using our real-time comparison dashboard below.</strong> See exactly why he could be ${t}'s most important player at the 2026 World Cup.`,
  (p, t, pos) => `<strong>Explore ${p.name}'s full 2026 World Cup Performance Analysis and compare his Key Stats against every rival ${pos} in the tournament using our live data tool below.</strong>`,
  (p, t, pos) => `<strong>Don't just take our word for it—unlock ${p.name}'s real-time Key Stats, radar charts, and head-to-head Performance Analysis below.</strong> The numbers reveal why ${t} need him in the 2026 World Cup Starting XI.`,
  (p, t, pos) => `<strong>Ready to see the data behind the hype? Scroll down to access ${p.name}'s live Performance Analysis dashboard, compare Key Stats, and build your own ${t} 2026 World Cup Starting XI.</strong>`,
  (p, t, pos) => `<strong>Want proof? Explore ${p.name}'s complete Key Stats profile and real-time Performance Analysis below.</strong> Compare him against any player in the 2026 World Cup and see what makes him indispensable to ${t}.`,
  (p, t, pos) => `<strong>See for yourself: dive into ${p.name}'s live Key Stats, Performance Analysis radar, and tactical comparison tools below.</strong> Data-driven insight for every ${t} 2026 World Cup decision.`,
]

// ── 5. Section generators ──────────────────────────────────────────────

function currentForm(p, teamName, pos, seed) {
  const tier = ratingTier(p.rating)
  const bracket = ageBracket(p.age)

  const statsPhrase = p.position === 'GK'
    ? `Across ${p.caps} international caps, his command of the area and shot-stopping reflexes have earned him a formidable ${p.rating}/10 ScoutEdge rating.`
    : p.goals > 10
      ? `With ${p.goals} international goals and ${p.assists} assists across ${p.caps} caps, his ${p.rating}/10 ScoutEdge rating tells only part of the story.`
      : p.goals > 0
        ? `His record of ${p.goals} goals and ${p.assists} assists in ${p.caps} caps reflects a ${pos} whose influence extends far beyond the stats sheet, carrying a ${p.rating}/10 rating.`
        : `Over ${p.caps} international appearances, his ${p.assists} assists and consistent ${p.rating}/10 rating underscore the quiet authority he brings to every match.`

  const clubText = pick(CLUB_PHRASES[tier], seed)(p, pos, teamName)
  const ageText = AGE_PHRASES[bracket](p, teamName)

  return `${clubText} ${statsPhrase} ${ageText}`
}

function outlook(p, teamName, pos, seed) {
  const venue = pick(VENUES, seed + 1)
  return pick(OUTLOOK_TEMPLATES[p.position], seed + 5)(p, teamName, pos, venue)
}

function readiness(p, teamName, seed) {
  return pick(FIT_PHRASES[p.fitnessStatus], seed + 13)(p, teamName)
}

function cta(p, teamName, pos, seed) {
  return pick(CTA_TEMPLATES, seed + 7)(p, teamName, pos)
}

// ── 6. Generate article ────────────────────────────────────────────────
function generateArticle(p) {
  const teamName = teamMap[p.teamSlug] || p.teamSlug
  const seed = hash(p.slug + p.teamSlug)
  const pos = POS_LABELS[p.position]
  const posCap = POS_LABELS_CAP[p.position]

  return [
    `<h2>${p.name} – ${teamName} ${posCap} | 2026 World Cup Performance Analysis</h2>`,
    `<p>${pick(HOOKS[p.position], seed)(p, teamName)}</p>`,
    `<p>${currentForm(p, teamName, pos, seed + 3)}</p>`,
    `<p>${readiness(p, teamName, seed + 9)}</p>`,
    `<p>${outlook(p, teamName, pos, seed + 11)}</p>`,
    `<p>${cta(p, teamName, pos, seed + 17)}</p>`,
  ].join('\n')
}

// ── 7. Process all players ─────────────────────────────────────────────
for (const player of players) {
  player.seoArticle = generateArticle(player)
}

// ── 8. Write back ──────────────────────────────────────────────────────
const header = playersRaw.slice(0, arrayStart)
const footer = playersRaw.slice(arrayEnd)
const newJson = JSON.stringify(players, null, 2)
const output = header + newJson + footer

fs.writeFileSync(playersPath, output, 'utf8')

console.log(`Updated ${players.length} player SEO articles`)
console.log(`Output: ${playersPath}`)

// ── 9. Verification (in-memory, no re-read) ───────────────────────────
const keywordChecks = [
  { label: '2026 World Cup', re: /2026 World Cup/g },
  { label: 'Starting XI', re: /Starting XI/g },
  { label: 'Key Stats', re: /Key Stats/g },
  { label: 'Performance Analysis', re: /Performance Analysis/g },
]
const seoCount = (output.match(/"seoArticle":\s*"/g) || []).length
console.log(`seoArticle fields found: ${seoCount}`)
for (const { label, re } of keywordChecks) {
  console.log(`  "${label}" appearances: ${(output.match(re) || []).length}`)
}
