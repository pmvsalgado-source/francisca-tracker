import { describe, it, expect, vi } from 'vitest'
import { getGoals } from '../services/goalsService'
import { getCompetitions } from '../services/competitionsService'

// The mock builder returns a chain object that is ALSO thenable so that:
//   - `await chain.select().order()`          resolves (goalsService path)
//   - `await chain.select().order().range()`  also resolves (competitionsService path)
// Without the .then(), awaiting the chain object would return the object itself,
// not { data, error }, and the services would throw.
vi.mock('../lib/supabase', () => {
  const resolved = { data: [{ id: '1' }, { id: '2' }], error: null }
  const makeChain = () => {
    const c = {
      select: vi.fn(() => c),
      order:  vi.fn(() => c),
      range:  vi.fn(() => Promise.resolve(resolved)),
      then:   (onFulfilled, onRejected) =>
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

  it('getGoals result contains the rows returned by Supabase', async () => {
    const result = await getGoals()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('id')
  })
})

describe('competitionsService', () => {
  it('getCompetitions returns an array — chain: select → order → range', async () => {
    // Competitions use the deeper chain: .select().order().range()
    // The thenable mock resolves correctly at every depth.
    const result = await getCompetitions()
    expect(Array.isArray(result)).toBe(true)
  })

  it('getCompetitions result contains the rows returned by Supabase', async () => {
    const result = await getCompetitions()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('id')
  })

  it('getCompetitions with explicit offset still returns an array', async () => {
    const result = await getCompetitions({ offset: 10 })
    expect(Array.isArray(result)).toBe(true)
  })
})
