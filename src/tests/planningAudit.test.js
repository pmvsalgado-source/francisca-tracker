import { describe, expect, it } from 'vitest'
import { auditPlanningTimeline, isCompetitionStressDay, isGolfHigh } from '../lib/planningAudit.js'
import { getPublicGolfState } from '../lib/periodizationViewModel.js'
import { DAY_TYPES, LOAD_LEVELS } from '../lib/periodization/day.js'

const lowGym = { sessionAllowed: true, sessionType: 'C', gymLoadLevel: LOAD_LEVELS.LOW }
const highGym = { sessionAllowed: true, sessionType: 'A', gymLoadLevel: LOAD_LEVELS.HIGH }
const offGym = { sessionAllowed: false, sessionType: null, gymLoadLevel: 'NONE' }

const makeDay = (date, extra = {}) => ({
  date,
  dayType: DAY_TYPES.LOW_LOAD,
  loadLevel: LOAD_LEVELS.LOW,
  phase: 'ACCUMULATION',
  nextCompetition: null,
  lastCompetition: null,
  daysToNextCompetition: null,
  daysSinceLastCompetition: null,
  gymRecommendation: lowGym,
  ...extra,
})

describe('planning audit', () => {
  it('flags 22 and 23 May as strong days near competition without changing the motor', () => {
    const days = Array.from({ length: 60 }, (_, index) => {
      const date = new Date('2026-05-01T12:00:00')
      date.setDate(date.getDate() + index)
      const dateStr = date.toISOString().slice(0, 10)
      return makeDay(dateStr)
    })

    days[21] = makeDay('2026-05-22', {
      dayType: DAY_TYPES.HIGH_LOAD,
      loadLevel: LOAD_LEVELS.HIGH,
      daysToNextCompetition: 4,
      gymRecommendation: highGym,
    })
    days[22] = makeDay('2026-05-23', {
      dayType: DAY_TYPES.HIGH_LOAD,
      loadLevel: LOAD_LEVELS.HIGH,
      daysToNextCompetition: 3,
      gymRecommendation: highGym,
    })
    days[25] = makeDay('2026-05-26', {
      dayType: DAY_TYPES.COMPETITION,
      loadLevel: LOAD_LEVELS.HIGH,
      daysToNextCompetition: 0,
      daysSinceLastCompetition: 0,
      nextCompetition: { title: 'Lisbon Cup' },
      gymRecommendation: offGym,
    })

    const report = auditPlanningTimeline(days)

    expect(report.summary.daysAnalyzed).toBe(60)
    expect(report.summary.highHighDays).toBe(2)
    expect(report.findings.some(finding => finding.date === '2026-05-22' && finding.severity === 'CRITICAL')).toBe(true)
    expect(report.findings.some(finding => finding.date === '2026-05-23' && finding.severity === 'CRITICAL')).toBe(true)
  })

  it('flags a 7-day window with no recovery-like day', () => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date('2026-05-01T12:00:00')
      date.setDate(date.getDate() + index)
      const dateStr = date.toISOString().slice(0, 10)
      return makeDay(dateStr, {
        dayType: DAY_TYPES.HIGH_LOAD,
        loadLevel: LOAD_LEVELS.HIGH,
        gymRecommendation: highGym,
      })
    })

    const report = auditPlanningTimeline(days)

    expect(report.summary.recoveryIssues).toBeGreaterThan(0)
    expect(report.findings.some(finding => finding.category === 'recovery-gap' && finding.severity === 'CRITICAL')).toBe(true)
  })

  it('does not treat assessment as a strong day unless the actual load is strong', () => {
    const report = auditPlanningTimeline([
      makeDay('2026-05-15', {
        dayType: DAY_TYPES.ASSESSMENT,
        loadLevel: LOAD_LEVELS.MEDIUM,
        gymRecommendation: { sessionAllowed: true, sessionType: 'C', gymLoadLevel: LOAD_LEVELS.LOW },
      }),
    ])

    expect(report.summary.highHighDays).toBe(0)
    expect(report.findings.some(finding => finding.category === 'consecutive-high-block')).toBe(false)
  })

  it('treats competition as a public competition state, not as training load', () => {
    const competitionDay = makeDay('2026-05-10', {
      dayType: DAY_TYPES.COMPETITION,
      loadLevel: LOAD_LEVELS.MEDIUM,
      gymRecommendation: highGym,
      daysToNextCompetition: 0,
      daysSinceLastCompetition: 0,
      nextCompetition: { title: 'Lisbon Cup' },
    })

    expect(getPublicGolfState(competitionDay)).toEqual(expect.objectContaining({
      label: 'Competição',
      loadLabel: 'Competição',
      colorKey: 'COMPETITION',
      category: 'competition',
      isCompetition: true,
      isTrainingLoad: false,
    }))
    expect(isGolfHigh(competitionDay)).toBe(false)
    expect(isCompetitionStressDay(competitionDay)).toBe(true)

    const report = auditPlanningTimeline([competitionDay])
    expect(report.findings.some(finding => finding.category === 'golf-gym-high')).toBe(false)
    expect(report.findings.some(finding => finding.category === 'competition-day-gym')).toBe(true)
  })

  it('does not treat multi-day competition as consecutive-high-block by default', () => {
    const days = [
      makeDay('2026-05-09', {
        dayType: DAY_TYPES.COMPETITION,
        loadLevel: LOAD_LEVELS.HIGH,
        gymRecommendation: offGym,
        daysToNextCompetition: 1,
        daysSinceLastCompetition: 0,
        nextCompetition: { title: 'Lisbon Cup' },
      }),
      makeDay('2026-05-10', {
        dayType: DAY_TYPES.COMPETITION,
        loadLevel: LOAD_LEVELS.MEDIUM,
        gymRecommendation: offGym,
        daysToNextCompetition: 0,
        daysSinceLastCompetition: 0,
        nextCompetition: { title: 'Lisbon Cup' },
      }),
    ]

    const report = auditPlanningTimeline(days)
    expect(report.findings.some(finding => finding.category === 'consecutive-high-block')).toBe(false)
    expect(report.findings.some(finding => finding.category === 'competition-block' && finding.severity === 'OK')).toBe(true)
  })

  it('does not escalate a four-day competition block by duration alone', () => {
    const days = Array.from({ length: 4 }, (_, index) => makeDay(`2026-05-${String(9 + index).padStart(2, '0')}`, {
      dayType: DAY_TYPES.COMPETITION,
      loadLevel: index === 0 ? LOAD_LEVELS.HIGH : LOAD_LEVELS.MEDIUM,
      gymRecommendation: offGym,
      daysToNextCompetition: 3 - index,
      daysSinceLastCompetition: index,
      nextCompetition: { title: 'Lisbon Cup' },
    }))

    const report = auditPlanningTimeline(days)
    expect(report.findings.some(finding => finding.category === 'consecutive-high-block')).toBe(false)
    expect(report.findings.some(finding => finding.category === 'competition-block' && finding.severity === 'OK')).toBe(true)
  })

  it('treats competition plus gym strength as critical', () => {
    const report = auditPlanningTimeline([
      makeDay('2026-05-10', {
        dayType: DAY_TYPES.COMPETITION,
        loadLevel: LOAD_LEVELS.MEDIUM,
        gymRecommendation: highGym,
        daysToNextCompetition: 0,
        daysSinceLastCompetition: 0,
        nextCompetition: { title: 'Lisbon Cup' },
      }),
    ])

    expect(report.findings.some(finding => finding.category === 'competition-day-gym' && finding.severity === 'CRITICAL')).toBe(true)
  })

  it('ignores ui annotations when deriving public golf state', () => {
    const annotated = makeDay('2026-05-10', {
      dayType: DAY_TYPES.LOW_LOAD,
      loadLevel: LOAD_LEVELS.MEDIUM,
      uiCompetitionBlockStartDate: '2026-05-09',
      uiIsCompetitionBlockStart: false,
      uiRelationLabel: '',
    })

    expect(getPublicGolfState(annotated)).toEqual(expect.objectContaining({
      label: 'Recuperação',
      loadLabel: 'Recuperação',
      category: 'recovery',
      isCompetition: false,
    }))
  })

  it('keeps REST public state as Descanso and RECOVERY as Recuperação', () => {
    const restDay = makeDay('2026-05-04', {
      dayType: DAY_TYPES.REST,
      loadLevel: LOAD_LEVELS.REST,
    })
    const recoveryDay = makeDay('2026-05-05', {
      dayType: DAY_TYPES.RECOVERY,
      loadLevel: LOAD_LEVELS.RECOVERY,
    })

    expect(getPublicGolfState(restDay)).toEqual(expect.objectContaining({
      label: 'Descanso',
      loadLabel: 'Descanso',
      category: 'rest',
      colorKey: 'REST',
      isCompetition: false,
    }))

    expect(getPublicGolfState(recoveryDay)).toEqual(expect.objectContaining({
      label: 'Recuperação',
      loadLabel: 'Recuperação',
      category: 'recovery',
      colorKey: 'RECOVERY',
      isCompetition: false,
    }))
  })
})

