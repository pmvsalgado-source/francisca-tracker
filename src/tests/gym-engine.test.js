import { describe, expect, it } from 'vitest'
import { getPeriodizationDayContext } from '../lib/periodization/context.js'
import { getGymRecommendationContext } from '../lib/periodization/gym/gymContext.js'

const comp = (start, end = start, extra = {}) => ({
  title: extra.title || 'National Open',
  category: extra.category || 'Competition',
  status: extra.status || 'confirmed',
  start_date: start,
  end_date: end,
  ...extra,
})

const excellent = { readinessLevel: 'EXCELLENT', painLevel: 1, daysToCompetition: 12, daysSinceCompetition: 4, loadLevel: 'HIGH', dayType: 'HIGH_LOAD', phase: 'DEVELOPMENT', warnings: [], history: [] }
const good = { readinessLevel: 'GOOD', painLevel: 2, daysToCompetition: 12, daysSinceCompetition: 4, loadLevel: 'HIGH', dayType: 'HIGH_LOAD', phase: 'DEVELOPMENT', warnings: [], history: [] }
const poor = { readinessLevel: 'POOR', painLevel: 8, daysToCompetition: 12, daysSinceCompetition: 4, loadLevel: 'HIGH', dayType: 'HIGH_LOAD', phase: 'DEVELOPMENT', warnings: [], history: [] }

const withHistory = history => ({ ...good, history })

describe('gym engine', () => {
  it('returns no gym on competition day', () => {
    const rec = getGymRecommendationContext({
      ...excellent,
      dayType: 'COMPETITION',
      loadLevel: 'HIGH',
      phase: 'PRE_COMP',
      daysToCompetition: 0,
      daysSinceCompetition: 0,
    })

    expect(rec.sessionAllowed).toBe(false)
    expect(rec.sessionType).toBeNull()
    expect(rec.gymLoadLevel).toBe('NONE')
  })

  it('returns no gym on D+1 after competition', () => {
    const rec = getGymRecommendationContext({
      ...good,
      dayType: 'REST',
      loadLevel: 'REST',
      phase: 'DELOAD',
      daysToCompetition: null,
      daysSinceCompetition: 1,
    })

    expect(rec.sessionAllowed).toBe(false)
    expect(rec.sessionType).toBeNull()
    expect(rec.gymLoadLevel).toBe('NONE')
  })

  it('allows no A sessions in PRE_COMP', () => {
    const rec = getGymRecommendationContext({
      ...good,
      phase: 'PRE_COMP',
      dayType: 'HIGH_LOAD',
      loadLevel: 'HIGH',
      daysToCompetition: 6,
    })

    expect(rec.sessionType).not.toBe('A')
  })

  it('caps gym at 4 sessions per week', () => {
    const history = [
      { date: '2026-05-11', gymRecommendation: { sessionAllowed: true, sessionType: 'C', gymLoadLevel: 'LOW' } },
      { date: '2026-05-12', gymRecommendation: { sessionAllowed: true, sessionType: 'B', gymLoadLevel: 'MEDIUM' } },
      { date: '2026-05-13', gymRecommendation: { sessionAllowed: true, sessionType: 'C', gymLoadLevel: 'LOW' } },
      { date: '2026-05-14', gymRecommendation: { sessionAllowed: true, sessionType: 'B', gymLoadLevel: 'MEDIUM' } },
    ]
    const rec = getGymRecommendationContext({
      ...good,
      date: '2026-05-15',
      history,
      dayType: 'LOW_LOAD',
      loadLevel: 'LOW',
      phase: 'DEVELOPMENT',
      daysToCompetition: 12,
    })

    expect(rec.sessionAllowed).toBe(false)
    expect(rec.sessionType).toBeNull()
    expect(rec.gymLoadLevel).toBe('NONE')
  })

  it('caps A sessions at 2 per week', () => {
    const history = [
      { date: '2026-05-11', gymRecommendation: { sessionAllowed: true, sessionType: 'A', gymLoadLevel: 'HIGH' } },
      { date: '2026-05-13', gymRecommendation: { sessionAllowed: true, sessionType: 'A', gymLoadLevel: 'HIGH' } },
    ]
    const rec = getGymRecommendationContext({
      ...excellent,
      date: '2026-05-15',
      history,
      dayType: 'HIGH_LOAD',
      loadLevel: 'HIGH',
      phase: 'DEVELOPMENT',
      daysToCompetition: 12,
    })

    expect(rec.sessionType).not.toBe('A')
  })

  it('respects 48h spacing between A sessions', () => {
    const history = [
      { date: '2026-05-11', gymRecommendation: { sessionAllowed: true, sessionType: 'A', gymLoadLevel: 'HIGH' } },
    ]
    const rec = getGymRecommendationContext({
      ...excellent,
      date: '2026-05-12',
      history,
      dayType: 'HIGH_LOAD',
      loadLevel: 'HIGH',
      phase: 'DEVELOPMENT',
      daysToCompetition: 12,
    })

    expect(rec.sessionType).not.toBe('A')
  })

  it('blocks A and B on poor readiness', () => {
    const rec = getGymRecommendationContext({
      ...poor,
      dayType: 'HIGH_LOAD',
      loadLevel: 'HIGH',
      phase: 'DEVELOPMENT',
      daysToCompetition: 12,
    })

    expect(['C', null]).toContain(rec.sessionType)
    expect(['LOW', 'NONE']).toContain(rec.gymLoadLevel)
  })

  it('limits D-2 to C only', () => {
    const rec = getGymRecommendationContext({
      ...good,
      dayType: 'MEDIUM_LOAD',
      loadLevel: 'MEDIUM',
      phase: 'PRE_COMP',
      daysToCompetition: 2,
    })

    expect(['C', null]).toContain(rec.sessionType)
    expect(['LOW', 'NONE']).toContain(rec.gymLoadLevel)
  })

  it('blocks gym on D-1', () => {
    const rec = getGymRecommendationContext({
      ...good,
      dayType: 'PRE_COMP_LIGHT',
      loadLevel: 'LOW',
      phase: 'PRE_COMP',
      daysToCompetition: 1,
    })

    expect(rec.sessionAllowed).toBe(false)
    expect(rec.sessionType).toBeNull()
  })

  it('does not accumulate A sessions in DELOAD', () => {
    const rec = getGymRecommendationContext({
      ...excellent,
      dayType: 'HIGH_LOAD',
      loadLevel: 'HIGH',
      phase: 'DELOAD',
      daysToCompetition: 14,
    })

    expect(rec.sessionType).not.toBe('A')
  })

  it('keeps far windows able to use one ALTA and protects the next day after ALTA', () => {
    const first = getGymRecommendationContext({
      ...excellent,
      date: '2026-05-05',
      dayType: 'HIGH_LOAD',
      loadLevel: 'HIGH',
      phase: 'DEVELOPMENT',
      daysToCompetition: 6,
      history: [],
    })

    expect(first.sessionType).toBe('A')

    const second = getGymRecommendationContext({
      ...excellent,
      date: '2026-05-06',
      dayType: 'HIGH_LOAD',
      loadLevel: 'HIGH',
      phase: 'DEVELOPMENT',
      daysToCompetition: 5,
      history: [
        { date: '2026-05-05', gymRecommendation: first },
      ],
    })

    expect(second.sessionType).not.toBe('A')
    expect(second.sessionType).not.toBe('B')
    expect(['C', null]).toContain(second.sessionType)
  })

  it('caps D-5 to medium and D-3 to low', () => {
    const d5 = getGymRecommendationContext({
      ...good,
      date: '2026-05-07',
      dayType: 'HIGH_LOAD',
      loadLevel: 'HIGH',
      phase: 'DEVELOPMENT',
      daysToCompetition: 5,
      history: [],
    })

    const d3 = getGymRecommendationContext({
      ...good,
      date: '2026-05-09',
      dayType: 'HIGH_LOAD',
      loadLevel: 'HIGH',
      phase: 'DEVELOPMENT',
      daysToCompetition: 3,
      history: [],
    })

    expect(d5.sessionType).not.toBe('A')
    expect(['B', 'C', null]).toContain(d5.sessionType)
    expect(d3.sessionType).not.toBe('A')
    expect(['C', null]).toContain(d3.sessionType)
  })

  it('limits MAINTENANCE_B2B to 2 sessions per week', () => {
    const history = [
      { date: '2026-05-05', gymRecommendation: { sessionAllowed: true, sessionType: 'B', gymLoadLevel: 'MEDIUM' } },
      { date: '2026-05-07', gymRecommendation: { sessionAllowed: true, sessionType: 'C', gymLoadLevel: 'LOW' } },
    ]
    const rec = getGymRecommendationContext({
      ...good,
      date: '2026-05-08',
      history,
      dayType: 'LOW_LOAD',
      loadLevel: 'LOW',
      phase: 'MAINTENANCE_B2B',
      daysToCompetition: 5,
    })

    expect(rec.sessionAllowed).toBe(false)
    expect(rec.sessionType).toBeNull()
  })

  it('adds gymRecommendation to the periodization output', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-14',
      events: [comp('2026-06-30')],
      readinessInputs: { pain: 1, sleep: 8, energy: 8, fatigue: 2 },
    })

    expect(ctx.gymRecommendation).toBeTruthy()
    expect(ctx.gymRecommendation).toHaveProperty('gymPhase')
    expect(ctx).toHaveProperty('loadLevel')
  })
})
