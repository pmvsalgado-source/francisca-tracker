// Periodization engine — calculates the training phase for any given week
// based on competition calendar data from Supabase.

export const PHASE_COLORS = {
  ACUMULACAO:          '#22c55e',
  DESENVOLVIMENTO:     '#3b82f6',
  DESENVOLVIMENTO_LIGHT: '#93c5fd',
  AFINACAO:            '#f59e0b',
  PEAK:                '#ef4444',
  MANUTENCAO_B2B:      '#a855f7',
  DESCARGA:            '#6b7280',
  DESCANSO:            '#d1d5db',
}

export const PHASE_FOCUS = {
  PEAK:                 'Zero mudanças. Executar o plano.',
  AFINACAO:             'Putting · ritmo · confiança',
  DESENVOLVIMENTO:      'Transferência para performance',
  DESENVOLVIMENTO_LIGHT:'Estimular sem fadiga',
  ACUMULACAO:           'Volume · base física e técnica',
  MANUTENCAO_B2B:       'Manutenção · recuperação ativa',
  DESCARGA:             'Reduzir carga · recuperar',
  DESCANSO:             'Pausa total',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMidnight(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Parse a 'YYYY-MM-DD' string to a Date at noon (avoids DST boundary issues)
function parseDate(str) {
  return new Date(str + 'T12:00:00')
}

// Positive integer: days from a to b (b > a → positive)
function daysDiff(a, b) {
  return Math.round((b - a) / 86400000)
}

// An event is a competition if its category contains 'competi' (e.g.
// 'Competição') or the title contains 'torneio'. Multi-day tournaments
// are supported via end_date.
function isCompetition(event) {
  return (event.category || '').toLowerCase().includes('competi')
    || (event.title || '').toLowerCase().includes('torneio')
}

// Does an event overlap any part of [wsDate, weDate] (both Date objects)?
function overlapsWeek(event, wsDate, weDate) {
  const start = parseDate(event.start_date)
  const end   = event.end_date ? parseDate(event.end_date) : start
  return start <= weDate && end >= wsDate
}

// Does any part of an event cover a specific calendar day (string 'YYYY-MM-DD')?
function coversDay(event, dayStr) {
  return event.start_date <= dayStr && (event.end_date || event.start_date) >= dayStr
}

// Is dayStr (string) a training day? Matches calendar events whose category
// suggests golf or gym training (e.g. 'Treino/Campo', 'Training Camp').
function isTrainingDay(events, dayStr) {
  return events.some(e => {
    const cat = (e.category || '').toLowerCase()
    return (cat.includes('treino') || cat.includes('camp') || cat.includes('gym')) && coversDay(e, dayStr)
  })
}

// Count consecutive training days ending on (and including) the day before weekStart
function longestRecentTrainingStreak(events, weekStart, lookbackDays = 14) {
  let streak = 0
  for (let i = 1; i <= lookbackDays; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - i)
    const dayStr = d.toISOString().split('T')[0]
    if (isTrainingDay(events, dayStr)) {
      streak++
    } else {
      break // streak broken — stop at first rest day
    }
  }
  return streak
}

// Count competition events whose start_date falls within [fromDate, toDate)
function countCompetitionsInRange(competitions, fromDate, toDate) {
  return competitions.filter(c => {
    const start = parseDate(c.start_date)
    return start >= fromDate && start < toDate
  }).length
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * calcWeekPhase(weekStart, events)
 *
 * @param {Date|string} weekStart  — first day of the week (any time-of-day)
 * @param {Array}       events     — raw event rows from Supabase
 * @returns {Object}               — phase descriptor (see module header)
 */
export function calcWeekPhase(weekStart, events) {
  const ws = toMidnight(weekStart)
  const we = new Date(ws)
  we.setDate(we.getDate() + 6)
  we.setHours(23, 59, 59, 999)

  const competitions = (events || []).filter(isCompetition)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  // ── Competition this week ─────────────────────────────────────────────────
  const thisWeekComps = competitions.filter(e => overlapsWeek(e, ws, we))
  const hasCompThisWeek = thisWeekComps.length > 0

  // ── Next competition after weekStart ──────────────────────────────────────
  // Competitions that start strictly after ws (not overlapping the current week)
  let daysToNextCompetition = null
  let nextCompEvent = null
  for (const c of competitions) {
    const start = parseDate(c.start_date)
    if (start > we) { // strictly after the week
      daysToNextCompetition = daysDiff(ws, start)
      nextCompEvent = c
      break
    }
  }

  // ── Previous competition before weekStart ─────────────────────────────────
  let daysSincePreviousCompetition = null
  for (let i = competitions.length - 1; i >= 0; i--) {
    const c = competitions[i]
    const end = c.end_date ? parseDate(c.end_date) : parseDate(c.start_date)
    if (end < ws) {
      daysSincePreviousCompetition = daysDiff(end, ws)
      break
    }
  }

  // ── Competition load (recent weeks) ──────────────────────────────────────
  const fourWeeksAgo = new Date(ws); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const fiveWeeksAgo = new Date(ws); fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35)

  const compsLast4Weeks = countCompetitionsInRange(competitions, fourWeeksAgo, ws)
  const compsLast5Weeks = countCompetitionsInRange(competitions, fiveWeeksAgo, ws)

  // ── Rest alert ────────────────────────────────────────────────────────────
  const trainingStreak = longestRecentTrainingStreak(events || [], ws, 14)

  let restAlert = false
  let restAlertLevel = 'none'

  if (trainingStreak >= 10 || compsLast5Weeks >= 4) {
    restAlert = true
    restAlertLevel = 'red'
  } else if (trainingStreak >= 7 || compsLast4Weeks >= 3) {
    restAlert = true
    restAlertLevel = 'yellow'
  }

  // ── Phase classification (priority order) ─────────────────────────────────
  let phase
  let reason

  if (hasCompThisWeek) {
    phase  = 'PEAK'
    reason = `Competição esta semana: ${thisWeekComps.map(e => e.title).join(', ')}`

  } else if (
    daysSincePreviousCompetition !== null && daysSincePreviousCompetition <= 7 &&
    daysToNextCompetition        !== null && daysToNextCompetition        <= 7
  ) {
    phase  = 'MANUTENCAO_B2B'
    reason = `Back-to-back: ${daysSincePreviousCompetition}d desde a última competição, ${daysToNextCompetition}d até à próxima`

  } else if (daysToNextCompetition !== null && daysToNextCompetition >= 1 && daysToNextCompetition <= 7) {
    phase  = 'AFINACAO'
    reason = `Próxima competição em ${daysToNextCompetition} dia${daysToNextCompetition === 1 ? '' : 's'}: ${nextCompEvent?.title || ''}`

  } else if (daysToNextCompetition !== null && daysToNextCompetition <= 14) {
    phase  = 'DESENVOLVIMENTO_LIGHT'
    reason = `Próxima competição em ${daysToNextCompetition} dias: ${nextCompEvent?.title || ''}`

  } else if (daysToNextCompetition !== null && daysToNextCompetition <= 21) {
    phase  = 'DESENVOLVIMENTO'
    reason = `Próxima competição em ${daysToNextCompetition} dias: ${nextCompEvent?.title || ''}`

  } else if (daysToNextCompetition !== null && daysToNextCompetition >= 22) {
    phase  = 'ACUMULACAO'
    reason = `Próxima competição em ${daysToNextCompetition} dias — janela de acumulação`

  } else if (compsLast4Weeks >= 3) {
    // No upcoming competition + intense recent block → recovery
    phase  = 'DESCARGA'
    reason = `${compsLast4Weeks} competições nas últimas 4 semanas — bloco intenso, recuperação necessária`

  } else {
    phase  = 'DESCANSO'
    reason = 'Sem competições no calendário'
  }

  console.log('[calc] daysToNext:', daysToNextCompetition, 'phase:', phase)

  return {
    phase,
    reason,
    daysToNextCompetition,
    daysSincePreviousCompetition,
    restAlert,
    restAlertLevel,
    recommendedTrainingFocus: PHASE_FOCUS[phase],
    phaseColor: PHASE_COLORS[phase],
  }
}

/**
 * calcCurrentPhase(events)
 * Convenience wrapper — calculates the phase for the current week (today as weekStart).
 */
export function calcCurrentPhase(events) {
  return calcWeekPhase(new Date(), events)
}
