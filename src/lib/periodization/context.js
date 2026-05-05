import { applyGuards } from './guards.js'
import { getMesocycleContext, daysDiff, eventEndDate, eventStartDate, getValidCompetitions, toDateStr } from './mesocycle.js'
import { toDateKey } from './date.js'
import { normalizeReadiness } from './readiness.js'
import { applyWeeklyLoadDistribution, getWeekLoadContext } from './week.js'
import { DAY_TYPES, LOAD_LEVELS, PHASE_LABELS, loadLevelForDayType } from './day.js'
import { getDayDecision } from './day.js'
import { getGymRecommendationContext } from './gym/gymContext.js'

function eventText(event) {
  return `${event?.category || ''} ${event?.title || ''} ${event?.type || ''} ${event?.notes || ''}`.toLowerCase()
}

function eventsOnDate(events, date) {
  return (events || []).filter(event => {
    const start = eventStartDate(event)
    const end = eventEndDate(event)
    return start && date >= start && date <= end
  })
}

function isTravelEvent(event) {
  const text = eventText(event)
  return ['travel', 'viagem', 'flight', 'voo', 'airport', 'aeroporto'].some(token => text.includes(token))
}

function isRestEvent(event) {
  const text = eventText(event)
  return ['rest', 'descanso', 'day off', 'folga'].some(token => text.includes(token))
}

function isInternationalCompetition(comp) {
  if (!comp) return false
  if (comp.international === true || comp.is_international === true) return true
  const text = `${comp.scope || ''} ${comp.level || ''} ${comp.tour_type || ''} ${comp.competition_scope || ''} ${comp.tags || ''} ${comp.notes || ''}`.toLowerCase()
  return text.includes('international') || text.includes('internacional')
}

function addDays(date, amount) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + amount)
  return toDateKey(d)
}

function buildCalendarContext({ date, events, mesocycle }) {
  const dayEvents = eventsOnDate(events, date)
  const validCompetitions = getValidCompetitions(events)
  const competitionToday = validCompetitions.find(comp => date >= comp._sd && date <= comp._ed) || null
  const nextCompetition = mesocycle.nextCompetition || validCompetitions.find(comp => comp._sd >= date) || null
  const lastCompetition = mesocycle.lastCompetition || [...validCompetitions].reverse().find(comp => comp._ed < date) || null
  const travelToday = dayEvents.some(isTravelEvent) && validCompetitions.some(isInternationalCompetition)
  const restToday = dayEvents.some(isRestEvent)
  const preferredAssessmentDate = lastCompetition?._ed ? addDays(lastCompetition._ed, 4) : null
  const preferredAssessmentEvents = preferredAssessmentDate ? eventsOnDate(events, preferredAssessmentDate) : []
  const preferredAssessmentCompetition = preferredAssessmentDate
    ? validCompetitions.some(comp => preferredAssessmentDate >= comp._sd && preferredAssessmentDate <= comp._ed)
    : false
  const preferredAssessmentTravel = preferredAssessmentEvents.some(isTravelEvent) && validCompetitions.some(isInternationalCompetition)
  const preferredAssessmentRest = preferredAssessmentEvents.some(isRestEvent)

  return {
    dayEvents,
    validCompetitions,
    competitionToday,
    nextCompetition,
    lastCompetition,
    daysToNextCompetition: nextCompetition ? Math.max(0, daysDiff(date, nextCompetition._sd)) : null,
    daysSinceLastCompetition: lastCompetition ? Math.max(0, daysDiff(lastCompetition._ed, date)) : null,
    travelToday,
    restToday,
    preferredAssessmentUnavailable: preferredAssessmentCompetition || preferredAssessmentTravel || preferredAssessmentRest,
    competitionsLast4Weeks: mesocycle.competitionsLast4Weeks || 0,
  }
}

function suggestedFocusFor(dayType, phase) {
  const byDay = {
    [DAY_TYPES.COMPETITION]: ['routine', 'strategy', 'confidence'],
    [DAY_TYPES.TRAVEL]: ['mobility', 'hydration', 'sleep'],
    [DAY_TYPES.REST]: ['sleep', 'recovery'],
    [DAY_TYPES.POST_COMP_RECOVERY]: ['mobility', 'recovery'],
    [DAY_TYPES.RECOVERY]: ['mobility', 'putting'],
    [DAY_TYPES.LOW_LOAD]: ['putting', 'wedges', 'mobility'],
    [DAY_TYPES.MEDIUM_LOAD]: ['technical quality', 'wedges', 'strength maintenance'],
    [DAY_TYPES.HIGH_LOAD]: ['technical development', 'speed', 'strength'],
    [DAY_TYPES.PRE_COMP_LIGHT]: ['routine', 'feel', 'putting'],
    [DAY_TYPES.ASSESSMENT]: ['assessment', 'baseline', 'movement screen'],
  }
  if (byDay[dayType]) return byDay[dayType]
  return phase === 'DELOAD' ? ['mobility', 'wedges'] : ['putting', 'wedges']
}

function athleteReason(dayType) {
  const map = {
    [DAY_TYPES.COMPETITION]: 'Compete with the plan you already trust and keep the day simple.',
    [DAY_TYPES.TRAVEL]: 'Protect your energy today so the next training or competition day is sharper.',
    [DAY_TYPES.REST]: 'Recover fully today so your next useful training day has quality.',
    [DAY_TYPES.POST_COMP_RECOVERY]: 'Let the body absorb the competition load before building again.',
    [DAY_TYPES.RECOVERY]: 'Move lightly and restore freshness without adding fatigue.',
    [DAY_TYPES.LOW_LOAD]: 'Keep feel and rhythm while leaving energy in reserve.',
    [DAY_TYPES.MEDIUM_LOAD]: 'Train with quality and enough load to keep progressing.',
    [DAY_TYPES.HIGH_LOAD]: 'This is the right window to build capacity with intent.',
    [DAY_TYPES.PRE_COMP_LIGHT]: 'Sharpen feel, routine and confidence without creating fatigue.',
    [DAY_TYPES.ASSESSMENT]: 'Use today to measure the starting point before the next development push.',
  }
  return map[dayType] || 'Train with a clear purpose today.'
}

function coachReason({ context, readiness, mesocycle, calendar }) {
  const triggers = [
    `phase=${context.phase}`,
    `mesocycle=${context.mesocycleType}/W${context.mesocycleWeek}`,
    `readiness=${readiness.readinessLevel}(${readiness.readinessScore})`,
  ]
  if (calendar.daysToNextCompetition != null) triggers.push(`D-${calendar.daysToNextCompetition}`)
  if (calendar.daysSinceLastCompetition != null) triggers.push(`D+${calendar.daysSinceLastCompetition}`)
  if (calendar.competitionsLast4Weeks >= 3) triggers.push(`${calendar.competitionsLast4Weeks} comps/4w`)
  return `Decision after mesocycle, week, day, readiness and guard layers. Triggers: ${triggers.join(', ')}.`
}

export function getPeriodizationDayContext({ date, events = [], readinessInputs = {}, history = [], weeksWithoutDeload = 0 } = {}) {
  const dateStr = toDateStr(date) || toDateStr(new Date())

  // Mesocycle = strategic context; week = organization; day = execution.
  // Competition is the anchor and every calculated prescription recomposes from events.
  const mesocycle = {
    ...getMesocycleContext({ date: dateStr, events }),
    weeksWithoutDeload,
  }
  const week = getWeekLoadContext({ mesocycle })
  const calendar = buildCalendarContext({ date: dateStr, events, mesocycle })
  const readiness = normalizeReadiness(readinessInputs)
  const rawDay = getDayDecision({
    date: dateStr,
    mesocycle,
    week,
    readiness,
    calendar,
    history,
  })
  const weeklyDay = applyWeeklyLoadDistribution({
    context: rawDay,
    week,
    readiness,
    calendar,
    history,
  })
  const guarded = applyGuards({
    context: {
      ...weeklyDay,
      phase: mesocycle.phase,
      mesocycleType: mesocycle.mesocycleType,
      mesocycleWeek: mesocycle.mesocycleWeek,
    },
    readiness,
    history,
    calendar,
    mesocycle,
  })

  const loadLevel = guarded.loadLevel || loadLevelForDayType(guarded.dayType)
  const output = {
    date: dateStr,
    dayType: guarded.dayType,
    loadLevel,
    phase: guarded.phase || mesocycle.phase,
    mesocycleType: guarded.mesocycleType || mesocycle.mesocycleType,
    mesocycleWeek: guarded.mesocycleWeek || mesocycle.mesocycleWeek,
    reasonForAthlete: athleteReason(guarded.dayType),
    reasonForCoach: '',
    warnings: guarded.warnings || [],
    suggestedFocus: suggestedFocusFor(guarded.dayType, guarded.phase || mesocycle.phase),
    reasons: guarded.reasons || [],
    readiness,
    nextCompetition: calendar.nextCompetition,
    lastCompetition: calendar.lastCompetition,
    daysToNextCompetition: calendar.daysToNextCompetition,
    daysSinceLastCompetition: calendar.daysSinceLastCompetition,
    eventsOnDay: calendar.dayEvents,
    phaseLabel: PHASE_LABELS[guarded.phase || mesocycle.phase],
    loadLabel: {
      [LOAD_LEVELS.HIGH]: 'Alta',
      [LOAD_LEVELS.MEDIUM]: 'Média',
      [LOAD_LEVELS.LOW]: 'Baixa',
      [LOAD_LEVELS.RECOVERY]: 'Muito baixa',
      [LOAD_LEVELS.REST]: 'Zero',
    }[loadLevel],
  }
  output.gymRecommendation = getGymRecommendationContext({
    date: dateStr,
    dayType: output.dayType,
    loadLevel: output.loadLevel,
    phase: output.phase,
    mesocycleType: output.mesocycleType,
    mesocycleWeek: output.mesocycleWeek,
    daysToCompetition: calendar.daysToNextCompetition,
    daysSinceCompetition: calendar.daysSinceLastCompetition,
    readinessLevel: readiness.readinessLevel,
    painLevel: readiness.pain,
    warnings: output.warnings,
    history,
  })
  output.reasonForCoach = coachReason({ context: output, readiness, mesocycle, calendar })
  return output
}
