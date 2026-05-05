// ─────────────────────────────────────────────────────────────────────────────
// periodization.js — Training phase engine
//
import { getPeriodizationDayContext as getEngineDayContext } from './periodization/context.js'
import { toDateKey } from './periodization/date.js'
export { getPeriodizationDayContext } from './periodization/context.js'
export { normalizeReadiness } from './periodization/readiness.js'

// Entry points:
//   calcWeekPhase(weekStart, events, athleteStatus?)  → full phase descriptor
//   calcCurrentPhase(events, athleteStatus?)          → convenience: today's week
//   getPeriodizationContext({ events, selectedDate, athleteStatus })
//
// Phase priority (highest first):
//   DESCANSO       — athlete signals (pain + very_high fatigue, or coach override)
//   DESCARGA       — coach override, or calendar load (no comp 22d+ && load triggers)
//   PEAK           — competition this week
//   MANUTENCAO_B2B — comp last week + comp next 7d
//   AFINACAO       — comp 1–7d
//   DESENVOLVIMENTO_LIGHT — comp 8–14d
//   DESENVOLVIMENTO       — comp 15–21d
//   ACUMULACAO     — comp 22d+ or empty calendar, no load triggers
//
// Alerts are SEPARATE from the phase — a PEAK week can still have red alerts.
// ─────────────────────────────────────────────────────────────────────────────

// ── Phase colors ──────────────────────────────────────────────────────────────
export const PHASE_COLORS = {
  ACUMULACAO:            '#22c55e',
  DESENVOLVIMENTO:       '#3b82f6',
  DESENVOLVIMENTO_LIGHT: '#93c5fd',
  AFINACAO:              '#f59e0b',
  PEAK:                  '#ef4444',
  MANUTENCAO_B2B:        '#a855f7',
  DESCARGA:              '#6b7280',
  DESCANSO:              '#d1d5db',
}

// ── Phase labels (human-readable PT) ─────────────────────────────────────────
export const PHASE_LABELS = {
  DESCANSO:              'Descanso',
  DESCARGA:              'Descarga',
  PEAK:                  'Competição',
  MANUTENCAO_B2B:        'Manutenção B2B',
  AFINACAO:              'Afinação',
  DESENVOLVIMENTO_LIGHT: 'Desenvolvimento Light',
  DESENVOLVIMENTO:       'Desenvolvimento',
  ACUMULACAO:            'Acumulação',
}

export const WEEK_TYPES = {
  LOAD: 'load',
  DELOAD: 'deload',
  COMPETITION: 'competition',
  TRANSITION: 'transition',
}

export const DEFAULT_WEEK_TYPE = WEEK_TYPES.LOAD

export const WEEK_TYPE_LABELS = {
  [WEEK_TYPES.LOAD]: 'Carga',
  [WEEK_TYPES.DELOAD]: 'Descarga',
  [WEEK_TYPES.COMPETITION]: 'Competição',
  [WEEK_TYPES.TRANSITION]: 'Transição',
}

export function getSuggestedWeekType(phase) {
  if (phase === 'PEAK') return WEEK_TYPES.COMPETITION
  if (phase === 'MANUTENCAO_B2B') return WEEK_TYPES.TRANSITION
  if (phase === 'DESCARGA' || phase === 'DESCANSO') return WEEK_TYPES.DELOAD
  return DEFAULT_WEEK_TYPE
}

export function applyWeekTypeContext(phaseData, weekTypeOverride = null) {
  const suggestedWeekType = getSuggestedWeekType(phaseData?.phase)
  const effectiveWeekType = weekTypeOverride || suggestedWeekType
  return {
    ...phaseData,
    suggestedWeekType,
    weekTypeOverride,
    effectiveWeekType,
    weekTypeLabel: WEEK_TYPE_LABELS[effectiveWeekType] || WEEK_TYPE_LABELS[DEFAULT_WEEK_TYPE],
  }
}

// ── Backward-compat flat text (consumed by Home.jsx heroLead/heroGuidance) ───
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

// ── Structured guidelines per phase ──────────────────────────────────────────
// Each phase defines golf + gym guidelines, athlete/coach messages.
// Used by components that want structured data instead of flat text.
export const PHASE_GUIDELINES = {
  PEAK: {
    label:       'Competição',
    description: 'Semana de competição. Manter sensações, confiança e rotina. Zero mudanças.',
    mood:        '🏆',
    golf: {
      volume:    '-40% a -50%',
      intensity: 'Média',
      focus:     'Rotina pré-shot, putting, wedges, jogo curto, confiança',
      rules:     'Não introduzir mudanças técnicas. Sessões curtas e focadas. Prioridade à cabeça.',
    },
    gym: {
      volume:    '-60%',
      intensity: 'Baixa',
      focus:     'Ativação leve, mobilidade, core estabilizador',
      rules:     'Sem fadiga muscular. Máximo 20–30 min. Objetivo: sentir o corpo ativo.',
    },
    athleteMessage: 'Semana de competição. Faz o que já sabes — confia no teu treino.',
    coachGuidance:  'Sessões Golf muito curtas. Ginásio só ativação. Nada de técnica nova. Proteger confiança.',
    alerts:         [],
  },

  AFINACAO: {
    label:       'Afinação',
    description: 'Competição nos próximos 1–7 dias. Afinar sensações, precisão e tomada de decisão.',
    mood:        '🎯',
    golf: {
      volume:    '-40%',
      intensity: 'Média/Alta',
      focus:     'Precisão, jogo real, tomada de decisão, distâncias, rotina',
      rules:     'Sem técnica nova. Foco em sensações e consistência. Sessões curtas e objetivas.',
    },
    gym: {
      volume:    '-50%',
      intensity: 'Baixa/Média',
      focus:     'Manutenção, estabilidade, mobilidade',
      rules:     'Sem carga pesada. Manter movimento sem acumular fadiga residual.',
    },
    athleteMessage: 'Estás perto da competição. Confia e afina. Nada de novo.',
    coachGuidance:  'Reduzir volume. Foco em rotina e precisão. Ginásio leve. Monitorizar sinais de ansiedade.',
    alerts:         [],
  },

  MANUTENCAO_B2B: {
    label:       'Manutenção B2B',
    description: 'Entre competições próximas. Recuperar mantendo ritmo e sensações competitivas.',
    mood:        '🔄',
    golf: {
      volume:    '-40% a -50%',
      intensity: 'Média',
      focus:     'Ritmo competitivo, consistência, putting, wedges',
      rules:     'Sessões curtas. Recuperar sem perder sensações. Sem análise técnica profunda.',
    },
    gym: {
      volume:    '-60%',
      intensity: 'Baixa',
      focus:     'Recuperação ativa, mobilidade, alongamentos',
      rules:     'Nada pesado. Prioridade é recuperar para a próxima competição.',
    },
    athleteMessage: 'Back-to-back. Recupera bem e mantém as sensações — a próxima competição está a chegar.',
    coachGuidance:  'Minimizar carga. Sessões curtas de Golf. Ginásio apenas recuperação. Monitorizar fadiga.',
    alerts:         [],
  },

  DESENVOLVIMENTO_LIGHT: {
    label:       'Desenvolvimento Light',
    description: 'Competição em 8–14 dias. Afinar e consolidar sem sobrecarregar.',
    mood:        '📈',
    golf: {
      volume:    '-20%',
      intensity: 'Média/Alta',
      focus:     'Afinar técnica, consolidar consistência, jogo curto e putts',
      rules:     'Manter algum volume mas controlar. Não arriscar técnica completamente nova.',
    },
    gym: {
      volume:    '-20%',
      intensity: 'Média',
      focus:     'Manutenção de força, mobilidade, prevenção de lesão',
      rules:     'Manter rotina mas evitar fadiga excessiva antes da competição.',
    },
    athleteMessage: 'Competição em breve. Consolida o que tens. Treina bem mas com cabeça.',
    coachGuidance:  'Volume ligeiramente reduzido. Foco em consistência e consolidação. Iniciar afinação gradual.',
    alerts:         [],
  },

  DESENVOLVIMENTO: {
    label:       'Desenvolvimento',
    description: 'Janela de desenvolvimento (15–21 dias). Melhorar com treino exigente e estruturado.',
    mood:        '💪',
    golf: {
      volume:    'Alto',
      intensity: 'Alta',
      focus:     'Melhoria técnica, consistência sob pressão, velocidade de swing, distâncias',
      rules:     'Treinar com alvo, feedback e intenção clara. Sem bater bolas sem plano.',
    },
    gym: {
      volume:    'Alto',
      intensity: 'Alta',
      focus:     'Força, potência, velocidade de rotação, prevenção',
      rules:     'Sessões completas. Progressão de carga. Monitorizar recuperação inter-sessão.',
    },
    athleteMessage: 'Janela de treino. Vai fundo — é aqui que se melhora.',
    coachGuidance:  'Máxima intensidade de desenvolvimento. Volume alto. Feedback técnico detalhado.',
    alerts:         [],
  },

  ACUMULACAO: {
    label:       'Acumulação',
    description: 'Calendário vazio ou competição distante (22d+). Construir base técnica e física.',
    mood:        '🏗️',
    golf: {
      volume:    'Médio/Alto',
      intensity: 'Média',
      focus:     'Fundamentos, repetição, técnica base, controlo de distâncias',
      rules:     'Volume e repetição. Foco na qualidade do contacto, não no score.',
    },
    gym: {
      volume:    'Alto',
      intensity: 'Média/Alta',
      focus:     'Base de força, hipertrofia funcional, condição física geral',
      rules:     'Progressão de carga. Volume elevado. Periodizar dentro do bloco.',
    },
    athleteMessage: 'Fase de construção. Investe agora — vai pagar nas competições.',
    coachGuidance:  'Janela ideal para trabalho técnico e físico. Aumentar progressivamente a carga.',
    alerts:         [],
  },

  DESCARGA: {
    label:       'Descarga',
    description: 'Carga acumulada elevada. Reduzir volume e intensidade para recuperar adaptações.',
    mood:        '🌀',
    golf: {
      volume:    '-40% a -60%',
      intensity: 'Baixa/Média',
      focus:     'Manter sensibilidade, ritmo de swing, wedges e putting',
      rules:     'Não acumular mais fadiga. Sessões curtas com foco em sensações.',
    },
    gym: {
      volume:    '-50%',
      intensity: 'Baixa/Média',
      focus:     'Recuperação ativa, mobilidade, alongamentos, prevenção',
      rules:     'Sem carga pesada. Recuperar forma sem perder adaptação neuromuscular.',
    },
    athleteMessage: 'Semana de descarga. O corpo precisa de recuperar — faz parte do plano.',
    coachGuidance:  'Reduzir drasticamente. Monitorizar sinais de fadiga. Pode ser necessária mais uma semana.',
    alerts:         [],
  },

  DESCANSO: {
    label:       'Descanso',
    description: 'Recuperação total. Sinais de fadiga, dor ou saturação detectados. Parar é progredir.',
    mood:        '😴',
    golf: {
      volume:    'Mínimo ou zero',
      intensity: 'Baixa',
      focus:     'Recuperação total. Tocar no taco só se sentir vontade genuína.',
      rules:     'Sem pressão de treinar. Nada técnico. Prazer acima de tudo.',
    },
    gym: {
      volume:    'Zero ou muito baixo',
      intensity: 'Baixa',
      focus:     'Recuperação total, mobilidade suave se necessário',
      rules:     'Prioridade máxima: sono e recuperação ativa. Zero progressão de carga.',
    },
    athleteMessage: 'Semana de descanso. Recupera a 100% — corpo e mente. Não há treino obrigatório.',
    coachGuidance:  'Zero ou mínimo de treino. Monitorizar sinais. Reavaliar estado antes de retomar.',
    alerts:         [],
  },
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toMidnight(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Extract YYYY-MM-DD from any date/datetime string or number.
function toDateStr(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

// Parse any date value to a Date at local noon (avoids DST boundary issues).
function parseDate(raw) {
  const s = toDateStr(raw)
  if (!s) return new Date(NaN)
  return new Date(s + 'T12:00:00')
}

// Resolve start/end date fields from event row (multiple column name conventions).
function eventDate(e)    { return toDateStr(e.start_date || e.date  || e.start || null) }
function eventEndDate(e) {
  const start = eventDate(e)
  if (!start) return null
  const explicit = toDateStr(e.end_date || e.end || null)
  if (explicit && explicit >= start) return explicit
  const durationCandidate = Array.isArray(e?.rounds)
    ? e.rounds.length
    : Number(e?.rounds || e?.competition_rounds || e?.days || e?.duration_days || e?.competition_duration || 1)
  const durationDays = Number.isFinite(durationCandidate) && durationCandidate > 0 ? Math.floor(durationCandidate) : 1
  if (durationDays <= 1) return start
  const d = parseDate(start)
  d.setDate(d.getDate() + durationDays - 1)
  return toDateStr(d) || start
}

// Positive integer: days from a to b (b > a → positive).
function daysDiff(a, b) { return Math.round((b - a) / 86400000) }

// ── Competition detection ─────────────────────────────────────────────────────
// Keywords that identify a competition regardless of category spelling.
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

const VALID_PERIODIZATION_STATUSES = new Set([
  'confirmed', 'played', 'confirmado', 'jogado', 'concluido', 'concluído',
])

export function isPeriodizationCompetition(event) {
  if (!isCompetition(event)) return false
  if (!event.status) return false
  const normalized = event.status.toString().trim().toLowerCase()
  return VALID_PERIODIZATION_STATUSES.has(normalized)
}

// Returns the first competition on or after fromDate.
export function getNextCompetition(events, fromDate) {
  const from = parseDate(fromDate)
  return (events || [])
    .filter(isCompetition)
    .filter(e => { const d = parseDate(eventDate(e)); return !isNaN(d) && d >= from })
    .sort((a, b) => eventDate(a).localeCompare(eventDate(b)))[0] || null
}

// Returns up to `limit` upcoming competitions from fromDate.
export function getUpcomingCompetitions(events, fromDate, limit = 4) {
  const from = parseDate(fromDate)
  return (events || [])
    .filter(isCompetition)
    .filter(e => { const d = parseDate(eventDate(e)); return !isNaN(d) && d >= from })
    .sort((a, b) => eventDate(a).localeCompare(eventDate(b)))
    .slice(0, limit)
}

const DAY_TYPE_LABELS = {
  training: 'Treino',
  high_load: 'Treino forte',
  light: 'Treino leve',
  taper: 'Preparação',
  practice_round: 'Volta de treino',
  competition: 'Competição',
  recovery: 'Recuperação',
  rest: 'Descanso',
  travel: 'Viagem',
  medical: 'Médico/Fisio',
}

const CYCLE_PHASE_LABELS = {
  base: 'Base',
  load: 'Construção',
  taper: 'Preparação para competir',
  competition: 'Competição',
  recovery: 'Recuperação',
}

const LOAD_LABELS = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  recovery: 'Muito baixa',
  rest: 'Zero',
  adjusted: 'Ajustada',
}

// Mesociclo = contexto estratégico; microciclo/semana = organização; dia = execução.
// Competição é a âncora. Esta camada diária é sempre recalculada a partir dos eventos.
// Não persistir dayType/carga/fase diária na base de dados.

function normalizeCompetition(e) {
  const start = eventDate(e)
  const end = eventEndDate(e)
  return start ? { ...e, _sd: start, _ed: end || start } : null
}

function eventsForDate(events, dateStr) {
  return (events || []).filter(e => {
    const start = eventDate(e)
    const end = eventEndDate(e)
    return start && dateStr >= start && dateStr <= end
  })
}

function hasTextMatch(event, tokens) {
  const text = `${event?.category || ''} ${event?.title || ''} ${event?.type || ''}`.toLowerCase()
  return tokens.some(token => text.includes(token))
}

function isExplicitMedicalEvent(event) {
  return hasTextMatch(event, ['medical', 'médico', 'medico', 'fisio', 'physio', 'injury', 'lesão', 'lesao'])
}

function isExplicitTravelEvent(event) {
  return hasTextMatch(event, ['travel', 'viagem', 'flight', 'voo', 'airport', 'aeroporto'])
}

function isExplicitInternationalCompetition(event) {
  if (!event) return false
  if (event.international === true || event.is_international === true) return true
  const fields = [event.scope, event.level, event.tour_type, event.competition_scope, event.tags, event.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return fields.includes('international') || fields.includes('internacional')
}

function dayGuidance(dayType, cyclePhase) {
  const map = {
    competition: {
      golf: 'Rotina, estratégia, confiança e execução simples.',
      gym: 'Sem carga. Apenas ativação leve se já estiver planeada.',
    },
    practice_round: {
      golf: 'Ritmo, estratégia do campo, linhas de saída e confiança.',
      gym: 'Mobilidade leve / ativação. Evitar fadiga.',
    },
    taper: {
      golf: 'Afinar sensações, wedges, putting e rotina.',
      gym: 'Leve, mobilidade e ativação curta.',
    },
    high_load: {
      golf: 'Treino com intenção, volume controlado e foco técnico.',
      gym: 'Força/potência conforme plano, monitorizando fadiga.',
    },
    training: {
      golf: 'Treino estruturado com objetivo claro.',
      gym: 'Sessão normal conforme plano.',
    },
    light: {
      golf: 'Sessão curta, qualidade e sensação.',
      gym: 'Carga reduzida, mobilidade e estabilidade.',
    },
    recovery: {
      golf: 'Recuperar. Opcional: toque leve, putting ou caminhada.',
      gym: 'Recuperação, mobilidade e descanso.',
    },
    rest: {
      golf: 'Descanso ou rotina muito leve se fizer sentido.',
      gym: 'Descanso.',
    },
    travel: {
      golf: 'Proteger energia. Ajustar ao dia de viagem.',
      gym: 'Mobilidade curta e hidratação. Sem carga.',
    },
    medical: {
      golf: 'Seguir indicação clínica/da equipa.',
      gym: 'Não carregar sem validação clínica.',
    },
  }
  return map[dayType] || map[cyclePhase] || map.training
}

function dayLoadLevel(dayType) {
  const map = {
    competition: 'high',
    practice_round: 'low',
    taper: 'low',
    high_load: 'high',
    training: 'medium',
    light: 'low',
    recovery: 'recovery',
    rest: 'rest',
    travel: 'low',
    medical: 'adjusted',
  }
  return map[dayType] || 'medium'
}

function dayInterpretation(dayType, cyclePhase) {
  const phaseSummary = {
    load: 'Construção',
    taper: 'Preparação para competir',
    competition: 'Competição',
    recovery: 'Recuperação',
    base: 'Base',
  }[cyclePhase] || 'Base'

  const map = {
    competition: {
      actionSummary: 'Competição',
      loadSummary: 'Carga competitiva',
      why: 'Dia de torneio. O foco é executar o plano e competir com confiança.',
      phaseSummary: 'Competição',
    },
    practice_round: {
      actionSummary: 'Volta de treino',
      loadSummary: 'Carga baixa',
      why: 'Preparar o campo, confirmar estratégia e ganhar confiança para o torneio.',
      phaseSummary: 'Preparação para competir',
    },
    taper: {
      actionSummary: 'Preparação',
      loadSummary: 'Carga baixa a média',
      why: 'Afinar ritmo e qualidade sem criar fadiga antes da competição.',
      phaseSummary: 'Preparação para competir',
    },
    high_load: {
      actionSummary: 'Treino forte',
      loadSummary: 'Carga alta',
      why: 'Ganhar capacidade e intensidade enquanto ainda há margem antes da competição.',
      phaseSummary: 'Construção',
    },
    training: {
      actionSummary: 'Treino',
      loadSummary: 'Carga média',
      why: 'Manter evolução técnica e ritmo de treino.',
      phaseSummary: 'Construção',
    },
    light: {
      actionSummary: 'Treino leve',
      loadSummary: 'Carga baixa',
      why: 'Manter sensações e qualidade sem acumular fadiga.',
      phaseSummary: 'Preparação / manutenção',
    },
    recovery: {
      actionSummary: 'Recuperação',
      loadSummary: 'Carga muito baixa',
      why: 'Recuperar do esforço competitivo ou de carga acumulada.',
      phaseSummary: 'Recuperação',
    },
    rest: {
      actionSummary: 'Descanso',
      loadSummary: 'Carga zero',
      why: 'Dar descanso total ao corpo e à cabeça.',
      phaseSummary: 'Recuperação',
    },
    travel: {
      actionSummary: 'Viagem',
      loadSummary: 'Carga baixa',
      why: 'Gerir deslocação sem acumular fadiga.',
      phaseSummary: 'Preparação / transição',
    },
    medical: {
      actionSummary: 'Médico/Fisio',
      loadSummary: 'Carga ajustada',
      why: 'Gestão física definida pela equipa.',
      phaseSummary: 'Gestão física',
    },
  }
  return map[dayType] || { actionSummary: DAY_TYPE_LABELS[dayType] || 'Treino', loadSummary: LOAD_LABELS[dayLoadLevel(dayType)], why: 'Ajustado à distância para a competição e à fase semanal.', phaseSummary }
}

function getLegacyDayPeriodizationContext({ date, events } = {}) {
  const dateStr = date instanceof Date
    ? toDateKey(date)
    : (toDateStr(date) || toDateStr(new Date().toISOString()))
  const day = parseDate(dateStr)
  const dayEvents = eventsForDate(events, dateStr)
  const validCompetitions = (events || [])
    .filter(isPeriodizationCompetition)
    .map(normalizeCompetition)
    .filter(Boolean)
    .sort((a, b) => a._sd.localeCompare(b._sd))

  const competitionToday = validCompetitions.find(c => dateStr >= c._sd && dateStr <= c._ed) || null
  const nextCompetition = validCompetitions.find(c => c._sd >= dateStr) || null
  const previousCompetition = [...validCompetitions].reverse().find(c => c._ed < dateStr) || null
  const practiceRoundCompetition = validCompetitions.find(c => daysDiff(day, parseDate(c._sd)) === 1) || null
  const recoveryCompetition = previousCompetition && daysDiff(parseDate(previousCompetition._ed), day) <= 2
    ? previousCompetition
    : null
  const relatedCompetition = competitionToday || practiceRoundCompetition || recoveryCompetition || nextCompetition || null
  const daysToCompetition = relatedCompetition ? daysDiff(day, parseDate(relatedCompetition._sd)) : null

  const reasons = []
  let dayType = 'training'
  let cyclePhase = 'base'

  const explicitMedical = dayEvents.some(isExplicitMedicalEvent)
  const explicitTravel = dayEvents.some(isExplicitTravelEvent) && validCompetitions.some(isExplicitInternationalCompetition)

  if (explicitMedical) {
    dayType = 'medical'
    reasons.push('Evento médico registado explicitamente neste dia.')
  } else if (explicitTravel) {
    dayType = 'travel'
    reasons.push('Evento de viagem explícito associado a competição internacional.')
  } else if (competitionToday) {
    dayType = 'competition'
    reasons.push('Competição válida neste dia.')
  } else if (practiceRoundCompetition) {
    dayType = 'practice_round'
    reasons.push('Dia imediatamente anterior ao início da competição.')
  } else if (recoveryCompetition) {
    dayType = 'recovery'
    reasons.push('Dia 1-2 após o fim da competição.')
  } else if (day.getDay() === 1 && dayEvents.length === 0) {
    dayType = 'rest'
    reasons.push('Segunda-feira sem eventos registados.')
  }

  if (competitionToday) {
    cyclePhase = 'competition'
  } else if (recoveryCompetition) {
    cyclePhase = 'recovery'
  } else if (nextCompetition) {
    const daysToNext = daysDiff(day, parseDate(nextCompetition._sd))
    if (daysToNext >= 1 && daysToNext <= 3) cyclePhase = 'taper'
    else if (daysToNext >= 4 && daysToNext <= 14) cyclePhase = 'load'
    else cyclePhase = 'base'
  }

  if (dayType === 'training') {
    const weekPhase = calcWeekPhase(dateStr, validCompetitions).phase
    if (cyclePhase === 'taper') {
      dayType = 'taper'
      reasons.push('1-3 dias antes da próxima competição.')
    } else if (cyclePhase === 'load') {
      dayType = ['ACUMULACAO', 'DESENVOLVIMENTO'].includes(weekPhase) ? 'high_load' : 'training'
      reasons.push('4-14 dias antes da próxima competição.')
    } else if (['DESCARGA', 'DESCANSO', 'MANUTENCAO_B2B'].includes(weekPhase)) {
      dayType = 'light'
      reasons.push(`Fase semanal ${weekPhase} sugere carga diária reduzida.`)
    } else {
      reasons.push('Dia de treino derivado da fase semanal e distância à competição.')
    }
  }

  const loadLevel = dayLoadLevel(dayType)
  const guidance = dayGuidance(dayType, cyclePhase)
  const interpretation = dayInterpretation(dayType, cyclePhase)

  return {
    date: dateStr,
    dayType,
    dayTypeLabel: DAY_TYPE_LABELS[dayType] || DAY_TYPE_LABELS.training,
    cyclePhase,
    cyclePhaseLabel: CYCLE_PHASE_LABELS[cyclePhase] || CYCLE_PHASE_LABELS.base,
    loadLevel,
    loadLabel: LOAD_LABELS[loadLevel] || LOAD_LABELS.medium,
    ...interpretation,
    nextCompetition: relatedCompetition,
    daysToCompetition,
    eventsOnDay: dayEvents,
    reasons,
    golfGuidance: guidance.golf,
    gymGuidance: guidance.gym,
  }
}

const ENGINE_TO_LEGACY_DAY_TYPE = {
  COMPETITION: 'competition',
  TRAVEL: 'travel',
  REST: 'rest',
  POST_COMP_RECOVERY: 'recovery',
  RECOVERY: 'recovery',
  LOW_LOAD: 'light',
  MEDIUM_LOAD: 'training',
  HIGH_LOAD: 'high_load',
  PRE_COMP_LIGHT: 'taper',
  ASSESSMENT: 'training',
}

const ENGINE_CYCLE_PHASE_LABELS = {
  ACCUMULATION: 'Construção',
  DEVELOPMENT: 'Construção',
  DELOAD: 'Recuperação',
  PRE_COMP: 'Preparação para competir',
  MAINTENANCE_B2B: 'Preparação / manutenção',
}

export function getDayPeriodizationContext({ date, events, readinessInputs, history } = {}) {
  const engine = getEngineDayContext({ date, events, readinessInputs, history })
  const legacyDayType = ENGINE_TO_LEGACY_DAY_TYPE[engine.dayType] || 'training'
  const cyclePhaseLabel = ENGINE_CYCLE_PHASE_LABELS[engine.phase] || engine.phaseLabel || 'Base'
  const guidance = dayGuidance(legacyDayType, 'base')

  return {
    ...engine,
    dayType: legacyDayType,
    dayTypeLabel: DAY_TYPE_LABELS[legacyDayType] || engine.dayType,
    cyclePhase: String(engine.phase || '').toLowerCase(),
    cyclePhaseLabel,
    loadLevel: String(engine.loadLevel || 'MEDIUM').toLowerCase(),
    loadLabel: engine.loadLabel,
    actionSummary: DAY_TYPE_LABELS[legacyDayType] || engine.dayType,
    loadSummary: engine.loadLabel ? `Carga ${engine.loadLabel.toLowerCase()}` : 'Carga média',
    why: engine.reasonForAthlete,
    phaseSummary: cyclePhaseLabel,
    nextCompetition: engine.nextCompetition,
    daysToCompetition: engine.daysToNextCompetition,
    eventsOnDay: engine.eventsOnDay,
    reasons: engine.reasons || [],
    golfGuidance: guidance.golf,
    gymGuidance: guidance.gym,
    engineDayType: engine.dayType,
    engineLoadLevel: engine.loadLevel,
  }
}

export function getDayLoadVisual(dayContext) {
  const level = dayContext?.dayType || dayContext?.loadLevel || 'training'
  const map = {
    rest: { bg: '#E5E7EB', text: '#374151', border: '#9CA3AF', pattern: 'solid' },
    recovery: { bg: '#E6F1FB', text: '#0C447C', border: '#9CC7EA', pattern: 'solid' },
    light: { bg: '#B5D4F4', text: '#042C53', border: '#7AAFE2', pattern: 'solid' },
    training: { bg: '#7DB6EA', text: '#042C53', border: '#378ADD', pattern: 'solid' },
    high_load: { bg: '#378ADD', text: '#FFFFFF', border: '#185FA5', pattern: 'solid' },
    taper: { bg: '#8EA4F8', text: '#111827', border: '#6366F1', pattern: 'solid' },
    practice_round: { bg: '#A78BFA', text: '#FFFFFF', border: '#7C3AED', pattern: 'solid' },
    competition: { bg: '#4F46E5', text: '#FFFFFF', border: '#312E81', pattern: 'solid' },
    travel: { bg: '#D3D1C7', text: '#2C2C2A', border: '#7A7870', pattern: 'dashed' },
    medical: { bg: '#FEE2E2', text: '#991B1B', border: '#F87171', pattern: 'solid' },
  }
  return map[level] || map.training
}

export function summarizeWeekFromDays(dayContexts = []) {
  const counts = {}
  ;(dayContexts || []).forEach(ctx => { counts[ctx.dayType] = (counts[ctx.dayType] || 0) + 1 })
  const dominantDayType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  const hasCompetition = dayContexts.some(ctx => ctx.dayType === 'competition')
  const hasRest = dayContexts.some(ctx => ctx.dayType === 'rest' || ctx.dayType === 'recovery')
  const loadProfile = dayContexts.map(ctx => ctx.loadLevel)
  let streak = 0
  let warning = null
  for (const ctx of dayContexts) {
    if (ctx.dayType === 'rest' || ctx.dayType === 'recovery') streak = 0
    else streak += 1
    if (streak >= 5) warning = '5+ dias seguidos sem descanso/recuperação.'
  }
  return { dominantDayType, hasCompetition, hasRest, loadProfile, warning }
}

// Count competition events whose start date falls within [fromDate, toDate).
// competitions[] must have a pre-normalised _sd field.
function countCompetitionsInRange(competitions, fromDate, toDate) {
  return competitions.filter(c => {
    const start = parseDate(c._sd)
    return start >= fromDate && start < toDate
  }).length
}

// ── Internal core phase (calendar-only, no athleteStatus, no wwd recursion) ──
// Used by weeksWithoutDescarga to inspect past weeks without infinite recursion.
function calcPhaseCore(weekStart, events) {
  const ws = toMidnight(weekStart)
  const we = new Date(ws)
  we.setDate(we.getDate() + 6)
  we.setHours(23, 59, 59, 999)

  const competitions = (events || [])
    .filter(isCompetition)
    .map(e => ({ ...e, _sd: eventDate(e), _ed: eventEndDate(e) }))
    .filter(e => e._sd)
    .sort((a, b) => a._sd.localeCompare(b._sd))

  const hasCompThisWeek = competitions.some(e => {
    const s = parseDate(e._sd), end = parseDate(e._ed)
    return s <= we && end >= ws
  })

  // Next competition strictly after this week
  let daysToPhaseComp = null
  for (const c of competitions) {
    const s = parseDate(c._sd)
    if (s > we) { daysToPhaseComp = Math.round((s - ws) / 86400000); break }
  }

  // Most recent competition that ended before this week
  let daysSincePrev = null
  for (let i = competitions.length - 1; i >= 0; i--) {
    const end = parseDate(competitions[i]._ed)
    if (end < ws) { daysSincePrev = daysDiff(end, ws); break }
  }

  const fourWeeksAgo = new Date(ws); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const compsLast4 = countCompetitionsInRange(competitions, fourWeeksAgo, ws)

  if (hasCompThisWeek) return 'PEAK'
  if (daysSincePrev !== null && daysSincePrev <= 7 && daysToPhaseComp !== null && daysToPhaseComp <= 7) return 'MANUTENCAO_B2B'
  if (daysToPhaseComp !== null && daysToPhaseComp >= 1 && daysToPhaseComp <= 7)  return 'AFINACAO'
  if (daysToPhaseComp !== null && daysToPhaseComp <= 14) return 'DESENVOLVIMENTO_LIGHT'
  if (daysToPhaseComp !== null && daysToPhaseComp <= 21) return 'DESENVOLVIMENTO'
  // No imminent competition — check calendar load
  if (compsLast4 >= 3) return 'DESCARGA'
  return 'ACUMULACAO'
}

// ── Count consecutive non-descarga/descanso weeks looking backwards ───────────
// Calls calcPhaseCore (not calcWeekPhase) to avoid recursion.
function weeksWithoutDescarga(weekStart, events, maxWeeks = 8) {
  let count = 0
  for (let i = 1; i <= maxWeeks; i++) {
    const prevWs = new Date(weekStart)
    prevWs.setDate(prevWs.getDate() - 7 * i)
    const phase = calcPhaseCore(prevWs, events)
    if (phase === 'DESCANSO' || phase === 'DESCARGA') break
    count++
  }
  return count
}

// ── Build alerts array (independent of phase) ─────────────────────────────────
function buildAlerts({ compsLast4Weeks, compsLast5Weeks, wwd, athleteStatus }) {
  const alerts = []
  const st = athleteStatus || {}

  // Athlete signals — red
  if (st.pain)
    alerts.push({ level: 'red', message: 'Dor persistente reportada — avaliar repouso imediato' })
  if (st.fatigue === 'very_high')
    alerts.push({ level: 'red', message: 'Fadiga muito alta — risco de lesão e quebra de performance' })
  if (st.performanceDrop)
    alerts.push({ level: 'red', message: 'Quebra de performance detectada — possível acumulação excessiva' })

  // Athlete signals — yellow
  if (st.fatigue === 'high')
    alerts.push({ level: 'yellow', message: 'Fadiga elevada — considerar reduzir volume esta semana' })
  if (st.saturation)
    alerts.push({ level: 'yellow', message: 'Saturação reportada — avaliar semana de descarga ou descanso' })

  // Calendar: competition density — red
  if (compsLast5Weeks >= 4)
    alerts.push({ level: 'red', message: `${compsLast5Weeks} competições nas últimas 5 semanas — carga competitiva muito alta` })
  else if (compsLast4Weeks >= 3)
    alerts.push({ level: 'yellow', message: `${compsLast4Weeks} competições nas últimas 4 semanas — considerar semana de descarga` })

  // Calendar: weeks without rest — red
  if (wwd >= 5)
    alerts.push({ level: 'red', message: `${wwd} semanas consecutivas sem descarga — risco de fadiga acumulada` })
  else if (wwd >= 3)
    alerts.push({ level: 'yellow', message: `${wwd} semanas sem descarga — monitorizar sinais de carga` })

  return alerts
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * calcWeekPhase(weekStart, events, athleteStatus?)
 *
 * @param {Date|string} weekStart     — first day of the target week
 * @param {Array}       events        — raw event rows from Supabase
 * @param {Object|null} athleteStatus — optional athlete/coach signals:
 *   {
 *     manualPhase:     'DESCANSO'|'DESCARGA'|null,  // coach override
 *     fatigue:         'none'|'moderate'|'high'|'very_high',
 *     pain:            boolean,
 *     performanceDrop: boolean,
 *     saturation:      boolean,
 *     // future RPE/ACWR fields (not required, ignored if absent):
 *     rpeSession:      number|null,
 *     weeklyLoad:      number|null,
 *     chronicLoad:     number|null,
 *     acwr:            number|null,
 *   }
 * @returns {Object} phase descriptor (see inline comments)
 */
export function calcWeekPhase(weekStart, events, athleteStatus = null) {
  const ws = toMidnight(weekStart)
  const we = new Date(ws)
  we.setDate(we.getDate() + 6)
  we.setHours(23, 59, 59, 999)

  const st = athleteStatus || {}

  // Normalise competition list once
  const competitions = (events || [])
    .filter(isCompetition)
    .map(e => ({ ...e, _sd: eventDate(e), _ed: eventEndDate(e) }))
    .filter(e => e._sd)
    .sort((a, b) => a._sd.localeCompare(b._sd))

  // ── Competition this week ──────────────────────────────────────────────────
  const thisWeekComps = competitions.filter(e => {
    const s = parseDate(e._sd), end = parseDate(e._ed)
    return s <= we && end >= ws
  })
  const hasCompThisWeek = thisWeekComps.length > 0

  // ── Nearest upcoming competition (for display countdown from today) ────────
  let daysToNextCompetition = null
  let nextCompEvent = null
  for (const c of competitions) {
    const s = parseDate(c._sd)
    if (s >= ws) {
      daysToNextCompetition = Math.round((s - ws) / 86400000)
      nextCompEvent = c
      break
    }
  }

  // ── Next competition strictly after this week (for phase rules) ────────────
  let daysToPhaseComp = null
  let phaseCompEvent = null
  for (const c of competitions) {
    const s = parseDate(c._sd)
    if (s > we) {
      daysToPhaseComp = Math.round((s - ws) / 86400000)
      phaseCompEvent = c
      break
    }
  }

  // ── Previous competition that ended before this week ──────────────────────
  let daysSincePreviousCompetition = null
  for (let i = competitions.length - 1; i >= 0; i--) {
    const end = parseDate(competitions[i]._ed)
    if (end < ws) {
      daysSincePreviousCompetition = daysDiff(end, ws)
      break
    }
  }

  // ── Competition density (recent blocks) ───────────────────────────────────
  const fourWeeksAgo = new Date(ws); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const fiveWeeksAgo = new Date(ws); fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35)
  const compsLast4Weeks = countCompetitionsInRange(competitions, fourWeeksAgo, ws)
  const compsLast5Weeks = countCompetitionsInRange(competitions, fiveWeeksAgo, ws)

  // ── Consecutive weeks without descarga/descanso ───────────────────────────
  const wwd = weeksWithoutDescarga(ws, events)

  // ── Alerts (independent of phase) ────────────────────────────────────────
  const alerts = buildAlerts({ compsLast4Weeks, compsLast5Weeks, wwd, athleteStatus: st })

  // ── Phase classification (priority order) ─────────────────────────────────
  let phase
  const reasons = []

  // Priority 1 — athlete DESCANSO (manual override OR severe athlete signals)
  if (
    st.manualPhase === 'DESCANSO' ||
    (st.pain && (st.fatigue === 'very_high' || st.fatigue === 'high'))
  ) {
    phase = 'DESCANSO'
    reasons.push(
      st.manualPhase === 'DESCANSO'
        ? 'Coach definiu semana de descanso'
        : 'Dor persistente com fadiga elevada — descanso necessário'
    )

  // Priority 2 — athlete DESCARGA (manual override by coach)
  } else if (st.manualPhase === 'DESCARGA') {
    phase = 'DESCARGA'
    reasons.push('Coach definiu semana de descarga')

  // Priority 3 — competition this week → PEAK
  } else if (hasCompThisWeek) {
    phase  = 'PEAK'
    reasons.push(`Competição esta semana: ${thisWeekComps.map(e => e.title).join(', ')}`)

  // Priority 4 — back-to-back → MANUTENCAO_B2B
  } else if (
    daysSincePreviousCompetition !== null && daysSincePreviousCompetition <= 7 &&
    daysToPhaseComp              !== null && daysToPhaseComp              <= 7
  ) {
    phase  = 'MANUTENCAO_B2B'
    reasons.push(
      `Back-to-back: ${daysSincePreviousCompetition}d desde a última competição, ${daysToPhaseComp}d até à próxima`
    )

  // Priority 5 — competition in 1–7 days → AFINACAO
  } else if (daysToPhaseComp !== null && daysToPhaseComp >= 1 && daysToPhaseComp <= 7) {
    phase  = 'AFINACAO'
    reasons.push(
      `Próxima competição em ${daysToPhaseComp} dia${daysToPhaseComp === 1 ? '' : 's'}: ${phaseCompEvent?.title || ''}`
    )

  // Priority 6 — competition in 8–14 days → DESENVOLVIMENTO_LIGHT
  } else if (daysToPhaseComp !== null && daysToPhaseComp <= 14) {
    phase  = 'DESENVOLVIMENTO_LIGHT'
    reasons.push(`Próxima competição em ${daysToPhaseComp} dias: ${phaseCompEvent?.title || ''}`)

  // Priority 7 — competition in 15–21 days → DESENVOLVIMENTO
  } else if (daysToPhaseComp !== null && daysToPhaseComp <= 21) {
    phase  = 'DESENVOLVIMENTO'
    reasons.push(`Próxima competição em ${daysToPhaseComp} dias: ${phaseCompEvent?.title || ''}`)

  // Priority 8 — no competition in next 22d+ (or empty calendar)
  // Check if calendar load triggers DESCARGA; otherwise ACUMULACAO
  } else {
    const calendarNeedsDescarga = compsLast4Weeks >= 3 || wwd >= 3
    if (calendarNeedsDescarga) {
      phase = 'DESCARGA'
      if (compsLast4Weeks >= 3)
        reasons.push(`${compsLast4Weeks} competições nas últimas 4 semanas — bloco intenso, descarga necessária`)
      if (wwd >= 3)
        reasons.push(`${wwd} semanas consecutivas sem descarga/descanso`)
    } else {
      phase = 'ACUMULACAO'
      reasons.push(
        daysToPhaseComp !== null
          ? `Próxima competição em ${daysToPhaseComp} dias — janela de acumulação`
          : 'Sem competições no calendário — fase de acumulação'
      )
    }
  }

  // Warn if manualPhase DESCARGA overrides a competition week
  if (phase === 'DESCARGA' && st.manualPhase === 'DESCARGA' && hasCompThisWeek) {
    alerts.push({
      level: 'yellow',
      message: 'Descarga definida manualmente apesar de existir competição esta semana — confirmar com o coach',
    })
  }

  // ── Derived display data ───────────────────────────────────────────────────
  const guide   = PHASE_GUIDELINES[phase] || PHASE_GUIDELINES.ACUMULACAO
  const heroCopy = (PHASE_FOCUS[phase] || '').split('\n').map(s => s.trim()).filter(Boolean)

  // ── Backward-compat alert fields (used by Home.jsx) ──────────────────────
  const hasRed    = alerts.some(a => a.level === 'red')
  const hasYellow = alerts.some(a => a.level === 'yellow')
  const restAlert      = hasRed || hasYellow
  const restAlertLevel = hasRed ? 'red' : hasYellow ? 'yellow' : 'none'

  const suggestedWeekType = getSuggestedWeekType(phase)

  return {
    // ── Core ──────────────────────────────────────────────────────────────
    phase,
    phaseLabel:  guide.label,
    description: guide.description,
    mood:        guide.mood,
    weekStart:   ws,
    weekEnd:     we,

    // ── Competition timing ────────────────────────────────────────────────
    daysToNextCompetition,
    nextCompetition:            nextCompEvent || null,
    daysSincePreviousCompetition,

    // ── Structured guidelines (golf + gym) ───────────────────────────────
    golf: guide.golf,
    gym:  guide.gym,

    // ── Messaging ─────────────────────────────────────────────────────────
    athleteMessage: guide.athleteMessage,
    coachGuidance:  guide.coachGuidance,

    // ── Alerts (independent of phase) ─────────────────────────────────────
    alerts,

    // ── Transparency ──────────────────────────────────────────────────────
    reasons,

    // ── Backward-compat fields consumed by existing components ────────────
    reason:                  reasons[0] || '',
    phaseColor:              PHASE_COLORS[phase],
    suggestedWeekType,
    weekTypeOverride:        null,
    effectiveWeekType:       suggestedWeekType,
    weekTypeLabel:           WEEK_TYPE_LABELS[suggestedWeekType] || WEEK_TYPE_LABELS[DEFAULT_WEEK_TYPE],
    restAlert,
    restAlertLevel,
    heroLead:                heroCopy[0] || '',
    heroGuidance:            heroCopy.slice(1).join('\n'),
    recommendedTrainingFocus: heroCopy.slice(1).join('\n'),

    // ── RPE/ACWR hook (future — not computed yet) ─────────────────────────
    // When rpeSession / weeklyLoad / chronicLoad / acwr are present in
    // athleteStatus, pass them through here for downstream consumers.
    loadMetrics: {
      rpeSession:  st.rpeSession  ?? null,
      weeklyLoad:  st.weeklyLoad  ?? null,
      chronicLoad: st.chronicLoad ?? null,
      acwr:        st.acwr        ?? null,
    },
  }
}

// ── getPeriodizationContext ───────────────────────────────────────────────────
/**
 * High-level entry point for components.
 * Accepts an options object so callers don't need to know the internal API.
 *
 * @param {Object} opts
 * @param {Array}       opts.events       — raw event rows from Supabase
 * @param {string|Date} opts.selectedDate — date within the target week (default: today)
 * @param {Object|null} opts.athleteStatus — see calcWeekPhase signature
 * @returns same shape as calcWeekPhase
 */
export function getPeriodizationContext({ events, selectedDate, athleteStatus } = {}) {
  const date = selectedDate
    ? (selectedDate instanceof Date ? selectedDate : new Date(String(selectedDate) + 'T12:00:00'))
    : new Date()
  return calcWeekPhase(date, events || [], athleteStatus || null)
}

// ── Convenience wrapper ───────────────────────────────────────────────────────
/**
 * calcCurrentPhase(events, athleteStatus?)
 * Calculates the phase for the current week.
 */
export function calcCurrentPhase(events, athleteStatus = null) {
  return calcWeekPhase(new Date(), events, athleteStatus)
}
