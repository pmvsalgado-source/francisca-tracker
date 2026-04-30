import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ErrorBoundary from '../components/ErrorBoundary'

vi.mock('../lib/sentry.js', () => ({
  default: { captureException: vi.fn() },
}))

function Bomb() {
  throw new Error('Test crash')
}

describe('ErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>App content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('App content')).toBeInTheDocument()
  })

  it('shows the fallback UI when a child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByText('Algo correu mal')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('shows the reload button in the fallback UI', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /recarregar página/i })).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('shows the error message in the fallback UI', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByText('Test crash')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('shows the "Voltar ao início" navigation button in the fallback UI', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /voltar ao início/i })).toBeInTheDocument()
    consoleSpy.mockRestore()
  })
})
