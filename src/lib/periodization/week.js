import { DAY_TYPES, LOAD_LEVELS, MESOCYCLE_TYPES, PHASES, loadLevelForDayType } from './day.js'
import { isExcellentReadiness } from './readiness.js'
import { toDateKey } from './date.js'

function normalizeHistory(history = []) {
  return [...history]
    .filter(Boolean)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
}

export function getWeekLoadContext({ mesocycle } = {}) {
  const phase = mesocycle?.phase || PHASES.ACCUMULATION
  const mesocycleType = mesocycle?.mesocycleType || MESOCYCLE_TYPES.BASE

  const plans = {
    [PHASES.ACCUMULATION]: {
      highTarget: { min: 1, max: 2 },
      mediumTarget: 2,
      lowTarget: 2,
      recoveryOrRestTarget: 1,
      loadBias: LOAD_LEVELS.MEDIUM,
    },
    [PHASES.DEVELOPMENT]: {
      highTarget: { min: 2, max: 3 },
      mediumTarget: 2,
      lowTarget: 1,
      recoveryOrRestTarget: 1,
      loadBias: LOAD_LEVELS.HIGH,
    },
    [PHASES.DELOAD]: {
      highTarget: { min: 0, max: 1 },
      mediumTarget: 2,
      lowTarget: 2,
      recoveryOrRestTarget: 2,
      loadBias: LOAD_LEVELS.LOW,
    },
    [PHASES.PRE_COMP]: {
      highTarget: { min: 0, max: 1 },
      mediumTarget: 2,
      lowTarget: 3,
      recoveryOrRestTarget: 2,
      loadBias: LOAD_LEVELS.LOW,
    },
    [PHASES.MAINTENANCE_B2B]: {
      highTarget: { min: 0, max: 1 },
      mediumTarget: 1,
      lowTarget: 3,
      recoveryOrRestTarget: 3,
      loadBias: LOAD_LEVELS.RECOVERY,
    },
  }

  return {
    phase,
    mesocycleType,
    ...plans[phase],
  }
}

function startOfWeek(date) {
  const d = new Date(`${date}T12:00:00`)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return toDateKey(d)
}

function endOfWeek(date) {
  const d = new Date(`${startOfWeek(date)}T12:00:00`)
  d.setDate(d.getDate() + 6)
  return toDateKey(d)
}

function dayIndexInWeek(date) {
  const d = new Date(`${date}T12:00:00`)
  return d.getDay() === 0 ? 6 : d.getDay() - 1
}

function isInCurrentWeek(entry, date) {
  return entry?.date >= startOfWeek(date) && entry?.date <= endOfWeek(date)
}

function isHighLoad(entry) {
  return entry?.dayType === DAY_TYPES.HIGH_LOAD || entry?.loadLevel === LOAD_LEVELS.HIGH
}

function currentWeekHighLoadCount(history = [], date) {
  return history.filter(entry => isInCurrentWeek(entry, date)).filter(isHighLoad).length
}

function countHighLoadsInPhaseSegment(history = [], phase) {
  return normalizeHistory(history).filter(entry => entry?.phase === phase && isHighLoad(entry)).length
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

function previousDayHadHighPainRest(history = [], date) {
  const previous = [...history].reverse().find(entry => entry?.date && entry.date < date)
  if (!previous || previous.dayType !== DAY_TYPES.REST) return false
  return (previous.warnings || []).some(warning => String(warning).toLowerCase().includes('high pain'))
}

function withDayType(context, dayType, reason) {
  return {
    ...context,
    dayType,
    loadLevel: loadLevelForDayType(dayType),
    reasons: [...(context.reasons || []), reason],
  }
}

export function applyWeeklyLoadDistribution({ context, week, readiness, calendar, history = [] } = {}) {
  let next = { ...context }

  if (previousDayHadHighPainRest(history, next.date)) {
    if (![DAY_TYPES.RECOVERY, DAY_TYPES.LOW_LOAD, DAY_TYPES.REST, DAY_TYPES.POST_COMP_RECOVERY].includes(next.dayType)) {
      next = withDayType(next, DAY_TYPES.LOW_LOAD, 'Week rule: day after high-pain rest returns with low load.')
    }
  }

  if (week?.phase === PHASES.DELOAD && next.dayType === DAY_TYPES.HIGH_LOAD) {
    const segmentHighLoads = countHighLoadsInPhaseSegment(history, PHASES.DELOAD)
    const weekHighLoads = currentWeekHighLoadCount(history, next.date)
    const daysToCompetition = calendar?.daysToNextCompetition ?? 999
    const segmentDayIndex = deloadSegmentDayIndex(history, next.date)
    const isBeforeMidpoint = dayIndexInWeek(next.date) < 4
    const canUseSingleShortHigh =
      isExcellentReadiness(readiness) &&
      daysToCompetition > 10 &&
      segmentDayIndex >= 3 &&
      isBeforeMidpoint &&
      segmentHighLoads < 1 &&
      weekHighLoads < 1

    next = canUseSingleShortHigh
      ? withDayType(next, DAY_TYPES.HIGH_LOAD, 'Week rule: single early high-load exposure allowed in deload.')
      : withDayType(next, DAY_TYPES.LOW_LOAD, 'Week rule: deload blocks additional or late high load.')
  }

  if (week?.phase === PHASES.PRE_COMP) {
    if (calendar?.daysToNextCompetition === 5 || calendar?.daysToNextCompetition === 6) {
      next = withDayType(next, DAY_TYPES.LOW_LOAD, 'Week rule: pre-comp taper inserts low/recovery day in D-7 to D-3 window.')
    } else if (calendar?.daysToNextCompetition >= 3 && calendar?.daysToNextCompetition <= 7 && next.dayType === DAY_TYPES.HIGH_LOAD) {
      next = withDayType(next, DAY_TYPES.MEDIUM_LOAD, 'Week rule: D-7 to D-3 is medium load at most.')
    } else if (calendar?.daysToNextCompetition === 8 || calendar?.daysToNextCompetition === 9) {
      next = withDayType(next, DAY_TYPES.MEDIUM_LOAD, 'Week rule: pre-comp defaults to sharpening, not high-load development.')
    }
  }

  return next
}
