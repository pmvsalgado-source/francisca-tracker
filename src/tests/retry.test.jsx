import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Goals from '../components/Goals'

// goals → error; entries → success (empty).
// Goals.jsx calls both fetchGoals and fetchEntries on mount.
// Only the goals fetch failing is enough to surface the retry button.
vi.mock('../lib/supabase', () => {
  const makeChain = (resolved) => {
    const c = {
      select: vi.fn(() => c),
      order:  vi.fn(() => c),
      then:   (onFulfilled, onRejected) =>
        Promise.resolve(resolved).then(onFulfilled, onRejected),
    }
    return c
  }
  return {
    supabase: {
      from: vi.fn((table) =>
        table === 'goals'
          ? makeChain({ data: null, error: { message: 'Erro de ligação' } })
          : makeChain({ data: [], error: null })
      ),
    },
  }
})

vi.mock('../lib/sentry.js', () => ({
  default: { captureException: vi.fn() },
}))

const t = {
  text: '#ffffff', textMuted: '#888888', surface: '#111111', border: '#222222',
  accent: '#52E8A0', danger: '#f87171', dangerBg: '#1a0808',
  bg: '#0a0a0a', navActive: '#333333',
}

describe('Goals retry UX', () => {
  it('shows "Tentar novamente" button when the goals fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Goals theme="dark" t={t} user={{ email: 'test@test.com' }} />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
    )
    consoleSpy.mockRestore()
  })

  it('shows the Supabase error message in the fetch error banner', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Goals theme="dark" t={t} user={{ email: 'test@test.com' }} />)
    await waitFor(() =>
      expect(screen.getByText(/erro de ligação/i)).toBeInTheDocument()
    )
    consoleSpy.mockRestore()
  })

  it('"Tentar novamente" button is enabled (not disabled) so user can click it', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Goals theme="dark" t={t} user={{ email: 'test@test.com' }} />)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /tentar novamente/i })
      expect(btn).not.toBeDisabled()
    })
    consoleSpy.mockRestore()
  })
})
