/**
 * Auto-linker for internal SEO link injection.
 *
 * Scans a text string for known entity names (teams, cities) and wraps the
 * first occurrence of each in a Next.js Link to the entity's detail page.
 *
 * Design constraints:
 * - Word-boundary matching only ("Brazil" must NOT match inside "Brazilian").
 * - First-occurrence-wins: each entity is linked at most once per call.
 * - Max links per call (default 3) to avoid over-optimization signals.
 * - Returns ReactNode[] for React rendering; pure string fallback also supported.
 * - Stable, deterministic ordering: longer entity names matched first so that
 *   "South Korea" beats "Korea" and "Mexico City" beats "Mexico".
 */

import type { ReactNode } from 'react'
import Link from 'next/link'
import { createElement } from 'react'

export type LinkEntity = {
  /** The display name to search for (e.g. "Brazil", "Mexico City"). */
  name: string
  /** The href to link to (e.g. "/teams/brazil"). Locale prefix added by caller if needed. */
  href: string
  /** Optional CSS class for the rendered anchor. */
  className?: string
}

const DEFAULT_MAX_LINKS = 3

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Sort entities so that longer names match first.
 * Prevents short prefixes/suffixes from stealing matches from longer names.
 */
function sortByLengthDesc(entities: ReadonlyArray<LinkEntity>): LinkEntity[] {
  return [...entities].sort((a, b) => b.name.length - a.name.length)
}

/**
 * Build a single regex matching any entity name with word boundaries.
 * Uses an alternation and `\b` anchors to keep substring matches out.
 *
 * Note: Unicode word boundaries are tricky for accented names; for the
 * current World Cup entity set (ASCII team/city names + a few accented
 * city names like "Curaçao"), JS \b handles ASCII fine. Accented names
 * are wrapped in lookarounds for safety.
 */
function buildEntityRegex(entities: ReadonlyArray<LinkEntity>): RegExp | null {
  if (entities.length === 0) return null
  const sorted = sortByLengthDesc(entities)
  const alternation = sorted.map((e) => escapeRegExp(e.name)).join('|')
  // Word boundary using lookarounds tolerant of punctuation/accents.
  // Match must be preceded/followed by non-letter (or start/end).
  return new RegExp(`(?<![A-Za-zÀ-ÿ])(${alternation})(?![A-Za-zÀ-ÿ])`, 'g')
}

export interface LinkifyOptions {
  /** Max anchor tags to emit per call. Default 3. */
  maxLinks?: number
  /** Override default link className. */
  className?: string
  /** A stable key prefix (use when calling multiple times in same render). */
  keyPrefix?: string
}

/**
 * Linkify a single string into a ReactNode[] (mix of strings and <Link> elements).
 *
 * Behavior:
 * - Wraps only the FIRST occurrence of each entity (per call).
 * - Stops emitting new anchors once maxLinks is reached.
 * - Returns the original string as a single-element array if no entities match.
 */
export function linkifyText(
  text: string,
  entities: ReadonlyArray<LinkEntity>,
  options: LinkifyOptions = {},
): ReactNode[] {
  if (!text || entities.length === 0) return [text]

  const maxLinks = options.maxLinks ?? DEFAULT_MAX_LINKS
  const className = options.className
  const keyPrefix = options.keyPrefix ?? 'al'

  const regex = buildEntityRegex(entities)
  if (!regex) return [text]

  const entityByName = new Map<string, LinkEntity>()
  for (const e of entities) entityByName.set(e.name, e)

  const usedNames = new Set<string>()
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let linkCount = 0
  let keyIdx = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (linkCount >= maxLinks) break
    const matchedName = match[1]
    if (usedNames.has(matchedName)) continue
    const entity = entityByName.get(matchedName)
    if (!entity) continue

    const start = match.index
    const end = start + matchedName.length

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start))
    }

    nodes.push(
      createElement(
        Link,
        {
          key: `${keyPrefix}-${keyIdx++}`,
          href: entity.href,
          className: entity.className ?? className,
        },
        matchedName,
      ),
    )

    usedNames.add(matchedName)
    linkCount += 1
    lastIndex = end
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes.length > 0 ? nodes : [text]
}

/**
 * Linkify text but produce HTML string output (for prose that's already rendered
 * via dangerouslySetInnerHTML, e.g. player seoArticle). Returns the original
 * string with `<a>` tags injected. Same first-occurrence + max-links rules.
 *
 * This is the fallback for code paths that must stay as strings. Prefer
 * `linkifyText` (ReactNode[]) when possible.
 */
export function linkifyHtml(
  text: string,
  entities: ReadonlyArray<LinkEntity>,
  options: LinkifyOptions = {},
): string {
  if (!text || entities.length === 0) return text
  const maxLinks = options.maxLinks ?? DEFAULT_MAX_LINKS
  const className = options.className

  const regex = buildEntityRegex(entities)
  if (!regex) return text

  const entityByName = new Map<string, LinkEntity>()
  for (const e of entities) entityByName.set(e.name, e)

  const usedNames = new Set<string>()
  let result = ''
  let lastIndex = 0
  let linkCount = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (linkCount >= maxLinks) break
    const matchedName = match[1]
    if (usedNames.has(matchedName)) continue
    const entity = entityByName.get(matchedName)
    if (!entity) continue

    const start = match.index
    const end = start + matchedName.length

    if (start > lastIndex) {
      result += text.slice(lastIndex, start)
    }
    const classAttr = entity.className ?? className
    const classPart = classAttr ? ` class="${classAttr}"` : ''
    result += `<a href="${entity.href}"${classPart}>${matchedName}</a>`

    usedNames.add(matchedName)
    linkCount += 1
    lastIndex = end
  }

  if (lastIndex < text.length) {
    result += text.slice(lastIndex)
  }

  return result
}

/**
 * Build LinkEntity[] from TEAMS data for a given locale prefix.
 * Excludes the current team (by slug) so the team's own page doesn't self-link.
 */
export function buildTeamEntities(
  teams: ReadonlyArray<{ slug: string; name: string }>,
  locale: string,
  excludeSlug?: string,
  className?: string,
): LinkEntity[] {
  return teams
    .filter((t) => t.slug !== excludeSlug)
    .map((t) => ({
      name: t.name,
      href: `/${locale}/teams/${t.slug}`,
      className,
    }))
}

/**
 * Build LinkEntity[] from cities data for a given locale prefix.
 */
export function buildCityEntities(
  cities: ReadonlyArray<{ slug: string; name: string }>,
  locale: string,
  excludeSlug?: string,
  className?: string,
): LinkEntity[] {
  return cities
    .filter((c) => c.slug !== excludeSlug)
    .map((c) => ({
      // Strip qualifier suffix (e.g. "New York / New Jersey" → also match "New York").
      // Use full name for primary entity; callers may add shorter aliases manually.
      name: c.name,
      href: `/${locale}/cities/${c.slug}`,
      className,
    }))
}
