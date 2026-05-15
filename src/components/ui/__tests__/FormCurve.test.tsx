import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import FormCurve from '../FormCurve'
import enMessages from '../../../../messages/en.json'

vi.mock('next-intl/server', () => {
  const interpolate = (template: string, params?: Record<string, unknown>) =>
    params
      ? template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
      : template

  return {
    getLocale: vi.fn(async () => 'en-US'),
    getTranslations: vi.fn(async (namespace: string) => {
      const ns = ((enMessages as unknown) as Record<string, Record<string, string>>)[namespace] ?? {}
      return (key: string, params?: Record<string, unknown>) =>
        interpolate(ns[key] ?? key, params)
    }),
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderFormCurve(props: { entity: 'team' | 'player'; slug: string; monthsLookback?: number; teamGlow?: string }) {
  const ui = await FormCurve(props)
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('FormCurve', () => {
  it('renders an SVG element with role="img"', async () => {
    const { container } = await renderFormCurve({ entity: 'team', slug: 'usa' })
    const svg = container.querySelector('svg[role="img"]')
    expect(svg).not.toBeNull()
  })

  it('renders aria-label including a direction word', async () => {
    const { container } = await renderFormCurve({ entity: 'team', slug: 'usa' })
    const svg = container.querySelector('svg[role="img"]')
    const aria = svg?.getAttribute('aria-label') ?? ''
    expect(aria).toMatch(/(up|down|flat)/)
  })

  it('renders a baseline line and a circle marker for the current value', async () => {
    const { container } = await renderFormCurve({ entity: 'player', slug: 'mbappe' })
    expect(container.querySelector('svg line')).not.toBeNull()
    expect(container.querySelector('svg circle')).not.toBeNull()
  })

  it('renders polyline path with the expected number of segments matching monthsLookback', async () => {
    const { container } = await renderFormCurve({ entity: 'team', slug: 'brazil', monthsLookback: 6 })
    const paths = container.querySelectorAll('svg path')
    expect(paths.length).toBeGreaterThanOrEqual(1)
    const linePath = Array.from(paths).find((p) => p.getAttribute('fill') === 'none')
    expect(linePath).toBeDefined()
    const d = linePath?.getAttribute('d') ?? ''
    const moveCount = (d.match(/M/g) ?? []).length
    const lineCount = (d.match(/L/g) ?? []).length
    expect(moveCount + lineCount).toBe(6)
  })

  it('renders a trend marker element when delta exceeds threshold', async () => {
    // Try multiple slugs until we find one with a non-flat trend.
    const slugs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    let foundTrend = false
    for (const s of slugs) {
      const { container, unmount } = await renderFormCurve({ entity: 'team', slug: s })
      const marker = container.querySelector('[data-testid="form-curve-trend"]')
      if (marker) {
        expect(marker.textContent).toMatch(/[↑↓]/)
        foundTrend = true
        unmount()
        break
      }
      unmount()
    }
    expect(foundTrend).toBe(true)
  })

  it('honors teamGlow color override on stroke', async () => {
    const { container } = await renderFormCurve({ entity: 'team', slug: 'germany', teamGlow: '#ff00aa' })
    const linePath = Array.from(container.querySelectorAll('svg path')).find(
      (p) => p.getAttribute('fill') === 'none'
    )
    expect(linePath?.getAttribute('stroke')).toBe('#ff00aa')
  })

  it('renders for player entity with valid svg', async () => {
    const { container } = await renderFormCurve({ entity: 'player', slug: 'haaland' })
    const svg = container.querySelector('svg[role="img"]')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('aria-label')).toContain('player')
  })
})
