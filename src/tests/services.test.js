import { describe, it, expect, vi } from 'vitest'
import { getGoals } from '../services/goalsService'
import { getCompetitions } from '../services/competitionsService'

// Mock Supabase with a chainable builder that is also thenable.
// This lets both `.order()` (goals) and `.order().range()` (competitions)
// resolve correctly without needing separate setups per service.
vi.mock('../lib/supabase', () => {
  const resolved = { data: [{ id: '1' }, { id: '2' }], error: null }
  const makeChain = () => {
    const c = {
      select: vi.fn(() => c),
      order: vi.fn(() => c),
      range: vi.fn(() => Promise.resolve(resolved)),
      then: (onFulfilled, onRejected) =>
        Promise.resolve(resolved).then(onFulfilled, onRejected),
    }
    return c
  }
  return { supabase: { from: vi.fn(makeChain) } }
})

vi.mock('../lib/sentry.js', () => ({
  default: { captureException: vi.fn() },
}))

describe('goalsService', () => {
  it('getGoals returns an array', async () => {
    const result = await getGoals()
    expect(Array.isArray(result)).toBe(true)
  })

  it('getGoals returns the data rows from Supabase', async () => {
    const result = await getGoals()
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('competitionsService', () => {
  it('getCompetitions returns an array', async () => {
    const result = await getCompetitions()
    expect(Array.isArray(result)).toBe(true)
  })

  it('getCompetitions returns the data rows from Supabase', async () => {
    const result = await getCompetitions()
    expect(result.length).toBeGreaterThan(0)
  })
})
