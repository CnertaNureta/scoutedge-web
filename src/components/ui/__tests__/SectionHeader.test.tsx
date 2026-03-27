import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SectionHeader from '../SectionHeader'

describe('SectionHeader', () => {
  it('renders children text', () => {
    render(<SectionHeader>Group Stage</SectionHeader>)
    expect(screen.getByText('Group Stage')).toBeInTheDocument()
  })

  it('renders as h2 by default', () => {
    render(<SectionHeader>Title</SectionHeader>)
    expect(screen.getByText('Title').tagName).toBe('H2')
  })

  it('renders as h1 when specified', () => {
    render(<SectionHeader as="h1">Hero</SectionHeader>)
    expect(screen.getByText('Hero').tagName).toBe('H1')
  })

  it('renders as h3 when specified', () => {
    render(<SectionHeader as="h3">Subtitle</SectionHeader>)
    expect(screen.getByText('Subtitle').tagName).toBe('H3')
  })

  it('shows rule divider when withRule is true', () => {
    const { container } = render(<SectionHeader withRule>With Rule</SectionHeader>)
    const rule = container.querySelector('.bg-gradient-to-r')
    expect(rule).not.toBeNull()
  })

  it('does not show rule divider by default', () => {
    const { container } = render(<SectionHeader>No Rule</SectionHeader>)
    const rule = container.querySelector('.bg-gradient-to-r')
    expect(rule).toBeNull()
  })

  it('applies custom accent color via inline style', () => {
    const { container } = render(<SectionHeader accentColor="#ff0000">Accent</SectionHeader>)
    const accent = container.querySelector('[style]') as HTMLElement
    expect(accent?.style.background).toBe('rgb(255, 0, 0)')
  })
})
