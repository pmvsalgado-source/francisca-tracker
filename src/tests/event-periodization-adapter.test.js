import { describe, expect, it } from 'vitest'
import {
  explainPeriodizationEvent,
  isCompetitionForPeriodization,
  normalizeEventsForPeriodization,
} from '../lib/calendar/eventPeriodizationAdapter.js'
import { getPeriodizationDayContext } from '../lib/periodization/context.js'

describe('eventPeriodizationAdapter', () => {
  it('recognizes Calendar tournament categories while preserving periodization status safety', () => {
    const events = [
      { id: 1, title: 'Internacional Norte', category: 'Internacional', status: 'confirmed', start_date: '2026-05-10' },
      { id: 2, title: 'European Ladies Amateur', category: 'European Ladies Amateur', status: '', start_date: '2026-05-12' },
      { id: 3, title: 'Open Regional', category: 'Amateur', status: 'optional', start_date: '2026-05-14' },
      { id: 4, title: 'Gym', category: 'Gym', status: 'confirmed', start_date: '2026-05-16' },
    ]

    expect(isCompetitionForPeriodization(events[0])).toBe(true)
    expect(isCompetitionForPeriodization(events[1])).toBe(true)
    expect(explainPeriodizationEvent(events[2]).included).toBe(false)
    expect(explainPeriodizationEvent(events[3]).included).toBe(false)

    const normalized = normalizeEventsForPeriodization({ events })
    expect(normalized).toHaveLength(2)
    expect(normalized[0]).toMatchObject({
      title: 'Internacional Norte',
      category: 'Competição',
      original_category: 'Internacional',
      status: 'confirmed',
      _periodizationAnchor: true,
    })
    expect(normalized[1]).toMatchObject({
      title: 'European Ladies Amateur',
      category: 'Competição',
      original_category: 'European Ladies Amateur',
      status: 'confirmed',
      original_status: '',
    })
  })

  it('does not use training plans or synthetic training sessions as competition anchors', () => {
    const events = [
      { id: 'train-event', title: 'Torneio treino', category: 'Torneio', status: 'confirmed', start_date: '2026-05-10', _isTrain: true },
    ]
    const trainingPlans = [
      { id: 'plan-1', week_start: '2026-05-04', plan_type: 'golf', days: [{ sessions: [{ title: 'Campo' }] }] },
    ]

    expect(normalizeEventsForPeriodization({ events, trainingPlans })).toEqual([])
  })

  it('normalizes a Calendar competition on 2026-05-10 and anchors the periodization engine', () => {
    const events = [
      {
        id: 'cal-comp-2026-05-10',
        title: 'Campeonato Nacional',
        category: 'Amateur',
        type: 'torneio',
        status: 'confirmed',
        startTime: '2026-05-10T08:00:00+01:00',
        endTime: '2026-05-10T18:00:00+01:00',
      },
    ]

    const normalized = normalizeEventsForPeriodization({ events })
    expect(normalized).toHaveLength(1)
    expect(normalized[0]).toMatchObject({
      start_date: '2026-05-10',
      end_date: '2026-05-10',
      title: 'Campeonato Nacional',
      status: 'confirmed',
      original_category: 'Amateur',
    })

    const ctx = getPeriodizationDayContext({
      date: '2026-05-10',
      events: normalized,
      readinessInputs: {},
      history: [],
    })

    expect(ctx.dayType).toBe('COMPETITION')
  })

  it('merges R1 confirmed + R2 optional when same title and consecutive days (R2 alone would be excluded)', () => {
    const normalized = normalizeEventsForPeriodization({
      events: [
        {
          id: 'r1',
          title: 'Lisbon Cup',
          category: 'Amateur',
          status: 'confirmed',
          start_date: '2026-05-09',
        },
        {
          id: 'r2',
          title: 'Lisbon Cup',
          category: 'Amateur',
          status: 'optional',
          start_date: '2026-05-10',
        },
      ],
    })

    expect(normalized).toHaveLength(1)
    expect(normalized[0]).toMatchObject({ start_date: '2026-05-09', end_date: '2026-05-10', status: 'confirmed' })
    for (const date of ['2026-05-09', '2026-05-10']) {
      expect(getPeriodizationDayContext({ date, events: normalized, readinessInputs: {}, history: [] }).dayType).toBe('COMPETITION')
    }
  })

  it('merges consecutive calendar rows with the same title into one competition span (e.g. R1 + R2 as two saves)', () => {
    const normalized = normalizeEventsForPeriodization({
      events: [
        {
          id: 'a',
          title: 'Campeonato Regional',
          category: 'Amateur',
          status: 'confirmed',
          start_date: '2026-05-09',
        },
        {
          id: 'b',
          title: 'Campeonato Regional',
          category: 'Amateur',
          status: 'confirmed',
          start_date: '2026-05-10',
        },
      ],
    })

    expect(normalized).toHaveLength(1)
    expect(normalized[0]).toMatchObject({ start_date: '2026-05-09', end_date: '2026-05-10' })
    for (const date of ['2026-05-09', '2026-05-10']) {
      expect(getPeriodizationDayContext({ date, events: normalized, readinessInputs: {}, history: [] }).dayType).toBe('COMPETITION')
    }
  })

  it('keeps every day of a multi-day competition as a competition day', () => {
    const normalized = normalizeEventsForPeriodization({
      events: [
        {
          title: 'European Ladies Amateur',
          category: 'European Ladies Amateur',
          status: 'played',
          start: '2026-05-10',
          end: '2026-05-12',
        },
      ],
    })

    expect(normalized[0]).toMatchObject({ start_date: '2026-05-10', end_date: '2026-05-12' })
    for (const date of ['2026-05-10', '2026-05-11', '2026-05-12']) {
      expect(getPeriodizationDayContext({ date, events: normalized, readinessInputs: {}, history: [] }).dayType).toBe('COMPETITION')
    }
  })

  it('expands a competition that only specifies duration/rounds into all competition days', () => {
    const normalized = normalizeEventsForPeriodization({
      events: [
        {
          title: 'Lisbon Cup',
          category: 'Amateur',
          status: 'confirmed',
          start_date: '2026-05-09',
          rounds: 2,
        },
      ],
    })

    expect(normalized).toHaveLength(1)
    expect(normalized[0]).toMatchObject({ start_date: '2026-05-09', end_date: '2026-05-10' })
    expect(getPeriodizationDayContext({ date: '2026-05-09', events: normalized, readinessInputs: {}, history: [] }).dayType).toBe('COMPETITION')
    expect(getPeriodizationDayContext({ date: '2026-05-10', events: normalized, readinessInputs: {}, history: [] }).dayType).toBe('COMPETITION')
  })
})
