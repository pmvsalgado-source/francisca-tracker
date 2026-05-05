import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Dumbbell, Flag, SlidersHorizontal, Trophy } from 'lucide-react'
import { getPeriodizationDayContext } from '../lib/periodization/context.js'
import { toDateKey } from '../lib/periodization/date.js'
import { normalizeEventsForPeriodization } from '../lib/calendar/eventPeriodizationAdapter'
import { getPublicGolfState } from '../lib/periodizationViewModel.js'

const F = "'Inter', system-ui, sans-serif"
const PHASE_LABELS = {
  ACCUMULATION: 'ACUMULAÇÃO',
  DEVELOPMENT: 'DESENVOLVIMENTO',
  DELOAD: 'DELOAD',
  PRE_COMP: 'PRÉ-COMPETIÇÃO',
  MAINTENANCE_B2B: 'MANUTENÇÃO',
  RECOVERY: 'RECUPERAÇÃO',
  COMPETITION: 'COMPETIÇÃO',
  PEAK: 'PEAK / AFINAÇÃO',
  AFINACAO: 'PEAK / AFINAÇÃO',
}

const MESOCYCLE_LABELS = {
  DEVELOPMENT_BLOCK: 'CONSTRUÇÃO',
  PRE_COMP: 'PRÉ-COMPETIÇÃO',
  MAINTENANCE_B2B: 'MANUTENÇÃO',
  BASE: 'BASE',
}

const DAY_TYPE_LABELS = {
  COMPETITION: 'Competição',
  TRAVEL: 'Viagem',
  REST: 'Descanso',
  POST_COMP_RECOVERY: 'Recuperação pós-competição',
  RECOVERY: 'Recuperação',
  LOW_LOAD: 'Carga baixa',
  MEDIUM_LOAD: 'Carga média',
  HIGH_LOAD: 'Carga alta',
  PRE_COMP_LIGHT: 'Preparação leve',
  ASSESSMENT: 'Avaliação',
}

const LOAD_LABELS = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
  RECOVERY: 'Recuperação',
  REST: 'Descanso',
}

const GYM_PHASE_LABELS = {
  BUILD: 'Força / Potência',
  MAINTENANCE: 'Manutenção leve',
  TAPER: 'Ativação / Taper',
  RECOVERY: 'Recuperação',
  BLOCKED: 'Recuperação',
}

function getPublicGymPhaseLabel(gymPhase) {
  const raw = String(gymPhase || '').trim()
  const upper = raw.toUpperCase()
  const lower = raw.toLowerCase()
  if (!raw) return 'Recuperação'
  if (upper.includes('MOBILITY') || upper.includes('RECOVERY') || lower.includes('recuper')) return 'Recuperação'
  if (upper.includes('MINIMUM') || upper.includes('MAINTENANCE') || lower.includes('maintenance')) return 'Manutenção'
  if (upper.includes('ACTIVATION') || upper.includes('TAPER') || lower.includes('ativ')) return 'Ativação / Taper'
  if (upper.includes('STRENGTH') || upper.includes('POWER') || upper.includes('BUILD') || lower.includes('força') || lower.includes('potência')) return 'Força / Potência'
  return GYM_PHASE_LABELS[upper] || raw
}

const FOCUS_LABELS = {
  strength: 'Força',
  power: 'Potência',
  speed: 'Velocidade',
  activation: 'Ativação',
  mobility: 'Mobilidade',
  core: 'Core',
  prevention: 'Prevenção',
}

const golfScale = {
  REST: { color: '#dbeafe', text: '#365174', h: 24, label: 'Recuperação' },
  RECOVERY: { color: '#bfdbfe', text: '#365174', h: 30, label: 'Recuperação' },
  LOW: { color: '#7eb2ff', text: '#1e3a8a', h: 42, label: 'Baixa' },
  MEDIUM: { color: '#2f6df2', text: '#ffffff', h: 54, label: 'Média' },
  HIGH: { color: '#0f4bc7', text: '#ffffff', h: 66, label: 'Alta' },
  COMPETITION: { color: '#2F3E6B', text: '#ffffff', h: 60, label: 'Competição' },
}

const gymScale = {
  none: { color: '#E5E7EB', text: '#94a3b8', h: 18, label: 'OFF' },
  C: { color: '#B7E4C7', text: '#166534', h: 42, label: 'Mobilidade' },
  B: { color: '#52B788', text: '#14532d', h: 54, label: 'Ativação' },
  A: { color: '#2D6A4F', text: '#ffffff', h: 66, label: 'Força' },
}

const panel = {
  background: '#ffffff',
  border: '1px solid #dde5f0',
  borderRadius: '12px',
  boxShadow: '0 14px 36px rgba(15, 23, 42, 0.06)',
}
const TRACK_ACCENT = {
  golf: '#123fc7',
  gym: '#0c8f56',
}
const TRACK_TITLE = {
  fontSize: 17,
  fontWeight: 900,
  lineHeight: 1.15,
  textTransform: 'uppercase',
}
const TRACK_SUBTITLE = {
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.35,
  color: '#263653',
  opacity: 0.7,
}
const PILL_FRAME = {
  height: 28,
  padding: '0 12px',
  borderRadius: 999,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  overflow: 'hidden',
}
const PILL_PHASE = {
  ...PILL_FRAME,
  fontSize: 10,
  fontWeight: 600,
}
const PILL_LOAD = {
  ...PILL_FRAME,
  fontSize: 10,
  fontWeight: 600,
}
/** Local calendar YYYY-MM-DD (same as periodization engine). Never use toISOString().slice(0,10) â€” that is UTC and can shift the day. */
function toDateStr(date) {
  return toDateKey(date)
}

function addDays(date, count) {
  const d = new Date(date)
  d.setDate(d.getDate() + count)
  d.setHours(12, 0, 0, 0)
  return d
}

function startOfWeek(date) {
  const d = new Date(date)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  d.setHours(12, 0, 0, 0)
  return d
}

function startOfMonth(date) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(12, 0, 0, 0)
  return d
}

function startOfYear(date) {
  const d = new Date(date)
  d.setMonth(0, 1)
  d.setHours(12, 0, 0, 0)
  return d
}

function addMonths(date, count) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + count, 1)
  d.setHours(12, 0, 0, 0)
  return d
}

function formatDate(dateStr, options) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-PT', options)
}

function relationLabel(ctx) {
  if (ctx.daysToNextCompetition != null) return ctx.daysToNextCompetition === 0 ? 'D-DIA' : `D-${ctx.daysToNextCompetition}`
  if (ctx.daysSinceLastCompetition != null) return `D+${ctx.daysSinceLastCompetition}`
  return 'Sem prova'
}

function annotateCompetitionBlocks(days) {
  const blocks = []
  let current = null
  days.forEach(day => {
    if (day.dayType !== 'COMPETITION') {
      if (current) blocks.push(current)
      current = null
      return
    }
    if (!current) current = { start: day.date, end: day.date }
    else current.end = day.date
  })
  if (current) blocks.push(current)

  return days.map(day => {
    const activeBlock = blocks.find(block => day.date >= block.start && day.date <= block.end)
    const nextBlock = activeBlock || blocks.find(block => day.date < block.start)
    const isBlockStart = Boolean(activeBlock && day.date === activeBlock.start)
    let relation = ''
    if (day.dayType === 'COMPETITION') {
      relation = isBlockStart ? 'D-DIA' : ''
    } else if (nextBlock) {
      const diff = Math.round((new Date(`${nextBlock.start}T12:00:00`) - new Date(`${day.date}T12:00:00`)) / 86400000)
      relation = diff >= 0 ? (diff === 0 ? 'D-DIA' : `D-${diff}`) : ''
    } else if (day.daysSinceLastCompetition != null) {
      relation = `D+${day.daysSinceLastCompetition}`
    } else {
      relation = relationLabel(day)
    }
    return {
      ...day,
      uiCompetitionBlockStartDate: activeBlock?.start || null,
      uiIsCompetitionBlockStart: isBlockStart,
      uiNextCompetitionBlockStartDate: nextBlock?.start || null,
      uiRelationLabel: relation,
    }
  })
}

function applyCompetitionDayTruth(days, competitionEvents) {
  const anchors = (competitionEvents || [])
    .map(event => ({
      start: event?.start_date || event?.date || null,
      end: event?.end_date || event?.start_date || event?.date || null,
      title: event?.title || '',
    }))
    .filter(anchor => anchor.start && anchor.end)

  if (anchors.length === 0) return days

  return days.map(day => {
    const competitionAnchor = anchors.find(anchor => day.date >= anchor.start && day.date <= anchor.end) || null
    if (!competitionAnchor) return day
    return {
      ...day,
      dayType: 'COMPETITION',
      competitionToday: day.competitionToday || {
        title: competitionAnchor.title,
        start_date: competitionAnchor.start,
        end_date: competitionAnchor.end,
      },
    }
  })
}

function displayRelationLabel(ctx) {
  return ctx.uiRelationLabel || ''
}

function getGolfVisual(ctx) {
  if (ctx.dayType === 'COMPETITION') return golfScale.COMPETITION
  if (ctx.dayType === 'POST_COMP_RECOVERY') return golfScale.RECOVERY
  if (ctx.dayType === 'PRE_COMP_LIGHT') return golfScale.LOW
  if (ctx.dayType === 'ASSESSMENT') return golfScale.MEDIUM
  return golfScale[ctx.loadLevel] || golfScale.MEDIUM
}

function getGolfRenderState(ctx) {
  if (ctx.dayType === 'COMPETITION') {
    const competitionState = {
      label: 'COMPETIÇÃO',
      renderedLabel: 'COMPETIÇÃO',
      colorKey: 'COMPETITION',
      renderedColorKey: 'COMPETITION',
      loadKey: 'COMPETITION',
      visual: golfScale.COMPETITION,
      barColor: golfScale.COMPETITION.color,
      barHeight: golfScale.COMPETITION.h,
    }
    return competitionState
  }
  if (ctx.dayType === 'POST_COMP_RECOVERY') {
    return { label: 'Recovery', renderedLabel: 'Recovery', colorKey: 'RECOVERY', renderedColorKey: 'RECOVERY', loadKey: 'RECOVERY', visual: golfScale.RECOVERY, barColor: golfScale.RECOVERY.color, barHeight: golfScale.RECOVERY.h }
  }
  if (ctx.dayType === 'PRE_COMP_LIGHT') {
    return { label: PHASE_LABELS[ctx.phase] || ctx.phase || 'PRÉ-COMPETIÇÃO', renderedLabel: PHASE_LABELS[ctx.phase] || ctx.phase || 'PRÉ-COMPETIÇÃO', colorKey: 'PRE_COMP_LIGHT', renderedColorKey: 'PRE_COMP_LIGHT', loadKey: 'LOW', visual: golfScale.LOW, barColor: golfScale.LOW.color, barHeight: golfScale.LOW.h }
  }
  if (ctx.dayType === 'ASSESSMENT') {
    return { label: PHASE_LABELS[ctx.phase] || ctx.phase || 'ASSESSMENT', renderedLabel: PHASE_LABELS[ctx.phase] || ctx.phase || 'ASSESSMENT', colorKey: 'ASSESSMENT', renderedColorKey: 'ASSESSMENT', loadKey: 'MEDIUM', visual: golfScale.MEDIUM, barColor: golfScale.MEDIUM.color, barHeight: golfScale.MEDIUM.h }
  }
  const colorKey = ctx.loadLevel || 'MEDIUM'
  const loadState = {
    label: PHASE_LABELS[ctx.phase] || ctx.phase || colorKey,
    renderedLabel: PHASE_LABELS[ctx.phase] || ctx.phase || colorKey,
    colorKey,
    renderedColorKey: colorKey,
    loadKey: colorKey,
    visual: golfScale[colorKey] || golfScale.MEDIUM,
    barColor: (golfScale[colorKey] || golfScale.MEDIUM).color,
    barHeight: (golfScale[colorKey] || golfScale.MEDIUM).h,
  }
  return loadState
}

function getGymVisual(ctx) {
  const rec = ctx.gymRecommendation || {}
  if (!rec.sessionAllowed || !rec.sessionType) return gymScale.none
  return gymScale[rec.sessionType] || gymScale.none
}

function phaseRangeLabel(ctx, track) {
  if (track === 'golf') {
    return PHASE_LABELS[ctx.phase] || ctx.phase || '-'
  }
  return getPublicGymPhaseLabel(ctx.gymRecommendation?.gymPhase)
}

function buildRanges(days, track) {
  const ranges = []
  let current = null
  days.forEach((day, index) => {
    const label = phaseRangeLabel(day, track)
    if (current && current.label === label) {
      current.end = index
      return
    }
    if (current) ranges.push(current)
    current = { label, start: index, end: index }
  })
  if (current) ranges.push(current)
  return ranges
}

function buildMonthRanges(days) {
  const ranges = []
  let current = null
  days.forEach((day, index) => {
    const key = day.date.slice(0, 7)
    if (current && current.key === key) {
      current.end = index
      return
    }
    if (current) ranges.push(current)
    current = {
      key,
      start: index,
      end: index,
      label: (() => {
        const month = formatDate(`${key}-01`, { month: 'long' }).replace('.', '')
        return month.charAt(0).toUpperCase() + month.slice(1)
      })(),
    }
  })
  if (current) ranges.push(current)
  return ranges
}

function buildLoadRanges(days) {
  const ranges = []
  let current = null
  days.forEach((day, index) => {
    const state = getPublicGolfState(day)
    const label = state?.loadLabel || '-'
    const colorKey = state?.colorKey || 'MEDIUM'
    if (current && current.label === label && current.colorKey === colorKey) {
      current.end = index
      return
    }
    if (current) ranges.push(current)
    current = { label, colorKey, start: index, end: index }
  })
  if (current) ranges.push(current)
  return ranges
}

function getPublicGymLoadLabel(gym) {
  if (!gym?.sessionAllowed || !gym?.sessionType) return 'OFF'
  const key = String(gym.sessionType).toUpperCase()
  if (key === 'POWER' || key === 'A' || key === 'STRENGTH') return 'ALTA'
  if (key === 'B' || key === 'ACTIVATION') return 'MÉDIA'
  if (key === 'C' || key === 'MOBILITY') return 'BAIXA'
  return 'OFF'
}

function getGymLoadBandStyle(label) {
  const normalized = String(label || '').toUpperCase()
  if (normalized === 'OFF') {
    return { bg: 'linear-gradient(180deg, rgba(229,231,235,0.32), rgba(229,231,235,0.16))', fg: '#94a3b8', border: 'rgba(229,231,235,0.96)' }
  }
  if (normalized === 'BAIXA') {
    return { bg: 'linear-gradient(180deg, rgba(183,228,199,0.5), rgba(183,228,199,0.24))', fg: '#166534', border: 'rgba(183,228,199,0.94)' }
  }
  if (normalized === 'MÉDIA') {
    return { bg: 'linear-gradient(180deg, rgba(82,183,136,0.44), rgba(82,183,136,0.2))', fg: '#0f3d24', border: 'rgba(82,183,136,0.9)' }
  }
  if (normalized === 'ALTA') {
    return { bg: 'linear-gradient(180deg, rgba(45,106,79,0.38), rgba(45,106,79,0.16))', fg: '#ffffff', border: 'rgba(45,106,79,0.92)' }
  }
  return { bg: 'linear-gradient(180deg, rgba(183,228,199,0.22), rgba(183,228,199,0.1))', fg: '#14532d', border: 'rgba(183,228,199,0.68)' }
}

function getCycleBandStyle(label) {
  const normalized = String(label || '').toLowerCase()
  if (normalized.includes('comp')) return { bg: 'linear-gradient(180deg, rgba(47,62,107,0.16), rgba(47,62,107,0.06))', fg: '#2F3E6B', border: 'rgba(47,62,107,0.18)' }
  if (normalized.includes('recuper')) return { bg: 'linear-gradient(180deg, rgba(191,219,254,0.32), rgba(191,219,254,0.14))', fg: '#365174', border: 'rgba(191,219,254,0.6)' }
  if (normalized.includes('manuten')) return { bg: 'linear-gradient(180deg, rgba(8,127,75,0.12), rgba(8,127,75,0.05))', fg: '#087f4b', border: 'rgba(8,127,75,0.18)' }
  if (normalized.includes('desenvol')) return { bg: 'linear-gradient(180deg, rgba(15,75,199,0.12), rgba(15,75,199,0.05))', fg: '#0f4bc7', border: 'rgba(15,75,199,0.18)' }
  if (normalized.includes('pre')) return { bg: 'linear-gradient(180deg, rgba(125,178,255,0.18), rgba(125,178,255,0.08))', fg: '#123fc7', border: 'rgba(125,178,255,0.22)' }
  return { bg: 'linear-gradient(180deg, rgba(18,63,199,0.1), rgba(18,63,199,0.04))', fg: '#123fc7', border: 'rgba(18,63,199,0.14)' }
}

function getLoadChipStyle(loadLevel, competition = false) {
  if (competition) return { bg: '#2F3E6B', fg: '#ffffff', border: '#2F3E6B' }
  if (loadLevel === 'ASSESSMENT') return { bg: '#fff7ed', fg: '#9a3412', border: '#fdba74' }
  if (loadLevel === 'HIGH') return { bg: '#0f4bc7', fg: '#ffffff', border: '#0f4bc7' }
  if (loadLevel === 'MEDIUM') return { bg: '#2f6df2', fg: '#ffffff', border: '#2f6df2' }
  if (loadLevel === 'LOW') return { bg: '#7eb2ff', fg: '#1e3a8a', border: '#7eb2ff' }
  return { bg: '#dbeafe', fg: '#365174', border: '#bfdbfe' }
}

function shortReason(ctx) {
  return ctx.reasonForAthlete || ctx.suggestedFocus?.[0] || ctx.reasons?.[0] || 'Treino ajustado ao calendário competitivo.'
}

function getPhaseLabel(day) {
  if (day?.dayType === 'COMPETITION') return 'COMPETIÇÃO'
  if (day?.dayType === 'REST') return 'Descanso'
  if (['REST', 'RECOVERY', 'POST_COMP_RECOVERY', 'LOW_LOAD'].includes(day?.dayType)) return 'Recuperação'
  if (day?.dayType === 'ASSESSMENT') return 'Avaliação'
  return PHASE_LABELS[day?.phase] || day?.phase || '-'
}

function getMesocycleLabel(day) {
  return MESOCYCLE_LABELS[day?.mesocycleType] || day?.mesocycleType || '-'
}

function getLoadLabel(day) {
  return getPublicGolfState(day).loadLabel || '-'
}

function getGymPhaseLabel(gym) {
  return getPublicGymPhaseLabel(gym?.gymPhase)
}

function getGymSessionLabel(gym) {
  if (!gym?.sessionAllowed || !gym?.sessionType) return 'Sem sessão'
  return gymScale[gym.sessionType]?.label || gym.sessionType
}

function getGymOutputLabel(gym) {
  if (!gym?.sessionAllowed || !gym?.sessionType) return 'Sem sessão'
  return {
    C: 'Mobilidade',
    B: 'Ativação',
    A: 'Força',
  }[gym.sessionType] || 'Sem sessão'
}

function getGymLoadLabel(gym) {
  if (!gym?.sessionAllowed || !gym?.sessionType) return 'OFF'
  if (gym.sessionType === 'POWER') return 'Alta'
  if (gym.sessionType === 'A' || gym.sessionType === 'STRENGTH') return 'Alta'
  if (gym.sessionType === 'B' || gym.sessionType === 'ACTIVATION') return 'Média'
  if (gym.sessionType === 'C' || gym.sessionType === 'MOBILITY') return 'Baixa'
  return 'OFF'
}

function getGymFocusText(day) {
  const gym = day?.gymRecommendation || {}
  if (day?.dayType === 'COMPETITION') return 'Preparar competição'
  if (!gym.sessionAllowed || !gym.sessionType) return 'Recuperar e manter o corpo disponível para o Golf'
  if (gym.sessionType === 'C') return 'Recuperar e manter o corpo disponível para o Golf'
  if (gym.sessionType === 'B') return 'Estimular sem comprometer o rendimento'
  if (gym.sessionType === 'A') return 'Manter força sem acumular fadiga'
  return 'Evitar fadiga antes da competição'
}

function getTodayHeroMessage(day, nextCompetition) {
  if (!day) return 'Consulta o dia selecionado para ver o plano.'
  if (day.dayType === 'COMPETITION') {
    return 'Hoje é dia de competição. O foco é competir bem e conservar energia para a recuperação.'
  }
  if (day.dayType === 'REST') {
    return 'Hoje é dia de descanso. O objetivo é recuperar completamente.'
  }
  const daysAway = day.daysToNextCompetition
  const phase = getPhaseLabel(day)
  if (daysAway != null && nextCompetition?.title) {
    return `Estás em ${phase} porque faltam ${daysAway} dias para a próxima competição, ${nextCompetition.title}.`
  }
  return `Estás em ${phase}. O objetivo é manter qualidade sem acumular fadiga.`
}

function getTodayActionText(day) {
  if (!day) return '-'
  const publicGolfState = getPublicGolfState(day)
  if (publicGolfState.isCompetition) return 'Entra focada, executa o plano e recupera depois.'
  if (publicGolfState.category === 'rest') return 'Descansa e recupera por completo.'
  if (publicGolfState.category === 'recovery') return 'Recupera, baixa a carga e prioriza frescura.'
  if (publicGolfState.category === 'assessment') return 'Avalia com intenção clara e usa o dia para medir evolução.'
  if (publicGolfState.loadLabel === 'Baixa') return 'Mantém ritmo com carga curta e controlada.'
  if (publicGolfState.loadLabel === 'Média') return 'Trabalha com qualidade e sem exagerar volume.'
  if (publicGolfState.loadLabel === 'Alta') return 'Dia forte: intensidade alta com execução limpa.'
  return 'Segue o plano definido para hoje.'
}
function TimelineHeader({ days, selectedDate, onSelectDay, columnWidth = 56, detailed = false }) {
  const months = buildMonthRanges(days)
  return (
    <div style={{ display: 'grid', gridTemplateRows: '28px 56px', minWidth: days.length * columnWidth }}>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${days.length}, ${columnWidth}px)`, minWidth: days.length * columnWidth, pointerEvents: 'none', alignItems: 'stretch' }}>
        {months.map(month => (
          <div
            key={`month-${month.key}`}
            style={{
              gridColumn: `${month.start + 1} / ${month.end + 2}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '2px 2px 5px',
              borderRadius: 999,
              background: 'linear-gradient(180deg, rgba(83,97,126,0.18), rgba(83,97,126,0.08))',
              border: '1px solid rgba(83,97,126,0.26)',
              color: '#334155',
              letterSpacing: 0.35,
              textTransform: 'uppercase',
              textOverflow: 'ellipsis',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
                ...PILL_PHASE,
            }}
          >
            {month.label}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, ${columnWidth}px)`, minWidth: days.length * columnWidth }}>
        {days.map(day => (
          <div key={`${day.date}-num`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10172f', fontSize: 16, fontWeight: 800, lineHeight: 1 }}>
            {String(new Date(`${day.date}T12:00:00`).getDate()).padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineSegment({ day, track, selectedDate, onSelectDay, columnWidth = 56, height = 98, showDetail = false }) {
  const golfRender = track === 'golf' ? getGolfRenderState(day) : null
  const isGolfCompetition = track === 'golf' && day.dayType === 'COMPETITION'
  const visual = isGolfCompetition ? golfScale.COMPETITION : (golfRender?.visual || getGymVisual(day))
  const isAssessment = track === 'golf' && day.dayType === 'ASSESSMENT'
  const publicGolfState = track === 'golf' ? getPublicGolfState(day) : null
  const renderedColorKey = track === 'golf'
    ? (publicGolfState?.colorKey || golfRender?.renderedColorKey || golfRender?.colorKey || visual?.label || 'UNKNOWN')
    : (day.gymRecommendation?.sessionType || 'none')
  const barColor = track === 'golf'
    ? (isGolfCompetition ? golfScale.COMPETITION.color : (golfRender?.barColor || visual.color))
    : visual.color
  const barAccentColor = track === 'golf'
    ? (isGolfCompetition ? golfScale.COMPETITION.color : '#6ea7ff')
    : '#52B788'
  const barHeight = track === 'golf'
    ? (isGolfCompetition ? golfScale.COMPETITION.h : (golfRender?.barHeight || visual.h))
    : visual.h
  return (
    <button
      type="button"
      title={`${formatDate(day.date, { weekday: 'short', day: '2-digit', month: 'short' })}\nFase: ${track === 'golf' ? getPhaseLabel(day) : getGymPhaseLabel(day.gymRecommendation)}\n${track === 'golf' ? `Carga pública: ${publicGolfState?.loadLabel || '-'}` : `Sessão: ${getGymSessionLabel(day.gymRecommendation)}`}\n${track === 'golf' ? (day.reasonForCoach || shortReason(day)) : (day.gymRecommendation?.reasonForGymCoach || 'Sem detalhe adicional.')}`}
      onClick={() => onSelectDay(day.date)}
      style={{
        height,
        width: columnWidth,
        border: 'none',
        borderLeft: '1px solid rgba(226, 232, 240, 0.75)',
        background: 'transparent',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'stretch',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: barHeight,
          background: `linear-gradient(135deg, ${barColor} 0%, ${barColor} 58%, ${barAccentColor} 140%)`,
          opacity: visual === gymScale.none ? 0.42 : 1,
          boxShadow: track === 'golf' ? 'inset 0 1px 0 rgba(255,255,255,0.35)' : 'inset 0 1px 0 rgba(255,255,255,0.28)',
        }}
        >
          {isAssessment && (
            <div
              title="Dia de avaliação. Usado para medir evolução e ajustar o plano."
              style={{
                position: 'absolute',
                left: '50%',
                top: 6,
                transform: 'translateX(-50%)',
                padding: '2px 6px',
                borderRadius: 999,
                background: '#ffffff',
                border: '1px solid rgba(18, 63, 199, 0.22)',
                color: '#173fc7',
                fontSize: 8,
                fontWeight: 900,
                letterSpacing: 0.15,
                textTransform: 'uppercase',
                boxShadow: '0 0 0 2px rgba(18, 63, 199, 0.08)',
                pointerEvents: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              AVAL.
            </div>
          )}
        </div>
    </button>
  )
}

function TimelineRow({ title, subtitle, days, track, selectedDate, onSelectDay, columnWidth = 56, segmentHeight = 98, showDetail = false }) {
  const effectiveColumnWidth = days.length === 7 ? 96 : columnWidth
  const effectiveSegmentHeight = days.length === 7 ? 116 : segmentHeight
  const accent = TRACK_ACCENT[track] || '#123fc7'
  const Icon = track === 'golf' ? Flag : Dumbbell
  const phaseRanges = track === 'gym' ? buildRanges(days, 'gym') : track === 'golf' ? buildRanges(days, 'golf') : null
  const sessionRanges = track === 'gym' ? buildGymSessionRanges(days) : null
  const loadRanges = track === 'golf' ? buildLoadRanges(days) : null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr', borderTop: '1px solid #dde5f0', marginBottom: track === 'golf' ? 30 : 0, paddingBottom: track === 'golf' ? 18 : 0 }}>
      <div style={{ padding: '24px 14px', borderRight: '1px solid #e7edf6' }}>
        <div style={{ width: 42, height: 42, borderRadius: 22, background: track === 'golf' ? '#123fc7' : '#0c8f56', color: '#fff', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <div style={{ ...TRACK_TITLE, color: accent }}>{title}</div>
        <div style={{ marginTop: 6, ...TRACK_SUBTITLE }}>{subtitle}</div>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateRows: track === 'gym' ? '22px 22px auto' : 'auto', gap: track === 'gym' ? 4 : 0 }}>
          {track === 'golf' && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, ${effectiveColumnWidth}px)`, minWidth: days.length * effectiveColumnWidth, alignItems: 'stretch' }}>
              {phaseRanges.map(range => {
                const style = getCycleBandStyle(range.label)
                return (
                  <div
                    key={`golf-phase-${range.start}-${range.end}-${range.label}`}
                    style={{
                      gridColumn: `${range.start + 1} / ${range.end + 2}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 2px 0',
                      borderRadius: 999,
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      color: style.fg,
                      textTransform: 'uppercase',
                      letterSpacing: 0.08,
                      textAlign: 'center',
                ...PILL_PHASE,
                    }}
                  >
                    {range.label}
                  </div>
                )
              })}
            </div>
          )}
          {track === 'gym' && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, ${effectiveColumnWidth}px)`, minWidth: days.length * effectiveColumnWidth, alignItems: 'stretch' }}>
              {phaseRanges.map(range => {
                const style = getCycleBandStyle(range.label)
                return (
                  <div
                    key={`gym-phase-${range.start}-${range.end}-${range.label}`}
                    style={{
                      gridColumn: `${range.start + 1} / ${range.end + 2}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 2px 0',
                      borderRadius: 999,
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      color: style.fg,
                      textTransform: 'uppercase',
                      letterSpacing: 0.08,
                      textAlign: 'center',
                ...PILL_LOAD,
                    }}
                  >
                    {range.label}
                  </div>
                )
              })}
            </div>
          )}
          {track === 'golf' && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, ${effectiveColumnWidth}px)`, minWidth: days.length * effectiveColumnWidth, alignItems: 'stretch' }}>
              {loadRanges.map(range => {
                const publicState = getPublicGolfState(days[range.start])
                const style = getLoadChipStyle(publicState?.colorKey || 'MEDIUM', publicState?.isCompetition)
                return (
                  <div
                    key={`golf-load-${range.start}-${range.end}-${range.label}`}
                    style={{
                      gridColumn: `${range.start + 1} / ${range.end + 2}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 2px 0',
                      borderRadius: 999,
                      color: style.fg,
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
                      ...PILL_LOAD,
                    }}
                  >
                    {range.label}
                  </div>
                )
              })}
            </div>
          )}
          {track === 'gym' && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, ${effectiveColumnWidth}px)`, minWidth: days.length * effectiveColumnWidth, alignItems: 'stretch' }}>
              {sessionRanges.map(range => {
                const style = getGymLoadBandStyle(range.label)
                return (
                  <div
                    key={`gym-session-${range.start}-${range.end}-${range.label}`}
                    style={{
                      gridColumn: `${range.start + 1} / ${range.end + 2}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 2px 0',
                      borderRadius: 999,
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      color: style.fg,
                      textTransform: 'uppercase',
                      letterSpacing: 0.08,
                      ...PILL_LOAD,
                    }}
                  >
                    {range.label}
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, ${effectiveColumnWidth}px)`, minWidth: days.length * effectiveColumnWidth }}>
            {days.map(day => <TimelineSegment key={day.date} day={day} track={track} selectedDate={selectedDate} onSelectDay={onSelectDay} columnWidth={effectiveColumnWidth} height={effectiveSegmentHeight} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function buildGymSessionRanges(days) {
  const ranges = []
  let current = null
  days.forEach((day, index) => {
    const label = getPublicGymLoadLabel(day.gymRecommendation)
    if (current && current.label === label) {
      current.end = index
      return
    }
    if (current) ranges.push(current)
    current = { label, start: index, end: index }
  })
  if (current) ranges.push(current)
  return ranges
}

function DualTimeline({ days, selectedDate, onSelectDay, density = 'standard' }) {
  const selectedIndex = Math.max(0, days.findIndex(day => day.date === selectedDate))
  const columnWidth = density === 'week' ? 96 : 56
  const segmentHeight = density === 'week' ? 116 : 98
  const showDetail = density === 'week'
  return (
    <section style={{ ...panel, overflowX: 'auto' }}>
      <div style={{ minWidth: 104 + days.length * columnWidth, position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr' }}>
          <div style={{ borderRight: '1px solid #e7edf6' }} />
          <TimelineHeader days={days} selectedDate={selectedDate} onSelectDay={onSelectDay} columnWidth={columnWidth} detailed={showDetail} />
        </div>
        <TimelineRow title="Golf" subtitle="Campo" days={days} track="golf" selectedDate={selectedDate} onSelectDay={onSelectDay} />
        <TimelineRow title="Gym" subtitle="Força & Condicionamento" days={days} track="gym" selectedDate={selectedDate} onSelectDay={onSelectDay} />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 104 + selectedIndex * columnWidth,
            width: columnWidth,
            border: '2px solid #4d64ff',
            borderRadius: 8,
            pointerEvents: 'none',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.8)',
          }}
        />
      </div>
    </section>
  )
}

function groupDays(days, mode) {
  if (mode === 'month') {
    const groups = []
    let current = null
    days.forEach(day => {
      const key = day.date.slice(0, 7)
      if (!current || current.key !== key) {
        current = { key, label: formatDate(`${key}-01`, { month: 'short' }).replace('.', '').toUpperCase(), days: [] }
        groups.push(current)
      }
      current.days.push(day)
    })
    return groups
  }

  const groups = []
  let current = null
  days.forEach(day => {
    const monday = toDateStr(startOfWeek(new Date(`${day.date}T12:00:00`)))
    if (!current || current.key !== monday) {
      current = { key: monday, label: formatDate(monday, { day: '2-digit', month: 'short' }).replace('.', ''), days: [] }
      groups.push(current)
    }
    current.days.push(day)
  })
  return groups
}

function summarizeGroup(group, track) {
  const competitionDay = group.days.find(day => getPublicGolfState(day).isCompetition)
  const selected = competitionDay || group.days[Math.floor(group.days.length / 2)] || group.days[0]
  if (track === 'golf') {
    const strongest = group.days.reduce((best, day) => {
      const publicState = getPublicGolfState(day)
      const rank = publicState.isCompetition
        ? 5
        : publicState.category === 'assessment'
          ? 1
          : { HIGH: 4, MEDIUM: 3, LOW: 2, RECOVERY: 1, REST: 0 }[publicState.colorKey] ?? 2
      return rank > best.rank ? { day, rank } : best
    }, { day: selected, rank: -1 }).day
    return {
      day: selected,
      visual: getPublicGolfState(strongest).isCompetition ? golfScale.COMPETITION : getGolfVisual(strongest),
      label: getPublicGolfState(selected).label || (PHASE_LABELS[selected.phase] || selected.phase),
    }
  }
  const strongest = group.days.reduce((best, day) => {
    const rank = { A: 3, B: 2, C: 1 }[day.gymRecommendation?.sessionType] || 0
    return rank > best.rank ? { day, rank } : best
  }, { day: selected, rank: -1 }).day
  return { day: selected, visual: getGymVisual(strongest), label: getPublicGymPhaseLabel(selected.gymRecommendation?.gymPhase) }
}

function CompactTimelineRow({ title, subtitle, groups, track, selectedDate, onSelectDay, mode }) {
  const accent = TRACK_ACCENT[track] || '#123fc7'
  const Icon = track === 'golf' ? Flag : Dumbbell
  const columnWidth = mode === 'month' ? 88 : 52
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr', borderTop: '1px solid #dde5f0' }}>
      <div style={{ padding: '20px 14px', borderRight: '1px solid #e7edf6' }}>
        <div style={{ width: 38, height: 38, borderRadius: 20, background: track === 'golf' ? '#123fc7' : '#0c8f56', color: '#fff', display: 'grid', placeItems: 'center', marginBottom: 10 }}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <div style={{ ...TRACK_TITLE, color: accent }}>{title}</div>
        <div style={{ marginTop: 6, ...TRACK_SUBTITLE }}>{subtitle}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${groups.length}, ${columnWidth}px)`, minWidth: groups.length * columnWidth, alignItems: 'end' }}>
        {groups.map(group => {
          const summary = summarizeGroup(group, track)
          const selected = group.days.some(day => day.date === selectedDate)
          const competition = group.days.some(day => day.dayType === 'COMPETITION')
          return (
            <button
              key={`${track}-${group.key}`}
              type="button"
              onClick={() => onSelectDay(summary.day.date)}
              title={`${group.label}\n${summary.label}\n${competition ? 'Competição no período' : ''}`}
              style={{
                height: mode === 'month' ? 92 : 84,
                border: 'none',
                borderLeft: '1px solid rgba(226, 232, 240, 0.75)',
                background: 'transparent',
                cursor: 'pointer',
                padding: '22px 3px 0',
                fontFamily: F,
                position: 'relative',
              }}
            >
              <div style={{ height: summary.visual.h * (mode === 'month' ? 0.72 : 0.58), borderRadius: '7px 7px 3px 3px', background: `linear-gradient(135deg, ${summary.visual.color}, ${track === 'golf' ? '#6ea7ff' : '#2D6A4F'})`, opacity: summary.visual === gymScale.none ? 0.3 : 1 }} />
              <div style={{ marginTop: 6, fontSize: 8, fontWeight: 900, color: accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                {competition ? 'COMPETIÇÃO' : summary.label}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CompactTimeline({ days, selectedDate, onSelectDay, mode }) {
  const groups = groupDays(days, mode)
  const columnWidth = mode === 'month' ? 88 : 52
  return (
    <section style={{ ...panel, overflowX: 'auto' }}>
      <div style={{ minWidth: 104 + groups.length * columnWidth }}>
        <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr' }}>
          <div style={{ borderRight: '1px solid #e7edf6' }} />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${groups.length}, ${columnWidth}px)`, minWidth: groups.length * columnWidth }}>
            {groups.map(group => (
              <button
                key={group.key}
                type="button"
                onClick={() => onSelectDay((group.days.find(day => day.dayType === 'COMPETITION') || group.days[0]).date)}
                style={{ height: 64, border: 'none', borderLeft: '1px solid #e7edf6', background: group.days.some(day => day.date === selectedDate) ? '#f8fbff' : 'transparent', cursor: 'pointer', fontFamily: F, padding: '10px 4px' }}
              >
                <div style={{ fontSize: 11, color: '#10172f', fontWeight: 900, textTransform: 'uppercase' }}>{group.label}</div>
                <div style={{ marginTop: 7, fontSize: 9, color: '#53617e', fontWeight: 800 }}>{group.days.length} dias</div>
              </button>
            ))}
          </div>
        </div>
        <CompactTimelineRow title="Golf" subtitle={mode === 'month' ? 'Macro ciclo' : 'Resumo semanal'} groups={groups} track="golf" selectedDate={selectedDate} onSelectDay={onSelectDay} mode={mode} />
        <CompactTimelineRow title="Gym" subtitle={mode === 'month' ? 'Macro força' : 'Resumo semanal'} groups={groups} track="gym" selectedDate={selectedDate} onSelectDay={onSelectDay} mode={mode} />
      </div>
    </section>
  )
}

function SummaryHeader({ view, setView, rangeLabel, onPrev, onNext }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <h1 style={{ margin: 0, color: '#10172f', fontSize: 24, letterSpacing: 0, fontWeight: 900 }}>Periodização</h1>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dde5f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          <button type="button" onClick={onPrev} style={{ width: 38, height: 42, border: 'none', borderRight: '1px solid #dde5f0', background: '#fff', color: '#10172f', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ minWidth: 164, padding: '0 12px', color: '#263653', fontSize: 11, fontWeight: 900, textAlign: 'center', textTransform: 'uppercase' }}>{rangeLabel}</div>
          <button type="button" onClick={onNext} style={{ width: 38, height: 42, border: 'none', borderLeft: '1px solid #dde5f0', background: '#fff', color: '#10172f', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', border: '1px solid #dde5f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          {['30 DIAS', 'SEMANA', 'TRIMESTRE', 'ANO'].map(label => (
            <button
              key={label}
              type="button"
              onClick={() => setView(label)}
              style={{
                minWidth: 104,
                padding: '12px 18px',
                border: 'none',
                borderRight: label === 'ANO' ? 'none' : '1px solid #dde5f0',
                background: view === label ? '#3436c7' : '#fff',
                color: view === label ? '#fff' : '#10172f',
                fontFamily: F,
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function LogicSummary({ title, lead, points }) {
  return (
    <section style={{ ...panel, padding: 18 }}>
      <div style={{ color: '#173fc7', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      <div style={{ color: '#10172f', fontSize: 14, fontWeight: 800, lineHeight: 1.6, marginBottom: 12 }}>{lead}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {points.map(point => (
          <div key={point} style={{ color: '#263653', fontSize: 13, lineHeight: 1.55 }}>â€¢ {point}</div>
        ))}
      </div>
    </section>
  )
}

function ManualBullet({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, alignItems: 'start' }}>
      <div style={{ color: '#53617e', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#10172f', fontSize: 13, fontWeight: 700, lineHeight: 1.55 }}>{value}</div>
    </div>
  )
}

function ManualBox({ title, accent, items }) {
  return (
    <section style={{ ...panel, padding: 18 }}>
      <div style={{ color: accent, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map(item => <ManualBullet key={item.label} label={item.label} value={item.value} />)}
      </div>
    </section>
  )
}

function CycleTile({ title, subtitle, tone = '#123fc7' }) {
  return (
    <div style={{ border: '1px solid #e5ebf5', borderRadius: 10, padding: 14, background: '#fff' }}>
      <div style={{ color: tone, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
      <div style={{ color: '#263653', fontSize: 12, lineHeight: 1.6 }}>{subtitle}</div>
    </div>
  )
}

function FlowBox({ title, tone, items, hint, fill = '#fff' }) {
  return (
    <div style={{ border: '1px solid #dfe6f1', borderRadius: 14, background: fill, padding: 14, minHeight: 132, boxShadow: '0 10px 22px rgba(16, 23, 47, 0.04)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        <div style={{ color: tone, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.3 }}>{title}</div>
        {hint && (
          <div style={{ alignSelf: 'flex-start', padding: '4px 8px', borderRadius: 999, background: `${tone}12`, color: tone, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.2 }}>
            {hint}
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(item => (
          <div
            key={item}
            style={{
              borderRadius: 999,
              border: `1px solid ${tone}22`,
              background: `${tone}12`,
              color: tone,
              padding: '7px 10px',
              fontSize: 12,
              fontWeight: 800,
              lineHeight: 1.2,
              textAlign: 'center',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function FlowConnector({ tone }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 132 }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            background: '#fff',
            border: `1px solid ${tone}33`,
            color: tone,
            display: 'grid',
            placeItems: 'center',
            fontSize: 16,
            fontWeight: 900,
            boxShadow: '0 8px 18px rgba(16, 23, 47, 0.05)',
          }}
        >
          <ArrowRight size={14} strokeWidth={3} />
        </div>
        <div style={{ width: 2, flex: 1, minHeight: 58, borderRadius: 999, background: `linear-gradient(180deg, ${tone}66, ${tone}1f)` }} />
      </div>
    </div>
  )
}

function CycleRail({ title, tone, cycles }) {
  return (
    <section style={{ border: '1px solid #e5ebf5', borderRadius: 14, background: '#fff', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ color: tone, fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>{title}</div>
        <div style={{ color: '#53617e', fontSize: 11, fontWeight: 800 }}>Sequencia de ciclos e efeito no plano</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cycles.length}, minmax(168px, 1fr))`, gap: 12, minWidth: Math.max(920, cycles.length * 180) }}>
          {cycles.map((cycle, index) => (
            <div key={cycle.title} style={{ position: 'relative', paddingTop: 14 }}>
              {index < cycles.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 26,
                    left: '62%',
                    right: '-38%',
                    height: 2,
                    background: `linear-gradient(90deg, ${cycle.tone}, ${cycles[index + 1].tone})`,
                    opacity: 0.45,
                  }}
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: cycle.tone,
                    border: '3px solid #fff',
                    boxShadow: '0 0 0 1px #dbe5f2',
                    flex: '0 0 auto',
                  }}
                />
                <div style={{ color: cycle.tone, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.2 }}>{cycle.title}</div>
              </div>
              <div style={{ border: '1px solid #e5ebf5', borderRadius: 12, padding: 14, minHeight: 124, background: '#fafcff' }}>
                <div style={{ color: '#263653', fontSize: 12, lineHeight: 1.65 }}>{cycle.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksPanel({ day }) {
  const gym = day?.gymRecommendation || {}
  const gymOutput = getGymOutputLabel(gym)
  const gymFocus = getGymFocusText(day)
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ color: '#10172f', fontSize: 18, fontWeight: 900 }}>Como funciona o plano</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 1fr', gap: 14, alignItems: 'stretch' }}>
        <section style={{ ...panel, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 20, background: '#123fc7', color: '#fff', display: 'grid', placeItems: 'center' }}><Flag size={18} /></div>
            <div>
              <div style={{ color: '#123fc7', fontSize: 16, fontWeight: 900, textTransform: 'uppercase' }}>Motor Golf</div>
              <div style={{ color: '#53617e', fontSize: 11, fontWeight: 800 }}>Calendario → decisao → carga</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <FlowBox title="Entradas" tone="#123fc7" fill="#f8fbff" items={['Calendario', 'Readiness', 'Distancia até prova']} />
            <FlowBox title="Decisão" tone="#123fc7" fill="#eef4ff" items={['Ajusta carga', 'Protege frescura', 'Define fase']} hint={getPhaseLabel(day)} />
            <FlowBox title="Saída" tone="#123fc7" fill="#f8fbff" items={[`Fase ${getPhaseLabel(day)}`, `Carga ${getLoadLabel(day)}`, DAY_TYPE_LABELS[day?.dayType] || 'Dia definido']} />
          </div>
        </section>

        <div style={{ display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 2, height: '100%', borderRadius: 999, background: 'linear-gradient(180deg, rgba(18,63,199,0.2), rgba(12,143,86,0.2))' }} />
        </div>

        <section style={{ ...panel, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 20, background: '#0c8f56', color: '#fff', display: 'grid', placeItems: 'center' }}><Dumbbell size={18} /></div>
            <div>
              <div style={{ color: '#0c8f56', fontSize: 16, fontWeight: 900, textTransform: 'uppercase' }}>Motor Gym</div>
              <div style={{ color: '#53617e', fontSize: 11, fontWeight: 800 }}>ação do dia / foco / detalhe</div>
            </div>
          </div>
          <div style={{ border: '1px solid #dfe6f1', borderRadius: 14, background: '#f6fbf8', padding: 14 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ color: '#53617e', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>Hoje</div>
                <div style={{ borderRadius: 999, background: '#0c8f56', color: '#fff', padding: '6px 10px', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>{gymOutput}</div>
              </div>
              <div style={{ borderRadius: 12, border: '1px solid rgba(12,143,86,0.16)', background: '#fff', padding: 14 }}>
                <div style={{ color: '#53617e', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Foco</div>
                <div style={{ color: '#10172f', fontSize: 16, fontWeight: 900, textTransform: 'uppercase' }}>{gymFocus}</div>
              </div>
              <div style={{ borderRadius: 12, border: '1px solid rgba(12,143,86,0.16)', background: '#fff', padding: 14 }}>
                <div style={{ color: '#53617e', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Carga</div>
                <div style={{ color: '#10172f', fontSize: 16, fontWeight: 900, textTransform: 'uppercase' }}>{getGymLoadLabel(gym)}</div>
              </div>
              <details style={{ borderTop: '1px solid rgba(12,143,86,0.14)', paddingTop: 10 }}>
                <summary style={{ cursor: 'pointer', color: '#0c8f56', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Ver detalhe do motor</summary>
                <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(12,143,86,0.18)', background: 'rgba(12,143,86,0.08)', color: '#0c8f56', padding: '7px 10px', fontSize: 12, fontWeight: 800, textAlign: 'center' }}>FASE: {getGymPhaseLabel(gym)}</div>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(12,143,86,0.18)', background: 'rgba(12,143,86,0.08)', color: '#0c8f56', padding: '7px 10px', fontSize: 12, fontWeight: 800, textAlign: 'center' }}>PERMISSÃO: {gym.sessionAllowed ? 'Permitida' : 'Bloqueada'}</div>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(12,143,86,0.18)', background: 'rgba(12,143,86,0.08)', color: '#0c8f56', padding: '7px 10px', fontSize: 12, fontWeight: 800, textAlign: 'center' }}>SESSÃO: {getGymOutputLabel(gym)}</div>
                </div>
              </details>
            </div>
          </div>
        </section>
      </div>

      <section style={{ marginTop: 16 }}>
        <CycleRail
          title="Drill down dos ciclos Golf"
          tone="#123fc7"
          cycles={[
            { title: 'Accumulation', subtitle: 'Base', tone: '#2f6df2' },
            { title: 'Development', subtitle: 'Construção', tone: '#0f4bc7' },
            { title: 'Deload', subtitle: 'Recuperar', tone: '#7eb2ff' },
            { title: 'Pre-comp', subtitle: 'Afinar', tone: '#123fc7' },
            { title: 'Competition', subtitle: 'Competir', tone: '#3422c7' },
            { title: 'Post-comp recovery', subtitle: 'Repor', tone: '#bfdbfe' },
          ]}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <CycleRail
          title="Drill down dos ciclos Gym"
          tone="#0c8f56"
          cycles={[
            { title: 'Build', subtitle: 'Base', tone: '#48bd78' },
            { title: 'Maintenance', subtitle: 'Manter', tone: '#087f4b' },
            { title: 'Taper', subtitle: 'Afinar', tone: '#a7e3bd' },
            { title: 'Recovery', subtitle: 'Recuperar', tone: '#cbd5e1' },
            { title: 'Blocked', subtitle: 'OFF', tone: '#e2e8f0' },
          ]}
        />
      </section>
    </section>
  )
}
function DetailCard({ title, icon, children }) {
  return (
    <section style={{ ...panel, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        {icon}
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#123fc7', textTransform: 'uppercase' }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Metric({ label, value, color = '#10172f' }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#53617e', fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 12, color, fontWeight: 900 }}>{value || '-'}</div>
    </div>
  )
}

function DayDetailPanel({ day }) {
  const gym = day.gymRecommendation || {}
  const gymFocus = gym.gymFocus?.map(f => FOCUS_LABELS[f] || f).join(', ')
  const golfState = DAY_TYPE_LABELS[day.dayType] || day.dayType
  const golfObjective = day.suggestedFocus?.length ? day.suggestedFocus.join(', ') : 'Manter o plano do dia.'
  const gymSession = getGymSessionLabel(gym)
  const gymPermission = gym.sessionAllowed ? 'Permitida' : 'Bloqueada'
  const gymFocusText = gymFocus || 'Sem sessão'
  const golfWhy = day.reasonForAthlete || shortReason(day)
  const gymWhy = gym.reasonForGymCoach || 'Sem sessão hoje.'
  return (
    <section style={{ ...panel, marginTop: 18, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#53617e', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Hoje</div>
          <div style={{ marginTop: 8, color: '#10172f', fontSize: 24, fontWeight: 900, textTransform: 'uppercase' }}>{formatDate(day.date, { day: '2-digit', month: 'long' })}</div>
          <div style={{ marginTop: 6, color: '#173fc7', fontSize: 14, fontWeight: 900 }}>{displayRelationLabel(day)}</div>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 999, background: '#eef2ff', color: '#173fc7', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>
          {golfState}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.15fr 0.95fr', gap: 16, marginTop: 20 }}>
        <div style={{ border: '1px solid #e5ebf5', borderRadius: 10, padding: 18, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 20, background: '#123fc7', color: '#fff', display: 'grid', placeItems: 'center' }}><Flag size={18} /></div>
            <div style={{ color: '#123fc7', fontSize: 18, fontWeight: 900, textTransform: 'uppercase' }}>Golf</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
            <Metric label="Estado" value={getLoadLabel(day)} color="#173fc7" />
            <Metric label="Objetivo" value={golfObjective} color="#10172f" />
            <Metric label="Porque" value={golfWhy} color="#10172f" />
          </div>
          {day.warnings?.length > 0 && <div style={{ marginTop: 10, color: '#a16207', fontSize: 12, lineHeight: 1.5 }}>{day.warnings.join(' · ')}</div>}
        </div>

        <div style={{ border: '1px solid #e5ebf5', borderRadius: 10, padding: 18, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 20, background: '#0c8f56', color: '#fff', display: 'grid', placeItems: 'center' }}><Dumbbell size={18} /></div>
            <div style={{ color: '#0c8f56', fontSize: 18, fontWeight: 900, textTransform: 'uppercase' }}>Gym</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
            <Metric label="Sessão" value={gymSession} color="#10172f" />
            <Metric label="Permissão" value={gymPermission} color="#10172f" />
            <Metric label="Porque" value={gymWhy} color="#10172f" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Metric label="Foco" value={gymFocusText} color="#10172f" />
            <Metric label="Carga" value={gym.gymLoadLevel || '-'} color="#10172f" />
          </div>
          {gym.warnings?.length > 0 && <div style={{ marginTop: 10, color: '#a16207', fontSize: 12, lineHeight: 1.5 }}>{gym.warnings.join(' · ')}</div>}
        </div>

        <div style={{ border: '1px solid #e5ebf5', borderRadius: 10, padding: 18, background: '#fff' }}>
          <div style={{ color: '#53617e', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>O que fazer hoje</div>
          <div style={{ marginTop: 10, color: '#10172f', fontSize: 18, fontWeight: 900 }}>{getTodayActionText(day)}</div>
          <div style={{ marginTop: 14, color: '#53617e', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Lembrete</div>
          <div style={{ marginTop: 8, color: '#10172f', fontSize: 13, lineHeight: 1.6 }}>
            {day.dayType === 'COMPETITION' ? 'Protege a energia, executa com intenção e recupera depois.' : 'Mantém a execução limpa e segue o plano definido para o dia.'}
          </div>
        </div>
      </div>

      <details style={{ marginTop: 18, borderTop: '1px solid #e5ebf5', paddingTop: 14 }}>
        <summary style={{ cursor: 'pointer', color: '#173fc7', fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>Ver lógica do plano</summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 14 }}>
          <DetailCard title="Golf" icon={<div style={{ width: 42, height: 42, borderRadius: 22, background: '#123fc7', color: '#fff', display: 'grid', placeItems: 'center' }}><Flag size={20} /></div>}>
            <div style={{ display: 'grid', gap: 10 }}>
              <Metric label="Fase" value={getPhaseLabel(day)} color="#173fc7" />
              <Metric label="Mesociclo" value={getMesocycleLabel(day)} color="#173fc7" />
              <Metric label="Carga" value={getLoadLabel(day)} color="#173fc7" />
              <Metric label="Razão técnica" value={day.reasonForCoach} color="#10172f" />
              <Metric label="Sinal" value={day.reasonForAthlete || shortReason(day)} color="#10172f" />
            </div>
          </DetailCard>
          <DetailCard title="Gym" icon={<div style={{ width: 42, height: 42, borderRadius: 22, background: '#0c8f56', color: '#fff', display: 'grid', placeItems: 'center' }}><Dumbbell size={20} /></div>}>
            <div style={{ display: 'grid', gap: 10 }}>
              <Metric label="Fase" value={getGymPhaseLabel(gym)} color="#0c8f56" />
              <Metric label="Sessão" value={gym.sessionAllowed ? gym.sessionType : 'Sem sessão'} color="#10172f" />
              <Metric label="Permissão" value={gym.sessionAllowed ? 'Permitida' : 'Bloqueada'} color="#10172f" />
              <Metric label="Razão técnica" value={gym.reasonForGymCoach} color="#10172f" />
              <Metric label="Sinal" value={gymFocusText} color="#10172f" />
            </div>
          </DetailCard>
          <DetailCard title="Detalhe" icon={<div style={{ width: 42, height: 42, borderRadius: 22, background: '#e8edff', color: '#173fc7', display: 'grid', placeItems: 'center' }}><CalendarDays size={20} /></div>}>
            <div style={{ display: 'grid', gap: 10 }}>
              <Metric label="Data" value={formatDate(day.date, { day: '2-digit', month: 'long' })} color="#10172f" />
              <Metric label="Estado" value={DAY_TYPE_LABELS[day.dayType] || day.dayType} color="#10172f" />
              <Metric label="Razão" value={displayRelationLabel(day)} color="#10172f" />
            </div>
          </DetailCard>
        </div>
      </details>

      <div style={{ marginTop: 18 }}>
        <LegendPanel compact />
      </div>
    </section>
  )
}

function ScaleRow({ title, items }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ color: '#263653', fontSize: 12, fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {items.map(item => (
          <div key={item.label} style={{ minWidth: 58 }}>
            <div style={{ height: 18, borderRadius: 4, background: item.color, marginBottom: 7, opacity: item.opacity || 1 }} />
            <div style={{ color: '#263653', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LegendPanel({ compact = false }) {
  return (
    <section style={{ ...panel, padding: compact ? 16 : 22 }}>
      <h2 style={{ margin: 0, color: '#263653', fontSize: compact ? 11 : 12, fontWeight: 900, textTransform: 'uppercase' }}>Legenda</h2>
      <ScaleRow
        title="Golf"
        items={[
          { label: 'Recuperação', color: golfScale.RECOVERY.color },
          { label: 'Baixa', color: golfScale.LOW.color },
          { label: 'Média', color: golfScale.MEDIUM.color },
          { label: 'Alta', color: golfScale.HIGH.color },
          { label: 'Avaliação', color: '#ffffff', opacity: 1 },
          { label: 'Competição', color: golfScale.COMPETITION.color },
        ]}
      />
      <ScaleRow
        title="Gym"
        items={[
          { label: 'C Mobilidade', color: gymScale.C.color },
          { label: 'B Ativação', color: gymScale.B.color },
          { label: 'A Força', color: gymScale.A.color },
          { label: 'Sem sessão', color: gymScale.none.color, opacity: 0.65 },
        ]}
      />
      <div style={{ marginTop: 14, color: '#53617e', fontSize: compact ? 11 : 12, lineHeight: 1.5 }}>Clique num dia para ver detalhes</div>
    </section>
  )
}
function eventOverlapsDate(event, date) {
  const start = event.start_date || event.date || event.start || event.startTime || ''
  const end = event.end_date || event.end || event.endTime || start
  const startDate = String(start).slice(0, 10)
  const endDate = String(end).slice(0, 10) || startDate
  return startDate && date >= startDate && date <= endDate
}

function buildPeriodizationDays({ start, length, events, readinessInputs, historySeed = [] }) {
  const history = [...historySeed]
  return Array.from({ length }, (_, index) => {
    const date = toDateStr(addDays(start, index))
    const engineContext = getPeriodizationDayContext({ date, events, readinessInputs, history })
    const renderedDay = {
      ...engineContext,
      date: engineContext.date,
      dayType: engineContext.dayType,
      loadLevel: engineContext.loadLevel,
      phase: engineContext.phase,
      gymRecommendation: engineContext.gymRecommendation,
    }
    history.push({
      date: renderedDay.date,
      dayType: renderedDay.dayType,
      loadLevel: renderedDay.loadLevel,
      phase: renderedDay.phase,
      gymRecommendation: renderedDay.gymRecommendation,
    })
    return renderedDay
  })
}

export default function PeriodizationDashboard({ events = [], trainingPlans = [], readinessInputs = {}, history: externalHistory = [] }) {
  const [view, setView] = useState('30 DIAS')
  const initialDate = useMemo(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  }, [])
  const [anchorDate, setAnchorDate] = useState(initialDate)
  const normalizedEvents = useMemo(
    () => normalizeEventsForPeriodization({ events, trainingPlans }),
    [events, trainingPlans]
  )
  const range = useMemo(() => {
    if (view === 'SEMANA') {
      const start = startOfWeek(anchorDate)
      return { start, length: 7, label: `${formatDate(toDateStr(start), { day: '2-digit', month: 'short' })} - ${formatDate(toDateStr(addDays(start, 6)), { day: '2-digit', month: 'short' })}` }
    }
    if (view === 'TRIMESTRE') {
      const start = startOfMonth(anchorDate)
      const end = addDays(addMonths(start, 3), -1)
      const length = Math.round((end - start) / 86400000) + 1
      return { start, length, label: `${formatDate(toDateStr(start), { month: 'short' })} - ${formatDate(toDateStr(end), { month: 'short', year: 'numeric' })}` }
    }
    if (view === 'ANO') {
      const start = startOfYear(anchorDate)
      const end = addDays(startOfYear(addMonths(start, 12)), -1)
      const length = Math.round((end - start) / 86400000) + 1
      return { start, length, label: String(start.getFullYear()) }
    }
    return { start: anchorDate, length: 30, label: `${formatDate(toDateStr(anchorDate), { day: '2-digit', month: 'short' })} - ${formatDate(toDateStr(addDays(anchorDate, 29)), { day: '2-digit', month: 'short' })}` }
  }, [anchorDate, view])
  const planningLength = Math.max(range.length, 60)
  const planningDays = useMemo(
    () => annotateCompetitionBlocks(applyCompetitionDayTruth(buildPeriodizationDays({
      start: range.start,
      length: planningLength,
      events: normalizedEvents,
      readinessInputs,
      historySeed: externalHistory,
    }), normalizedEvents)),
    [externalHistory, normalizedEvents, planningLength, range.start, readinessInputs]
  )
  const renderedDays = useMemo(() => planningDays.slice(0, range.length), [planningDays, range.length])
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(initialDate))
  const selectedDay = renderedDays.find(day => day.date === selectedDate) || renderedDays[0]
  const currentDay = renderedDays[0]
  const nextCompetition = currentDay?.nextCompetition

  const selectView = nextView => {
    setView(nextView)
    const selected = new Date(`${selectedDay?.date || toDateStr(anchorDate)}T12:00:00`)
    if (nextView === 'SEMANA') setAnchorDate(startOfWeek(selected))
    else if (nextView === 'TRIMESTRE') setAnchorDate(startOfMonth(selected))
    else if (nextView === 'ANO') setAnchorDate(startOfYear(selected))
    else setAnchorDate(selected)
  }
  const moveRange = direction => {
    const next = new Date(anchorDate)
    if (view === 'SEMANA') next.setDate(next.getDate() + direction * 7)
    else if (view === 'TRIMESTRE') next.setMonth(next.getMonth() + direction * 3, 1)
    else if (view === 'ANO') next.setFullYear(next.getFullYear() + direction, 0, 1)
    else next.setDate(next.getDate() + direction * 30)
    next.setHours(12, 0, 0, 0)
    setAnchorDate(next)
    setSelectedDate(toDateStr(next))
  }

  if (!currentDay || !selectedDay) return null

  return (
    <div style={{ fontFamily: F, color: '#10172f', background: '#f8fafc', margin: '-4px -4px 0', padding: '4px 0 24px' }}>
      <SummaryHeader view={view} setView={selectView} rangeLabel={range.label} onPrev={() => moveRange(-1)} onNext={() => moveRange(1)} />
      {false && view !== '30 DIAS' && (
        <div style={{ ...panel, marginTop: 16, padding: 16, color: '#53617e', fontSize: 13 }}>
          Esta vista está preparada visualmente. A implementação funcional atual é a vista de 30 dias.
        </div>
      )}
      <div style={{ marginTop: 18 }}>
        {view === 'TRIMESTRE' ? (
          <CompactTimeline days={renderedDays} selectedDate={selectedDay.date} onSelectDay={setSelectedDate} mode="week" />
        ) : view === 'ANO' ? (
          <CompactTimeline days={renderedDays} selectedDate={selectedDay.date} onSelectDay={setSelectedDate} mode="month" />
        ) : (
          <DualTimeline days={renderedDays} selectedDate={selectedDay.date} onSelectDay={setSelectedDate} density={view === 'SEMANA' ? 'week' : 'standard'} />
        )}
      </div>
      <HowItWorksPanel day={selectedDay} />
    </div>
  )
}
