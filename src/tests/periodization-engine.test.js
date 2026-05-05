import { describe, expect, it } from 'vitest'
import { getPeriodizationDayContext } from '../lib/periodization/context.js'
import { DAY_TYPES, LOAD_LEVELS, MESOCYCLE_TYPES, PHASES } from '../lib/periodization/day.js'

const comp = (start, end = start, extra = {}) => ({
  title: extra.title || 'National Open',
  category: extra.category || 'Competition',
  status: extra.status || 'confirmed',
  start_date: start,
  end_date: end,
  ...extra,
})

const excellent = { pain: 0, sleep: 9, energy: 9, fatigue: 1 }
const good = { pain: 1, sleep: 8, energy: 8, fatigue: 2 }
const highFatigue = { pain: 1, sleep: 4, energy: 4, fatigue: 9 }
const highPain = { pain: 8, sleep: 8, energy: 8, fatigue: 2 }
const travel = date => ({
  title: 'International travel',
  category: 'Travel',
  status: 'confirmed',
  start_date: date,
  end_date: date,
})

describe('periodization day engine', () => {
  it('sets D+1 after a 3-round competition to rest or conservative recovery', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-04',
      events: [comp('2026-05-01', '2026-05-03')],
      readinessInputs: good,
    })

    expect([DAY_TYPES.REST, DAY_TYPES.POST_COMP_RECOVERY]).toContain(ctx.dayType)
    expect(ctx.loadLevel).not.toBe(LOAD_LEVELS.HIGH)
  })

  it('sets D+2 after a heavy competition to recovery and never high load', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-05',
      events: [comp('2026-05-01', '2026-05-03')],
      readinessInputs: good,
    })

    expect([DAY_TYPES.POST_COMP_RECOVERY, DAY_TYPES.RECOVERY]).toContain(ctx.dayType)
    expect(ctx.loadLevel).not.toBe(LOAD_LEVELS.HIGH)
  })

  it('sets D-1 before competition to pre-competition light', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-09',
      events: [comp('2026-05-10')],
      readinessInputs: excellent,
    })

    expect(ctx.dayType).toBe(DAY_TYPES.PRE_COMP_LIGHT)
  })

  it('detects a competition on 2026-05-10 from a YYYY-MM-DD start date', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-10',
      events: [
        {
          title: 'Lisbon Cup',
          category: 'Competition',
          status: 'confirmed',
          start_date: '2026-05-10',
          end_date: '2026-05-10',
        },
      ],
      readinessInputs: excellent,
    })

    expect(ctx.dayType).toBe(DAY_TYPES.COMPETITION)
    expect(ctx.daysToNextCompetition).toBe(0)
  })

  it('treats a competition with duration/rounds as competition on every covered day', () => {
    const events = [
      {
        title: 'Lisbon Cup',
        category: 'Competition',
        status: 'confirmed',
        start_date: '2026-05-09',
        rounds: 2,
      },
    ]

    expect(getPeriodizationDayContext({ date: '2026-05-09', events, readinessInputs: excellent }).dayType).toBe(DAY_TYPES.COMPETITION)
    expect(getPeriodizationDayContext({ date: '2026-05-10', events, readinessInputs: excellent }).dayType).toBe(DAY_TYPES.COMPETITION)
  })

  it('sets D-2 before competition to low load or pre-competition light', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-08',
      events: [comp('2026-05-10')],
      readinessInputs: excellent,
    })

    expect([DAY_TYPES.LOW_LOAD, DAY_TYPES.PRE_COMP_LIGHT]).toContain(ctx.dayType)
    expect(ctx.loadLevel).not.toBe(LOAD_LEVELS.HIGH)
  })

  it('allows high load at D-10 with no fatigue and no recent competition', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-10',
      events: [comp('2026-05-20')],
      readinessInputs: excellent,
    })

    expect(ctx.dayType).toBe(DAY_TYPES.HIGH_LOAD)
    expect(ctx.loadLevel).toBe(LOAD_LEVELS.HIGH)
  })

  it('blocks high load at D-10 when fatigue is high', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-10',
      events: [comp('2026-05-20')],
      readinessInputs: highFatigue,
    })

    expect([DAY_TYPES.RECOVERY, DAY_TYPES.LOW_LOAD]).toContain(ctx.dayType)
    expect(ctx.loadLevel).not.toBe(LOAD_LEVELS.HIGH)
  })

  it('uses development block progression when 30+ days from the next competition', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-07',
      events: [comp('2026-05-01', '2026-05-03'), comp('2026-06-20')],
      readinessInputs: good,
    })

    expect(ctx.mesocycleType).toBe(MESOCYCLE_TYPES.DEVELOPMENT_BLOCK)
    expect(ctx.daysToNextCompetition).toBeGreaterThan(30)
  })

  it('maps a 3-week free block to accumulation, development and deload', () => {
    const events = [comp('2026-05-01', '2026-05-03'), comp('2026-06-30')]

    expect(getPeriodizationDayContext({ date: '2026-05-07', events, readinessInputs: good }).phase).toBe(PHASES.ACCUMULATION)
    expect(getPeriodizationDayContext({ date: '2026-05-14', events, readinessInputs: good }).phase).toBe(PHASES.DEVELOPMENT)
    expect(getPeriodizationDayContext({ date: '2026-05-21', events, readinessInputs: good }).phase).toBe(PHASES.DELOAD)
  })

  it('uses maintenance B2B for competitions in consecutive weeks and reduces high load', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-06',
      events: [comp('2026-05-01', '2026-05-02'), comp('2026-05-10')],
      readinessInputs: excellent,
    })

    expect(ctx.mesocycleType).toBe(MESOCYCLE_TYPES.MAINTENANCE_B2B)
    expect(ctx.phase).toBe(PHASES.MAINTENANCE_B2B)
    expect(ctx.loadLevel).not.toBe(LOAD_LEVELS.HIGH)
  })

  it('warns when there are 3 competitions in 4 weeks', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-22',
      events: [comp('2026-05-01'), comp('2026-05-10'), comp('2026-05-20'), comp('2026-06-15')],
      readinessInputs: good,
    })

    expect(ctx.warnings.some(warning => warning.includes('3 competitions in 4 weeks'))).toBe(true)
    expect(ctx.loadLevel).not.toBe(LOAD_LEVELS.HIGH)
  })

  it('forces low load or recovery after 2 high-load days', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-12',
      events: [comp('2026-05-22')],
      readinessInputs: excellent,
      history: [
        { date: '2026-05-10', dayType: DAY_TYPES.HIGH_LOAD, loadLevel: LOAD_LEVELS.HIGH },
        { date: '2026-05-11', dayType: DAY_TYPES.HIGH_LOAD, loadLevel: LOAD_LEVELS.HIGH },
      ],
    })

    expect([DAY_TYPES.LOW_LOAD, DAY_TYPES.RECOVERY]).toContain(ctx.dayType)
    expect(ctx.loadLevel).not.toBe(LOAD_LEVELS.HIGH)
  })

  it('uses rest or recovery for poor readiness with high pain regardless of mesocycle', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-12',
      events: [comp('2026-06-30')],
      readinessInputs: highPain,
    })

    expect([DAY_TYPES.REST, DAY_TYPES.RECOVERY]).toContain(ctx.dayType)
    expect(ctx.loadLevel).not.toBe(LOAD_LEVELS.HIGH)
  })

  it('schedules assessment on D+4 as the preferred development-block anchor', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-07',
      events: [comp('2026-05-01', '2026-05-03'), comp('2026-06-20')],
      readinessInputs: good,
    })

    expect(ctx.dayType).toBe(DAY_TYPES.ASSESSMENT)
  })

  it('does not schedule D+5 assessment when D+4 already had assessment', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-08',
      events: [comp('2026-05-01', '2026-05-03'), comp('2026-06-20')],
      readinessInputs: good,
      history: [
        { date: '2026-05-07', dayType: DAY_TYPES.ASSESSMENT, loadLevel: LOAD_LEVELS.MEDIUM },
      ],
    })

    expect([DAY_TYPES.LOW_LOAD, DAY_TYPES.MEDIUM_LOAD]).toContain(ctx.dayType)
    expect(ctx.dayType).not.toBe(DAY_TYPES.ASSESSMENT)
  })

  it('does not create consecutive assessment days in a generated 30-day sequence', () => {
    const events = [comp('2026-05-01', '2026-05-03'), comp('2026-06-20')]
    const history = []
    const contexts = Array.from({ length: 30 }, (_, index) => {
      const date = new Date('2026-05-04T12:00:00')
      date.setDate(date.getDate() + index)
      const ctx = getPeriodizationDayContext({
        date: date.toISOString().slice(0, 10),
        events,
        readinessInputs: good,
        history,
      })
      history.push({ date: ctx.date, dayType: ctx.dayType, loadLevel: ctx.loadLevel })
      return ctx
    })

    for (let i = 1; i < contexts.length; i += 1) {
      expect([contexts[i - 1].dayType, contexts[i].dayType]).not.toEqual([
        DAY_TYPES.ASSESSMENT,
        DAY_TYPES.ASSESSMENT,
      ])
    }
  })

  it('uses D+5 assessment only when preferred D+4 was unavailable', () => {
    const events = [
      comp('2026-05-01', '2026-05-03'),
      travel('2026-05-07'),
      comp('2026-06-20', '2026-06-20', { international: true }),
    ]
    const d4 = getPeriodizationDayContext({
      date: '2026-05-07',
      events,
      readinessInputs: good,
    })
    const d5 = getPeriodizationDayContext({
      date: '2026-05-08',
      events,
      readinessInputs: good,
      history: [{ date: d4.date, dayType: d4.dayType, loadLevel: d4.loadLevel }],
    })

    expect(d4.dayType).toBe(DAY_TYPES.TRAVEL)
    expect(d5.dayType).toBe(DAY_TYPES.ASSESSMENT)
  })

  it('does not allow more than 1 high-load day in a deload week', () => {
    const events = [comp('2026-05-11'), comp('2026-06-01')]
    const history = []
    const contexts = Array.from({ length: 7 }, (_, index) => {
      const date = new Date('2026-05-18T12:00:00')
      date.setDate(date.getDate() + index)
      const ctx = getPeriodizationDayContext({
        date: date.toISOString().slice(0, 10),
        events,
        readinessInputs: excellent,
        history,
      })
      history.push({ date: ctx.date, dayType: ctx.dayType, loadLevel: ctx.loadLevel, warnings: ctx.warnings })
      return ctx
    })

    expect(contexts.every(ctx => ctx.phase === PHASES.DELOAD || ctx.phase === PHASES.PRE_COMP)).toBe(true)
    expect(contexts.filter(ctx => ctx.dayType === DAY_TYPES.HIGH_LOAD).length).toBeLessThanOrEqual(1)
    expect(contexts.find(ctx => ctx.date === '2026-05-22')?.dayType).not.toBe(DAY_TYPES.HIGH_LOAD)
  })

  it('limits DELOAD to one high-load per phase segment and keeps the second deload high low', () => {
    const events = [comp('2026-05-11'), comp('2026-06-01')]
    const history = []
    const contexts = Array.from({ length: 5 }, (_, index) => {
      const date = new Date('2026-05-18T12:00:00')
      date.setDate(date.getDate() + index)
      const ctx = getPeriodizationDayContext({
        date: date.toISOString().slice(0, 10),
        events,
        readinessInputs: excellent,
        history,
      })
      history.push({ date: ctx.date, dayType: ctx.dayType, loadLevel: ctx.loadLevel, phase: ctx.phase, warnings: ctx.warnings })
      return ctx
    })

    expect(contexts.filter(ctx => ctx.phase === PHASES.DELOAD && ctx.dayType === DAY_TYPES.HIGH_LOAD)).toHaveLength(1)
    expect(contexts.find(ctx => ctx.date === '2026-05-20')?.dayType).toBe(DAY_TYPES.HIGH_LOAD)
    expect(contexts.find(ctx => ctx.date === '2026-05-21')?.dayType).not.toBe(DAY_TYPES.HIGH_LOAD)
    expect(contexts.find(ctx => ctx.date === '2026-05-22')?.dayType).not.toBe(DAY_TYPES.HIGH_LOAD)
  })

  it('puts recovery immediately after the single deload high and returns low load the next day', () => {
    const events = [comp('2026-05-11'), comp('2026-06-01')]
    const history = []
    const contexts = Array.from({ length: 5 }, (_, index) => {
      const date = new Date('2026-05-18T12:00:00')
      date.setDate(date.getDate() + index)
      const ctx = getPeriodizationDayContext({
        date: date.toISOString().slice(0, 10),
        events,
        readinessInputs: excellent,
        history,
      })
      history.push({ date: ctx.date, dayType: ctx.dayType, loadLevel: ctx.loadLevel, phase: ctx.phase, warnings: ctx.warnings })
      return ctx
    })

    expect(contexts.find(ctx => ctx.date === '2026-05-20')?.dayType).toBe(DAY_TYPES.HIGH_LOAD)
    expect(contexts.find(ctx => ctx.date === '2026-05-21')?.dayType).toBe(DAY_TYPES.RECOVERY)
    expect(contexts.find(ctx => ctx.date === '2026-05-22')?.dayType).toBe(DAY_TYPES.LOW_LOAD)
  })

  it('blocks high-load in deload when daysToCompetition is 10 or less', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-22',
      events: [comp('2026-05-11'), comp('2026-06-01')],
      readinessInputs: excellent,
      history: [
        { date: '2026-05-18', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM, phase: PHASES.DELOAD },
        { date: '2026-05-19', dayType: DAY_TYPES.RECOVERY, loadLevel: LOAD_LEVELS.RECOVERY, phase: PHASES.DELOAD },
        { date: '2026-05-20', dayType: DAY_TYPES.HIGH_LOAD, loadLevel: LOAD_LEVELS.HIGH, phase: PHASES.DELOAD },
        { date: '2026-05-21', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW, phase: PHASES.DELOAD },
      ],
    })

    expect(ctx.phase).toBe(PHASES.DELOAD)
    expect(ctx.daysToNextCompetition).toBe(10)
    expect(ctx.dayType).not.toBe(DAY_TYPES.HIGH_LOAD)
  })

  it('defaults deload to no high load unless readiness is excellent and distance is safe', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-19',
      events: [comp('2026-05-11'), comp('2026-06-01')],
      readinessInputs: { pain: 3, sleep: 7, energy: 7, fatigue: 3 },
    })

    expect(ctx.phase).toBe(PHASES.DELOAD)
    expect(ctx.dayType).not.toBe(DAY_TYPES.HIGH_LOAD)
    expect(ctx.loadLevel).not.toBe(LOAD_LEVELS.HIGH)
  })

  it('does not schedule D-9 pre-comp as high load by default', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-23',
      events: [comp('2026-05-11'), comp('2026-06-01')],
      readinessInputs: excellent,
    })

    expect(ctx.phase).toBe(PHASES.PRE_COMP)
    expect(ctx.daysToNextCompetition).toBe(9)
    expect(ctx.dayType).not.toBe(DAY_TYPES.HIGH_LOAD)
  })

  it('returns with recovery or low load the day after a high-pain rest', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-20',
      events: [comp('2026-05-11'), comp('2026-06-01')],
      readinessInputs: excellent,
      history: [
        {
          date: '2026-05-19',
          dayType: DAY_TYPES.REST,
          loadLevel: LOAD_LEVELS.REST,
          warnings: ['High pain: rest or recovery required.'],
        },
      ],
    })

    expect([DAY_TYPES.RECOVERY, DAY_TYPES.LOW_LOAD]).toContain(ctx.dayType)
  })

  it('includes at least 1 low-load or recovery day in the pre-comp D-7 to D-3 window', () => {
    const events = [comp('2026-05-11'), comp('2026-06-01')]
    const history = []
    const contexts = Array.from({ length: 5 }, (_, index) => {
      const date = new Date('2026-05-25T12:00:00')
      date.setDate(date.getDate() + index)
      const ctx = getPeriodizationDayContext({
        date: date.toISOString().slice(0, 10),
        events,
        readinessInputs: excellent,
        history,
      })
      history.push({ date: ctx.date, dayType: ctx.dayType, loadLevel: ctx.loadLevel, warnings: ctx.warnings })
      return ctx
    })

    expect(contexts.map(ctx => ctx.daysToNextCompetition)).toEqual([7, 6, 5, 4, 3])
    expect(contexts.some(ctx => [DAY_TYPES.LOW_LOAD, DAY_TYPES.RECOVERY].includes(ctx.dayType))).toBe(true)
    expect(contexts.every(ctx => ctx.dayType !== DAY_TYPES.HIGH_LOAD)).toBe(true)
  })

  it('does not allow high load on D+2 after a high-pain rest', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-21',
      events: [comp('2026-05-11'), comp('2026-06-01')],
      readinessInputs: excellent,
      history: [
        {
          date: '2026-05-19',
          dayType: DAY_TYPES.REST,
          loadLevel: LOAD_LEVELS.REST,
          warnings: ['High pain: rest or recovery required.'],
        },
        { date: '2026-05-20', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW, warnings: [] },
      ],
    })

    expect(ctx.phase).toBe(PHASES.DELOAD)
    expect(ctx.dayType).not.toBe(DAY_TYPES.HIGH_LOAD)
    expect(ctx.loadLevel).not.toBe(LOAD_LEVELS.HIGH)
    expect([DAY_TYPES.RECOVERY, DAY_TYPES.LOW_LOAD, DAY_TYPES.MEDIUM_LOAD]).toContain(ctx.dayType)
  })

  it('does not shift a removed high load later in the same deload window after high-pain rest', () => {
    const events = [comp('2026-05-11'), comp('2026-06-01')]
    const history = []
    const contexts = Array.from({ length: 4 }, (_, index) => {
      const date = new Date('2026-05-19T12:00:00')
      date.setDate(date.getDate() + index)
      const dateStr = date.toISOString().slice(0, 10)
      const ctx = getPeriodizationDayContext({
        date: dateStr,
        events,
        readinessInputs: dateStr === '2026-05-19' ? { pain: 8, sleep: 3, energy: 3, fatigue: 8 } : excellent,
        history,
      })
      history.push({ date: ctx.date, dayType: ctx.dayType, loadLevel: ctx.loadLevel, warnings: ctx.warnings })
      return ctx
    })

    expect(contexts.slice(0, 3).map(ctx => [ctx.date, ctx.dayType, ctx.loadLevel])).toEqual([
      ['2026-05-19', DAY_TYPES.REST, LOAD_LEVELS.REST],
      ['2026-05-20', DAY_TYPES.LOW_LOAD, LOAD_LEVELS.LOW],
      ['2026-05-21', DAY_TYPES.LOW_LOAD, LOAD_LEVELS.LOW],
    ])
    expect(contexts[3].dayType).toBe(DAY_TYPES.RECOVERY)
  })

  it('inserts recovery when a rolling 7-day window would have no rest or recovery', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-14',
      events: [comp('2026-06-30')],
      readinessInputs: excellent,
      history: [
        { date: '2026-05-10', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-11', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-12', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-13', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
      ],
    })

    expect(ctx.dayType).toBe(DAY_TYPES.RECOVERY)
  })

  it('keeps at least 2 rest or recovery days in a pre-comp 7-day window', () => {
    const events = [comp('2026-06-01')]
    const history = []
    const contexts = Array.from({ length: 7 }, (_, index) => {
      const date = new Date('2026-05-25T12:00:00')
      date.setDate(date.getDate() + index)
      const ctx = getPeriodizationDayContext({
        date: date.toISOString().slice(0, 10),
        events,
        readinessInputs: excellent,
        history,
      })
      history.push({ date: ctx.date, dayType: ctx.dayType, loadLevel: ctx.loadLevel, warnings: ctx.warnings })
      return ctx
    })

    expect(contexts.filter(ctx => [DAY_TYPES.REST, DAY_TYPES.RECOVERY, DAY_TYPES.POST_COMP_RECOVERY].includes(ctx.dayType)).length).toBeGreaterThanOrEqual(2)
  })

  it('keeps at least 2 rest or recovery days in a deload 7-day window', () => {
    const events = [comp('2026-05-01', '2026-05-03'), comp('2026-06-30')]
    const history = []
    const contexts = Array.from({ length: 7 }, (_, index) => {
      const date = new Date('2026-05-18T12:00:00')
      date.setDate(date.getDate() + index)
      const ctx = getPeriodizationDayContext({
        date: date.toISOString().slice(0, 10),
        events,
        readinessInputs: excellent,
        history,
      })
      history.push({ date: ctx.date, dayType: ctx.dayType, loadLevel: ctx.loadLevel, warnings: ctx.warnings })
      return ctx
    })

    expect(contexts.some(ctx => ctx.phase === PHASES.DELOAD)).toBe(true)
    expect(contexts.filter(ctx => [DAY_TYPES.REST, DAY_TYPES.RECOVERY, DAY_TYPES.POST_COMP_RECOVERY].includes(ctx.dayType)).length).toBeGreaterThanOrEqual(2)
  })

  it('inserts a full REST day in a week with no REST', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-16',
      events: [comp('2026-06-30')],
      readinessInputs: excellent,
      history: [
        { date: '2026-05-11', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-12', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-13', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-14', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-15', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
      ],
    })

    expect(ctx.dayType).toBe(DAY_TYPES.REST)
  })

  it('does not let RECOVERY satisfy the weekly REST requirement', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-17',
      events: [comp('2026-06-30')],
      readinessInputs: excellent,
      history: [
        { date: '2026-05-11', dayType: DAY_TYPES.RECOVERY, loadLevel: LOAD_LEVELS.RECOVERY },
        { date: '2026-05-12', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-13', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-14', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-15', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-16', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
      ],
    })

    expect(ctx.dayType).toBe(DAY_TYPES.REST)
  })

  it('does not let POST_COMP_RECOVERY satisfy the weekly REST requirement', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-17',
      events: [comp('2026-06-30')],
      readinessInputs: excellent,
      history: [
        { date: '2026-05-11', dayType: DAY_TYPES.POST_COMP_RECOVERY, loadLevel: LOAD_LEVELS.RECOVERY },
        { date: '2026-05-12', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-13', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-14', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-15', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-16', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
      ],
    })

    expect(ctx.dayType).toBe(DAY_TYPES.REST)
  })

  it('does not force weekly REST in a competition week', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-11',
      events: [comp('2026-05-14')],
      readinessInputs: excellent,
    })

    expect(ctx.dayType).not.toBe(DAY_TYPES.REST)
  })

  it('forces recovery on the 6th consecutive training day', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-15',
      events: [comp('2026-06-30')],
      readinessInputs: excellent,
      history: [
        { date: '2026-05-10', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-11', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-12', dayType: DAY_TYPES.HIGH_LOAD, loadLevel: LOAD_LEVELS.HIGH },
        { date: '2026-05-13', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-14', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
      ],
    })

    expect(ctx.dayType).toBe(DAY_TYPES.RECOVERY)
  })

  it('forces recovery after 4 consecutive pre-comp training days', () => {
    const ctx = getPeriodizationDayContext({
      date: '2026-05-28',
      events: [comp('2026-06-01')],
      readinessInputs: excellent,
      history: [
        { date: '2026-05-24', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-25', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-26', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-27', dayType: DAY_TYPES.PRE_COMP_LIGHT, loadLevel: LOAD_LEVELS.LOW },
      ],
    })

    expect(ctx.phase).toBe(PHASES.PRE_COMP)
    expect(ctx.dayType).toBe(DAY_TYPES.RECOVERY)
  })

  it('does not override competition on a forced recovery day and recovers after competition', () => {
    const events = [comp('2026-05-15')]
    const competitionDay = getPeriodizationDayContext({
      date: '2026-05-15',
      events,
      readinessInputs: excellent,
      history: [
        { date: '2026-05-10', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-11', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-12', dayType: DAY_TYPES.HIGH_LOAD, loadLevel: LOAD_LEVELS.HIGH },
        { date: '2026-05-13', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-14', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
      ],
    })
    const afterCompetition = getPeriodizationDayContext({
      date: '2026-05-16',
      events,
      readinessInputs: excellent,
      history: [
        { date: '2026-05-10', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-11', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: '2026-05-12', dayType: DAY_TYPES.HIGH_LOAD, loadLevel: LOAD_LEVELS.HIGH },
        { date: '2026-05-13', dayType: DAY_TYPES.LOW_LOAD, loadLevel: LOAD_LEVELS.LOW },
        { date: '2026-05-14', dayType: DAY_TYPES.MEDIUM_LOAD, loadLevel: LOAD_LEVELS.MEDIUM },
        { date: competitionDay.date, dayType: competitionDay.dayType, loadLevel: competitionDay.loadLevel },
      ],
    })

    expect(competitionDay.dayType).toBe(DAY_TYPES.COMPETITION)
    expect([DAY_TYPES.REST, DAY_TYPES.RECOVERY, DAY_TYPES.POST_COMP_RECOVERY]).toContain(afterCompetition.dayType)
  })
})
