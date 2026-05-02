// ─── Foco ativo ────────────────────────────────────────────────────────────────
// tasks e drivers vivem dentro do foco — single source of truth.
export const activeFocus = {
  id: 'swing_speed_focus',
  name: 'Velocidade de Swing',
  metric: 'swing_speed',
  startValue: 80,
  currentValue: 80, // fallback quando não há registos
  targetValue: 95,
  unit: 'mph',
  startDate: '2026-01-20',
  objective: 'ganhar distância sem perder controlo.',

  tasks: [
    {
      id: 'speed',
      shortLabel: 'Velocidade',
      label: 'Registar velocidade 2x esta semana',
      metric: 'swing_speed',
      expectedPerWeek: 2,
      unit: 'mph',
      countLabel: 'registos',
      required: true,
    },
    {
      id: 'stack',
      shortLabel: 'The Stack',
      label: 'Treinar The Stack 3 sessões',
      metric: 'stack_speed',
      expectedPerWeek: 3,
      unit: '',
      countLabel: 'sessões',
      required: true,
    },
    {
      id: 'carry',
      shortLabel: 'Carry Driver',
      label: 'Testar carry driver (mín. 10 bolas)',
      metric: 'carry',
      expectedPerWeek: 1,
      unit: 'm',
      countLabel: 'registos',
      required: false,
    },
  ],

  // mode: 'manual'  → status + trend definidos manualmente pelo coach
  // mode: 'metric'  → valor + trend calculados a partir dos registos (linkedMetric)
  drivers: [
    { id: 'stack',    label: 'The Stack',          mode: 'metric', linkedMetric: 'stack_speed', unit: '',    status: null,    trend: null,   required: false },
    { id: 'strength', label: 'Força (Deadlift)',    mode: 'manual', linkedMetric: 'deadlift',    unit: 'kg',  status: 'Fraco', trend: 'down', required: false },
    { id: 'mobility', label: 'Mobilidade Torácica', mode: 'manual', linkedMetric: null,           unit: '',    status: 'Médio', trend: 'flat', required: false },
    { id: 'carry',    label: 'Carry Driver',        mode: 'metric', linkedMetric: 'carry',        unit: 'm',   status: null,    trend: null,   required: false },
  ],

  milestones: [
    { value: 85, unit: 'mph', label: 'Voltar aos 85 mph',  targetDate: '2026-06-01' },
    { value: 90, unit: 'mph', label: 'Chegar aos 90 mph',  targetDate: '2026-07-15' },
    { value: 95, unit: 'mph', label: 'Objetivo final',     targetDate: '2026-09-01' },
  ],
}

// ─── Helpers de tempo ─────────────────────────────────────────────────────────
export function getCurrentWeekRange(baseDate = new Date()) {
  const start = new Date(baseDate)
  const day = start.getDay()
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return {
    start,
    end,
    startStr: start.toISOString().split('T')[0],
    endStr:   end.toISOString().split('T')[0],
  }
}

// ─── Métricas registáveis — fonte única ──────────────────────────────────────
// Retorna lista ordenada: métrica principal → tasks → drivers
// Usado em Track Progress E no modal do Overview.
export function getFocusMetricOptions(focus = activeFocus) {
  const seen = new Set()
  const result = []
  const add = (value, label, unit, source) => {
    if (value && !seen.has(value)) {
      seen.add(value)
      result.push({ value, label: label.replace(/\s+\d+x.*$/i, '').replace(/\s*\(.*\)/, '').trim(), unit: unit || '', source })
    }
  }
  add(focus.metric, focus.name, focus.unit, 'main')
  ;(focus.tasks || []).forEach(t => add(t.metric, t.shortLabel || t.label, t.unit, 'task'))
  ;(focus.drivers || []).forEach(d => { if (d.linkedMetric) add(d.linkedMetric, d.label, d.unit, 'driver') })
  return result
}

// ─── Compliance ────────────────────────────────────────────────────────────────
// Status é determinado apenas pelas tasks com required: true.
// Tasks opcionais são contadas mas não afetam o status geral.
export function getFocusCompliance(focus = activeFocus, logs = [], baseDate = new Date()) {
  const week = getCurrentWeekRange(baseDate)
  const tasks = focus.tasks || []
  const counts = {}

  tasks.forEach(task => {
    const expected = task.expectedPerWeek ?? 0
    const done = logs.filter(log =>
      log.metric_id === task.metric &&
      log.value != null && log.value !== '' &&
      log.entry_date >= week.startStr && log.entry_date <= week.endStr
    ).length
    counts[task.id] = {
      ...task,
      expected,
      done,
      missing:  Math.max(0, expected - done),
      complete: expected > 0 && done >= expected,
    }
  })

  const missingRequired = tasks
    .filter(t => t.required)
    .map(t => counts[t.id])
    .filter(t => t && t.missing > 0)

  const focusLogs = logs
    .filter(log => log.metric_id === focus.metric && log.value && log.entry_date)
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
  const lastLog = focusLogs[0] || null
  const daysSinceLast = lastLog
    ? Math.floor((new Date(baseDate.toDateString()) - new Date(lastLog.entry_date + 'T00:00:00')) / 86400000)
    : null

  const status = !lastLog || daysSinceLast > 10 ? 'overdue'
    : missingRequired.length ? 'warning'
    : 'ok'

  return { week, tasks: counts, missingRequired, lastLog, daysSinceLast, status }
}

// ─── Alerta Overview ──────────────────────────────────────────────────────────
export function getOverviewFocusAlert(focus = activeFocus, logs = [], baseDate = new Date()) {
  const compliance = getFocusCompliance(focus, logs, baseDate)

  if (compliance.status === 'ok') {
    return { status: 'ok', title: 'Foco em dia', message: 'Continua assim.', lines: [], compliance }
  }

  if (!compliance.lastLog) {
    return { status: 'overdue', title: 'Sem dados recentes', message: 'Regista o primeiro valor para começar o acompanhamento.', lines: [], compliance }
  }

  if (compliance.daysSinceLast > 10) {
    return {
      status: 'overdue',
      title: 'Atenção ao foco atual',
      message: `Último registo há ${compliance.daysSinceLast} dias.`,
      lines: [],
      compliance,
    }
  }

  // warning: mostrar contagens por task obrigatória
  const lines = compliance.missingRequired.map(t =>
    `${t.shortLabel || t.id}: ${Math.min(t.done, t.expected)}/${t.expected}${t.countLabel ? ' ' + t.countLabel : ''}`
  )
  return {
    status: 'warning',
    title: 'Esta semana está incompleta',
    message: '',
    lines,
    compliance,
  }
}

// ─── Drivers ─────────────────────────────────────────────────────────────────
// Calcula o que mostrar para cada driver, com base no mode.
export function getDriverDisplay(driver, entries = []) {
  if (driver.mode === 'manual') {
    const color = driver.trend === 'up' ? '#16A34A' : driver.trend === 'down' ? '#EF4444' : '#D97706'
    const arrow = driver.trend === 'up' ? '↑' : driver.trend === 'down' ? '↓' : '→'
    return { value: driver.status || '—', arrow, color, hasData: !!driver.status }
  }

  // mode: 'metric'
  if (!driver.linkedMetric) return { value: 'Sem dados', arrow: '—', color: '#94A3B8', hasData: false }

  const logs = entries
    .filter(e => e.metric_id === driver.linkedMetric && e.value && e.entry_date)
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date))

  const last = logs[0]
  if (!last) return { value: 'Sem dados', arrow: '—', color: '#94A3B8', hasData: false }

  const lastVal = Number(last.value)
  const prev    = logs[1]
  const delta   = prev ? lastVal - Number(prev.value) : null
  const color   = delta == null ? '#64748B' : delta > 0 ? '#16A34A' : delta < 0 ? '#EF4444' : '#D97706'
  const arrow   = delta == null ? '→' : delta > 0 ? '↑' : delta < 0 ? '↓' : '→'

  return {
    value:   `${lastVal}${driver.unit ? ' ' + driver.unit : ''}`,
    arrow,
    color,
    hasData: true,
  }
}

// ─── Análise automática ───────────────────────────────────────────────────────
export function getFocusAnalysis(focus = activeFocus, compliance, trend) {
  const startVal = focus.startValue ?? focus.currentValue

  if (!compliance?.lastLog) {
    return 'Ainda sem dados de evolução. Regista os primeiros valores para acompanhar o progresso.'
  }
  if (compliance.status === 'ok' && trend != null && trend >= 0) {
    return `Evolução positiva${trend > 0 ? `: +${Math.round(trend)} ${focus.unit}` : ''}. Continua assim.`
  }
  if (trend != null && trend < 0) {
    return `Abaixo da linha esperada. Próximo passo: recuperar e voltar aos ${startVal} ${focus.unit}.`
  }
  return `A trabalhar para os ${focus.targetValue} ${focus.unit}. Mantém a regularidade dos registos.`
}
