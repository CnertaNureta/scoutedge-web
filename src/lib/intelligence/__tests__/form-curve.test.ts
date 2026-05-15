import { describe, it, expect } from 'vitest'
import { buildFormCurve, buildFormCurveFromAvailable } from '../form-curve'

describe('buildFormCurve', () => {
  it('returns exactly monthsLookback points (default 6)', () => {
    const series = buildFormCurve('team', 'usa')
    expect(series.points.length).toBe(6)
  })

  it('returns exactly monthsLookback points when overridden', () => {
    const series = buildFormCurve('team', 'usa', 4)
    expect(series.points.length).toBe(4)
  })

  it('monthOffset runs from -(N-1) to 0', () => {
    const series = buildFormCurve('team', 'brazil', 6)
    const offsets = series.points.map((p) => p.monthOffset)
    expect(offsets).toEqual([-5, -4, -3, -2, -1, 0])
  })

  it('delta equals last value minus first value', () => {
    const series = buildFormCurve('player', 'mbappe-2026', 6)
    const first = series.points[0].value
    const last = series.points[series.points.length - 1].value
    expect(series.delta).toBeCloseTo(last - first, 10)
  })

  it('trend is "up" when delta exceeds positive threshold', () => {
    const slugs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const upSeries = slugs
      .map((s) => buildFormCurve('team', s, 6))
      .find((s) => s.delta > 0.05)
    expect(upSeries).toBeDefined()
    expect(upSeries?.trend).toBe('up')
  })

  it('trend is "down" when delta is sufficiently negative', () => {
    const slugs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const downSeries = slugs
      .map((s) => buildFormCurve('team', s, 6))
      .find((s) => s.delta < -0.05)
    expect(downSeries).toBeDefined()
    expect(downSeries?.trend).toBe('down')
  })

  it('trend is "flat" when delta is within threshold', () => {
    // Manufacture a flat case by checking at least one slug stays within band.
    const slugs = Array.from({ length: 50 }, (_, i) => `slug-${i}`)
    const flatSeries = slugs
      .map((s) => buildFormCurve('team', s, 6))
      .find((s) => Math.abs(s.delta) <= 0.05)
    expect(flatSeries).toBeDefined()
    expect(flatSeries?.trend).toBe('flat')
  })

  it('same slug + entity produces identical series (deterministic)', () => {
    const a = buildFormCurve('team', 'argentina', 6)
    const b = buildFormCurve('team', 'argentina', 6)
    expect(a).toEqual(b)
  })

  it('different slugs produce different series', () => {
    const a = buildFormCurve('team', 'germany', 6)
    const b = buildFormCurve('team', 'france', 6)
    expect(a.points).not.toEqual(b.points)
  })

  it('team and player with same slug produce different series', () => {
    const team = buildFormCurve('team', 'usa', 6)
    const player = buildFormCurve('player', 'usa', 6)
    expect(team.points).not.toEqual(player.points)
  })

  it('mean is between min and max of points', () => {
    const series = buildFormCurve('player', 'haaland', 6)
    const values = series.points.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    expect(series.mean).toBeGreaterThanOrEqual(min)
    expect(series.mean).toBeLessThanOrEqual(max)
  })

  it('all values are within [0, 1]', () => {
    const series = buildFormCurve('player', 'bellingham', 6)
    for (const p of series.points) {
      expect(p.value).toBeGreaterThanOrEqual(0)
      expect(p.value).toBeLessThanOrEqual(1)
    }
  })

  it('clamps monthsLookback below minimum to 2', () => {
    const series = buildFormCurve('team', 'spain', 1)
    expect(series.points.length).toBe(2)
  })

  it('clamps monthsLookback above maximum to 24', () => {
    const series = buildFormCurve('team', 'spain', 999)
    expect(series.points.length).toBe(24)
  })

  it('buildFormCurveFromAvailable matches buildFormCurve output', () => {
    const a = buildFormCurve('team', 'portugal', 6)
    const b = buildFormCurveFromAvailable('team', 'portugal', 6)
    expect(a).toEqual(b)
  })

  it('exercises both team and player entities with valid output', () => {
    const team = buildFormCurve('team', 'japan', 6)
    const player = buildFormCurve('player', 'kubo', 6)
    expect(team.entity).toBe('team')
    expect(player.entity).toBe('player')
    expect(team.points.length).toBe(6)
    expect(player.points.length).toBe(6)
  })
})
