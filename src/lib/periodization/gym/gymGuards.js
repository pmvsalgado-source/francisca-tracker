import { defaultGymConfig } from './gymConfig.js'
import { toDateKey } from '../date.js'

function normalizeHistory(history = []) {
  return [...history]
    .filter(Boolean)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
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

function isInWeek(entry, date) {
  return entry?.date >= startOfWeek(date) && entry?.date <= endOfWeek(date)
}

function extractGymSession(entry) {
  if (!entry) return null
  if (entry.gymRecommendation) return entry.gymRecommendation
  if (entry.gymLoadLevel || entry.gymSessionType || entry.gymSessionAllowed != null) {
    return {
      sessionAllowed: entry.gymSessionAllowed,
      sessionType: entry.gymSessionType || entry.sessionType || null,
      gymLoadLevel: entry.gymLoadLevel || null,
    }
  }
  return null
}

function sessionType(entry) {
  return extractGymSession(entry)?.sessionType || null
}

function sessionAllowed(entry) {
  const gym = extractGymSession(entry)
  if (!gym) return false
  if (gym.sessionAllowed === false) return false
  return gym.sessionType != null
}

function isWeeklySession(entry) {
  return sessionAllowed(entry)
}

function isA(entry) {
  return sessionType(entry) === 'A'
}

function countSessions(history = [], date) {
  return normalizeHistory(history).filter(entry => entry?.date && isInWeek(entry, date) && isWeeklySession(entry)).length
}

function countASessions(history = [], date) {
  return normalizeHistory(history).filter(entry => entry?.date && isInWeek(entry, date) && isA(entry)).length
}

function lastASession(history = [], date) {
  return normalizeHistory(history)
    .filter(entry => entry?.date && entry.date < date && isA(entry))
    .reverse()[0] || null
}

function hoursBetween(from, to) {
  return (new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 3600000
}

function isPoorReadiness(input = {}) {
  return input.readinessLevel === 'POOR' || Number(input.painLevel || 0) >= 7
}

function hasLongTravel(input = {}) {
  if (input.dayType !== 'TRAVEL') return false
  if (input.travelInternational === true || input.international === true || input.is_international === true) return true
  const duration = Number(input.travelDurationHours ?? input.travelHours ?? input.durationHours ?? input.travelDuration ?? NaN)
  return Number.isFinite(duration) && duration > 4
}

export function evaluateGymGuards(input = {}, config = defaultGymConfig) {
  const warnings = [...(input.warnings || [])]
  const phaseWarnings = []
  const history = input.history || []
  const currentSessions = countSessions(history, input.date)
  const currentASessions = countASessions(history, input.date)
  const lastA = lastASession(history, input.date)
  const allowedTypes = new Set(['A', 'B', 'C'])
  let blocked = false
  let blockReason = ''

  const block = reason => {
    blocked = true
    blockReason = blockReason || reason
    return reason
  }

  if (input.dayType === 'COMPETITION') {
    block('Competition day: no gym session.')
  }

  if (input.daysSinceCompetition === 1) {
    block('D+1 after competition: no gym session.')
  }

  if (input.daysToCompetition != null && input.daysToCompetition <= 1) {
    block('D-1 or competition day: no gym session.')
  }

  if (input.dayType === 'REST') {
    block('REST day: no gym session.')
  }

  if (hasLongTravel(input)) {
    block('Long travel day: no gym session.')
  } else if (input.dayType === 'TRAVEL') {
    allowedTypes.delete('A')
    allowedTypes.delete('B')
  }

  if (isPoorReadiness(input)) {
    allowedTypes.delete('A')
    allowedTypes.delete('B')
    warnings.push('Poor readiness: limit gym to C only.')
  }

  if (input.phase === 'PRE_COMP') {
    allowedTypes.delete('A')
    if (currentSessions >= 2) block('PRE_COMP weekly cap reached.')
    phaseWarnings.push('Pre-comp: max 2 gym sessions per week, no A sessions.')
  }

  if (input.phase === 'MAINTENANCE_B2B') {
    allowedTypes.delete('A')
    if (currentSessions >= 2) block('Maintenance B2B weekly cap reached.')
    phaseWarnings.push('Maintenance B2B: max 2 gym sessions per week, B/C only.')
  }

  if (currentSessions >= config.maxSessionsPerWeek) {
    block('Weekly gym cap reached.')
  }

  if (currentASessions >= config.maxASessionsPerWeek) {
    allowedTypes.delete('A')
    warnings.push('Weekly A session cap reached.')
  }

  if (lastA && hoursBetween(lastA.date, input.date) < config.minHoursBetweenASessions) {
    allowedTypes.delete('A')
    warnings.push('A session spacing below 48 hours.')
  }

  if (input.daysToCompetition === 2) {
    allowedTypes.delete('A')
    allowedTypes.delete('B')
    warnings.push('D-2: only C or no gym.')
  }

  if (input.daysSinceCompetition === 1) {
    allowedTypes.clear()
  }

  return {
    blocked,
    blockReason,
    allowedTypes: [...allowedTypes],
    currentSessions,
    currentASessions,
    warnings: [...warnings, ...(blocked ? [] : phaseWarnings)],
    travelMode: input.dayType === 'TRAVEL' ? (hasLongTravel(input) ? 'long' : 'short') : null,
  }
}
