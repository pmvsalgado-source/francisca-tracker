# Golf Training Periodization Engine Export

Source module: `src/lib/periodization.js`

This document contains only the logic layer relevant to phase assignment, daily prescriptions, competition-derived scheduling, and 30-day calendar state. It excludes UI components, styling, persistence, and unrelated modules.

## Conceptual Model

- Mesocycle: strategic context.
- Microcycle/week: organizational layer.
- Day: execution layer.
- Competition: anchor for daily prescription.
- All calculated periodization fields are derived from events and are not stored in the database.

## Competition Calendar Input Model

Competition and calendar events are consumed as plain objects. The periodization engine reads these fields:

```ts
type CalendarEvent = {
  title?: string
  category?: string
  status?: string
  start_date?: string // YYYY-MM-DD
  end_date?: string   // YYYY-MM-DD, optional. Defaults to start_date.
  date?: string       // fallback date field
  start?: string      // fallback date field
  end?: string        // fallback end date field

  // Optional travel/international hints:
  international?: boolean
  is_international?: boolean
  scope?: string
  level?: string
  tour_type?: string
  competition_scope?: string
  tags?: string
  notes?: string
  type?: string
}
```

Valid periodization competitions:

```js
const COMP_KEYWORDS = [
  'competi', 'torneio', ' cup', 'championship', 'stroke play',
  'stableford', 'matchplay', 'match play', 'medal play', 'pro-am', 'proam',
  'open ', ' open', 'nacional', 'regional',
]

const VALID_PERIODIZATION_STATUSES = new Set([
  'confirmed', 'played', 'confirmado', 'jogado', 'concluido', 'concluído',
])

export function isCompetition(event) {
  const cat = (event.category || '').toLowerCase()
  const title = (event.title || '').toLowerCase()
  return COMP_KEYWORDS.some(kw => cat.includes(kw) || title.includes(kw))
}

export function isPeriodizationCompetition(event) {
  if (!isCompetition(event)) return false
  if (!event.status) return false
  const normalized = event.status.toString().trim().toLowerCase()
  return VALID_PERIODIZATION_STATUSES.has(normalized)
}
```

Statuses not counted: `optional`, `opcional`, `cancelled`, `cancelado`, `planned`, `planeado`, `draft`, `rascunho`, missing status.

Multi-day competitions:

- Every day between `start_date` and `end_date` is treated as competition.
- The day immediately before `start_date` is a practice round.
- The 1-2 days after `end_date` are recovery.

## Weekly Phase Constants

```js
export const PHASE_LABELS = {
  DESCANSO: 'Descanso',
  DESCARGA: 'Descarga',
  PEAK: 'Competição',
  MANUTENCAO_B2B: 'Manutenção B2B',
  AFINACAO: 'Afinação',
  DESENVOLVIMENTO_LIGHT: 'Desenvolvimento Light',
  DESENVOLVIMENTO: 'Desenvolvimento',
  ACUMULACAO: 'Acumulação',
}

export const WEEK_TYPES = {
  LOAD: 'load',
  DELOAD: 'deload',
  COMPETITION: 'competition',
  TRANSITION: 'transition',
}

export const WEEK_TYPE_LABELS = {
  load: 'Carga',
  deload: 'Descarga',
  competition: 'Competição',
  transition: 'Transição',
}
```

Suggested week type from weekly phase:

```js
export function getSuggestedWeekType(phase) {
  if (phase === 'PEAK') return WEEK_TYPES.COMPETITION
  if (phase === 'MANUTENCAO_B2B') return WEEK_TYPES.TRANSITION
  if (phase === 'DESCARGA' || phase === 'DESCANSO') return WEEK_TYPES.DELOAD
  return WEEK_TYPES.LOAD
}
```

## Weekly Phase Engine

Entry point:

```js
calcWeekPhase(weekStart, events, athleteStatus?)
```

Weekly phase priority:

1. `DESCANSO`: manual athlete signal/coach override or severe pain/fatigue.
2. `DESCARGA`: manual coach override.
3. `PEAK`: valid competition overlaps this week.
4. `MANUTENCAO_B2B`: competition ended in the last 7 days and next competition is within 7 days.
5. `AFINACAO`: next competition is 1-7 days after this week.
6. `DESENVOLVIMENTO_LIGHT`: next competition is 8-14 days away.
7. `DESENVOLVIMENTO`: next competition is 15-21 days away.
8. `DESCARGA`: no imminent competition and calendar load triggers recovery, e.g. 3+ competitions in last 4 weeks or 3+ weeks without deload/rest.
9. `ACUMULACAO`: default base/build phase.

Weekly phase output model:

```ts
type WeekPhaseContext = {
  phase: 'DESCANSO' | 'DESCARGA' | 'PEAK' | 'MANUTENCAO_B2B' |
         'AFINACAO' | 'DESENVOLVIMENTO_LIGHT' |
         'DESENVOLVIMENTO' | 'ACUMULACAO'
  phaseLabel: string
  description: string
  mood: string
  weekStart: Date
  weekEnd: Date
  daysToNextCompetition: number | null
  nextCompetition: CalendarEvent | null
  daysSincePreviousCompetition: number | null
  golf: {
    volume: string
    intensity: string
    focus: string
    rules: string
  }
  gym: {
    volume: string
    intensity: string
    focus: string
    rules: string
  }
  athleteMessage: string
  coachGuidance: string
  alerts: Array<{ level: 'red' | 'yellow', message: string }>
  reasons: string[]
  reason: string
  phaseColor: string
  suggestedWeekType: 'load' | 'deload' | 'competition' | 'transition'
  weekTypeOverride: string | null
  effectiveWeekType: 'load' | 'deload' | 'competition' | 'transition'
  weekTypeLabel: string
  restAlert: boolean
  restAlertLevel: 'red' | 'yellow' | 'none'
  loadMetrics: {
    rpeSession: number | null
    weeklyLoad: number | null
    chronicLoad: number | null
    acwr: number | null
  }
}
```

## Daily Periodization Constants

Daily type labels:

```js
const DAY_TYPE_LABELS = {
  high_load: 'Treino forte',
  training: 'Treino',
  light: 'Treino leve',
  taper: 'Preparação',
  practice_round: 'Volta de treino',
  competition: 'Competição',
  recovery: 'Recuperação',
  rest: 'Descanso',
  travel: 'Viagem',
  medical: 'Médico/Fisio',
}
```

Cycle phase labels:

```js
const CYCLE_PHASE_LABELS = {
  load: 'Construção',
  taper: 'Preparação para competir',
  competition: 'Competição',
  recovery: 'Recuperação',
  base: 'Base',
}
```

Load labels:

```js
const LOAD_LABELS = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  recovery: 'Muito baixa',
  rest: 'Zero',
  adjusted: 'Ajustada',
}
```

## Training Day Data Model

Returned by:

```js
getDayPeriodizationContext({ date, events })
```

```ts
type DayPeriodizationContext = {
  date: string // YYYY-MM-DD

  // What the athlete does today:
  dayType:
    | 'training'
    | 'high_load'
    | 'light'
    | 'taper'
    | 'practice_round'
    | 'competition'
    | 'recovery'
    | 'rest'
    | 'travel'
    | 'medical'
  dayTypeLabel: string
  actionSummary: string

  // Load:
  loadLevel: 'high' | 'medium' | 'low' | 'recovery' | 'rest' | 'adjusted'
  loadLabel: string
  loadSummary: string

  // Cycle phase:
  cyclePhase: 'base' | 'load' | 'taper' | 'competition' | 'recovery'
  cyclePhaseLabel: string
  phaseSummary: string

  // Competition anchor:
  nextCompetition: CalendarEvent | null
  daysToCompetition: number | null
  eventsOnDay: CalendarEvent[]

  // Explanation:
  why: string
  reasons: string[]

  // Prescription guidance:
  golfGuidance: string
  gymGuidance: string
}
```

## Daily Assignment Logic

```js
export function getDayPeriodizationContext({ date, events } = {}) {
  const dateStr = normalizeDate(date)
  const dayEvents = eventsForDate(events, dateStr)

  const validCompetitions = events
    .filter(isPeriodizationCompetition)
    .map(normalizeCompetition)
    .sort(byStartDate)

  const competitionToday =
    validCompetitions.find(c => dateStr >= c._sd && dateStr <= c._ed) || null

  const nextCompetition =
    validCompetitions.find(c => c._sd >= dateStr) || null

  const previousCompetition =
    [...validCompetitions].reverse().find(c => c._ed < dateStr) || null

  const practiceRoundCompetition =
    validCompetitions.find(c => daysBetween(dateStr, c._sd) === 1) || null

  const recoveryCompetition =
    previousCompetition && daysBetween(previousCompetition._ed, dateStr) <= 2
      ? previousCompetition
      : null

  let dayType = 'training'
  let cyclePhase = 'base'
  const reasons = []

  if (explicit medical event on this day) {
    dayType = 'medical'
  } else if (explicit travel event and international competition exists) {
    dayType = 'travel'
  } else if (competitionToday) {
    dayType = 'competition'
  } else if (practiceRoundCompetition) {
    dayType = 'practice_round'
  } else if (recoveryCompetition) {
    dayType = 'recovery'
  } else if (Monday and no event) {
    dayType = 'rest'
  }

  if (competitionToday) {
    cyclePhase = 'competition'
  } else if (recoveryCompetition) {
    cyclePhase = 'recovery'
  } else if (nextCompetition is 1-3 days away) {
    cyclePhase = 'taper'
  } else if (nextCompetition is 4-14 days away) {
    cyclePhase = 'load'
  } else {
    cyclePhase = 'base'
  }

  if (dayType === 'training') {
    const weekPhase = calcWeekPhase(dateStr, validCompetitions).phase

    if (cyclePhase === 'taper') {
      dayType = 'taper'
    } else if (cyclePhase === 'load') {
      dayType = ['ACUMULACAO', 'DESENVOLVIMENTO'].includes(weekPhase)
        ? 'high_load'
        : 'training'
    } else if (['DESCARGA', 'DESCANSO', 'MANUTENCAO_B2B'].includes(weekPhase)) {
      dayType = 'light'
    }
  }

  const loadLevel = dayLoadLevel(dayType)
  const guidance = dayGuidance(dayType, cyclePhase)
  const interpretation = dayInterpretation(dayType, cyclePhase)

  return {
    date: dateStr,
    dayType,
    dayTypeLabel: DAY_TYPE_LABELS[dayType],
    cyclePhase,
    cyclePhaseLabel: CYCLE_PHASE_LABELS[cyclePhase],
    loadLevel,
    loadLabel: LOAD_LABELS[loadLevel],
    ...interpretation,
    nextCompetition: relatedCompetition,
    daysToCompetition,
    eventsOnDay: dayEvents,
    reasons,
    golfGuidance: guidance.golf,
    gymGuidance: guidance.gym,
  }
}
```

Daily interpretation copy:

```js
const DAILY_INTERPRETATION = {
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
```

## Daily Guidance Logic

```js
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
```

## Daily Visual State Logic

Returned by:

```js
getDayLoadVisual(dayContext)
```

This is visual metadata only. It does not alter phase logic.

```js
const DAY_LOAD_VISUALS = {
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
```

## 30-Day Calendar Generation Logic

The 30-day calendar is generated from the current date and `events`. Each day is recalculated from the event list:

```js
const start = new Date(todayStr + 'T12:00:00')

const next30Days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(start)
  d.setDate(start.getDate() + i)
  const date = d.toISOString().split('T')[0]
  return getDayPeriodizationContext({ date, events })
})

const dayTiles = next30Days.map(dayContext => {
  const visual = getDayLoadVisual(dayContext)
  const weeklyPhase = calcWeekPhase(weekStartForDate(dayContext.date), validCompetitions)
  const hasAlert = weeklyPhase.alerts.length > 0

  return {
    date: dayContext.date,
    dayType: dayContext.dayType,
    actionSummary: dayContext.actionSummary,
    loadSummary: dayContext.loadSummary,
    why: dayContext.why,
    phaseSummary: dayContext.phaseSummary,
    competition: dayContext.nextCompetition,
    daysToCompetition: dayContext.daysToCompetition,
    visual,
    hasAlert,
  }
})
```

Tile color/state is driven by:

- `getDayPeriodizationContext({ date, events })`
- `getDayLoadVisual(dayContext)`
- weekly alerts from `calcWeekPhase(weekStart, validCompetitions)`

No daily periodization state is stored.

## Weekly Summary From Daily Contexts

Prepared helper:

```js
export function summarizeWeekFromDays(dayContexts = []) {
  const counts = {}
  dayContexts.forEach(ctx => {
    counts[ctx.dayType] = (counts[ctx.dayType] || 0) + 1
  })

  const dominantDayType =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  const hasCompetition =
    dayContexts.some(ctx => ctx.dayType === 'competition')

  const hasRest =
    dayContexts.some(ctx => ctx.dayType === 'rest' || ctx.dayType === 'recovery')

  const loadProfile =
    dayContexts.map(ctx => ctx.loadLevel)

  let streak = 0
  let warning = null
  for (const ctx of dayContexts) {
    if (ctx.dayType === 'rest' || ctx.dayType === 'recovery') streak = 0
    else streak += 1
    if (streak >= 5) warning = '5+ dias seguidos sem descanso/recuperação.'
  }

  return {
    dominantDayType,
    hasCompetition,
    hasRest,
    loadProfile,
    warning,
  }
}
```

## Important Non-Logic Notes

- Manual weekly `week_type` overrides are operational and separate from calculated weekly phase.
- Daily `dayType`, `loadLevel`, and `cyclePhase` are never persisted.
- The weekly phase engine `calcWeekPhase` remains the source of truth for weekly phase.
- The daily engine explains the role of a specific day relative to competitions and weekly phase.
