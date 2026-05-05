const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function numericInput(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? clamp(number, 0, 10) : fallback
}

export const READINESS_LEVELS = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  POOR: 'POOR',
}

export function normalizeReadiness(input = {}) {
  const pain = numericInput(input.pain, 0)
  const sleep = numericInput(input.sleep, 7)
  const energy = numericInput(input.energy, 7)
  const fatigue = numericInput(input.fatigue, 0)

  const readinessScore = Math.round(((sleep + energy + (10 - fatigue) + (10 - pain)) / 4) * 10) / 10

  let readinessLevel = READINESS_LEVELS.FAIR
  if (readinessScore < 4 || pain >= 7) readinessLevel = READINESS_LEVELS.POOR
  else if (readinessScore >= 8 && pain <= 2) readinessLevel = READINESS_LEVELS.EXCELLENT
  else if (readinessScore >= 6 && pain <= 4) readinessLevel = READINESS_LEVELS.GOOD

  return {
    pain,
    sleep,
    energy,
    fatigue,
    readinessScore,
    readinessLevel,
    allowsHighLoad: readinessLevel === READINESS_LEVELS.GOOD || readinessLevel === READINESS_LEVELS.EXCELLENT,
  }
}

export function isExcellentReadiness(readiness) {
  return readiness?.readinessLevel === READINESS_LEVELS.EXCELLENT
}

export function canHighLoad(readiness) {
  return readiness?.readinessLevel === READINESS_LEVELS.GOOD || readiness?.readinessLevel === READINESS_LEVELS.EXCELLENT
}
