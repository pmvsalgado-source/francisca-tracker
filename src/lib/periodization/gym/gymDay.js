import { defaultGymConfig } from './gymConfig.js'
import { getGymPhase } from './gymMesocycle.js'
import { evaluateGymGuards } from './gymGuards.js'
import { toDateKey } from '../date.js'

function typeToLoadLevel(sessionType) {
  if (sessionType === 'A') return 'HIGH'
  if (sessionType === 'B') return 'MEDIUM'
  if (sessionType === 'C') return 'LOW'
  return 'NONE'
}

function focusFor(sessionType) {
  const map = {
    A: ['strength', 'power'],
    B: ['speed', 'activation'],
    C: ['mobility', 'core', 'prevention'],
  }
  return map[sessionType] || []
}

function weekStartKey(date) {
  const d = new Date(`${date}T12:00:00`)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return toDateKey(d)
}

function normalizeHistory(history = []) {
  return [...history]
    .filter(Boolean)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
}

function sessionTypeFromEntry(entry) {
  const gym = entry?.gymRecommendation || {}
  if (gym.sessionAllowed === false) return null
  return gym.sessionType || entry?.gymSessionType || entry?.sessionType || null
}

function weekSessionCounts(history = [], date) {
  const start = weekStartKey(date)
  const endDate = new Date(`${start}T12:00:00`)
  endDate.setDate(endDate.getDate() + 6)
  const end = toDateKey(endDate)
  const entries = normalizeHistory(history).filter(entry => entry?.date && entry.date >= start && entry.date <= end)
  return {
    A: entries.filter(entry => sessionTypeFromEntry(entry) === 'A').length,
    B: entries.filter(entry => sessionTypeFromEntry(entry) === 'B').length,
    C: entries.filter(entry => sessionTypeFromEntry(entry) === 'C').length,
  }
}

function lastGymSessionType(history = [], date) {
  return normalizeHistory(history)
    .filter(entry => entry?.date && entry.date < date)
    .reverse()
    .map(sessionTypeFromEntry)
    .find(Boolean) || null
}

function maxLabelRank(label) {
  return { NONE: 0, OFF: 0, BAIXA: 1, MEDIUM: 2, HIGH: 3, ALTA: 3 }[label] ?? 0
}

function minLabel(a, b) {
  return maxLabelRank(a) < maxLabelRank(b) ? a : b
}

function distanceCap(input = {}) {
  const dTo = input.daysToCompetition
  const dSince = input.daysSinceCompetition

  if (input.dayType === 'COMPETITION') return 'OFF'
  if (dTo != null && dTo <= 1) return 'OFF'
  if (dSince === 1) return 'OFF'
  if (dSince === 2) return 'BAIXA'
  if (dSince === 3) return 'MEDIUM'
  if (dTo === 2) return 'OFF'
  if (dTo === 3 || dTo === 4) return 'BAIXA'
  if (dTo === 5) return 'MEDIUM'
  return 'ALTA'
}

function buildBlockedRecommendation({ gymPhase, warnings, blockReason }) {
  return {
    gymPhase,
    sessionAllowed: false,
    sessionType: null,
    gymLoadLevel: 'NONE',
    gymFocus: [],
    reasonForGymCoach: blockReason || 'Gym blocked by hard guard.',
    warnings: [...warnings],
  }
}

function chooseSessionType(input, guard) {
  const allowed = new Set(guard.allowedTypes)
  const has = type => allowed.has(type)
  const history = input.history || []
  const weekCounts = weekSessionCounts(history, input.date)
  const prevSessionType = lastGymSessionType(history, input.date)
  const cap = distanceCap(input)

  if (input.dayType === 'TRAVEL') {
    return has('C') ? 'C' : null
  }
  if (input.dayType === 'RECOVERY' || input.dayType === 'POST_COMP_RECOVERY') {
    return has('C') ? 'C' : null
  }
  if (input.dayType === 'PRE_COMP_LIGHT') {
    return has('C') ? 'C' : null
  }
  if (input.dayType === 'ASSESSMENT') {
    if (has('B')) return 'B'
    return has('C') ? 'C' : null
  }

  if (prevSessionType === 'A') {
    return has('C') ? 'C' : null
  }

  let maxAllowed = cap
  if (input.phase === 'DELOAD') {
    maxAllowed = minLabel(maxAllowed, 'MEDIUM')
  }
  if (input.phase === 'PRE_COMP' || input.phase === 'MAINTENANCE_B2B') {
    maxAllowed = minLabel(maxAllowed, 'MEDIUM')
  }
  if (input.readinessLevel === 'POOR' || Number(input.painLevel || 0) >= 7) {
    maxAllowed = minLabel(maxAllowed, 'BAIXA')
  }
  if (weekCounts.A >= 1) {
    maxAllowed = minLabel(maxAllowed, 'MEDIUM')
  }
  if (weekCounts.B >= 2) {
    maxAllowed = minLabel(maxAllowed, 'BAIXA')
  }

  if (maxLabelRank(maxAllowed) <= 0) {
    return has('C') && input.dayType !== 'COMPETITION' ? 'C' : null
  }

  const canUseA =
    has('A') &&
    weekCounts.A < 1 &&
    maxLabelRank(maxAllowed) >= 3 &&
    input.readinessLevel !== 'POOR' &&
    Number(input.painLevel || 0) < 5 &&
    Number(input.daysToCompetition ?? 999) >= 6

  const canUseB =
    has('B') &&
    weekCounts.B < 2 &&
    maxLabelRank(maxAllowed) >= 2 &&
    Number(input.daysToCompetition ?? 999) >= 3

  const canUseC = has('C') && maxLabelRank(maxAllowed) >= 1

  if (canUseA) return 'A'
  if (canUseB) return 'B'
  if (canUseC) return 'C'
  return null
}

export function getGymRecommendation(input = {}, config = defaultGymConfig) {
  const gymPhase = getGymPhase(input.phase, input.dayType)
  const guard = evaluateGymGuards(input, config)
  const warnings = [...new Set([...(input.warnings || []), ...(guard.warnings || [])])]

  if (guard.blocked || guard.allowedTypes.length === 0) {
    return buildBlockedRecommendation({ gymPhase, warnings, blockReason: guard.blockReason })
  }

  const sessionType = chooseSessionType(input, guard)

  if (!sessionType) {
    return {
      gymPhase,
      sessionAllowed: false,
      sessionType: null,
      gymLoadLevel: 'NONE',
      gymFocus: [],
      reasonForGymCoach: `Gym optional but skipped today. Phase: ${gymPhase}.`,
      warnings,
    }
  }

  const gymLoadLevel = typeToLoadLevel(sessionType)
  const reasonParts = [
    `Gym phase: ${gymPhase}.`,
    `Day type: ${input.dayType}.`,
    `Selected ${sessionType} session because current load is ${input.loadLevel} and days to competition are ${input.daysToCompetition ?? 'unknown'}.`,
  ]

  if (guard.travelMode) {
    reasonParts.push(guard.travelMode === 'long' ? 'Long travel would have blocked gym.' : 'Travel day stays C-only.')
  }

  if (input.phase === 'PRE_COMP') {
    reasonParts.push('Pre-comp keeps gym short and non-destructive.')
  }

  if (input.phase === 'MAINTENANCE_B2B') {
    reasonParts.push('Back-to-back competition window keeps gym minimal.')
  }

  if (input.daysSinceCompetition === 2) {
    reasonParts.push('D+2 keeps gym at BAIXA or OFF.')
  }

  if (input.daysSinceCompetition === 3) {
    reasonParts.push('D+3 allows at most MÉDIA.')
  }

  if (input.daysToCompetition === 5) {
    reasonParts.push('D-5 allows at most MÉDIA.')
  }

  return {
    gymPhase,
    sessionAllowed: true,
    sessionType,
    gymLoadLevel,
    gymFocus: focusFor(sessionType),
    reasonForGymCoach: reasonParts.join(' '),
    warnings,
  }
}
