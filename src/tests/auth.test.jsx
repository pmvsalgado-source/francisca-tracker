import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Login from '../components/Login'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

describe('Login', () => {
  it('renders the email input field', () => {
    render(<Login />)
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
  })

  it('renders the password input field', () => {
    render(<Login />)
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('renders the Sign In button', () => {
    render(<Login />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('both email and password inputs have the correct type', () => {
    render(<Login />)
    expect(screen.getByPlaceholderText('your@email.com')).toHaveAttribute('type', 'email')
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password')
  })
})
