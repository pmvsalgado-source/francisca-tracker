import { toDateKey } from '../date.js'

const LOAD_ORDER = {
  OFF: 0,
  BAIXA: 1,
  MÉDIA: 2,
  ALTA: 3,
}

function weekStartKey(date) {
  const d = new Date(`${date}T12:00:00`)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return toDateKey(d)
}

function loadLabelFromGym(gym = {}) {
  if (!gym.sessionAllowed || !gym.sessionType) return 'OFF'
  const key = String(gym.sessionType).toUpperCase()
  if (key === 'POWER' || key === 'A' || key === 'STRENGTH') return 'ALTA'
  if (key === 'B' || key === 'ACTIVATION') return 'MÉDIA'
  if (key === 'C' || key === 'MOBILITY') return 'BAIXA'
  return 'OFF'
}

function sessionTypeFromLoadLabel(label) {
  if (label === 'ALTA') return 'A'
  if (label === 'MÉDIA') return 'B'
  if (label === 'BAIXA') return 'C'
  return null
}

function isLowReadiness(day = {}) {
  const readiness = day.readiness || {}
  const pain = Number(readiness.painLevel ?? readiness.pain ?? 0)
  const fatigue = Number(readiness.fatigue ?? 0)
  return readiness.readinessLevel === 'POOR' || pain >= 7 || fatigue >= 7
}

function isCompetitionProtected(day = {}) {
  return (
    day.dayType === 'COMPETITION' ||
    day.daysToNextCompetition === 0 ||
    day.daysToNextCompetition === 1 ||
    day.daysToNextCompetition === 2 ||
    day.daysSinceLastCompetition === 1
  )
}

function isPostCompetitionMultiDay(day = {}, previousCompetitionBlockLength = 0) {
  return previousCompetitionBlockLength > 1 && day.daysSinceLastCompetition >= 2 && day.daysSinceLastCompetition <= 3
}

function maxAllowedByDistance(day = {}, previousCompetitionBlockLength = 0) {
  if (isCompetitionProtected(day)) return 'OFF'
  if (previousCompetitionBlockLength > 1 && day.daysSinceLastCompetition === 2) return 'BAIXA'
  if (previousCompetitionBlockLength > 1 && day.daysSinceLastCompetition === 3) return 'MÉDIA'

  const distance = day.daysToNextCompetition
  if (distance == null) return 'ALTA'
  if (distance >= 6) return 'ALTA'
  if (distance === 5) return 'MÉDIA'
  if (distance >= 3) return 'BAIXA'
  return 'OFF'
}

function canPromote(day = {}) {
  return !isCompetitionProtected(day) && !isLowReadiness(day)
}

function clampLoadLabel(current, maxAllowed) {
  return LOAD_ORDER[maxAllowed] < LOAD_ORDER[current] ? maxAllowed : current
}

function getProtectionReason(day = {}, previousCompetitionBlockLength = 0) {
  if (day.dayType === 'COMPETITION') return 'Competição: gym OFF.'
  if (previousCompetitionBlockLength > 1) {
    if (day.daysSinceLastCompetition === 1) return 'Pós-competição multi-dia: D+1 OFF.'
    if (day.daysSinceLastCompetition === 2) return 'Pós-competição multi-dia: D+2 OFF/BAIXA.'
    if (day.daysSinceLastCompetition === 3) return 'Pós-competição multi-dia: D+3 máximo MÉDIA.'
  }
  return 'Proteção competitiva: gym OFF.'
}

function buildCompetitionBlockIndex(days = []) {
  const sorted = days
    .map((day, index) => ({ day, index }))
    .sort((a, b) => String(a.day.date).localeCompare(String(b.day.date)))

  const blocks = []
  let start = null

  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i]
    const isCompetition = current.day.dayType === 'COMPETITION'

    if (isCompetition && start == null) {
      start = i
    }

    const next = sorted[i + 1]
    const endOfBlock = start != null && (!next || next.day.dayType !== 'COMPETITION')
    if (endOfBlock) {
      const blockDays = sorted.slice(start, i + 1)
      blocks.push({
        startDate: blockDays[0].day.date,
        endDate: blockDays[blockDays.length - 1].day.date,
        length: blockDays.length,
      })
      start = null
    }
  }

  const blockByDate = new Map()
  blocks.forEach(block => {
    const blockDays = days
      .filter(day => day.dayType === 'COMPETITION' && day.date >= block.startDate && day.date <= block.endDate)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))

    blockDays.forEach((day, index) => {
      blockByDate.set(day.date, {
        ...block,
        offset: index,
        isStart: index === 0,
        isEnd: index === blockDays.length - 1,
      })
    })
  })

  const previousCompetitionBlockLengthByDate = new Map()
  let lastCompetitionBlockLength = 0
  sorted.forEach(({ day }) => {
    previousCompetitionBlockLengthByDate.set(day.date, lastCompetitionBlockLength)
    const block = blockByDate.get(day.date)
    if (block?.isEnd) {
      lastCompetitionBlockLength = block.length
    }
  })

  return { blocks, blockByDate, previousCompetitionBlockLengthByDate }
}

function sortByDate(days = []) {
  return [...days].sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

function setSuggested(row, nextLabel, reason) {
  if (!nextLabel || LOAD_ORDER[nextLabel] <= LOAD_ORDER[row.suggestedLoadLabel]) return false
  row.suggestedLoadLabel = nextLabel
  row.suggestedSessionType = sessionTypeFromLoadLabel(nextLabel)
  if (reason) row.reasons.push(reason)
  return true
}

function applyWeekQuota(weekRows) {
  const sorted = [...weekRows].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const currentCounts = sorted.reduce(
    (acc, row) => {
      acc[row.suggestedLoadLabel] = (acc[row.suggestedLoadLabel] || 0) + 1
      return acc
    },
    { OFF: 0, BAIXA: 0, MÉDIA: 0, ALTA: 0 }
  )

  const highCandidates = sorted
    .filter(row => canPromote(row.day) && row.distanceCap === 'ALTA')
    .sort((a, b) => {
      const distanceA = a.day.daysToNextCompetition == null ? 99 : a.day.daysToNextCompetition
      const distanceB = b.day.daysToNextCompetition == null ? 99 : b.day.daysToNextCompetition
      if (distanceA !== distanceB) return distanceB - distanceA
      return LOAD_ORDER[b.suggestedLoadLabel] - LOAD_ORDER[a.suggestedLoadLabel]
    })

  if (currentCounts.ALTA < 1) {
    const candidate = highCandidates.find(row => LOAD_ORDER[row.suggestedLoadLabel] < LOAD_ORDER.ALTA)
    if (candidate) {
      setSuggested(candidate, 'ALTA', 'Objetivo distância: garantir 1 sessão ALTA na semana.')
      currentCounts.ALTA += 1
    }
  }

  const mediumCandidates = sorted
    .filter(row => canPromote(row.day) && (row.distanceCap === 'ALTA' || row.distanceCap === 'MÉDIA'))
    .sort((a, b) => {
      const distanceA = a.day.daysToNextCompetition == null ? 99 : a.day.daysToNextCompetition
      const distanceB = b.day.daysToNextCompetition == null ? 99 : b.day.daysToNextCompetition
      if (distanceA !== distanceB) return distanceA - distanceB
      return LOAD_ORDER[a.suggestedLoadLabel] - LOAD_ORDER[b.suggestedLoadLabel]
    })

  if (currentCounts.ALTA < 1 || currentCounts.MÉDIA < 1) {
    const candidate = mediumCandidates.find(row => LOAD_ORDER[row.suggestedLoadLabel] < LOAD_ORDER.MÉDIA)
    if (candidate) {
      setSuggested(candidate, 'MÉDIA', 'Objetivo distância: garantir estímulo médio na semana.')
      currentCounts.MÉDIA += 1
    }
  }

  if (currentCounts.MÉDIA > 2) {
    const extras = sorted
      .filter(row => row.suggestedLoadLabel === 'MÉDIA')
      .sort((a, b) => LOAD_ORDER[a.actualLoadLabel] - LOAD_ORDER[b.actualLoadLabel])
      .slice(2)
    extras.forEach(row => {
      row.suggestedLoadLabel = row.distanceCap === 'OFF' ? 'OFF' : 'BAIXA'
      row.suggestedSessionType = sessionTypeFromLoadLabel(row.suggestedLoadLabel)
      row.reasons.push('Limite semanal: reduzir excesso de MÉDIA.')
    })
  }
}

function enforcePostHighRecovery(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    if (row.suggestedLoadLabel !== 'ALTA') continue
    const next = rows[i + 1]
    if (!next) continue
    if (next.suggestedLoadLabel === 'ALTA' || next.suggestedLoadLabel === 'MÉDIA') {
      const fallback = next.distanceCap === 'OFF' ? 'OFF' : 'BAIXA'
      next.suggestedLoadLabel = fallback
      next.suggestedSessionType = sessionTypeFromLoadLabel(fallback)
      next.reasons.push('Depois de ALTA: dia seguinte deve ser BAIXA ou OFF.')
    }
  }
}

function enforceLowStreak(rows) {
  let streak = []

  const canRaiseFurther = weekRows => {
    const counts = weekRows.reduce(
      (acc, row) => {
        acc[row.suggestedLoadLabel] = (acc[row.suggestedLoadLabel] || 0) + 1
        return acc
      },
      { OFF: 0, BAIXA: 0, MÉDIA: 0, ALTA: 0 }
    )
    return counts.ALTA < 1 || counts.MÉDIA < 1
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    if (isCompetitionProtected(row.day) || LOAD_ORDER[row.suggestedLoadLabel] >= LOAD_ORDER.MÉDIA) {
      streak = []
      continue
    }

    streak.push(row)

    if (streak.length <= 4) continue

    const weekKey = weekStartKey(row.date)
    const weekRows = rows.filter(item => weekStartKey(item.date) === weekKey)
    if (!canRaiseFurther(weekRows)) {
      streak = []
      continue
    }

    const candidate = [...streak]
      .reverse()
      .find(item => canPromote(item.day) && item.distanceCap !== 'BAIXA' && LOAD_ORDER[item.suggestedLoadLabel] < LOAD_ORDER.MÉDIA)
    if (candidate) {
      setSuggested(candidate, 'MÉDIA', 'Anti-regressão: evitar mais de 4 dias seguidos sem estímulo >= MÉDIA.')
      streak = []
    }
  }
}

export function simulateGymDistanceMode(days = []) {
  const sortedDays = sortByDate(days)
  const { blockByDate, previousCompetitionBlockLengthByDate } = buildCompetitionBlockIndex(sortedDays)

  const rows = sortedDays.map(day => {
    const block = blockByDate.get(day.date) || null
    const previousCompetitionBlockLength = previousCompetitionBlockLengthByDate.get(day.date) || 0

    const actualLoadLabel = loadLabelFromGym(day.gymRecommendation)
    const actualSessionType = day.gymRecommendation?.sessionAllowed ? (day.gymRecommendation?.sessionType || null) : null
    const distanceCap = maxAllowedByDistance(day, previousCompetitionBlockLength)
    const baseSuggestedLoadLabel = clampLoadLabel(actualLoadLabel, distanceCap)

    const row = {
      day,
      date: day.date,
      actualLoadLabel,
      actualSessionType,
      suggestedLoadLabel: baseSuggestedLoadLabel,
      suggestedSessionType: sessionTypeFromLoadLabel(baseSuggestedLoadLabel),
      distanceCap,
      reasons: [],
    }

    if (isCompetitionProtected(day)) {
      row.suggestedLoadLabel = 'OFF'
      row.suggestedSessionType = null
      row.reasons.push(getProtectionReason(day, previousCompetitionBlockLength))
      return row
    }

    if (isPostCompetitionMultiDay(day, previousCompetitionBlockLength)) {
      row.suggestedLoadLabel = clampLoadLabel(row.suggestedLoadLabel, 'BAIXA')
      row.suggestedSessionType = sessionTypeFromLoadLabel(row.suggestedLoadLabel)
      row.reasons.push(getProtectionReason(day, previousCompetitionBlockLength))
    }

    if (isLowReadiness(day)) {
      row.suggestedLoadLabel = 'OFF'
      row.suggestedSessionType = null
      row.reasons.push('Readiness/dor baixa: não promover carga.')
      return row
    }

    if (distanceCap === 'ALTA') {
      row.reasons.push('Janela livre >= 6 dias: ALTA é possível.')
    } else if (distanceCap === 'MÉDIA') {
      row.reasons.push('D-5: manter no máximo MÉDIA.')
    } else if (distanceCap === 'BAIXA') {
      row.reasons.push('Janela curta: manter BAIXA.')
    } else {
      row.reasons.push('Proteção competitiva: manter OFF.')
    }

    return row
  })

  const weekGroups = new Map()
  rows.forEach(row => {
    const key = weekStartKey(row.date)
    if (!weekGroups.has(key)) weekGroups.set(key, [])
    weekGroups.get(key).push(row)
  })

  weekGroups.forEach(applyWeekQuota)

  enforcePostHighRecovery(rows)
  enforceLowStreak(rows)

  return {
    daysAnalyzed: rows.length,
    rows,
    summary: {
      daysAnalyzed: rows.length,
      totalChanged: rows.filter(row => row.actualLoadLabel !== row.suggestedLoadLabel).length,
      mediumDays: rows.filter(row => row.suggestedLoadLabel === 'MÉDIA').length,
      highDays: rows.filter(row => row.suggestedLoadLabel === 'ALTA').length,
      protectedDays: rows.filter(row => isCompetitionProtected(row.day)).length,
      offDays: rows.filter(row => row.suggestedLoadLabel === 'OFF').length,
    },
  }
}
