import { describe, expect, it } from 'vitest'
import { simulateGymDistanceMode } from '../lib/periodization/gym/distanceModeSimulation.js'

const offGym = { sessionAllowed: false, sessionType: null, gymLoadLevel: 'NONE' }

const makeDay = (
  date,
  {
    dayType = 'HIGH_LOAD',
    daysToNextCompetition = null,
    daysSinceLastCompetition = null,
    readinessLevel = 'GOOD',
    pain = 2,
    fatigue = 2,
    gymRecommendation = offGym,
  } = {}
) => ({
  date,
  dayType,
  daysToNextCompetition,
  daysSinceLastCompetition,
  readiness: { readinessLevel, pain, fatigue },
  gymRecommendation,
})

describe('gym distance mode simulation', () => {
  it('keeps the distance mode conservative and blocks over-promotion', () => {
    const rows = simulateGymDistanceMode([
      makeDay('2026-05-05', { daysToNextCompetition: 11 }),
      makeDay('2026-05-06', { daysToNextCompetition: 10 }),
      makeDay('2026-05-07', { daysToNextCompetition: 9 }),
      makeDay('2026-05-08', { daysToNextCompetition: 8 }),
      makeDay('2026-05-09', { daysToNextCompetition: 7 }),
      makeDay('2026-05-10', { daysToNextCompetition: 6 }),
      makeDay('2026-05-11', { daysToNextCompetition: 5 }),
      makeDay('2026-05-12', { daysToNextCompetition: 4 }),
      makeDay('2026-05-13', { daysToNextCompetition: 3 }),
      makeDay('2026-05-14', { daysToNextCompetition: 2 }),
      makeDay('2026-05-15', { daysToNextCompetition: 1 }),
      makeDay('2026-05-16', { dayType: 'COMPETITION', daysToNextCompetition: 0, daysSinceLastCompetition: 0 }),
      makeDay('2026-05-17', { dayType: 'COMPETITION', daysToNextCompetition: 0, daysSinceLastCompetition: 0 }),
      makeDay('2026-05-18', { dayType: 'RECOVERY', daysToNextCompetition: 0, daysSinceLastCompetition: 1 }),
      makeDay('2026-05-19', { dayType: 'RECOVERY', daysToNextCompetition: 0, daysSinceLastCompetition: 2 }),
      makeDay('2026-05-20', { daysToNextCompetition: null }),
      makeDay('2026-05-21', { daysToNextCompetition: null }),
      makeDay('2026-05-22', { daysToNextCompetition: null }),
      makeDay('2026-05-23', { daysToNextCompetition: null }),
      makeDay('2026-05-24', { daysToNextCompetition: null }),
    ])

    const byDate = new Map(rows.rows.map(row => [row.date, row]))

    expect(byDate.get('2026-05-11').suggestedLoadLabel).toMatch(/^(BAIXA|OFF|MÉDIA)$/)
    expect(byDate.get('2026-05-11').suggestedLoadLabel).not.toBe('ALTA')
    expect(byDate.get('2026-05-14').suggestedLoadLabel).toBe('OFF')
    expect(byDate.get('2026-05-15').suggestedLoadLabel).toBe('OFF')
    expect(byDate.get('2026-05-16').suggestedLoadLabel).toBe('OFF')
    expect(byDate.get('2026-05-17').suggestedLoadLabel).toBe('OFF')
    expect(byDate.get('2026-05-18').suggestedLoadLabel).toBe('OFF')
    expect(byDate.get('2026-05-19').suggestedLoadLabel).toMatch(/^(OFF|BAIXA)$/)
    expect(byDate.get('2026-05-19').suggestedLoadLabel).not.toBe('ALTA')

    const weekStart = rows.rows
      .filter(row => row.date >= '2026-05-05' && row.date <= '2026-05-11')
      .map(row => row.suggestedLoadLabel)
    expect(weekStart.filter(label => label === 'ALTA').length).toBeLessThanOrEqual(1)
    expect(weekStart.filter(label => label === 'MÉDIA').length).toBeLessThanOrEqual(2)
    expect(rows.rows.filter(row => row.suggestedLoadLabel === 'ALTA').every(row => Number(row.day.daysToNextCompetition) >= 6 || row.day.daysToNextCompetition == null)).toBe(true)
  })

  it('keeps D-3 out of MEDIUM and protects post-competition multi-day recovery windows', () => {
    const rows = simulateGymDistanceMode([
      makeDay('2026-05-28', { daysToNextCompetition: 4 }),
      makeDay('2026-05-29', { daysToNextCompetition: 3 }),
      makeDay('2026-05-30', { dayType: 'COMPETITION', daysToNextCompetition: 0, daysSinceLastCompetition: 0 }),
      makeDay('2026-05-31', { dayType: 'COMPETITION', daysToNextCompetition: 0, daysSinceLastCompetition: 0 }),
      makeDay('2026-06-01', { dayType: 'RECOVERY', daysToNextCompetition: 11, daysSinceLastCompetition: 1 }),
      makeDay('2026-06-02', { dayType: 'RECOVERY', daysToNextCompetition: 10, daysSinceLastCompetition: 2 }),
      makeDay('2026-06-03', { dayType: 'RECOVERY', daysToNextCompetition: 9, daysSinceLastCompetition: 3 }),
      makeDay('2026-06-04', { dayType: 'RECOVERY', daysToNextCompetition: 8, daysSinceLastCompetition: 4 }),
      makeDay('2026-06-25', { dayType: 'COMPETITION', daysToNextCompetition: 0, daysSinceLastCompetition: 0 }),
      makeDay('2026-06-26', { dayType: 'COMPETITION', daysToNextCompetition: 0, daysSinceLastCompetition: 0 }),
      makeDay('2026-06-27', { dayType: 'RECOVERY', daysToNextCompetition: 7, daysSinceLastCompetition: 1 }),
      makeDay('2026-06-28', { dayType: 'RECOVERY', daysToNextCompetition: 6, daysSinceLastCompetition: 2 }),
      makeDay('2026-06-29', { dayType: 'RECOVERY', daysToNextCompetition: 6, daysSinceLastCompetition: 3 }),
    ])

    const byDate = new Map(rows.rows.map(row => [row.date, row]))

    expect(byDate.get('2026-05-29').suggestedLoadLabel).not.toBe('MÉDIA')
    expect(byDate.get('2026-05-29').suggestedLoadLabel).toMatch(/^(OFF|BAIXA)$/)
    expect(byDate.get('2026-06-01').suggestedLoadLabel).toBe('OFF')
    expect(byDate.get('2026-06-01').reasons.join(' ')).toMatch(/Pós-competição multi-dia/i)
    expect(byDate.get('2026-06-02').suggestedLoadLabel).toMatch(/^(OFF|BAIXA)$/)
    expect(byDate.get('2026-06-03').suggestedLoadLabel).toMatch(/^(OFF|BAIXA|MÉDIA)$/)
    expect(byDate.get('2026-06-29').suggestedLoadLabel).toMatch(/^(OFF|BAIXA|MÉDIA)$/)
    expect(byDate.get('2026-06-29').suggestedLoadLabel).not.toBe('ALTA')
    expect(byDate.get('2026-06-29').reasons.join(' ')).toMatch(/Pós-competição multi-dia/i)
  })

  it('does not promote poor readiness days', () => {
    const rows = simulateGymDistanceMode([
      makeDay('2026-05-25', { daysToNextCompetition: 8, readinessLevel: 'POOR', pain: 8, fatigue: 8 }),
    ]).rows

    expect(rows[0].suggestedLoadLabel).toBe('OFF')
    expect(rows[0].reasons.join(' ')).toMatch(/Readiness/i)
  })
})
