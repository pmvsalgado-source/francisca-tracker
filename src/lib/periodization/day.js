import { canHighLoad, isExcellentReadiness } from './readiness.js'
import { toDateKey } from './date.js'

export const DAY_TYPES = {
  COMPETITION: 'COMPETITION',
  TRAVEL: 'TRAVEL',
  REST: 'REST',
  POST_COMP_RECOVERY: 'POST_COMP_RECOVERY',
  RECOVERY: 'RECOVERY',
  LOW_LOAD: 'LOW_LOAD',
  MEDIUM_LOAD: 'MEDIUM_LOAD',
  HIGH_LOAD: 'HIGH_LOAD',
  PRE_COMP_LIGHT: 'PRE_COMP_LIGHT',
  ASSESSMENT: 'ASSESSMENT',
}

export const LOAD_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  RECOVERY: 'RECOVERY',
  REST: 'REST',
}

export const PHASES = {
  ACCUMULATION: 'ACCUMULATION',
  DEVELOPMENT: 'DEVELOPMENT',
  DELOAD: 'DELOAD',
  PRE_COMP: 'PRE_COMP',
  MAINTENANCE_B2B: 'MAINTENANCE_B2B',
}

export const MESOCYCLE_TYPES = {
  DEVELOPMENT_BLOCK: 'DEVELOPMENT_BLOCK',
  PRE_COMP: 'PRE_COMP',
  MAINTENANCE_B2B: 'MAINTENANCE_B2B',
  BASE: 'BASE',
}

export const DAY_TYPE_LABELS = {
  [DAY_TYPES.COMPETITION]: 'Competição',
  [DAY_TYPES.TRAVEL]: 'Viagem',
  [DAY_TYPES.REST]: 'Descanso',
  [DAY_TYPES.POST_COMP_RECOVERY]: 'Recuperação pós-competição',
  [DAY_TYPES.RECOVERY]: 'Recuperação',
  [DAY_TYPES.LOW_LOAD]: 'Carga baixa',
  [DAY_TYPES.MEDIUM_LOAD]: 'Carga média',
  [DAY_TYPES.HIGH_LOAD]: 'Carga alta',
  [DAY_TYPES.PRE_COMP_LIGHT]: 'Preparação leve',
  [DAY_TYPES.ASSESSMENT]: 'Avaliação',
}

export const LOAD_LABELS = {
  [LOAD_LEVELS.HIGH]: 'Alta',
  [LOAD_LEVELS.MEDIUM]: 'Média',
  [LOAD_LEVELS.LOW]: 'Baixa',
  [LOAD_LEVELS.RECOVERY]: 'Muito baixa',
  [LOAD_LEVELS.REST]: 'Zero',
}

export const PHASE_LABELS = {
  [PHASES.ACCUMULATION]: 'Acumulação',
  [PHASES.DEVELOPMENT]: 'Desenvolvimento',
  [PHASES.DELOAD]: 'Descarga',
  [PHASES.PRE_COMP]: 'Pré-competição',
  [PHASES.MAINTENANCE_B2B]: 'Manutenção entre competições',
}

export function loadLevelForDayType(dayType) {
  const map = {
    [DAY_TYPES.COMPETITION]: LOAD_LEVELS.HIGH,
    [DAY_TYPES.TRAVEL]: LOAD_LEVELS.LOW,
    [DAY_TYPES.REST]: LOAD_LEVELS.REST,
    [DAY_TYPES.POST_COMP_RECOVERY]: LOAD_LEVELS.RECOVERY,
    [DAY_TYPES.RECOVERY]: LOAD_LEVELS.RECOVERY,
    [DAY_TYPES.LOW_LOAD]: LOAD_LEVELS.LOW,
    [DAY_TYPES.MEDIUM_LOAD]: LOAD_LEVELS.MEDIUM,
    [DAY_TYPES.HIGH_LOAD]: LOAD_LEVELS.HIGH,
    [DAY_TYPES.PRE_COMP_LIGHT]: LOAD_LEVELS.LOW,
    [DAY_TYPES.ASSESSMENT]: LOAD_LEVELS.MEDIUM,
  }
  return map[dayType] || LOAD_LEVELS.MEDIUM
}

function isVeryLightCompetition(comp) {
  const rounds = Number(comp?.rounds || comp?.competition_rounds || comp?.days || 0)
  return comp?.very_light === true || comp?.light_competition === true || (rounds > 0 && rounds <= 1)
}

function chooseTrainingWindowDay({ mesocycle, readiness }) {
  if (mesocycle.phase === PHASES.DELOAD) return DAY_TYPES.LOW_LOAD
  if (mesocycle.phase === PHASES.MAINTENANCE_B2B) return DAY_TYPES.LOW_LOAD
  if (mesocycle.phase === PHASES.ACCUMULATION) return canHighLoad(readiness) ? DAY_TYPES.HIGH_LOAD : DAY_TYPES.MEDIUM_LOAD
  if (mesocycle.phase === PHASES.DEVELOPMENT) return canHighLoad(readiness) ? DAY_TYPES.HIGH_LOAD : DAY_TYPES.MEDIUM_LOAD
  return DAY_TYPES.MEDIUM_LOAD
}

function isUnavailableForAssessment(dayType) {
  return [DAY_TYPES.COMPETITION, DAY_TYPES.TRAVEL, DAY_TYPES.REST].includes(dayType)
}

function isWithinCurrentDevelopmentBlock(entry, calendar) {
  if (!entry?.date) return false
  const afterLastCompetition = !calendar?.lastCompetition?._ed || entry.date > calendar.lastCompetition._ed
  const beforeNextCompetition = !calendar?.nextCompetition?._sd || entry.date < calendar.nextCompetition._sd
  return afterLastCompetition && beforeNextCompetition
}

function hasAssessmentInCurrentBlock(history = [], calendar = {}) {
  return history.some(entry => entry?.dayType === DAY_TYPES.ASSESSMENT && isWithinCurrentDevelopmentBlock(entry, calendar))
}

function hasPreviousDayAssessment(history = [], date) {
  return history.some(entry => entry?.date && entry.date < date && entry.dayType === DAY_TYPES.ASSESSMENT)
}

function preferredAssessmentDayUnavailable(history = [], calendar = {}) {
  const preferredDate = calendar?.lastCompetition?._ed
    ? new Date(`${calendar.lastCompetition._ed}T12:00:00`)
    : null

  if (!preferredDate) return false
  preferredDate.setDate(preferredDate.getDate() + 4)
  const preferredDateStr = toDateKey(preferredDate)
  const preferredEntry = history.find(entry => entry?.date === preferredDateStr)

  if (preferredEntry) return isUnavailableForAssessment(preferredEntry.dayType)
  return calendar.preferredAssessmentUnavailable === true
}

export function getDayDecision({ date, mesocycle, week, readiness, calendar, history = [] } = {}) {
  const reasons = []
  let dayType = DAY_TYPES.MEDIUM_LOAD

  if (calendar?.competitionToday) {
    dayType = DAY_TYPES.COMPETITION
    reasons.push('Competition today.')
  } else if (calendar?.travelToday) {
    dayType = DAY_TYPES.TRAVEL
    reasons.push('Explicit travel event linked to an international competition.')
  } else if (calendar?.restToday) {
    dayType = DAY_TYPES.REST
    reasons.push('Explicit rest day.')
  } else if (calendar?.daysSinceLastCompetition === 1) {
    if (isVeryLightCompetition(calendar.lastCompetition) && isExcellentReadiness(readiness)) {
      dayType = DAY_TYPES.POST_COMP_RECOVERY
      reasons.push('D+1 after a light competition with excellent readiness.')
    } else {
      dayType = DAY_TYPES.REST
      reasons.push('Mandatory D+1 post-competition rest.')
    }
  } else if (calendar?.daysSinceLastCompetition === 2) {
    dayType = isExcellentReadiness(readiness) ? DAY_TYPES.RECOVERY : DAY_TYPES.POST_COMP_RECOVERY
    reasons.push('D+2 after competition, high load blocked.')
  } else if (calendar?.daysSinceLastCompetition === 3) {
    dayType = DAY_TYPES.LOW_LOAD
    reasons.push('D+3 after competition progression.')
  } else if (!canHighLoad(readiness) && (readiness?.readinessLevel === 'POOR' || readiness?.fatigue >= 7)) {
    dayType = readiness?.pain >= 7 ? DAY_TYPES.REST : DAY_TYPES.RECOVERY
    reasons.push('Readiness blocks high load.')
  } else if (calendar?.daysToNextCompetition === 1) {
    dayType = DAY_TYPES.PRE_COMP_LIGHT
    reasons.push('D-1 before competition.')
  } else if (calendar?.daysToNextCompetition === 2) {
    dayType = DAY_TYPES.PRE_COMP_LIGHT
    reasons.push('D-2 before competition.')
  } else if (calendar?.daysToNextCompetition === 3) {
    dayType = DAY_TYPES.MEDIUM_LOAD
    reasons.push('D-3: medium load only, no destructive load.')
  } else if (calendar?.daysToNextCompetition >= 4 && calendar?.daysToNextCompetition <= 7) {
    dayType = canHighLoad(readiness) && readiness?.fatigue <= 3 ? DAY_TYPES.MEDIUM_LOAD : DAY_TYPES.LOW_LOAD
    reasons.push('D-4 to D-7: protect quality and reduce destructive load.')
  } else if (calendar?.daysToNextCompetition >= 8 && calendar?.daysToNextCompetition <= 21) {
    dayType = canHighLoad(readiness) ? DAY_TYPES.HIGH_LOAD : DAY_TYPES.LOW_LOAD
    reasons.push('D-8 to D-21 is the main high-load window.')
  } else if (calendar?.daysToNextCompetition > 21 || calendar?.daysToNextCompetition == null) {
    dayType = chooseTrainingWindowDay({ mesocycle, week, readiness })
    reasons.push('Development window driven by mesocycle progression.')
  }

  const previousDayWasAssessment = hasPreviousDayAssessment(history.slice(-1), date)
  if (previousDayWasAssessment && dayType === DAY_TYPES.HIGH_LOAD) {
    dayType = DAY_TYPES.MEDIUM_LOAD
    reasons.push('Day after assessment is capped at medium load.')
  }

  if (
    mesocycle?.mesocycleType === MESOCYCLE_TYPES.DEVELOPMENT_BLOCK &&
    mesocycle?.mesocycleWeek === 1 &&
    (calendar?.daysToNextCompetition == null || calendar.daysToNextCompetition > 5) &&
    !hasAssessmentInCurrentBlock(history, calendar) &&
    !isUnavailableForAssessment(dayType)
  ) {
    if (calendar?.daysSinceLastCompetition === 4) {
      dayType = DAY_TYPES.ASSESSMENT
      reasons.push('Preferred D+4 assessment anchor at the start of a development block.')
    } else if (
      calendar?.daysSinceLastCompetition === 5 &&
      preferredAssessmentDayUnavailable(history, calendar)
    ) {
      dayType = DAY_TYPES.ASSESSMENT
      reasons.push('D+5 fallback assessment because D+4 was unavailable.')
    }
  }

  if (previousDayWasAssessment && dayType === DAY_TYPES.ASSESSMENT) {
    dayType = DAY_TYPES.MEDIUM_LOAD
    reasons.push('Consecutive assessment days are suppressed.')
  }

  return {
    date,
    dayType,
    loadLevel: loadLevelForDayType(dayType),
    reasons,
  }
}
