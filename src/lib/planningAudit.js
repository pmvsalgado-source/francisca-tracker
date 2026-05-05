import { DAY_TYPES, LOAD_LEVELS } from './periodization/day.js'
import { getPublicGolfState as getViewModelPublicGolfState } from './periodizationViewModel.js'

const SEVERITY_ORDER = {
  OK: 0,
  WARN: 1,
  CRITICAL: 2,
}

function sortDays(days = []) {
  return [...days].filter(Boolean).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
}

export function isCompetitionDay(day) {
  return day?.dayType === DAY_TYPES.COMPETITION
}

export function isCompetitionStressDay(day) {
  return isCompetitionDay(day)
}

export function isGolfHigh(day) {
  return !isCompetitionDay(day) && (day?.dayType === DAY_TYPES.HIGH_LOAD || day?.loadLevel === LOAD_LEVELS.HIGH)
}

export function isGymHigh(day) {
  const gym = day?.gymRecommendation || {}
  return gym.sessionType === 'A' || gym.gymLoadLevel === LOAD_LEVELS.HIGH
}

export function isRecoveryLike(day) {
  const gym = day?.gymRecommendation || {}
  return [
    DAY_TYPES.REST,
    DAY_TYPES.RECOVERY,
    DAY_TYPES.POST_COMP_RECOVERY,
    DAY_TYPES.LOW_LOAD,
    DAY_TYPES.PRE_COMP_LIGHT,
  ].includes(day?.dayType) ||
    [LOAD_LEVELS.RECOVERY, LOAD_LEVELS.REST, LOAD_LEVELS.LOW].includes(day?.loadLevel) ||
    gym.sessionAllowed === false ||
    gym.sessionType === 'C'
}

export function getCompetitionOffset(day) {
  if (!day) return null
  if (isCompetitionDay(day)) return 0
  if (day.daysToNextCompetition != null) return -Number(day.daysToNextCompetition)
  if (day.daysSinceLastCompetition != null) return Number(day.daysSinceLastCompetition)
  return null
}

export function getPublicGolfState(day) {
  return getViewModelPublicGolfState(day)
}

export function classifyFindingSeverity({
  baseSeverity = 'OK',
  strongBlockLength = 0,
  competitionInvolved = false,
  distanceToCompetition = null,
  distanceFromCompetition = null,
  gymSessionType = null,
  recoveryCount = null,
} = {}) {
  let severity = baseSeverity

  if (strongBlockLength >= 3) severity = 'CRITICAL'
  else if (strongBlockLength === 2 && severity === 'OK') severity = 'WARN'

  if (competitionInvolved && severity === 'WARN') severity = 'CRITICAL'

  if (distanceToCompetition != null && distanceToCompetition <= 4 && gymSessionType === 'A') {
    severity = 'CRITICAL'
  }

  if (distanceToCompetition === 5 && gymSessionType === 'A' && severity === 'OK') {
    severity = 'WARN'
  }

  if (distanceFromCompetition === 1 && gymSessionType === 'A') {
    severity = 'CRITICAL'
  }

  if (distanceFromCompetition === 1 && gymSessionType === 'B' && severity === 'OK') {
    severity = 'WARN'
  }

  if (recoveryCount != null) {
    severity = recoveryCount === 0 ? 'CRITICAL' : 'WARN'
  }

  return severity
}

function competitionBlocks(days) {
  const blocks = []
  let current = null

  sortDays(days).forEach(day => {
    if (!isCompetitionDay(day)) {
      if (current) blocks.push(current)
      current = null
      return
    }

    if (!current) {
      current = { startIndex: day.index, endIndex: day.index }
      return
    }

    if (day.index === current.endIndex + 1) {
      current.endIndex = day.index
      return
    }

    blocks.push(current)
    current = { startIndex: day.index, endIndex: day.index }
  })

  if (current) blocks.push(current)
  return blocks
}

function makeFinding({ date, severity, category, title, explanation, recommendation, rawDay }) {
  return { date, severity, category, title, explanation, recommendation, rawDay }
}

function strongestRunSeverity(run, includesCompetition) {
  if (run.length >= 3) return 'CRITICAL'
  if (run.length === 2) return includesCompetition ? 'CRITICAL' : 'WARN'
  return 'OK'
}

function relativeLabel(day) {
  const offset = getCompetitionOffset(day)
  if (offset == null) return 'Sem prova'
  if (offset === 0) return 'D-DIA'
  if (offset < 0) return `D-${Math.abs(offset)}`
  return `D+${offset}`
}

export function auditPlanningTimeline(days = []) {
  const ordered = sortDays(days).map((day, index) => ({ ...day, index }))
  const findings = []

  const compBlocks = competitionBlocks(ordered)

  const highHighDays = ordered.filter(day => isGolfHigh(day) && isGymHigh(day)).length

  const isStrongDay = day => (
    !isCompetitionDay(day) &&
    (
      isGolfHigh(day) ||
      isGymHigh(day) ||
      (
        day?.dayType === DAY_TYPES.ASSESSMENT &&
        (isGolfHigh(day) || isGymHigh(day))
      )
    )
  )

  let runStart = null
  let run = []

  const flushRun = () => {
    if (run.length < 2) {
      runStart = null
      run = []
      return
    }

    const includesCompetition = run.some(isCompetitionDay)
    const severity = strongestRunSeverity(run, includesCompetition)
    const startDay = run[0]
    const endDay = run[run.length - 1]

    findings.push(makeFinding({
      date: startDay.date,
      severity: classifyFindingSeverity({
        baseSeverity: severity,
        strongBlockLength: run.length,
        competitionInvolved: includesCompetition,
      }),
      category: 'consecutive-high-block',
      title: run.length >= 3 ? 'Bloco forte de 3+ dias' : 'Dois dias fortes seguidos',
      explanation: `${run.length} dias seguidos com Golf forte, Gym forte ou avaliação exigente.`,
      recommendation: 'Baixa a carga ou intercala recuperação antes de aumentar outra vez.',
      rawDay: startDay,
    }))

    runStart = null
    run = []
    return endDay
  }

  ordered.forEach((day, index) => {
    if (isStrongDay(day)) {
      if (!run.length) runStart = index
      run.push(day)
    } else if (run.length) {
      flushRun()
    }
  })
  if (run.length) flushRun()

  ordered.forEach((day, index) => {
    const competitionDay = isCompetitionDay(day)
    const offset = getCompetitionOffset(day)
    const gymHigh = isGymHigh(day)
    const golfHigh = isGolfHigh(day)
    const competitionNear = offset != null && offset <= 4 && offset >= 0
    const postCompetition = offset != null && offset >= 1 && offset <= 2

    if (golfHigh && gymHigh) {
      const prev = ordered[index - 1]
      const next = ordered[index + 1]
      const adjacentHighHigh = Boolean((prev && isGolfHigh(prev) && isGymHigh(prev)) || (next && isGolfHigh(next) && isGymHigh(next)))
      const severity = classifyFindingSeverity({
        baseSeverity: 'OK',
        strongBlockLength: adjacentHighHigh ? 2 : 1,
        competitionInvolved: competitionDay || competitionNear,
        distanceToCompetition: day.daysToNextCompetition,
        distanceFromCompetition: day.daysSinceLastCompetition,
        gymSessionType: day.gymRecommendation?.sessionType,
      })

      findings.push(makeFinding({
        date: day.date,
        severity,
        category: 'golf-gym-high',
        title: 'Golf forte + Gym forte',
        explanation: `Dia ${relativeLabel(day)} com Golf forte e Gym forte no mesmo dia.`,
        recommendation: competitionNear || competitionDay
          ? 'Evita força pesada perto da competição.'
          : 'Aceitável se o dia for isolado e houver recuperação depois.',
        rawDay: day,
      }))
    }

    if (gymHigh && offset != null) {
      let severity = 'OK'
      if (offset === 0) {
        severity = 'CRITICAL'
      } else if (offset === 1) {
        severity = day.gymRecommendation?.sessionType === 'A' ? 'CRITICAL' : 'WARN'
      } else if (offset === 2) {
        severity = day.gymRecommendation?.sessionType === 'A' ? 'WARN' : 'OK'
      } else if (offset === 5) {
        severity = day.gymRecommendation?.sessionType === 'A' ? 'WARN' : 'OK'
      } else if (offset >= 1 && offset <= 4) {
        severity = day.gymRecommendation?.sessionType === 'A' ? 'CRITICAL' : 'WARN'
      }

      if (severity !== 'OK') {
        findings.push(makeFinding({
          date: day.date,
          severity,
          category: offset >= 0 ? 'gym-near-competition' : 'gym-near-competition',
          title: 'Gym pesado perto de competição',
          explanation: `Sessão ${day.gymRecommendation?.sessionType || '-'} em ${relativeLabel(day)}.`,
          recommendation: offset === 0
            ? 'No dia da competição, mantém Gym em OFF ou ativação muito leve.'
            : 'Perto da prova, reduz força pesada e prioriza mobilidade/ativação.',
          rawDay: day,
        }))
      }
    }

    if (competitionDay) {
      const block = compBlocks.find(item => index >= item.startIndex && index <= item.endIndex)
      const blockLength = block ? block.endIndex - block.startIndex + 1 : 1
      if (day.gymRecommendation?.sessionAllowed !== false || day.gymRecommendation?.sessionType != null) {
        findings.push(makeFinding({
          date: day.date,
          severity: 'CRITICAL',
          category: 'competition-day-gym',
          title: 'Gym em dia de competição',
          explanation: 'Dia de competição deve ficar sem força pesada.',
          recommendation: 'Gym OFF ou ativação muito leve.',
          rawDay: day,
        }))
      }
      if (golfHigh && gymHigh) {
        findings.push(makeFinding({
          date: day.date,
          severity: 'CRITICAL',
          category: 'competition-stress',
          title: 'Competição como carga pública',
          explanation: 'Dia de competição deve ser lido como Competição, não como treino forte.',
          recommendation: 'Mantém a leitura pública como competição e avalia o esforço competitivo separadamente.',
          rawDay: day,
        }))
      }
      if (blockLength > 1) {
        findings.push(makeFinding({
          date: day.date,
          severity: 'OK',
          category: 'competition-block',
          title: 'Dia de competição em bloco',
          explanation: `Competição em bloco de ${blockLength} dias.`,
          recommendation: 'Mantém a recuperação entre dias e evita construir força em paralelo.',
          rawDay: day,
        }))
      }
    }

    if (day.dayType === DAY_TYPES.ASSESSMENT) {
      const risky = isGolfHigh(day) || isGymHigh(day) || (day.daysToNextCompetition != null && day.daysToNextCompetition <= 4)
      if (risky) {
        findings.push(makeFinding({
          date: day.date,
          severity: classifyFindingSeverity({
            baseSeverity: 'WARN',
            competitionInvolved: day.daysToNextCompetition != null && day.daysToNextCompetition <= 4,
            strongBlockLength: isGolfHigh(day) || isGymHigh(day) ? 2 : 1,
            distanceToCompetition: day.daysToNextCompetition,
            distanceFromCompetition: day.daysSinceLastCompetition,
            gymSessionType: day.gymRecommendation?.sessionType,
          }),
          category: 'assessment',
          title: 'Dia de avaliação em contexto exigente',
          explanation: 'Avaliação a coincidir com carga alta ou a ficar muito perto da competição.',
          recommendation: 'Mantém a avaliação sem a transformar num dia forte adicional.',
          rawDay: day,
        }))
      }
    }
  })

  compBlocks.forEach((block, index) => {
    const next = compBlocks[index + 1]
    if (!next) return
    const gap = next.startIndex - block.endIndex - 1
    if (gap <= 0 || gap > 6) return

    for (let i = block.endIndex + 1; i < next.startIndex; i += 1) {
      const day = ordered[i]
      if (!isGymHigh(day)) continue
      findings.push(makeFinding({
        date: day.date,
        severity: gap <= 3 ? 'CRITICAL' : 'WARN',
        category: 'back-to-back-competition',
        title: 'Gym entre competições próximas',
        explanation: `Existem competições separadas por apenas ${gap} dias e este dia tenta construir força no intervalo.`,
        recommendation: 'Privilegia recovery/activation até passar a janela competitiva.',
        rawDay: day,
      }))
    }
  })

  let recoveryRun = null
  const flushRecoveryRun = () => {
    if (!recoveryRun) return
    const severity = recoveryRun.zeroCount > 0 ? 'CRITICAL' : 'WARN'
    findings.push(makeFinding({
      date: ordered[recoveryRun.startIndex].date,
      severity,
      category: 'recovery-gap',
      title: 'Recuperação insuficiente em 7 dias',
      explanation: `Janela móvel de 7 dias com apenas ${recoveryRun.lightDays} dia(s) leve(s)/recovery/off.`,
      recommendation: 'Garante pelo menos 2 dias leves por semana.',
      rawDay: ordered[recoveryRun.startIndex],
    }))
    recoveryRun = null
  }

  for (let i = 0; i <= ordered.length - 7; i += 1) {
    const windowDays = ordered.slice(i, i + 7)
    const lightDays = windowDays.filter(isRecoveryLike).length
    if (lightDays < 2) {
      if (!recoveryRun || recoveryRun.endIndex !== i - 1) {
        if (recoveryRun) flushRecoveryRun()
        recoveryRun = { startIndex: i, endIndex: i, lightDays, zeroCount: lightDays === 0 ? 1 : 0 }
      } else {
        recoveryRun.endIndex = i
        recoveryRun.lightDays = Math.min(recoveryRun.lightDays, lightDays)
        if (lightDays === 0) recoveryRun.zeroCount += 1
      }
    } else if (recoveryRun) {
      flushRecoveryRun()
    }
  }
  flushRecoveryRun()

  const sortedFindings = findings.sort((a, b) => {
    const dateCmp = String(a.date || '').localeCompare(String(b.date || ''))
    if (dateCmp !== 0) return dateCmp
    return SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  })

  const totalWarnings = sortedFindings.filter(item => item.severity === 'WARN').length
  const totalCritical = sortedFindings.filter(item => item.severity === 'CRITICAL').length
  const totalInfo = sortedFindings.filter(item => item.category === 'competition-block' && item.severity === 'OK').length
  const consecutiveHighBlocks = sortedFindings.filter(item => item.category === 'consecutive-high-block').length
  const gymNearCompetitionIssues = sortedFindings.filter(item => ['gym-near-competition', 'back-to-back-competition', 'competition-day-gym'].includes(item.category)).length
  const recoveryIssues = sortedFindings.filter(item => item.category === 'recovery-gap').length

  return {
    summary: {
      daysAnalyzed: ordered.length,
      totalWarnings,
      totalCritical,
      totalInfo,
      highHighDays,
      consecutiveHighBlocks,
      gymNearCompetitionIssues,
      recoveryIssues,
    },
    findings: sortedFindings,
  }
}

