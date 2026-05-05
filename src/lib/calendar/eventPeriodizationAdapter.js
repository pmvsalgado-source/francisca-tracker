import { getEventVisual, isCompetitionEvent } from '../../constants/eventCategories.js'
import { toDateKey } from '../periodization/date.js'

const ACTIVE_PERIODIZATION_STATUSES = new Set([
  'confirmed',
  'played',
  'concluido',
  'concluído',
  'confirmado',
  'jogado',
])

const IGNORED_PERIODIZATION_STATUSES = new Set([
  'cancelled',
  'canceled',
  'cancelado',
  'cancelada',
  'optional',
  'opcional',
  'draft',
  'rascunho',
  'invalid',
  'invalido',
  'inválido',
])

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase()
}

function toDateStr(raw) {
  return toDateKey(raw)
}

function eventStartDate(event) {
  return toDateStr(
    event?.start_date ||
      event?.event_date ||
      event?.event_start_date ||
      event?.date ||
      event?.start ||
      event?.startTime ||
      null
  )
}

function eventEndDate(event) {
  const startKey = eventStartDate(event)
  const endKey = toDateStr(
    event?.end_date ||
      event?.event_end_date ||
      event?.endDate ||
      event?.end ||
      event?.endTime ||
      null
  )
  if (!startKey) return null
  if (endKey && endKey >= startKey) return endKey
  const durationCandidate = Array.isArray(event?.rounds)
    ? event.rounds.length
    : Number(event?.rounds || event?.competition_rounds || event?.days || event?.duration_days || event?.competition_duration || 1)
  const durationDays = Number.isFinite(durationCandidate) && durationCandidate > 0 ? Math.floor(durationCandidate) : 1
  if (durationDays <= 1) return startKey
  const d = new Date(`${startKey}T12:00:00`)
  d.setDate(d.getDate() + durationDays - 1)
  return toDateKey(d) || startKey
}

function addOneCalendarDay(dateStr) {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return toDateKey(d)
}

function titleMergeKey(event) {
  return String(event?.title || '').trim().toLowerCase()
}

/**
 * Full-calendar pass: consecutive days with the same title → one row with inclusive [minStart, maxEnd].
 * At least one row in the chain must look like a competition (trophy). If any row has an allowed
 * periodization status, the merged row keeps a permitted status so a "R2" day marked optional still
 * anchors when R1 is confirmed (same title, consecutive dates).
 */
function chainMergeSameTitleConsecutiveDays(allEvents) {
  const evs = (allEvents || []).filter(e => !isTrainingPlanEvent(e) && eventStartDate(e))
  if (evs.length === 0) return []
  const sorted = [...evs].sort((a, b) => (eventStartDate(a) || '').localeCompare(eventStartDate(b) || ''))
  const chains = []
  let cur = [sorted[0]]
  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i]
    const prev = cur[cur.length - 1]
    const k1 = titleMergeKey(prev)
    const k2 = titleMergeKey(next)
    const prevEnd = eventEndDate(prev)
    const nextStart = eventStartDate(next)
    if (k1 && k1 === k2 && nextStart && prevEnd && nextStart === addOneCalendarDay(prevEnd)) cur.push(next)
    else {
      chains.push(cur)
      cur = [next]
    }
  }
  chains.push(cur)

  const out = []
  for (const chain of chains) {
    const hasComp = chain.some(r => isCalendarCompetition(r))
    if (!hasComp) continue
    if (chain.length === 1) {
      out.push({ ...chain[0] })
      continue
    }
    const minStart = chain.reduce((m, r) => {
      const s = eventStartDate(r)
      return !m || (s && s < m) ? s : m
    }, null)
    const maxEnd = chain.reduce((m, r) => {
      const e = eventEndDate(r)
      return !m || (e && e > m) ? e : m
    }, null)
    if (!minStart || !maxEnd) continue
    const end = maxEnd >= minStart ? maxEnd : minStart
    const base = chain.find(r => isCalendarCompetition(r)) || chain[0]
    const pick = chain.find(r => statusDecision(r).allowed)
    out.push({
      ...base,
      id: base.id,
      title: base.title ?? chain[0].title,
      start_date: minStart,
      end_date: end,
      status: pick ? pick.status || 'confirmed' : chain[0].status,
    })
  }
  return out
}

function statusDecision(event) {
  const status = normalizeStatus(event?.status)
  if (!status) return { allowed: true, normalizedStatus: 'confirmed', reason: 'active calendar event with no status' }
  if (ACTIVE_PERIODIZATION_STATUSES.has(status)) return { allowed: true, normalizedStatus: status, reason: `active status: ${status}` }
  if (IGNORED_PERIODIZATION_STATUSES.has(status)) return { allowed: false, normalizedStatus: status, reason: `ignored status: ${status}` }
  return { allowed: false, normalizedStatus: status, reason: `unsupported status: ${status}` }
}

function isTrainingPlanEvent(event) {
  return event?._isTrain === true || event?._source === 'trainingPlan'
}

function isCalendarCompetition(event) {
  if (isCompetitionEvent(event)) return true
  return getEventVisual(event?.type || null, event?.category, event?.title).svgKind === 'trophy'
}

export function isCompetitionForPeriodization(event) {
  if (!event || isTrainingPlanEvent(event)) return false
  const decision = statusDecision(event)
  return decision.allowed && isCalendarCompetition(event)
}

export function explainPeriodizationEvent(event) {
  if (!event) return { included: false, reason: 'missing event' }
  if (isTrainingPlanEvent(event)) return { included: false, reason: 'training plan sessions are not competition anchors' }
  const decision = statusDecision(event)
  const competition = isCalendarCompetition(event)
  const start = eventStartDate(event)
  if (!competition) return { included: false, reason: 'not classified as tournament/competition by Calendar rules' }
  if (!start) return { included: false, reason: 'missing supported start date' }
  if (!decision.allowed) return { included: false, reason: decision.reason }
  return { included: true, reason: decision.reason, normalizedStatus: decision.normalizedStatus }
}

export function normalizeEventsForPeriodization({ events = [], trainingPlans = [] } = {}) {
  void trainingPlans
  const mergedChains = chainMergeSameTitleConsecutiveDays(events || [])
  return mergedChains
    .filter(event => explainPeriodizationEvent(event).included)
    .map(event => {
      const decision = statusDecision(event)
      return {
        ...event,
        start_date: eventStartDate(event),
        end_date: eventEndDate(event),
        status: decision.normalizedStatus,
        category: 'Competição',
        original_category: event.category,
        original_status: event.status,
        _periodizationAnchor: true,
        _periodizationReason: decision.reason,
      }
    })
    .filter(event => event.start_date)
}
