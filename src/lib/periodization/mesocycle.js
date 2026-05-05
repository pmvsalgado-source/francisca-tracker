import { MESOCYCLE_TYPES, PHASES } from './day.js'
import { toDateKey } from './date.js'

const COMP_KEYWORDS = [
  'competi',
  'torneio',
  ' cup',
  'championship',
  'stroke play',
  'stableford',
  'matchplay',
  'match play',
  'medal play',
  'pro-am',
  'proam',
  'open ',
  ' open',
  'nacional',
  'regional',
]

const VALID_PERIODIZATION_STATUSES = new Set([
  'confirmed',
  'played',
  'confirmado',
  'jogado',
  'concluido',
  'concluído',
])

export function toDateStr(raw) {
  return toDateKey(raw)
}

export function parseDate(raw) {
  const s = toDateStr(raw)
  return s ? new Date(`${s}T12:00:00`) : new Date(NaN)
}

export function daysDiff(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86400000)
}

export function eventStartDate(event) {
  return toDateStr(
    event?.start_date ||
      event?.event_date ||
      event?.event_start_date ||
      event?.date ||
      event?.start ||
      event?.startTime ||
      null
  )
}

export function eventEndDate(event) {
  const startKey = eventStartDate(event)
  const endKey = toDateStr(
    event?.end_date ||
      event?.event_end_date ||
      event?.endDate ||
      event?.end ||
      event?.endTime ||
      null
  )
  if (!startKey) return resolved
  if (endKey && endKey >= startKey) return endKey
  const durationCandidate = Array.isArray(event?.rounds)
    ? event.rounds.length
    : Number(event?.rounds || event?.competition_rounds || event?.days || event?.duration_days || event?.competition_duration || 1)
  const durationDays = Number.isFinite(durationCandidate) && durationCandidate > 0 ? Math.floor(durationCandidate) : 1
  if (durationDays <= 1) return startKey
  const start = parseDate(startKey)
  start.setDate(start.getDate() + durationDays - 1)
  return toDateStr(start) || startKey
}

export function isCompetition(event) {
  if (event?._periodizationAnchor) return true
  const text = `${event?.category || ''} ${event?.title || ''}`.toLowerCase()
  if (/competi/i.test(text) || /torneio/i.test(text)) return true
  return COMP_KEYWORDS.some(keyword => text.includes(keyword))
}

export function isPeriodizationCompetition(event) {
  if (!isCompetition(event) || !event?.status) return false
  return VALID_PERIODIZATION_STATUSES.has(String(event.status).trim().toLowerCase())
}

export function normalizeCompetition(event) {
  const start = eventStartDate(event)
  if (!start) return null
  const end = eventEndDate(event)
  return { ...event, _sd: start, _ed: end >= start ? end : start }
}

export function getValidCompetitions(events = []) {
  return events
    .filter(isPeriodizationCompetition)
    .map(normalizeCompetition)
    .filter(Boolean)
    .sort((a, b) => a._sd.localeCompare(b._sd))
}

function weeksSinceAnchor(date, lastCompetition) {
  if (!lastCompetition) return 1
  return Math.max(1, Math.floor(daysDiff(lastCompetition._ed, date) / 7) + 1)
}

function phaseForDevelopmentWeek(week) {
  if (week === 1) return PHASES.ACCUMULATION
  if (week === 2) return PHASES.DEVELOPMENT
  return PHASES.DELOAD
}

function phaseForTwoWeekBlock(week) {
  return week === 1 ? PHASES.DEVELOPMENT : PHASES.DELOAD
}

function countCompetitionsInWindow(competitions, date, daysBack = 28) {
  const end = parseDate(date)
  const start = new Date(end)
  start.setDate(start.getDate() - daysBack)
  return competitions.filter(comp => {
    const compStart = parseDate(comp._sd)
    return compStart >= start && compStart <= end
  }).length
}

export function getMesocycleContext({ date, events = [] } = {}) {
  const dateStr = toDateStr(date) || toDateStr(new Date())
  const competitions = getValidCompetitions(events)
  const competitionToday = competitions.find(comp => dateStr >= comp._sd && dateStr <= comp._ed) || null
  const nextCompetition = competitions.find(comp => comp._sd > dateStr || (dateStr >= comp._sd && dateStr <= comp._ed)) || null
  const lastCompetition = [...competitions].reverse().find(comp => comp._ed < dateStr) || null

  const daysToNextCompetition = nextCompetition
    ? Math.max(0, daysDiff(dateStr, nextCompetition._sd))
    : null
  const daysSinceLastCompetition = lastCompetition
    ? Math.max(0, daysDiff(lastCompetition._ed, dateStr))
    : null

  const safePrev = daysSinceLastCompetition ?? 999
  const safeNext = daysToNextCompetition ?? 999
  const competitionGap = safePrev + safeNext
  const hasBackToBack = daysSinceLastCompetition !== null && daysSinceLastCompetition <= 7 && daysToNextCompetition !== null && daysToNextCompetition <= 7
  const competitionsLast4Weeks = countCompetitionsInWindow(competitions, dateStr, 28)

  let mesocycleType = MESOCYCLE_TYPES.BASE
  let mesocycleWeek = 1
  let phase = PHASES.ACCUMULATION

  if (competitionToday) {
    mesocycleType = MESOCYCLE_TYPES.PRE_COMP
    phase = PHASES.PRE_COMP
  } else if (hasBackToBack) {
    mesocycleType = MESOCYCLE_TYPES.MAINTENANCE_B2B
    phase = PHASES.MAINTENANCE_B2B
  } else if (competitionGap < 10 || (daysToNextCompetition !== null && daysToNextCompetition < 10)) {
    mesocycleType = MESOCYCLE_TYPES.PRE_COMP
    phase = PHASES.PRE_COMP
  } else if (competitionGap >= 14 && competitionGap <= 21) {
    mesocycleType = MESOCYCLE_TYPES.DEVELOPMENT_BLOCK
    mesocycleWeek = Math.min(2, Math.max(1, weeksSinceAnchor(dateStr, lastCompetition)))
    phase = phaseForTwoWeekBlock(mesocycleWeek)
  } else if (competitionGap > 21 || daysToNextCompetition === null) {
    mesocycleType = MESOCYCLE_TYPES.DEVELOPMENT_BLOCK
    mesocycleWeek = ((weeksSinceAnchor(dateStr, lastCompetition) - 1) % 3) + 1
    phase = phaseForDevelopmentWeek(mesocycleWeek)
  }

  return {
    date: dateStr,
    mesocycleType,
    mesocycleWeek,
    phase,
    competitionGap,
    daysToNextCompetition,
    daysSinceLastCompetition,
    nextCompetition,
    lastCompetition,
    competitionToday,
    competitions,
    competitionsLast4Weeks,
    hasBackToBack,
  }
}
