import { canHighLoad, isExcellentReadiness } from './readiness.js'
import { DAY_TYPES, LOAD_LEVELS, PHASES, loadLevelForDayType } from './day.js'
import { toDateKey } from './date.js'

function normalizeHistory(history = []) {
  return [...history]
    .filter(Boolean)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
}

function isHighLoad(context) {
  return context?.dayType === DAY_TYPES.HIGH_LOAD || context?.loadLevel === LOAD_LEVELS.HIGH
}

function isRecoveryDay(context) {
  return [
    DAY_TYPES.REST,
    DAY_TYPES.RECOVERY,
    DAY_TYPES.POST_COMP_RECOVERY,
  ].includes(context?.dayType)
}

function isTrainingDay(context) {
  return [
    DAY_TYPES.LOW_LOAD,
    DAY_TYPES.MEDIUM_LOAD,
    DAY_TYPES.HIGH_LOAD,
    DAY_TYPES.ASSESSMENT,
    DAY_TYPES.PRE_COMP_LIGHT,
  ].includes(context?.dayType)
}

function highLoadCount(history) {
  return normalizeHistory(history).filter(isHighLoad).length
}

function recentHighLoadCount(history, count) {
  return normalizeHistory(history).slice(-count).filter(isHighLoad).length
}

function overrideDay(context, dayType, reason, warning = null) {
  return {
    ...context,
    dayType,
    loadLevel: loadLevelForDayType(dayType),
    reasons: [...(context.reasons || []), reason],
    warnings: warning ? [...(context.warnings || []), warning] : [...(context.warnings || [])],
  }
}

function daysBetween(from, to) {
  return Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000)
}

function addDays(date, amount) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + amount)
  return toDateKey(d)
}

function startOfCalendarWeek(date) {
  const d = new Date(`${date}T12:00:00`)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return toDateKey(d)
}

function endOfCalendarWeek(date) {
  return addDays(startOfCalendarWeek(date), 6)
}

function dayIndexInWeek(date) {
  const d = new Date(`${date}T12:00:00`)
  return d.getDay() === 0 ? 6 : d.getDay() - 1
}

function isHighPainRest(entry) {
  return entry?.dayType === DAY_TYPES.REST &&
    (entry?.warnings || []).some(warning => String(warning).toLowerCase().includes('high pain'))
}

function mostRecentHighPainRest(history = [], date) {
  return normalizeHistory(history)
    .filter(entry => entry?.date && entry.date < date && isHighPainRest(entry))
    .reverse()[0] || null
}

function mostRecentEntryBeforeDate(history = [], date) {
  return normalizeHistory(history)
    .filter(entry => entry?.date && entry.date < date)
    .reverse()[0] || null
}

function deloadSegmentDayIndex(history = [], date) {
  const ordered = normalizeHistory(history).filter(entry => entry?.date && entry.date < date)
  let count = 0
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const entry = ordered[i]
    if (entry.phase === PHASES.DELOAD) {
      count += 1
      continue
    }
    break
  }
  return count + 1
}

function deloadHighCount(history = []) {
  return normalizeHistory(history).filter(entry => entry?.phase === PHASES.DELOAD && isHighLoad(entry)).length
}

function isProtectedDeloadHigh(guarded, readiness, calendar, history) {
  return (
    guarded.phase === PHASES.DELOAD &&
    guarded.dayType === DAY_TYPES.HIGH_LOAD &&
    (calendar?.daysToNextCompetition ?? 999) > 10 &&
    isExcellentReadiness(readiness) &&
    deloadSegmentDayIndex(history, guarded.date) >= 3 &&
    deloadHighCount(history) < 1
  )
}

function recentHistoryBeforeDate(history = [], date, count) {
  return normalizeHistory(history)
    .filter(entry => entry?.date && entry.date < date)
    .slice(-count)
}

function consecutiveTrainingDays(history = []) {
  let count = 0
  for (const entry of normalizeHistory(history).reverse()) {
    if (isTrainingDay(entry)) count += 1
    else break
  }
  return count
}

function daysSinceLastRecovery(history = []) {
  let count = 0
  for (const entry of normalizeHistory(history).reverse()) {
    if (isRecoveryDay(entry)) return count
    count += 1
  }
  return count
}

function structuralRecoveryMinimum(phase) {
  return [PHASES.PRE_COMP, PHASES.DELOAD].includes(phase) ? 2 : 1
}

function previousDeloadHigh(history = [], date) {
  const previous = mostRecentEntryBeforeDate(history, date)
  if (!previous) return false
  return previous.phase === PHASES.DELOAD && isHighLoad(previous)
}

function isFullRestDay(entry) {
  return entry?.dayType === DAY_TYPES.REST
}

function isWeeklyRestCandidate(dayType) {
  return [
    DAY_TYPES.LOW_LOAD,
    DAY_TYPES.MEDIUM_LOAD,
    DAY_TYPES.HIGH_LOAD,
    DAY_TYPES.PRE_COMP_LIGHT,
  ].includes(dayType)
}

function weekEntries(history = [], date) {
  const start = startOfCalendarWeek(date)
  const end = endOfCalendarWeek(date)
  return normalizeHistory(history).filter(entry => entry?.date && entry.date >= start && entry.date <= end)
}

function weekContainsCompetition({ calendar = {}, history = [], date } = {}) {
  const start = startOfCalendarWeek(date)
  const end = endOfCalendarWeek(date)
  if (calendar.competitionToday) return true
  if (calendar.nextCompetition?._sd && calendar.nextCompetition._sd >= start && calendar.nextCompetition._sd <= end) return true
  if (calendar.lastCompetition?._ed && calendar.lastCompetition._ed >= start && calendar.lastCompetition._ed <= end) return true
  return weekEntries(history, date).some(entry => entry?.dayType === DAY_TYPES.COMPETITION)
}

function weekHasFullRest({ calendar = {}, history = [], date } = {}) {
  return weekEntries(history, date).some(isFullRestDay)
}

function consecutiveTrainingDaysInWeek(history = [], date) {
  const start = startOfCalendarWeek(date)
  const ordered = normalizeHistory(history).filter(entry => entry?.date && entry.date >= start && entry.date < date)
  let count = 0
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const entry = ordered[i]
    if (isTrainingDay(entry)) {
      count += 1
      continue
    }
    break
  }
  return count
}

export function applyGuards({ context, readiness, history = [], calendar = {}, mesocycle = {} } = {}) {
  let guarded = {
    ...context,
    warnings: [...(context?.warnings || [])],
    reasons: [...(context?.reasons || [])],
  }

  if (calendar.competitionsLast4Weeks >= 3) {
    guarded.warnings.push('Competitive density: 3 competitions in 4 weeks. Prioritize recovery and sharpness.')
  }

  const isFixedCalendarDay = guarded.dayType === DAY_TYPES.COMPETITION || guarded.dayType === DAY_TYPES.TRAVEL

  if (
    !isFixedCalendarDay &&
    isWeeklyRestCandidate(guarded.dayType) &&
    !weekHasFullRest({ calendar, history, date: guarded.date }) &&
    !weekContainsCompetition({ calendar, history, date: guarded.date }) &&
    calendar.daysToNextCompetition !== 1 &&
    calendar.daysToNextCompetition !== 2
  ) {
    const weekTrainingStreak = consecutiveTrainingDaysInWeek(history, guarded.date)
    if (weekTrainingStreak >= 5 || dayIndexInWeek(guarded.date) === 0) {
      guarded = overrideDay(
        guarded,
        DAY_TYPES.REST,
        'Guard: weekly rest rule requires one full rest day in the calendar week.'
      )
    }
  }

  if (!isFixedCalendarDay) {
    if (
      guarded.phase === PHASES.DELOAD &&
      previousDeloadHigh(history, guarded.date) &&
      !isRecoveryDay(guarded)
    ) {
      guarded = overrideDay(
        guarded,
        DAY_TYPES.RECOVERY,
        'Guard: deload needs recovery immediately after a high-load exposure.'
      )
    }

    const rollingWindow = [...recentHistoryBeforeDate(history, guarded.date, 6), guarded]
    const recoveryCount = rollingWindow.filter(isRecoveryDay).length
    const minRecovery = structuralRecoveryMinimum(guarded.phase)
    const recentTrainingStreak = consecutiveTrainingDays(history)
    const noRecoveryPressure = recoveryCount < 1 && recentTrainingStreak >= 3
    const phaseRecoveryPressure =
      minRecovery >= 2 &&
      recoveryCount < 2 &&
      daysSinceLastRecovery(history) >= 2 &&
      !isProtectedDeloadHigh(guarded, readiness, calendar, history)

    if (!isRecoveryDay(guarded) && (noRecoveryPressure || phaseRecoveryPressure)) {
      guarded = overrideDay(
        guarded,
        DAY_TYPES.RECOVERY,
        `Guard: rolling 7-day window requires ${minRecovery} recovery day${minRecovery === 1 ? '' : 's'}.`
      )
    }
  }

  if (!isFixedCalendarDay) {
    const maxConsecutiveTraining = guarded.phase === PHASES.PRE_COMP ? 4 : 5
    if (isTrainingDay(guarded) && consecutiveTrainingDays(history) >= maxConsecutiveTraining) {
      guarded = overrideDay(
        guarded,
        DAY_TYPES.RECOVERY,
        `Guard: max ${maxConsecutiveTraining} consecutive training days reached.`
      )
    }
  }

  if (mesocycle.weeksWithoutDeload >= 3) {
    guarded.phase = PHASES.DELOAD
    if (isHighLoad(guarded)) {
      guarded = overrideDay(guarded, DAY_TYPES.LOW_LOAD, 'Guard: 3 weeks without deload forces reduced load.')
    }
    guarded.warnings.push('3 weeks without deload: force deload week.')
  }

  if (readiness?.pain >= 7) {
    return overrideDay(guarded, DAY_TYPES.REST, 'Guard: high pain has absolute priority.', 'High pain: rest or recovery required.')
  }

  const highPainRest = mostRecentHighPainRest(history, guarded.date)
  const daysAfterHighPainRest = highPainRest ? daysBetween(highPainRest.date, guarded.date) : null

  if (!isFixedCalendarDay && daysAfterHighPainRest === 1) {
    if (![DAY_TYPES.RECOVERY, DAY_TYPES.LOW_LOAD, DAY_TYPES.REST, DAY_TYPES.POST_COMP_RECOVERY].includes(guarded.dayType)) {
      guarded = overrideDay(guarded, DAY_TYPES.LOW_LOAD, 'Guard: D+1 after high-pain rest is recovery or low load.')
    }
  } else if (!isFixedCalendarDay && daysAfterHighPainRest === 2) {
    if (isHighLoad(guarded)) {
      guarded = overrideDay(guarded, DAY_TYPES.MEDIUM_LOAD, 'Guard: D+2 after high-pain rest is medium load at most.')
    }
  } else if (
    !isFixedCalendarDay &&
    daysAfterHighPainRest !== null &&
    daysAfterHighPainRest > 2 &&
    [PHASES.DELOAD, PHASES.PRE_COMP].includes(guarded.phase) &&
    guarded.dayType === DAY_TYPES.HIGH_LOAD
  ) {
    guarded = overrideDay(guarded, guarded.phase === PHASES.DELOAD ? DAY_TYPES.LOW_LOAD : DAY_TYPES.MEDIUM_LOAD, 'Guard: high-pain rest absorbs the removed high load in this window.')
  }

  if (calendar.daysToNextCompetition === 1 || calendar.daysToNextCompetition === 2) {
    if (isHighLoad(guarded)) {
      guarded = overrideDay(guarded, DAY_TYPES.PRE_COMP_LIGHT, 'Guard: never high load on D-1 or D-2.')
    }
  }

  if (calendar.daysSinceLastCompetition === 1 && isHighLoad(guarded)) {
    guarded = overrideDay(guarded, DAY_TYPES.REST, 'Guard: never high load day after competition.')
  }

  if (calendar.daysSinceLastCompetition === 2 && isHighLoad(guarded)) {
    guarded = overrideDay(guarded, DAY_TYPES.POST_COMP_RECOVERY, 'Guard: D+2 cannot be high load.')
  }

  if (readiness?.fatigue >= 7 && isHighLoad(guarded)) {
    guarded = overrideDay(guarded, DAY_TYPES.RECOVERY, 'Guard: high fatigue blocks high load.', 'High fatigue: high load blocked.')
  }

  if (!canHighLoad(readiness) && isHighLoad(guarded)) {
    guarded = overrideDay(guarded, DAY_TYPES.LOW_LOAD, 'Guard: high load requires good or excellent readiness.')
  }

  const lastTwoHigh = recentHighLoadCount(history, 2)
  if (lastTwoHigh >= 2) {
    guarded = overrideDay(
      guarded,
      isExcellentReadiness(readiness) ? DAY_TYPES.LOW_LOAD : DAY_TYPES.RECOVERY,
      'Guard: after 2 high-load days, force low load or recovery.'
    )
  } else if (isHighLoad(guarded) && recentHighLoadCount(history, 1) >= 1) {
    guarded = overrideDay(guarded, DAY_TYPES.MEDIUM_LOAD, 'Guard: avoid 2 consecutive high-load days by default.')
  }

  if (isHighLoad(guarded) && recentHighLoadCount(history, 2) >= 2) {
    guarded = overrideDay(guarded, DAY_TYPES.RECOVERY, 'Guard: never 3 high-load days in a row.', 'Absolute guard: 3 high-load days in a row blocked.')
  }

  if (isHighLoad(guarded) && highLoadCount(history.slice(-6)) >= 4) {
    guarded = overrideDay(guarded, DAY_TYPES.LOW_LOAD, 'Guard: max 4 high-load days in any 7-day window.', 'High-load cap reached for the 7-day window.')
  }

  if (calendar.daysToNextCompetition != null && calendar.daysToNextCompetition < 7 && calendar.nextCompetition?.important === true && isHighLoad(guarded)) {
    guarded = overrideDay(guarded, DAY_TYPES.MEDIUM_LOAD, 'Guard: important competition under 7 days reduces destructive physical load.')
  }

  return guarded
}
