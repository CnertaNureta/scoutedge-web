import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from '../Badge'

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Premium</Badge>)
    expect(screen.getByText('Premium')).toBeInTheDocument()
  })

  it('renders as a span element', () => {
    render(<Badge>Tag</Badge>)
    expect(screen.getByText('Tag').tagName).toBe('SPAN')
  })

  it('applies primary variant classes by default', () => {
    render(<Badge>Default</Badge>)
    const el = screen.getByText('Default')
    expect(el.className).toContain('text-primary')
  })

  it('applies secondary variant classes', () => {
    render(<Badge variant="secondary">Sec</Badge>)
    const el = screen.getByText('Sec')
    expect(el.className).toContain('text-secondary')
  })

  it('applies outline variant classes', () => {
    render(<Badge variant="outline">Outline</Badge>)
    const el = screen.getByText('Outline')
    expect(el.className).toContain('border-white/20')
  })

  it('applies md size classes', () => {
    render(<Badge size="md">Big</Badge>)
    const el = screen.getByText('Big')
    expect(el.className).toContain('text-xs')
  })
})
