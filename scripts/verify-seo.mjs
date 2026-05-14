#!/usr/bin/env node
/**
 * verify-seo.mjs — production SEO audit for kickoracle.com
 *
 * Checks robots.txt, sitemap.xml, and a representative set of pages for
 * canonical/hreflang/JSON-LD correctness. Emits a colored pass/fail report
 * and exits non-zero on any failure (so cron / CI can wire it up).
 *
 * Usage:
 *   node scripts/verify-seo.mjs            # audit https://kickoracle.com
 *   BASE_URL=https://staging.example.com node scripts/verify-seo.mjs
 *   node scripts/verify-seo.mjs --dry-run  # print plan, no network
 *   node scripts/verify-seo.mjs --help
 *
 * Trade-off: uses small regex helpers for <link>/JSON-LD extraction instead
 * of pulling in node-html-parser. The HTML head is well-formed and small,
 * so this keeps zero new deps.
 */

const BASE_URL = (process.env.BASE_URL || 'https://kickoracle.com').replace(/\/$/, '')
const TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 3
const LOCALE_PATH_RE = /\/[a-z]{2}(?:-[A-Za-z0-9]+)*(\/|$)/
// Use the actual hreflang codes emitted by the site (Chinese is zh-Hans per BCP-47).
// Mirrors src/i18n/locales.ts LOCALE_CONFIGS[*].hreflang.
const PAGE_HREFLANG_LOCALES = ['en', 'es', 'zh-Hans', 'pt', 'ar', 'fr', 'ja', 'ko', 'de', 'it', 'nl', 'tr', 'pl', 'id', 'ru', 'fa', 'th', 'vi', 'hu']
const SITEMAP_HREFLANG_LOCALES = ['en', 'zh-Hans', 'es', 'pt', 'ar']
const PAGE_HREFLANG_COUNT = PAGE_HREFLANG_LOCALES.length + 1 // 19 locales + x-default

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SHOW_HELP = args.has('--help') || args.has('-h')

// ---------- ANSI color helpers ----------
const isTTY = process.stdout.isTTY && !process.env.NO_COLOR
const c = (code) => (s) => (isTTY ? `\x1b[${code}m${s}\x1b[0m` : s)
const green = c('32')
const red = c('31')
const yellow = c('33')
const cyan = c('36')
const dim = c('2')
const bold = c('1')
const OK = green('✓')
const FAIL = red('✗')
const WARN = yellow('⚠')

// ---------- Result aggregator ----------
const results = [] // { url, label, level: 'pass'|'warn'|'fail', message }
function pass(url, message) { results.push({ url, level: 'pass', message }) }
function warn(url, message) { results.push({ url, level: 'warn', message }) }
function fail(url, message) { results.push({ url, level: 'fail', message }) }

// ---------- HTTP with timeout + manual redirect tracking ----------
async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: controller.signal, redirect: 'manual' })
  } finally {
    clearTimeout(t)
  }
}

async function fetchFollowing(url, method = 'GET') {
  const hops = [url]
  let current = url
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetchWithTimeout(current, { method, headers: { 'user-agent': 'kickoracle-seo-verifier/1.0' } })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = new URL(res.headers.get('location'), current).toString()
      hops.push(next)
      current = next
      continue
    }
    return { res, hops, finalUrl: current }
  }
  throw new Error(`Too many redirects (${MAX_REDIRECTS}) for ${url}`)
}

// ---------- Tiny HTML head parsing (regex; head is small + well-formed) ----------
function extractLinkTags(html) {
  const out = []
  const re = /<link\b([^>]*)>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const attrs = {}
    for (const a of m[1].matchAll(/([a-z-]+)\s*=\s*"([^"]*)"/gi)) attrs[a[1].toLowerCase()] = a[2]
    out.push(attrs)
  }
  return out
}

function extractJsonLdBlocks(html) {
  const blocks = []
  const re = /<script\b[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    try { blocks.push({ ok: true, data: JSON.parse(raw) }) }
    catch (e) { blocks.push({ ok: false, error: e.message, raw: raw.slice(0, 80) }) }
  }
  return blocks
}

function extractXmlTagValues(xml, tagName) {
  const values = []
  const re = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  let m
  while ((m = re.exec(xml)) !== null) {
    values.push(
      m[1]
        .trim()
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    )
  }
  return values
}

function flattenGraph(blocks) {
  const nodes = []
  for (const b of blocks) {
    if (!b.ok) continue
    const items = Array.isArray(b.data) ? b.data : [b.data]
    for (const it of items) {
      if (it && Array.isArray(it['@graph'])) nodes.push(...it['@graph'])
      else if (it) nodes.push(it)
    }
  }
  return nodes
}

function typesOf(nodes) {
  const set = new Set()
  for (const n of nodes) {
    const t = n?.['@type']
    if (Array.isArray(t)) t.forEach((x) => set.add(x))
    else if (t) set.add(t)
  }
  return [...set]
}

// ---------- Checks ----------
async function checkRobots() {
  const url = `${BASE_URL}/robots.txt`
  console.log(`\n${bold(cyan('▸ robots.txt'))} ${dim(url)}`)
  try {
    const { res, hops } = await fetchFollowing(url)
    if (res.status !== 200) return fail(url, `HTTP ${res.status}`)
    if (hops.length > 1) warn(url, `redirected ${hops.length - 1}x → ${hops.at(-1)}`)
    const body = await res.text()
    const checks = [
      [/^Sitemap:\s*https:\/\/kickoracle\.com\/sitemap\.xml/im, 'Sitemap directive'],
      [/^User-agent:\s*\*/im, 'User-agent: *'],
      [/^Disallow:\s*\/api\//im, 'Disallow: /api/'],
      [/^Disallow:\s*\/auth\//im, 'Disallow: /auth/'],
      [/^Allow:\s*\//im, 'Allow: /'],
    ]
    for (const [re, label] of checks) {
      if (re.test(body)) pass(url, label)
      else fail(url, `missing ${label}`)
    }
    // Sanity: warn on suspicious blanket disallow
    const otherDisallow = body.split(/\r?\n/).filter((l) => /^Disallow:/.test(l) && !/\/(api|auth)\//.test(l) && !/^Disallow:\s*$/.test(l))
    if (otherDisallow.length) warn(url, `extra Disallow lines: ${otherDisallow.join(' | ')}`)
  } catch (e) {
    fail(url, e.message)
  }
}

async function checkSitemap() {
  const url = `${BASE_URL}/sitemap.xml`
  console.log(`\n${bold(cyan('▸ sitemap.xml'))} ${dim(url)}`)
  try {
    const { res, hops } = await fetchFollowing(url)
    if (res.status !== 200) { fail(url, `HTTP ${res.status}`); return [] }
    if (hops.length > 1) warn(url, `redirected ${hops.length - 1}x → ${hops.at(-1)}`)
    const xml = await res.text()
    if (!/<\?xml/.test(xml)) { fail(url, 'missing XML declaration'); return [] }

    let urlEntries = []
    if (/<sitemapindex\b/i.test(xml)) {
      const sitemapUrls = extractXmlTagValues(xml, 'loc')
      if (!sitemapUrls.length) {
        fail(url, 'sitemapindex has no <loc> entries')
        return []
      }
      pass(url, `${sitemapUrls.length} sitemap chunk(s) listed`)

      for (const sitemapUrl of sitemapUrls) {
        try {
          const { res: chunkRes, hops: chunkHops, finalUrl } = await fetchFollowing(sitemapUrl)
          if (chunkRes.status !== 200) {
            fail(sitemapUrl, `HTTP ${chunkRes.status} (final: ${finalUrl})`)
            continue
          }
          if (chunkHops.length > 1) warn(sitemapUrl, `redirected ${chunkHops.length - 1}x → ${finalUrl}`)

          const chunkXml = await chunkRes.text()
          if (!/<urlset\b/i.test(chunkXml)) {
            fail(sitemapUrl, 'not a valid <urlset> XML')
            continue
          }
          const chunkEntries = chunkXml.match(/<url>[\s\S]*?<\/url>/g) || []
          if (!chunkEntries.length) warn(sitemapUrl, 'chunk has no <url> entries')
          else pass(sitemapUrl, `${chunkEntries.length} <url> entries`)
          urlEntries.push(...chunkEntries)
        } catch (e) {
          fail(sitemapUrl, e.message)
        }
      }
    } else if (/<urlset\b/i.test(xml)) {
      urlEntries = xml.match(/<url>[\s\S]*?<\/url>/g) || []
    } else {
      fail(url, 'not a valid <sitemapindex> or <urlset> XML')
      return []
    }

    if (!urlEntries.length) {
      fail(url, 'no sitemap <url> entries found')
      return []
    }

    if (urlEntries.length < 100) fail(url, `only ${urlEntries.length} <url> entries (need >= 100)`)
    else if (urlEntries.length < 1000) warn(url, `only ${urlEntries.length} <url> entries (expected >= 1000)`)
    else pass(url, `${urlEntries.length} <url> entries across sitemap`)

    const hreflangCounts = new Map()
    let entriesWithAlternates = 0
    for (const entry of urlEntries) {
      const langs = [...entry.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1])
      if (langs.length) entriesWithAlternates++
      for (const l of langs) hreflangCounts.set(l, (hreflangCounts.get(l) || 0) + 1)
    }
    if (entriesWithAlternates === urlEntries.length && urlEntries.length > 0) pass(url, `all ${urlEntries.length} entries carry xhtml:link alternates`)
    else if (entriesWithAlternates > 0) warn(url, `${entriesWithAlternates}/${urlEntries.length} entries carry alternates`)
    else fail(url, 'no <xhtml:link rel="alternate"> entries found')

    const seenLocales = [...hreflangCounts.keys()].sort()
    const missing = SITEMAP_HREFLANG_LOCALES.filter((l) => !hreflangCounts.has(l))
    if (missing.length === 0 && hreflangCounts.has('x-default')) pass(url, `sitemap hreflang covers ${SITEMAP_HREFLANG_LOCALES.length} submitted locales + x-default`)
    else fail(url, `missing hreflang: ${missing.concat(hreflangCounts.has('x-default') ? [] : ['x-default']).join(',')}`)

    console.log(dim(`  hreflang codes seen (${seenLocales.length}): ${seenLocales.join(', ')}`))
    return urlEntries
  } catch (e) {
    fail(url, e.message)
    return []
  }
}

async function checkPage(url, deepChecks = []) {
  console.log(`\n${bold(cyan('▸ page'))} ${dim(url)}`)
  try {
    const { res, hops, finalUrl } = await fetchFollowing(url)
    if (res.status !== 200) return fail(url, `HTTP ${res.status} (final: ${finalUrl})`)
    if (hops.length > 1) warn(url, `redirected ${hops.length - 1}x → ${finalUrl}`)
    else pass(url, 'HTTP 200 (direct)')

    const html = await res.text()
    const links = extractLinkTags(html)

    // Canonical
    const canon = links.find((l) => (l.rel || '').toLowerCase() === 'canonical')
    if (!canon) fail(url, 'missing <link rel="canonical">')
    else if (!canon.href || !/^https?:\/\//.test(canon.href)) fail(url, `canonical not absolute: ${canon.href}`)
    else if (!LOCALE_PATH_RE.test(new URL(canon.href).pathname)) fail(url, `canonical not locale-prefixed: ${canon.href}`)
    else pass(url, `canonical = ${canon.href}`)

    // hreflang
    const alts = links.filter((l) => (l.rel || '').toLowerCase() === 'alternate' && l.hreflang)
    if (alts.length >= PAGE_HREFLANG_COUNT) pass(url, `${alts.length} hreflang alternates`)
    else fail(url, `only ${alts.length} hreflang alternates (need >= ${PAGE_HREFLANG_COUNT})`)
    if (alts.some((l) => l.hreflang === 'x-default')) pass(url, 'hreflang x-default present')
    else fail(url, 'hreflang x-default missing')

    // JSON-LD
    const blocks = extractJsonLdBlocks(html)
    const broken = blocks.filter((b) => !b.ok)
    if (blocks.length === 0) fail(url, 'no JSON-LD <script> blocks')
    else if (broken.length) fail(url, `${broken.length} invalid JSON-LD block(s); first error: ${broken[0].error}`)
    else pass(url, `${blocks.length} JSON-LD block(s) parsed`)

    const nodes = flattenGraph(blocks)
    const types = typesOf(nodes)
    if (types.length) console.log(dim(`  @types: ${types.join(', ')}`))

    // Deep checks per page kind
    for (const dc of deepChecks) dc(url, { nodes, types, html })
  } catch (e) {
    fail(url, e.message)
  }
}

// ---------- Schema-specific deep checks ----------
const playerCheck = (url, { nodes }) => {
  const person = nodes.find((n) => n['@type'] === 'Person' || (Array.isArray(n['@type']) && n['@type'].includes('Person')))
  if (!person) return fail(url, 'JSON-LD missing Person node')
  if (!person.name) fail(url, 'Person missing name')
  else pass(url, `Person.name=${person.name}`)
  if (!person.url || !/^https?:\/\//.test(person.url)) fail(url, `Person.url missing or not absolute: ${person.url}`)
  else pass(url, `Person.url=${person.url}`)
  if (!person.memberOf) warn(url, 'Person missing memberOf SportsTeam')
  else pass(url, 'Person.memberOf present')
  if (person.aggregateRating) fail(url, 'Person.aggregateRating triggers invalid Google Review snippets; remove it from player pages')
  else pass(url, 'Person has no unsupported aggregateRating')
}

const teamCheck = (url, { nodes }) => {
  const team = nodes.find((n) => n['@type'] === 'SportsTeam' || (Array.isArray(n['@type']) && n['@type'].includes('SportsTeam')))
  if (!team) return fail(url, 'JSON-LD missing SportsTeam node')
  if (!Array.isArray(team.athlete) || team.athlete.length === 0) fail(url, 'SportsTeam.athlete empty or not an array')
  else pass(url, `SportsTeam.athlete has ${team.athlete.length} entries`)
}

const cityCheck = (url, { nodes }) => {
  const place = nodes.find((n) => {
    const t = n['@type']
    return t === 'Place' || t === 'TouristAttraction' || (Array.isArray(t) && (t.includes('Place') || t.includes('TouristAttraction')))
  })
  if (!place) return fail(url, 'JSON-LD missing Place/TouristAttraction')
  pass(url, `City has ${place['@type']} node${place.geo ? ' with geo' : ' (no geo)'}`)
}

const breadcrumbCheck = (url, { nodes, html }) => {
  const bc = nodes.find((n) => n['@type'] === 'BreadcrumbList' || (Array.isArray(n['@type']) && n['@type'].includes('BreadcrumbList')))
  if (!bc) { warn(url, 'no BreadcrumbList in JSON-LD'); return }
  const items = Array.isArray(bc.itemListElement) ? bc.itemListElement.length : 0
  // Best-effort visible breadcrumb count via <nav aria-label="breadcrumb"> or [data-breadcrumb]
  const navMatch = html.match(/<nav[^>]*aria-label="breadcrumb"[^>]*>([\s\S]*?)<\/nav>/i)
  const visibleCount = navMatch ? (navMatch[1].match(/<li\b/gi) || []).length : null
  if (visibleCount && visibleCount !== items) warn(url, `BreadcrumbList itemListElement=${items} but visible <li>=${visibleCount}`)
  else pass(url, `BreadcrumbList has ${items} item(s)`)
}

// ---------- Plan ----------
const PAGES = [
  { url: `${BASE_URL}/en`, checks: [] }, // home is the root; no breadcrumb expected
  { url: `${BASE_URL}/en/teams`, checks: [breadcrumbCheck] },
  { url: `${BASE_URL}/en/teams/argentina`, checks: [teamCheck, breadcrumbCheck] },
  { url: `${BASE_URL}/en/teams/argentina/players/lionel-messi`, checks: [playerCheck, breadcrumbCheck] },
  { url: `${BASE_URL}/en/cities/los-angeles`, checks: [cityCheck, breadcrumbCheck] },
  { url: `${BASE_URL}/de/teams/argentina`, checks: [teamCheck, breadcrumbCheck] },
]

function printHelp() {
  console.log(`verify-seo — production SEO audit\n
Usage:
  node scripts/verify-seo.mjs           Run full audit against ${BASE_URL}
  BASE_URL=<url> node scripts/verify-seo.mjs
  node scripts/verify-seo.mjs --dry-run Print planned URLs and exit
  node scripts/verify-seo.mjs --help    Show this message

Exits 0 on pass, 1 if any check fails.`)
}

function printSummary() {
  const passed = results.filter((r) => r.level === 'pass').length
  const warned = results.filter((r) => r.level === 'warn').length
  const failed = results.filter((r) => r.level === 'fail').length

  // Group by URL for the detail block
  const byUrl = new Map()
  for (const r of results) {
    if (!byUrl.has(r.url)) byUrl.set(r.url, [])
    byUrl.get(r.url).push(r)
  }
  console.log(`\n${bold('— Detail —')}`)
  for (const [url, items] of byUrl) {
    const failedHere = items.filter((i) => i.level === 'fail')
    const warnedHere = items.filter((i) => i.level === 'warn')
    if (!failedHere.length && !warnedHere.length) continue
    console.log(`\n${dim(url)}`)
    for (const i of failedHere) console.log(`  ${FAIL} ${red(i.message)}`)
    for (const i of warnedHere) console.log(`  ${WARN} ${yellow(i.message)}`)
  }

  console.log(`\n${bold('— Summary —')}`)
  console.log(`  ${OK} ${green(passed + ' passed')}   ${WARN} ${yellow(warned + ' warned')}   ${FAIL} ${red(failed + ' failed')}`)
  return failed === 0 ? 0 : 1
}

// ---------- Main ----------
async function main() {
  if (SHOW_HELP) { printHelp(); process.exit(0) }
  console.log(bold(`KickOracle SEO verifier`) + dim(`  BASE_URL=${BASE_URL}`))

  if (DRY_RUN) {
    console.log('\n' + bold('Planned requests (dry-run, no network):'))
    console.log(`  GET ${BASE_URL}/robots.txt`)
    console.log(`  GET ${BASE_URL}/sitemap.xml`)
    console.log(`  GET sitemap chunks listed by ${BASE_URL}/sitemap.xml`)
    for (const p of PAGES) console.log(`  GET ${p.url}`)
    process.exit(0)
  }

  // Run robots + sitemap sequentially (needed for context), pages in parallel
  await checkRobots()
  await checkSitemap()
  await Promise.all(PAGES.map((p) => checkPage(p.url, p.checks)))

  process.exit(printSummary())
}

main().catch((e) => {
  console.error(red(`\nFatal: ${e.stack || e.message}`))
  process.exit(1)
})
