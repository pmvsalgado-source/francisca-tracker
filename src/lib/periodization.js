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
  PEAK: `Competir fresca e confiante, sem mudar nada.
Trabalhar putting, wedges e rotina com pouco volume.
Fazer apenas ativação leve, mobilidade e core.
Evitar treino pesado, muitas bolas e mudanças técnicas.`,
  AFINACAO: `Afinar ritmo, distâncias e confiança.
Trabalhar jogo curto, distâncias e rotina consistente.
Manter ginásio leve com mobilidade e alguma velocidade.
Evitar sessões longas, carga alta e técnica nova.`,
  DESENVOLVIMENTO_LIGHT: `Melhorar sem acumular fadiga.
Trabalhar técnica leve, wedges, putting e controlo.
Fazer ginásio moderado com força leve e mobilidade.
Evitar volume excessivo e carga pesada.`,
  DESENVOLVIMENTO: `Evoluir com treino forte e objetivo claro.
Trabalhar no range com alvo, feedback e velocidade.
Fazer ginásio completo com força, potência e velocidade.
Evitar bater bolas sem plano.`,
  ACUMULACAO: `Construir base técnica e física.
Treinar com volume, repetição e foco na técnica.
Fazer ginásio com carga e progressão de força.
Evitar focar apenas em score.`,
  MANUTENCAO_B2B: `Recuperar mantendo boas sensações de jogo.
Fazer sessões curtas com putting, wedges e ritmo.
Manter ginásio leve com mobilidade e ativação.
Evitar carga física e técnica nova.`,
  DESCARGA: `Baixar carga e recuperar.
Treinar pouco, com foco em ritmo e contacto.
Fazer apenas mobilidade e recuperação.
Evitar intensidade alta e volume.`,
  DESCANSO: `Recuperar totalmente corpo e mente.
Não é necessário treinar.
Dar descanso completo ao corpo.
Evitar treinar por obrigação.`,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMidnight(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Extract the YYYY-MM-DD portion from any date/datetime string.
// Handles: '2026-05-01', '2026-05-01T00:00:00', '2026-05-01T00:00:00.000Z',
//          '2026-05-01 00:00:00', timestamps stored as numbers.
function toDateStr(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s          // already YYYY-MM-DD
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

// Parse any date value to a Date at local noon (avoids DST boundary issues).
// Returns Invalid Date (not null) so comparisons behave predictably.
function parseDate(raw) {
  const s = toDateStr(raw)
  if (!s) return new Date(NaN)
  return new Date(s + 'T12:00:00')
}

// Resolve the start-date field regardless of column name used in the DB row
function eventDate(e) {
  return toDateStr(e.start_date || e.date || e.start || null)
}

// Resolve the end-date field, falling back to start date
function eventEndDate(e) {
  return toDateStr(e.end_date || e.end || null) || eventDate(e)
}

// Positive integer: days from a to b (b > a → positive)
function daysDiff(a, b) {
  return Math.round((b - a) / 86400000)
}

// Keywords that identify a competition event regardless of category spelling.
// Covers: Competição, Competition, Torneio, Open, Cup, Championship,
// Stroke Play, Stableford, Medal, Match Play, Matchplay, Pro-Am,
// Nacional (also matches Internacional), Regional.
const COMP_KEYWORDS = [
  'competi', 'torneio', ' cup', 'championship', 'stroke play',
  'stableford', 'matchplay', 'match play', 'medal play', 'pro-am', 'proam',
  'open ', ' open', 'nacional', 'regional',
]

export function isCompetition(event) {
  const cat   = (event.category || '').toLowerCase()
  const title = (event.title    || '').toLowerCase()
  return COMP_KEYWORDS.some(kw => cat.includes(kw) || title.includes(kw))
}

// Returns the first competition event on or after fromDate, sorted by start date.
export function getNextCompetition(events, fromDate) {
  const from = parseDate(fromDate)
  return (events || [])
    .filter(isCompetition)
    .filter(e => { const d = parseDate(eventDate(e)); return !isNaN(d) && d >= from })
    .sort((a, b) => eventDate(a).localeCompare(eventDate(b)))[0] || null
}

// Returns up to `limit` upcoming competition events from fromDate, sorted by start date.
export function getUpcomingCompetitions(events, fromDate, limit = 4) {
  const from = parseDate(fromDate)
  return (events || [])
    .filter(isCompetition)
    .filter(e => { const d = parseDate(eventDate(e)); return !isNaN(d) && d >= from })
    .sort((a, b) => eventDate(a).localeCompare(eventDate(b)))
    .slice(0, limit)
}

// Does an event overlap any part of [wsDate, weDate] (both Date objects)?
function overlapsWeek(event, wsDate, weDate) {
  const start = parseDate(eventDate(event))
  const end   = parseDate(eventEndDate(event))
  return start <= weDate && end >= wsDate
}

// Does any part of an event cover a specific calendar day (string 'YYYY-MM-DD')?
function coversDay(event, dayStr) {
  const sd = eventDate(event)      // already YYYY-MM-DD via toDateStr
  const ed = eventEndDate(event)
  return sd != null && sd <= dayStr && ed != null && ed >= dayStr
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

// Count competition events whose start date falls within [fromDate, toDate)
// competitions[] already has pre-normalised _sd from calcWeekPhase
function countCompetitionsInRange(competitions, fromDate, toDate) {
  return competitions.filter(c => {
    const start = parseDate(c._sd)
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

  const competitions = (events || [])
    .filter(isCompetition)
    .map(e => ({ ...e, _sd: eventDate(e), _ed: eventEndDate(e) }))   // normalise dates once
    .filter(e => {
      if (!e._sd) return false
      return true
    })
    .sort((a, b) => a._sd.localeCompare(b._sd))

  // ── Competition this week ─────────────────────────────────────────────────
  const thisWeekComps = competitions.filter(e => {
    const start = parseDate(e._sd), end = parseDate(e._ed)
    return start <= we && end >= ws
  })
  const hasCompThisWeek = thisWeekComps.length > 0

  // ── Nearest upcoming competition from today (for countdown display) ────────
  let daysToNextCompetition = null  // returned to caller — days from today
  let nextCompEvent = null
  for (const c of competitions) {
    const start = parseDate(c._sd)
    if (start >= ws) {
      daysToNextCompetition = Math.round((start - ws) / (1000 * 60 * 60 * 24))
      nextCompEvent = c
      break
    }
  }

  // ── Next competition strictly after the current week (for phase rules) ────
  // Phase rules (AFINACAO, DESENVOLVIMENTO_LIGHT…) are only evaluated when
  // hasCompThisWeek=false, so we need a separate countdown from the week end.
  let daysToPhaseComp = null
  let phaseCompEvent = null
  for (const c of competitions) {
    const start = parseDate(c._sd)
    if (start > we) {
      daysToPhaseComp = Math.round((start - ws) / (1000 * 60 * 60 * 24))
      phaseCompEvent = c
      break
    }
  }

  // ── Previous competition before weekStart ─────────────────────────────────
  let daysSincePreviousCompetition = null
  for (let i = competitions.length - 1; i >= 0; i--) {
    const c = competitions[i]
    const end = parseDate(c._ed)
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
    daysToPhaseComp              !== null && daysToPhaseComp              <= 7
  ) {
    phase  = 'MANUTENCAO_B2B'
    reason = `Back-to-back: ${daysSincePreviousCompetition}d desde a última competição, ${daysToPhaseComp}d até à próxima`

  } else if (daysToPhaseComp !== null && daysToPhaseComp >= 1 && daysToPhaseComp <= 7) {
    phase  = 'AFINACAO'
    reason = `Próxima competição em ${daysToPhaseComp} dia${daysToPhaseComp === 1 ? '' : 's'}: ${phaseCompEvent?.title || ''}`

  } else if (daysToPhaseComp !== null && daysToPhaseComp <= 14) {
    phase  = 'DESENVOLVIMENTO_LIGHT'
    reason = `Próxima competição em ${daysToPhaseComp} dias: ${phaseCompEvent?.title || ''}`

  } else if (daysToPhaseComp !== null && daysToPhaseComp <= 21) {
    phase  = 'DESENVOLVIMENTO'
    reason = `Próxima competição em ${daysToPhaseComp} dias: ${phaseCompEvent?.title || ''}`

  } else if (daysToPhaseComp !== null && daysToPhaseComp >= 22) {
    phase  = 'ACUMULACAO'
    reason = `Próxima competição em ${daysToPhaseComp} dias — janela de acumulação`

  } else if (compsLast4Weeks >= 3) {
    // No upcoming competition + intense recent block → recovery
    phase  = 'DESCARGA'
    reason = `${compsLast4Weeks} competições nas últimas 4 semanas — bloco intenso, recuperação necessária`

  } else {
    phase  = 'DESCANSO'
    reason = 'Sem competições no calendário'
  }

  const heroCopy = (PHASE_FOCUS[phase] || '').split('\n').map(s => s.trim()).filter(Boolean)

  return {
    phase,
    reason,
    daysToNextCompetition,
    daysSincePreviousCompetition,
    restAlert,
    restAlertLevel,
    recommendedTrainingFocus: heroCopy.slice(1).join('\n'),
    heroLead: heroCopy[0] || '',
    heroGuidance: heroCopy.slice(1).join('\n'),
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
