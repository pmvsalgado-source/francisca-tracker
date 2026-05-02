import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getEventCategories,
  saveEvent as saveEventSvc,
  deleteEvent as deleteEventSvc,
  saveEventCategory,
  getWellnessEntries,
  saveWellnessEntry,
  getSessionRatings,
  findSessionRatingEntry,
  saveSessionRatingEntry,
  deleteEntry,
} from '../services/calendarService'
import { saveTrainingPlan } from '../services/trainingService'
import { SCHEDULE_TYPES, TOURNAMENT_CATEGORIES, DEFAULT_CATEGORIES, activityColor, activityColorFromCategory, getEventVisual, isCompetitionEvent } from '../constants/eventCategories'
import { calcWeekPhase, calcCurrentPhase, PHASE_COLORS } from '../lib/periodization'
import EmptyState from './EmptyState'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const STATUS = ['confirmed','optional','cancelled','played']

const EXERCISE_PALETTE = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6','#06b6d4','#f97316','#ef4444','#22c55e','#a855f7']
const RATING_OPTIONS = [
  { value: 'mau', face: '😞', label: 'Mal', color: '#ef4444' },
  { value: 'medio', face: '😐', label: 'Médio', color: '#f59e0b' },
  { value: 'bom', face: '😊', label: 'Bem', color: '#22c55e' },
]

const WELLNESS_METRICS = [
  { id: '__w_energia__',  label: 'Energia',       icon: '⚡', color: '#22C55E' },
  { id: '__w_sono__',     label: 'Sono',           icon: '🌙', color: '#6366F1' },
  { id: '__w_cansaco__',  label: 'Cansaço',        icon: '💪', color: '#F59E0B' },
  { id: '__w_dores__',    label: 'Dores / Lesões', icon: '🩹', color: '#EF4444' },
  { id: '__w_stress__',   label: 'Stress',         icon: '🌀', color: '#14B8A6' },
]
const DAY_NOTE_METRIC_ID = '__day_note__'

const EMPTY_FORM = {
  title: '', start_date: '', end_date: '', category: 'Competição', status: 'confirmed',
  color: '#378ADD', result: '', position: '', notes: '', fez_campo: false,
  time: '', duration: '', course: '', holes: '18', score: '',
}

export default function Calendar({ theme, t, user, lang = 'en', onNavigate, events = [], trainingPlans = [], onEventsChanged, onPlansChanged, initScheduleType, onInitConsumed, focusDate = null, onFocusConsumed }) {
  const [view, setView] = useState('day')
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1))
  const [dayDetailDate, setDayDetailDate] = useState(null)
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [pendingDate, setPendingDate] = useState(null)
  const [scheduleType, setScheduleType] = useState(null)
  const [editEvent, setEditEvent] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [catForm, setCatForm] = useState({ name: '', color: '#378ADD' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState(null)
  const [calFilters, setCalFilters] = useState({ events: true, golf: true, gym: true })
  const [calNote, setCalNote] = useState('')
  const [calNoteSaving, setCalNoteSaving] = useState(false)
  const [wellnessData, setWellnessData] = useState({})
  const [sessionRatings, setSessionRatings] = useState({})
  const [expandedSession, setExpandedSession] = useState(null)
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState(null) // { entryId, metricId }
  const [completedByKey, setCompletedByKey] = useState({})
  const [activityPopover, setActivityPopover] = useState(null)
  const [todayPulse, setTodayPulse] = useState(false)
  const [showLoadInfo, setShowLoadInfo] = useState(false)
  const [showPlayedModal, setShowPlayedModal] = useState(false)
  const focusDateRef = useRef(null)
  const calNoteSaveTimerRef = useRef(null)
  const calNoteLoadedDateRef = useRef(null)
  const calNoteSkipSaveRef = useRef(false)

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const todayIso = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`
  const monthLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const weekdayFullLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getEventCategories()
      if (data && data.length > 0) setCategories(data)
    } catch { /* fallback to DEFAULT_CATEGORIES already in state */ }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const openSchedulePicker = (date) => {
    setPendingDate(date || todayIso)
    setShowTypeModal(true)
  }

  const selectScheduleType = useCallback((type, date) => {
    setShowTypeModal(false)
    setEditEvent(null)
    setScheduleType(type.id)
    const d = date || pendingDate || todayIso
    const isTornType = type.id === 'torneio'
    setForm({
      ...EMPTY_FORM,
      start_date: d,
      end_date: d,
      category: isTornType ? TOURNAMENT_CATEGORIES[0].name : type.category,
      color: isTornType ? TOURNAMENT_CATEGORIES[0].color : type.color,
      title: (type.id === 'other' || isTornType) ? '' : type.label,
      fez_campo: type.id === 'campo',
    })
    setShowModal(true)
  }, [pendingDate, todayIso])

  useEffect(() => {
    if (!initScheduleType) return
    const type = SCHEDULE_TYPES.find(s => s.id === initScheduleType)
    if (type) { selectScheduleType(type, todayIso); onInitConsumed?.() }
  }, [initScheduleType, selectScheduleType, todayIso, onInitConsumed])

  useEffect(() => {
    const dateStr = dayDetailDate || todayIso
    let cancelled = false
    calNoteLoadedDateRef.current = null
    getWellnessEntries(dateStr, [DAY_NOTE_METRIC_ID])
      .then(data => {
        if (cancelled) return
        calNoteSkipSaveRef.current = true
        setCalNote(data?.[0]?.value || '')
        calNoteLoadedDateRef.current = dateStr
      })
      .catch(() => {
        if (cancelled) return
        calNoteSkipSaveRef.current = true
        setCalNote('')
        calNoteLoadedDateRef.current = dateStr
      })
    return () => { cancelled = true }
  }, [dayDetailDate, todayIso])

  useEffect(() => {
    const d = new Date()
    const dateStr = dayDetailDate || `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    getWellnessEntries(dateStr, WELLNESS_METRICS.map(m => m.id))
      .then(data => {
        const map = {}
        ;(data || []).forEach(r => { map[r.metric_id] = Number(r.value) })
        setWellnessData(map)
      })
      .catch(() => {})
  }, [dayDetailDate])

  useEffect(() => {
    if (!focusDate || focusDate === focusDateRef.current) return
    focusDateRef.current = focusDate
    const d = new Date(focusDate + 'T12:00:00')
    const ds = fmtDate(d)
    setDayDetailDate(ds)
    setCurrentDate(d)
    setView('day')
    onFocusConsumed?.()
  }, [focusDate, onFocusConsumed])

  const openDayDetail = (dateStr) => {
    setDayDetailDate(dateStr)
    const d = new Date(dateStr + 'T12:00:00')
    setCurrentDate(d)
    setView('day')
  }

  const openEdit = (e) => {
    // Torneio events are stored with a tournament-specific category (e.g. 'Circuito Nacional'),
    // not with 'Competio', so we check TOURNAMENT_CATEGORIES first.
    const isTournamentEvent = TOURNAMENT_CATEGORIES.some(tc => tc.name === e.category)
    const st = isTournamentEvent
      ? SCHEDULE_TYPES.find(s => s.id === 'torneio')
      : SCHEDULE_TYPES.find(s => s.category === e.category)
    setScheduleType(st?.id || null)
    setEditEvent(e)
    setForm({
      ...EMPTY_FORM,
      title: e.title,
      start_date: e.start_date,
      end_date: e.end_date || e.start_date,
      category: e.category,
      status: e.status,
      color: e.color,
      result: e.result || '',
      position: e.position || '',
      notes: e.notes || '',
      fez_campo: e.fez_campo || false,
      course: st?.id === 'campo' ? (e.title || '') : '',
    })
    setShowModal(true)
  }

  const saveEvent = async () => {
    setSaving(true)
    setSaveError(null)
    const prevStatus = editEvent?.status
    const isCampoType = scheduleType === 'campo' && !editEvent
    const extras = []
    if (form.time) extras.push(`Hora: ${form.time}`)
    if (form.duration) extras.push(`Durao: ${form.duration}`)
    if (isCampoType && form.holes) extras.push(`Buracos: ${form.holes}`)
    if (isCampoType && form.score) extras.push(`Score: ${form.score}`)
    const notesStr = extras.length > 0
      ? extras.join('  ') + (form.notes ? '\n' + form.notes : '')
      : form.notes

    const payload = {
      title: isCampoType ? (form.course || form.title || 'Treino de campo') : form.title,
      start_date: form.start_date,
      end_date: form.end_date,
      category: form.category,
      status: form.status,
      color: form.color,
      result: form.result,
      position: form.position ? parseInt(form.position) : null,
      notes: notesStr,
      fez_campo: form.fez_campo,
    }

    try {
      if (editEvent) {
        await saveEventSvc(payload, editEvent.id)
      } else {
        await saveEventSvc({ ...payload, created_by: 'user' })
      }
    } catch (err) {
      setSaving(false)
      setSaveError(err.message || 'Erro ao guardar o evento. Tenta novamente.')
      return
    }
    setSaving(false)
    setShowModal(false)
    setScheduleType(null)
    onEventsChanged?.()
    if (form.status === 'played' && prevStatus !== 'played' && isCompetitionEvent({ category: form.category, title: form.title })) {
      setShowPlayedModal(true)
    }
  }

  const deleteEvent = () => setDeleteConfirmEvent(editEvent)

  const confirmDeleteEvent = async () => {
    if (!deleteConfirmEvent) return
    try { await deleteEventSvc(deleteConfirmEvent.id) } catch (err) { console.error('confirmDeleteEvent:', err) }
    setDeleteConfirmEvent(null)
    setShowModal(false)
    onEventsChanged?.()
  }

  const saveCat = async () => {
    try { await saveEventCategory({ ...catForm, created_by: 'user' }) } catch (err) { console.error('saveCat:', err) }
    setCategories(p => [...p, catForm])
    setCatForm({ name: '', color: '#378ADD' })
    setShowCatModal(false)
  }

  const getCatColor = (catName) => categories.find(c => c.name === catName)?.color || '#777'

  const getWeekDays = () => {
    const d = new Date(currentDate)
    const dow = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      return day
    })
  }

  const switchView = (v) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    if (v === 'week') setCurrentDate(now)
    else if (v === 'month') setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
    else if (v === 'day') { setCurrentDate(now); setDayDetailDate(todayIso) }
    setView(v)
  }

  const getEventsForDay = (date) => {
    const d = typeof date === 'string'
      ? date
      : `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    const dayEvents = calFilters.events ? events.filter(e => {
      const start = e.start_date; const end = e.end_date || e.start_date
      return d >= start && d <= end
    }) : []
    const trainingSessions = []
    trainingPlans.forEach(plan => {
      if (!plan.days || !plan.week_start) return
      const planType = plan.plan_type
      plan.days.forEach((day, dayIdx) => {
        if (!day?.sessions?.length) return
        const dayDate = new Date(plan.week_start + 'T12:00:00')
        dayDate.setDate(dayDate.getDate() + dayIdx)
        const sds = `${dayDate.getFullYear()}-${String(dayDate.getMonth()+1).padStart(2,'0')}-${String(dayDate.getDate()).padStart(2,'0')}`
        if (sds !== d) return
        day.sessions.forEach((session, si) => {
          const typeTag = session.session_type === 'coach' ? ' [C]' : session.session_type === 'auto' ? ' [A]' : ''
          if (calFilters.golf && planType === 'golf')
            trainingSessions.push({ ...session, _isTrain: true, type: 'golf', _color: activityColor('golf'), name: (session.cat || 'Golf') + typeTag, done: session.status === 'done', _key: `golf-${plan.id}-${dayIdx}-${si}`, _planId: plan.id, _dayIdx: dayIdx, _si: si })
          if (calFilters.gym && planType === 'gym')
            trainingSessions.push({ ...session, _isTrain: true, type: 'gym', _color: activityColor('gym'), name: (session.cat || 'Gym') + typeTag, done: session.status === 'done', _key: `gym-${plan.id}-${dayIdx}-${si}`, _planId: plan.id, _dayIdx: dayIdx, _si: si })
        })
      })
    })
    return [...dayEvents, ...trainingSessions]
  }

  const getDaysInMonth = (year, month) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    let startDow = firstDay.getDay()
    startDow = startDow === 0 ? 6 : startDow - 1 // Seg=0 … Dom=6
    for (let i = 0; i < startDow; i++) days.push({ date: new Date(year, month, -startDow + i + 1), current: false })
    for (let i = 1; i <= lastDay.getDate(); i++) days.push({ date: new Date(year, month, i), current: true })
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date
      days.push({ date: new Date(last.getTime() + 86400000), current: false })
    }
    return days
  }

  const getTrainingLogForDay = (dateStr) => {
    const sessions = []
    let athleteNotes = ''
    trainingPlans.forEach(plan => {
      if (!plan.days || !plan.week_start) return
      plan.days.forEach((day, dayIdx) => {
        if (!day?.sessions?.length) return
        const dayDate = new Date(plan.week_start + 'T12:00:00')
        dayDate.setDate(dayDate.getDate() + dayIdx)
        const sds = `${dayDate.getFullYear()}-${String(dayDate.getMonth()+1).padStart(2,'0')}-${String(dayDate.getDate()).padStart(2,'0')}`
        if (sds !== dateStr) return
        day.sessions.forEach(session => {
          sessions.push({ ...session, planType: plan.plan_type })
        })
        if (plan.athlete_notes) athleteNotes = plan.athlete_notes
      })
    })
    const allItems = sessions.flatMap(s => s.items || []).filter(i => !i.isRest)
    const completionPct = allItems.length > 0
      ? Math.round(allItems.reduce((acc, item) => acc + (item.progress ?? (item.done ? 100 : 0)), 0) / allItems.length)
      : null
    return { sessions, completionPct, athleteNotes, hasPlan: sessions.length > 0 }
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const F = "'Inter', system-ui, sans-serif"
  const btn = (active) => ({ background: active ? t.accent + '18' : 'transparent', border: `1px solid ${active ? t.accent : t.border}`, borderRadius: '20px', color: active ? t.accent : t.textMuted, padding: '5px 14px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: active ? 700 : 500 })
  const inp = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, padding: '6px 10px', fontSize: '13px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }

  const yearEvents = events.filter(e => e.start_date?.startsWith(year.toString()))
  const confirmed = yearEvents.filter(e => e.status === 'confirmed').length
  const optional = yearEvents.filter(e => e.status === 'optional').length

  const schedTypeInfo = scheduleType ? SCHEDULE_TYPES.find(s => s.id === scheduleType) : null
  const isTorneio = scheduleType === 'torneio'
  const isCampo = scheduleType === 'campo'
  const isAppointment = ['golf_coach', 'gym', 'mental_coach', 'fisio', 'massagem', 'other'].includes(scheduleType)
  const canSave = editEvent
    ? !!form.title
    : isCampo ? true : !!form.title

  const fmtDate = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`

  const getWeekStartForDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00')
    const dow = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
  }

  const getDayIndex = (dateStr) => {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    return dow === 0 ? 6 : dow - 1
  }

  const savePlanProgress = async (plan, dayIdx, sessionIdx, itemIdx, progressValue) => {
    const newDays = JSON.parse(JSON.stringify(plan.days || []))
    const item = newDays[dayIdx]?.sessions?.[sessionIdx]?.items?.[itemIdx]
    if (!item) return
    item.progress = progressValue
    item.done = progressValue === 100
    try {
      await saveTrainingPlan({ days: newDays, updated_at: new Date().toISOString(), updated_by: user?.email || '' }, plan.id)
    } catch (err) { console.error('savePlanProgress:', err) }
    onPlansChanged?.()
  }

  const saveCalNote = async (noteText) => {
    setCalNoteSaving(true)
    try {
      await saveWellnessEntry(selectedDayStr, DAY_NOTE_METRIC_ID, noteText, user?.email)
    } catch (err) { console.error('saveCalNote:', err) }
    setCalNoteSaving(false)
  }

  const saveWellness = async (metricId, value) => {
    setWellnessData(p => ({ ...p, [metricId]: value }))
    try {
      await saveWellnessEntry(selectedDayStr, metricId, value, user?.email)
    } catch (err) { console.error('saveWellness:', err) }
  }

  useEffect(() => {
    const dateStr = dayDetailDate || todayIso
    getSessionRatings(dateStr)
      .then(data => {
        const map = {}
        ;(data || []).forEach(r => { map[r.metric_id] = r.value })
        setSessionRatings(map)
      })
      .catch(() => {})
  }, [dayDetailDate, todayIso])

  const saveSessionRating = async (sessionKey, dateStr, val) => {
    const metricId = `__sr_${sessionKey}__`
    if (val === null) {
      try {
        const existing = await findSessionRatingEntry(dateStr, metricId)
        if (existing) setDeleteSessionConfirm({ entryId: existing.id, metricId })
      } catch (err) { console.error('saveSessionRating (find):', err) }
      return
    }
    setSessionRatings(p => ({ ...p, [metricId]: val }))
    try {
      await saveSessionRatingEntry(dateStr, metricId, val, user?.email)
    } catch (err) { console.error('saveSessionRating (save):', err) }
  }

  const confirmDeleteSession = async () => {
    if (!deleteSessionConfirm) return
    const { entryId, metricId } = deleteSessionConfirm
    try { await deleteEntry(entryId) } catch (err) { console.error('confirmDeleteSession:', err) }
    setSessionRatings(p => { const n = { ...p }; delete n[metricId]; return n })
    setDeleteSessionConfirm(null)
  }

  const markSessionDone = async (plan, dayIdx, si) => {
    const newDays = JSON.parse(JSON.stringify(plan.days || []))
    const session = newDays[dayIdx]?.sessions?.[si]
    if (!session) return
    session.status = 'done'
    try {
      await saveTrainingPlan({ days: newDays, updated_at: new Date().toISOString(), updated_by: user?.email || '' }, plan.id)
    } catch (err) { console.error('markSessionDone:', err) }
    onPlansChanged?.()
  }

  const toggleSessionStatus = async (plan, dayIdx, si, nextStatus) => {
    const newDays = JSON.parse(JSON.stringify(plan.days || []))
    const session = newDays[dayIdx]?.sessions?.[si]
    if (!session) return
    session.status = nextStatus
    try {
      await saveTrainingPlan({ days: newDays, updated_at: new Date().toISOString(), updated_by: user?.email || '' }, plan.id)
    } catch (err) { console.error('toggleSessionStatus:', err) }
    onPlansChanged?.()
  }

  const getActivityKey = (row) => {
    if (row.type === 'event') return `evt-${row.ev?.id}`
    if (row.type === 'golf') return `golf-${row.plan?.id}-${row.dayIdx}-${row.si}`
    if (row.type === 'gym') return `gym-${row.plan?.id}-${row.dayIdx}-${row.si}`
    return null
  }

  const toggleActivityDone = (row) => {
    const key = getActivityKey(row)
    if (!key) return
    const currentDone = completedByKey[key] !== undefined
      ? completedByKey[key]
      : (row.session?.status === 'done')
    if (currentDone) {
      unmarkActivity(key, row.plan?.id, row.dayIdx, row.si)
    } else {
      setActivityPopover({ key, planId: row.plan?.id, dayIdx: row.dayIdx, si: row.si })
    }
  }

  const clearSessionRating = async (sessionKey, dateStr) => {
    const metricId = `__sr_${sessionKey}__`
    setSessionRatings(p => { const n = { ...p }; delete n[metricId]; return n })
    try {
      const existing = await findSessionRatingEntry(dateStr, metricId)
      if (existing) await deleteEntry(existing.id)
    } catch (err) { console.error('clearSessionRating:', err) }
  }

  const unmarkActivity = (key, planId, dayIdx, si) => {
    setCompletedByKey(prev => ({ ...prev, [key]: false }))
    if (planId !== undefined) {
      const plan = trainingPlans.find(p => p.id === planId)
      if (plan) toggleSessionStatus(plan, dayIdx, si, 'pending')
    }
    clearSessionRating(key, selectedDayStr)
    setActivityPopover(null)
  }

  const confirmRating = (val) => {
    if (!activityPopover) return
    const { key, planId, dayIdx, si } = activityPopover
    setCompletedByKey(prev => ({ ...prev, [key]: true }))
    if (planId !== undefined) {
      const plan = trainingPlans.find(p => p.id === planId)
      if (plan) toggleSessionStatus(plan, dayIdx, si, 'done')
    }
    saveSessionRating(key, selectedDayStr, val)
    setActivityPopover(null)
  }

  const selectedDayStr = dayDetailDate || todayIso
  const selectedDayDate = new Date(selectedDayStr + 'T12:00:00')
  const selectedDayEvents = getEventsForDay(selectedDayStr)
  const weekPhaseData = calcWeekPhase(getWeekStartForDate(selectedDayStr), events)
  const currentPhaseData = calcCurrentPhase(events)
  const weekDays = getWeekDays()
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]

  useEffect(() => {
    if (calNoteSkipSaveRef.current) {
      calNoteSkipSaveRef.current = false
      return
    }
    if (calNoteLoadedDateRef.current !== selectedDayStr) return
    if (calNoteSaveTimerRef.current) clearTimeout(calNoteSaveTimerRef.current)
    calNoteSaveTimerRef.current = setTimeout(() => {
      saveCalNote(calNote)
    }, 800)
    return () => {
      if (calNoteSaveTimerRef.current) clearTimeout(calNoteSaveTimerRef.current)
    }
  }, [calNote, selectedDayStr])
  const weekRangeLabel = weekStart && weekEnd
    ? (weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${monthLabels[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${weekStart.getDate()} ${monthLabels[weekStart.getMonth()].slice(0, 3)} – ${weekEnd.getDate()} ${monthLabels[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`)
    : ''
  const monthDays = getDaysInMonth(year, month)
  const weekEvents = weekDays.flatMap(day => getEventsForDay(day))
  const weekTrainings = weekEvents.filter(ev => ev._isTrain).length
  const weekCompetitions = weekEvents.filter(isCompetitionEvent).length
  const weekCalendarEvents = weekEvents.filter(ev => !ev._isTrain).length
  // Carga: pontos por dia ativo (competição=1.5, treino=1.0, só appointment=0.5).
  // Denominador = 6 (máximo recomendado — 1 dia de descanso obrigatório por semana).
  // Se score > 6 a carga ultrapassa 100% → sinal de sobrecarga.
  const weekLoadScore = weekDays.reduce((sum, day) => {
    const evts = getEventsForDay(day)
    if (evts.some(isCompetitionEvent)) return sum + 1.5
    if (evts.some(ev => ev._isTrain)) return sum + 1.0
    if (evts.some(ev => !ev._isTrain)) return sum + 0.5
    return sum
  }, 0)
  const weekRestDays = weekDays.filter(day => getEventsForDay(day).length === 0).length
  const weekLoad = Math.min(100, Math.round((weekLoadScore / 6) * 100))
  // Objetivo: prioridade — competição > camp > treino > manutenção > livre
  const weekFirstComp = weekEvents.find(isCompetitionEvent)
  const weekFirstCamp = weekEvents.find(ev => !ev._isTrain && /camp/i.test(ev.category || ev.title || ''))
  const weekObjective = weekFirstComp?.title
    || weekFirstCamp?.title
    || (weekTrainings > 0 ? `Semana de treino — ${weekTrainings} ${weekTrainings === 1 ? 'sessão' : 'sessões'}` : null)
    || (weekCalendarEvents > 0 ? 'Semana de manutenção' : 'Semana livre')
  const selectedDayObjective = selectedDayEvents.find(ev => ev._isTrain)?.title || selectedDayEvents[0]?.title || 'Sem eventos definidos'
  const selectedDaySubtitle = selectedDayEvents.length > 0
    ? `${selectedDayEvents.length} bloco${selectedDayEvents.length === 1 ? '' : 's'} planeado${selectedDayEvents.length === 1 ? '' : 's'}`
    : 'Sem eventos definidos'

  const cardShell = {
    background: t.cardBg,
    border: `1px solid ${t.border}`,
    borderRadius: '16px',
  }

  const HeaderBar = ({ label, range, onPrev, onNext, onToday, onAdd, showGolfGym = true }) => (
    <div style={{ ...cardShell, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '9px', letterSpacing: '1.8px', color: t.accent, fontWeight: 700, marginBottom: '3px', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: t.text, lineHeight: 1.2 }}>{range}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={onPrev} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '999px', color: t.textMuted, width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>&lt;</button>
          <button onClick={() => { onToday?.(); setTodayPulse(true); setTimeout(() => setTodayPulse(false), 600) }} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '999px', color: t.textMuted, height: '32px', padding: '0 12px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 700, transform: todayPulse ? 'scale(0.88)' : 'scale(1)', transition: 'transform 150ms ease' }}>Hoje</button>
          <button onClick={onNext} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '999px', color: t.textMuted, width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>&gt;</button>
        </div>
        <button onClick={onAdd} style={{ background: t.accent, border: 'none', borderRadius: '999px', color: t.navTextActive, height: '32px', padding: '0 14px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 800, boxShadow: `0 3px 10px ${t.accent}2b` }}>+ Evento</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '999px', padding: '4px' }}>
          {(['day', 'week', 'month', 'year']).map(v => (
            <button key={v} onClick={() => switchView(v)}
              style={{ background: view === v ? t.accent : 'transparent', border: 'none', borderRadius: '999px', color: view === v ? t.navTextActive : t.textMuted, padding: '6px 12px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: view === v ? 800 : 600 }}>
              {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', visibility: showGolfGym ? 'visible' : 'hidden' }}>
          {[[ 'events', 'Eventos', '#378ADD' ], [ 'golf', 'Golf', '#22c55e' ], [ 'gym', 'Ginásio', '#f97316' ]].map(([key, label, color]) => (
            <button key={key} onClick={() => setCalFilters(p => ({ ...p, [key]: !p[key] }))}
              style={{ background: calFilters[key] ? color + '18' : t.cardBg, border: `1px solid ${calFilters[key] ? color : t.border}`, borderRadius: '999px', color: calFilters[key] ? color : t.textMuted, padding: '5px 10px', cursor: 'pointer', fontSize: '9px', fontFamily: F, fontWeight: calFilters[key] ? 700 : 500, letterSpacing: '0.8px' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const DayHeader = ({ dateLabel, weekdayLabel, onPrev, onNext, onAdd }) => (
    <div style={{ ...cardShell, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '9px', letterSpacing: '1.8px', color: t.danger, fontWeight: 700, marginBottom: '3px', textTransform: 'uppercase' }}>Dia</div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: t.text, lineHeight: 1.2 }}>{dateLabel}</div>
        <div style={{ fontSize: '10px', color: t.accent, fontWeight: 600, marginTop: '2px' }}>{weekdayLabel}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={onPrev} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '999px', color: t.textMuted, width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>&lt;</button>
          <button onClick={onNext} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '999px', color: t.textMuted, width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>&gt;</button>
        </div>
        <button onClick={onAdd} style={{ background: t.danger, border: 'none', borderRadius: '999px', color: t.navTextActive, height: '32px', padding: '0 14px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 800, boxShadow: `0 3px 10px ${t.danger}2b` }}>+ Agendar</button>
      </div>
    </div>
  )

  const phaseFromSelectedDay = (() => {
    if (selectedDayEvents.some(isCompetitionEvent)) return 'PEAK'
    if (selectedDayEvents.some(ev => ev._isTrain && ev.type === 'golf')) return 'BUILD'
    if (selectedDayEvents.some(ev => ev._isTrain && ev.type === 'gym')) return 'BUILD'
    if (selectedDayEvents.length === 0) return 'RECOVERY'
    return 'BASE'
  })()

  const phaseColors = {
    BASE: '#22c55e',
    BUILD: '#f59e0b',
    PEAK: '#ef4444',
    RECOVERY: '#94a3b8',
  }

  const PhaseCard = ({ phase, energy, objective, subtitle }) => {
    const color = phaseColors[phase] || phaseColors.BASE
    const phaseCopy = {
      PEAK: 'BUILD',
      BUILD: 'BUILD',
      BASE: 'BASE',
      RECOVERY: 'RECOVERY',
    }[phase] || phase
    return (
      <div style={{ ...cardShell, padding: '16px', background: color, borderColor: color, minHeight: '196px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
      <div style={{ fontSize: '12px', letterSpacing: '1.6px', color: '#fff', fontWeight: 800, marginBottom: '14px', textTransform: 'uppercase' }}>{phaseCopy}</div>
      <div style={{ fontSize: '10px', color: '#fff', opacity: 0.95, marginBottom: '6px' }}>Energia hoje</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{ width: '11px', height: '11px', borderRadius: '50%', background: i < energy ? '#fff' : 'rgba(255,255,255,0.35)', display: 'inline-block' }} />
            ))}
          </div>
          <div style={{ fontSize: '10px', color: '#fff', opacity: 0.92, marginBottom: '4px' }}>Objetivo do dia</div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', lineHeight: 1.35 }}>{objective}</div>
        </div>
        {subtitle && <div style={{ fontSize: '10px', color: '#fff', opacity: 0.82, lineHeight: 1.4 }}>{subtitle}</div>}
      </div>
    )
  }

  const SessionGlyph = ({ kind, color = '#fff', size = 48 }) => {
    const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }
    if (kind === 'range') return (
      <svg {...s}>
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2" fill={color} stroke="none"/>
      </svg>
    )
    if (kind === 'golf') return (
      <svg {...s}>
        <line x1="6" y1="22" x2="6" y2="3"/>
        <path d="M6 3l13 5-13 5z" fill={color} stroke="none"/>
      </svg>
    )
    if (kind === 'gym') return (
      <svg {...s}>
        <path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/>
        <path d="m18 22 4-4"/><path d="m2 6 4-4"/>
        <path d="m3 10 7-7"/><path d="m14 21 7-7"/>
      </svg>
    )
    if (kind === 'mental') return (
      <svg {...s}>
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.84z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.84z"/>
      </svg>
    )
    if (kind === 'trophy' || kind === 'comp') return (
      <svg {...s}>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
      </svg>
    )
    if (kind === 'recovery') return (
      <svg {...s}>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        <path d="M3.22 12H9.5l1.5-3 2 4.5 1.5-4 1.5 2.5h5.27"/>
      </svg>
    )
    return (
      <svg {...s}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )
  }

  const EventCard = ({ event, compact = false, onClick, completedOverride, onCircleClick, rating }) => {
    const visual = getEventVisual(event._isTrain ? event.type : null, event.category, event.title)
    const color = event._isTrain ? (event._color || visual.color) : (event.color || getCatColor(event.category) || visual.color)
    const checked = completedOverride !== undefined ? completedOverride : !!(event.done || event.completed || event.checked || event.fez_campo)
    const icon = visual.icon
    const ratingColor = rating === 'bom' ? '#22c55e' : rating === 'medio' ? '#f59e0b' : rating === 'mau' ? '#ef4444' : null
    const ratingSmile = rating === 'bom' ? ':)' : rating === 'medio' ? ':|' : rating === 'mau' ? ':(' : ''
    const circleActiveBg = ratingColor || color
    return (
      <div onClick={onClick}
        style={{ ...cardShell, padding: compact ? '8px 10px' : '12px 12px', borderLeft: `3px solid ${color}`, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ width: compact ? '20px' : '22px', height: compact ? '20px' : '22px', borderRadius: '50%', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? '12px' : '13px', flexShrink: 0, marginTop: '1px' }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? '12px' : '13px', fontWeight: 800, color: t.text, lineHeight: 1.2 }}>{event.title || event.session_name || event.name || event.cat}</div>
          <div style={{ fontSize: '9px', color: color, fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase', marginTop: '2px' }}>{event.category || (event.type === 'golf' ? 'Golf' : 'Ginasio')}</div>
          {!compact && event.notes && <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '5px', lineHeight: 1.45 }}>{event.notes.split('\n')[0]}</div>}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onCircleClick?.() }}
          style={{ width: '18px', height: '18px', borderRadius: '50%', background: checked ? circleActiveBg : 'transparent', border: `1.5px solid ${checked ? circleActiveBg : color}`, color: t.navTextActive, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', cursor: onCircleClick ? 'pointer' : 'default', padding: 0, fontSize: '9px', fontWeight: 900, lineHeight: 1 }}>
          {checked ? '✓' : ''}
        </button>
      </div>
    )
  }

  const ProgressBar = ({ value, label, color, onInfo, showInfo, infoText }) => (
    <div style={{ ...cardShell, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: t.textMuted, fontWeight: 700 }}>{label}</div>
          {onInfo && (
            <button onClick={onInfo} style={{ width: '14px', height: '14px', borderRadius: '50%', background: t.border, border: 'none', color: t.textMuted, fontSize: '9px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, flexShrink: 0 }}>i</button>
          )}
        </div>
        <div style={{ fontSize: '22px', fontWeight: 900, color }}>{value}%</div>
      </div>
      <div style={{ height: '6px', borderRadius: '999px', background: t.border, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color, borderRadius: '999px' }} />
      </div>
      {showInfo && infoText && (
        <>
          <div onClick={onInfo} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20, background: t.text, color: t.bg, borderRadius: '10px', padding: '12px 14px', fontSize: '11px', lineHeight: 1.6, width: '260px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
            {infoText}
          </div>
        </>
      )}
    </div>
  )

  const DayColumn = ({ day, eventsForDay, isToday, trainingLog }) => {
    const dateStr = fmtDate(day)
    const weekdayShort = weekdayLabels[(day.getDay() + 6) % 7]
    const sorted = sortCalendarEvents(eventsForDay)
    const hasComp = sorted.some(isCompetitionEvent)
    const hasTrain = sorted.some(ev => ev._isTrain)
    const phase = hasComp ? 'Peak' : hasTrain ? 'Build' : 'Rest'
    const phaseColor = phase === 'Peak' ? '#ef4444' : phase === 'Build' ? '#f59e0b' : '#94a3b8'
    const trainSessions = (trainingLog?.sessions || []).filter(s => !s.isRest)
    const hasRest = (trainingLog?.sessions || []).some(s => s.isRest)
    return (
      <div onClick={() => openDayDetail(dateStr)} style={{ ...cardShell, padding: 0, minHeight: '210px', background: isToday ? t.accent + '08' : t.cardBg, cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: `3px solid ${phaseColor}` }}>
        <div style={{ padding: '10px 10px 6px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: isToday ? t.accent : t.textMuted, fontWeight: 700 }}>{weekdayShort}</div>
            {isToday
              ? <div className="today-badge-lg" style={{ marginTop: '4px' }}>{day.getDate()}</div>
              : <div style={{ fontSize: '22px', fontWeight: 900, color: t.text, lineHeight: 1, marginTop: '4px' }}>{day.getDate()}</div>
            }
          </div>
          <div style={{ marginTop: '2px', background: phaseColor + '18', border: `1px solid ${phaseColor}55`, borderRadius: '999px', padding: '2px 7px', fontSize: '8px', fontWeight: 800, color: phaseColor, letterSpacing: '0.8px', textTransform: 'uppercase', flexShrink: 0 }}>{phase}</div>
        </div>
        <div style={{ padding: '0 8px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {sorted.slice(0, 3).map((ev, idx) => {
            const evVis = getEventVisual(ev._isTrain ? ev.type : null, ev.category, ev.title)
            const evColor = ev._isTrain ? (ev._color || evVis.color) : (ev.color || getCatColor(ev.category) || evVis.color)
            const evName = ev.title || ev.session_name || ev.name || ev.cat || '—'
            return (
              <div key={ev.id || idx}
                onClick={e => { e.stopPropagation(); ev._isTrain ? openDayDetail(dateStr) : openEdit(ev) }}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: evColor + '10', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', minWidth: 0, borderLeft: `3px solid ${evColor}` }}>
                <span style={{ fontSize: '11px', lineHeight: 1, flexShrink: 0 }}>{evVis.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{evName}</div>
                  {(ev.category || ev.type) && <div style={{ fontSize: '8px', letterSpacing: '0.5px', color: evColor, fontWeight: 700, textTransform: 'uppercase' }}>{ev.category || (ev.type === 'golf' ? 'Golf' : 'Ginásio')}</div>}
                </div>
              </div>
            )
          })}
          {sorted.length > 3 && <div style={{ fontSize: '9px', color: t.textMuted, fontWeight: 700, paddingLeft: '4px' }}>+{sorted.length - 3}</div>}
          {sorted.length === 0 && <div style={{ fontSize: '10px', color: t.textFaint, padding: '4px 2px', fontStyle: 'italic' }}>Livre</div>}
        </div>
        {(trainSessions.length > 0 || hasRest) && (
          <div style={{ padding: '6px 8px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: '4px', flexWrap: 'wrap', background: t.bg }}>
            {trainSessions.map((session, si) => {
              const isGolf = session.planType === 'golf'
              const color = isGolf ? activityColor('golf') : activityColor('gym')
              const sessItems = (session.items || []).filter(i => !i.isRest)
              const pct = sessItems.length > 0 ? Math.round(sessItems.reduce((a, i) => a + (i.progress ?? (i.done ? 100 : 0)), 0) / sessItems.length) : null
              return (
                <div key={si} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: color + '14', border: `1px solid ${color}35`, borderRadius: '999px', padding: '3px 8px' }}>
                  <span style={{ fontSize: '10px' }}>{isGolf ? '⛳' : '💪'}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color }}>{pct !== null ? `${pct}%` : '—'}</span>
                </div>
              )
            })}
            {hasRest && (
              <div style={{ display: 'flex', alignItems: 'center', background: '#94a3b814', border: '1px solid #94a3b835', borderRadius: '999px', padding: '3px 8px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>Descanso</span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const getCalendarPriority = (ev) => {
    if (!ev) return 3
    if (isCompetitionEvent(ev)) return 0
    if (ev._isTrain) return 1
    return 2
  }

  const sortCalendarEvents = (list) => [...list].sort((a, b) => getCalendarPriority(a) - getCalendarPriority(b))

  const MonthCard = ({ monthIndex, eventsForMonth }) => {
    const sorted = sortCalendarEvents(eventsForMonth)
    const hasComp = sorted.some(isCompetitionEvent)
    const hasTrain = sorted.some(ev => ev._isTrain)
    const phase = hasComp ? 'peak' : hasTrain ? 'build' : null
    const phaseColor = phase === 'peak' ? '#ef4444' : phase === 'build' ? '#f59e0b' : null
    return (
      <div style={{ ...cardShell, padding: '12px', background: t.surface, height: '178px', display: 'flex', flexDirection: 'column', borderTop: phaseColor ? `3px solid ${phaseColor}` : undefined }}>
        <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700, flexShrink: 0 }}>{monthLabels[monthIndex]}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minHeight: 0, overflow: 'hidden', flex: 1 }}>
          {sorted.slice(0, 4).map(ev => {
            const evVis = getEventVisual(ev._isTrain ? ev.type : null, ev.category, ev.title)
            const evColor = ev._isTrain ? (ev._color || evVis.color) : (ev.color || getCatColor(ev.category) || evVis.color)
            return (
              <div key={ev.id} onClick={() => openEdit(ev)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: evColor + '10', borderRadius: '5px', padding: '4px 6px', cursor: 'pointer', borderLeft: `2px solid ${evColor}`, minWidth: 0 }}>
                <span style={{ fontSize: '10px', flexShrink: 0 }}>{evVis.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.title}</span>
                <span style={{ fontSize: '9px', color: t.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>{ev.start_date?.slice(8)}{ev.end_date && ev.end_date !== ev.start_date ? `–${ev.end_date?.slice(8)}` : ''}</span>
              </div>
            )
          })}
          {sorted.length > 4 && <div style={{ fontSize: '9px', color: t.textMuted, fontWeight: 700, paddingLeft: '4px' }}>+{sorted.length - 4}</div>}
          {sorted.length === 0 && <div style={{ fontSize: '10px', color: t.textFaint, fontStyle: 'italic', padding: '4px 2px' }}>Livre</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;background:${t.bg};padding:4px;}
        .cal-cell{background:${t.surface};padding:6px;height:120px;min-height:120px;max-height:120px;cursor:pointer;transition:background 0.1s,box-shadow 0.1s;border:1px solid ${t.border};border-radius:8px;display:flex;flex-direction:column;overflow:hidden;}
        .cal-cell:hover{background:${t.accent}06;box-shadow:0 2px 8px rgba(0,0,0,0.06);}
        .cal-cell.today-cell{background:${t.accent}12 !important;border-color:${t.accent}55;box-shadow:0 0 0 2px ${t.accent}33;}
        .cal-week-grid{display:grid;grid-template-columns:repeat(7,1fr);background:${t.surface};border-radius:0 0 14px 14px;overflow:hidden;border:1px solid ${t.border};border-top:none;}
        .cal-week-cell{background:${t.bg};padding:8px 6px;min-height:160px;cursor:pointer;transition:background 0.1s;border-right:0.5px solid ${t.border};border-bottom:0.5px solid ${t.border};}
        .cal-week-cell:hover{background:${t.accent}08;}
        .cal-week-cell.today-cell{background:${t.accent}15 !important;box-shadow:inset 0 0 0 2px ${t.accent}55;}
        .today-badge{background:${t.accent};color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;line-height:1;}
        .today-badge-lg{background:${t.accent};color:#fff;width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;line-height:1;}
        .annual-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .cal-year-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
        .type-btn:hover{transform:scale(1.03);box-shadow:0 4px 16px rgba(0,0,0,0.15);}
        .type-btn{transition:all 0.15s;}
        .session-card{position:relative;transition:box-shadow 0.15s,transform 0.15s,border-color 0.15s;cursor:pointer;}
        .session-card::before{content:'';position:absolute;left:74px;right:0;top:0;height:0;background:var(--session-color);transition:height 0.15s;z-index:1;}
        .session-card:hover{border-color:var(--session-color) !important;box-shadow:0 5px 16px var(--session-shadow);transform:translateY(-1px);}
        .session-card:hover::before{height:3px;}
        @media(max-width:768px){.annual-grid{grid-template-columns:repeat(2,1fr)}.cal-cell{height:88px;min-height:88px;max-height:88px;padding:4px}.cal-week-cell{min-height:100px;padding:4px}}
        @media(max-width:600px){.cal-year-stats{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      {/* Session rating delete confirm */}
      {deleteSessionConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: t.overlayBg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ background: t.modalBg, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '24px', width: '300px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: t.text }}>Apagar esta avaliação?</div>
            <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '20px' }}>Esta acção não pode ser desfeita.</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteSessionConfirm(null)} style={btn(false)}>Cancelar</button>
              <button onClick={confirmDeleteSession} style={{ background: t.danger, border: 'none', borderRadius: '20px', color: t.navTextActive, padding: '7px 16px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 700 }}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      {/* Session rating popup */}
      {activityPopover && (
        <div style={{ position: 'fixed', inset: 0, background: t.overlayBg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002, padding: '16px' }}>
          <div style={{ background: t.modalBg, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '18px 20px', width: '100%', maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', fontWeight: 800, color: t.accent, textTransform: 'uppercase' }}>COMO CORREU?</div>
              <button onClick={() => setActivityPopover(null)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[['mau', 'Mal', '#ef4444'], ['medio', 'Médio', '#f59e0b'], ['bom', 'Bem', '#22c55e']].map(([val, label, bc]) => (
                <button key={val}
                  onClick={() => confirmRating(val)}
                  title={label}
                  style={{ background: bc + '12', border: `1.5px solid ${bc}`, borderRadius: '50%', color: bc, width: '48px', height: '48px', cursor: 'pointer', fontSize: '25px', fontFamily: F, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                  {RATING_OPTIONS.find(o => o.value === val)?.face || label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmEvent && (
        <div style={{ position: 'fixed', inset: 0, background: t.overlayBg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.modalBg, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px 32px', maxWidth: '380px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: t.text }}>Apagar este evento?</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
              <b style={{ color: t.text }}>{deleteConfirmEvent.title}</b><br/>
              {deleteConfirmEvent.start_date}{deleteConfirmEvent.end_date !== deleteConfirmEvent.start_date ? `   ${deleteConfirmEvent.end_date}` : ''}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirmEvent(null)} style={btn(false)}>Cancelar</button>
              <button onClick={confirmDeleteEvent} style={{ background: t.danger, border: 'none', borderRadius: '20px', color: t.navTextActive, padding: '7px 16px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 700 }}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      {/* Played Modal */}
      {showPlayedModal && (
        <div style={{ position: 'fixed', inset: 0, background: t.overlayBg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ background: t.modalBg, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '32px 28px', maxWidth: '380px', width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏆</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: t.text, marginBottom: '8px' }}>Torneio concluído!</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>Queres preencher as stats agora?</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setShowPlayedModal(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted, padding: '9px 18px', cursor: 'pointer', fontSize: '13px', fontFamily: F }}>Mais tarde</button>
              <button onClick={() => { setShowPlayedModal(false); onNavigate?.('competition') }} style={{ background: t.danger, border: 'none', borderRadius: '8px', color: t.navTextActive, padding: '9px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: F }}>Preencher Stats</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Type Picker */}
      {showTypeModal && (
        <div style={{ position: 'fixed', inset: 0, background: t.overlayBg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.modalBg, border: `1px solid ${t.border}`, borderRadius: '18px', padding: '28px', width: '90%', maxWidth: '440px' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '4px', color: t.text }}>Novo agendamento</div>
            <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '22px' }}>
              {pendingDate && pendingDate !== todayIso ? `Para ${pendingDate}  ` : ''}Que tipo de agendamento?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
              {SCHEDULE_TYPES.map(type => (
                <button key={type.id} className="type-btn" onClick={() => selectScheduleType(type)}
                  style={{ background: type.color + '15', border: `1.5px solid ${type.color}50`, borderRadius: '14px', padding: '14px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: F }}>
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>{type.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: t.text, lineHeight: 1.3 }}>{type.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTypeModal(false)} style={{ ...btn(false), width: '100%', textAlign: 'center' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: t.overlayBg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.modalBg, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '460px', maxHeight: '92vh', overflowY: 'auto' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              {schedTypeInfo && <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: schedTypeInfo.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{schedTypeInfo.icon}</div>}
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: t.text }}>
                  {editEvent ? `Editar  ${editEvent.title}` : schedTypeInfo ? schedTypeInfo.label : 'Novo evento'}
                </div>
                {!editEvent && schedTypeInfo && <div style={{ fontSize: '11px', color: schedTypeInfo.color, fontWeight: 600, marginTop: '2px' }}>{form.start_date}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/*  EDITING EXISTING EVENT: full generic form  */}
              {editEvent && (<>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>NOME</div>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do evento" style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>INICIO</div>
                    <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>FIM</div>
                    <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} style={inp} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>CATEGORIA</div>
                    <select value={form.category} onChange={e => { const cat = categories.find(c => c.name === e.target.value); setForm(p => ({ ...p, category: e.target.value, color: cat?.color || p.color })) }} style={{ ...inp }}>
                      {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>ESTADO</div>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ ...inp }}>
                      {STATUS.map(s => <option key={s} value={s}>{s === 'played' ? 'Jogado ✓' : s === 'confirmed' ? 'Confirmado' : s === 'optional' ? 'Opcional' : 'Cancelado'}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>RESULTADO</div>
                    <input value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} placeholder="Top 10, Cut, DNF..." style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>POSICAO</div>
                    <input type="number" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="Ex: 3" style={inp} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.fez_campo} onChange={e => setForm(p => ({ ...p, fez_campo: e.target.checked }))} style={{ width: '15px', height: '15px', accentColor: t.accent, cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px', color: t.text, fontFamily: F }}>Fez campo</span>
                </label>
              </>)}

              {/*  NEW TORNEIO  */}
              {!editEvent && isTorneio && (<>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '8px' }}>TIPO DE TORNEIO</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                    {TOURNAMENT_CATEGORIES.map(tc => {
                      const sel = form.category === tc.name
                      return (
                        <button key={tc.name} type="button"
                          onClick={() => setForm(p => ({ ...p, category: tc.name, color: tc.color }))}
                          style={{ background: sel ? tc.color + '22' : 'transparent', border: `1.5px solid ${sel ? tc.color : t.border}`, borderRadius: '20px', color: sel ? tc.color : t.textMuted, padding: '5px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: sel ? 700 : 500 }}>
                          {tc.name}
                        </button>
                      )
                    })}
                    <button type="button"
                      onClick={() => setForm(p => ({ ...p, category: '', color: '#6b7280' }))}
                      style={{ background: !TOURNAMENT_CATEGORIES.find(tc => tc.name === form.category) ? '#6b728022' : 'transparent', border: `1.5px solid ${!TOURNAMENT_CATEGORIES.find(tc => tc.name === form.category) ? '#6b7280' : t.border}`, borderRadius: '20px', color: !TOURNAMENT_CATEGORIES.find(tc => tc.name === form.category) ? '#6b7280' : t.textMuted, padding: '5px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: !TOURNAMENT_CATEGORIES.find(tc => tc.name === form.category) ? 700 : 500 }}>
                      Personalizado
                    </button>
                  </div>
                  {!TOURNAMENT_CATEGORIES.find(tc => tc.name === form.category) && (
                    <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                      placeholder="Ex: Circuito Europeu, Regional..." style={{ ...inp, marginTop: '4px' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>NOME DO TORNEIO</div>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Portuguese International U21" style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>INICIO</div>
                    <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>FIM</div>
                    <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} style={inp} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>ESTADO</div>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ ...inp }}>
                    {STATUS.map(s => <option key={s} value={s}>{s === 'played' ? 'Jogado ✓' : s === 'confirmed' ? 'Confirmado' : s === 'optional' ? 'Opcional' : 'Cancelado'}</option>)}
                  </select>
                </div>
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '12px' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '1px', color: t.textMuted, marginBottom: '8px', fontWeight: 600 }}>RESULTADO (preencher aps o torneio)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>Resultado</div>
                      <input value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} placeholder="Top 10, Cut, DNF..." style={inp} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>Posio</div>
                      <input type="number" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="Ex: 3" style={inp} />
                    </div>
                  </div>
                </div>
              </>)}

              {/*  NEW CAMPO  */}
              {!editEvent && isCampo && (<>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>LOCAL / CAMPO</div>
                  <input value={form.course} onChange={e => setForm(p => ({ ...p, course: e.target.value, title: e.target.value || 'Treino de campo' }))} placeholder="Ex: Troia Golf, Quinta do Peru..." style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>DATA</div>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value, end_date: e.target.value }))} style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>BURACOS</div>
                    <select value={form.holes} onChange={e => setForm(p => ({ ...p, holes: e.target.value }))} style={{ ...inp }}>
                      <option value="9">9 buracos</option>
                      <option value="18">18 buracos</option>
                      <option value="27">27 buracos</option>
                      <option value="36">36 buracos</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>SCORE</div>
                    <input type="number" value={form.score} onChange={e => setForm(p => ({ ...p, score: e.target.value }))} placeholder="Ex: 72" style={inp} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>RESULTADO</div>
                  <input value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} placeholder="Notas sobre o jogo..." style={inp} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.fez_campo} onChange={e => setForm(p => ({ ...p, fez_campo: e.target.checked }))} style={{ width: '15px', height: '15px', accentColor: t.accent, cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px', color: t.text, fontFamily: F }}>Fez campo</span>
                </label>
              </>)}

              {/*  NEW APPOINTMENT (golf_coach, gym, mental_coach, fisio, massagem, other)  */}
              {!editEvent && isAppointment && (<>
                {scheduleType === 'other' && (
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>TITULO</div>
                    <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do evento" style={inp} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>DATA</div>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value, end_date: e.target.value }))} style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>HORA</div>
                    <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>DURACAO</div>
                    <input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="Ex: 1h30" style={inp} />
                  </div>
                </div>
              </>)}

              {/* Notes  always shown */}
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>NOTAS</div>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observacoes..." style={{ ...inp, minHeight: '60px', resize: 'vertical' }} />
              </div>
            </div>

            {saveError && (
              <div style={{ marginTop: '12px', padding: '9px 13px', background: t.dangerBg, border: `1px solid ${t.danger}`, borderRadius: '8px', fontSize: '12px', color: t.danger, lineHeight: 1.5 }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'space-between' }}>
              <div>
                {editEvent && <button onClick={deleteEvent} style={{ background: 'transparent', border: `1px solid ${t.danger}`, borderRadius: '20px', color: t.danger, padding: '7px 14px', cursor: 'pointer', fontSize: '11px', fontFamily: F }}>Apagar</button>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setShowModal(false); setScheduleType(null); setSaveError(null) }} style={btn(false)}>Cancelar</button>
                <button onClick={saveEvent} disabled={saving || !canSave}
                  style={{ background: saving ? t.surface : (schedTypeInfo?.color || t.accent), border: 'none', borderRadius: '20px', color: t.navTextActive, padding: '7px 20px', cursor: (saving || !canSave) ? 'not-allowed' : 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 700, opacity: !canSave ? 0.5 : 1 }}>
                  {saving ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div style={{ position: 'fixed', inset: 0, background: t.overlayBg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.modalBg, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '24px', width: '90%', maxWidth: '340px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: t.text }}>Nova Categoria</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome da categoria" style={inp} />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={catForm.color} onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))} style={{ width: '36px', height: '32px', border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer', padding: '2px' }} />
                <span style={{ fontSize: '12px', color: t.textMuted }}>Escolher cor</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCatModal(false)} style={btn(false)}>Cancelar</button>
              <button onClick={saveCat} style={{ background: t.accent, border: 'none', borderRadius: '20px', color: t.navTextActive, padding: '7px 16px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 700 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.accent, marginBottom: '4px', fontWeight: 700 }}>CALENDÁRIO</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: t.text, lineHeight: 1.15 }}>Agenda da Temporada</div>
          <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>Todos os eventos da época — competições, treinos de campo e sessões de ginásio</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {view === 'day' && (
        <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <HeaderBar
            label="Dia"
            showGolfGym={false}
            range={`${selectedDayDate.getDate()} ${monthLabels[selectedDayDate.getMonth()]} ${selectedDayDate.getFullYear()}  ${['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][selectedDayDate.getDay()]}`}
            onPrev={() => {
              const prev = new Date(selectedDayStr + 'T12:00:00')
              prev.setDate(prev.getDate() - 1)
              const ds = fmtDate(prev)
              setDayDetailDate(ds)
              setCurrentDate(prev)
              setView('day')
            }}
            onNext={() => {
              const next = new Date(selectedDayStr + 'T12:00:00')
              next.setDate(next.getDate() + 1)
              const ds = fmtDate(next)
              setDayDetailDate(ds)
              setCurrentDate(next)
              setView('day')
            }}
            onToday={() => { setDayDetailDate(todayIso); setCurrentDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())); setView('day') }}
            onAdd={() => openSchedulePicker(selectedDayStr)}
          />
          <div style={{ background: `linear-gradient(125deg, ${weekPhaseData.phaseColor} 0%, ${weekPhaseData.phaseColor}d0 55%, ${weekPhaseData.phaseColor}90 100%)`, padding: '6px 16px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '3px', color: '#fff', fontWeight: 800, textTransform: 'uppercase', fontFamily: F, opacity: 0.95 }}>
              {weekPhaseData.phase.replace(/_/g, ' ')}
            </span>
          </div>
          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>

              {/* Left — activities */}
              <div style={{ ...cardShell, padding: '14px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px', flexShrink: 0 }}>Atividades</div>
                {selectedDayEvents.length === 0 ? (
                  <EmptyState icon="📅" message="Sem eventos" subMessage="Usa + Evento para criar um registo." t={t} compact />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '220px', paddingRight: '2px' }}>
                    {selectedDayEvents.map((ev, ei) => {
                      const actKey = ev._isTrain ? (ev._key || null) : (ev.id ? `evt-${ev.id}` : null)
                      const doneOverride = actKey !== null && completedByKey[actKey] !== undefined ? completedByKey[actKey] : undefined
                      const isDone = doneOverride !== undefined ? doneOverride : !!(ev.done || ev.completed || ev.checked || ev.fez_campo)
                      const currentRating = actKey ? (sessionRatings[`__sr_${actKey}__`] || null) : null
                      return (
                        <div key={ev.id || ei}>
                          <EventCard
                            event={ev}
                            completedOverride={doneOverride}
                            rating={currentRating}
                            onClick={() => { if (ev._isTrain) { openDayDetail(selectedDayStr) } else { openEdit(ev) } }}
                            onCircleClick={() => {
                              if (!actKey) return
                              if (isDone) {
                                unmarkActivity(actKey, ev._planId, ev._dayIdx, ev._si)
                              } else {
                                setActivityPopover({ key: actKey, planId: ev._planId, dayIdx: ev._dayIdx, si: ev._si })
                              }
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right — wellness */}
              <div style={{ ...cardShell, padding: '14px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>Como me senti hoje?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {WELLNESS_METRICS.map(m => {
                    const val = wellnessData[m.id] || 0
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px', width: '28px', textAlign: 'center', lineHeight: 1, flexShrink: 0 }}>{m.icon}</span>
                        <div style={{ fontSize: '11px', color: t.text, fontWeight: 600, flex: 1, minWidth: 0 }}>{m.label}</div>
                        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <button key={i} onClick={() => saveWellness(m.id, val === 1 && i === 0 ? 0 : i + 1)}
                              style={{ width: '15px', height: '15px', borderRadius: '50%', border: `1.5px solid ${i < val ? m.color : t.border}`, background: i < val ? m.color : t.border, cursor: 'pointer', padding: 0, flexShrink: 0, transition: 'all 0.12s' }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* SESSÕES DO DIA */}
            {(() => {
              const ws = getWeekStartForDate(selectedDayStr)
              const dayIdx = getDayIndex(selectedDayStr)
              const golfPlan = trainingPlans.find(p => p.week_start === ws && p.plan_type === 'golf')
              const gymPlan = trainingPlans.find(p => p.week_start === ws && p.plan_type === 'gym')

              const golfDaySessions = golfPlan?.days?.[dayIdx]?.sessions || []
              const gymDaySessions = gymPlan?.days?.[dayIdx]?.sessions || []
              const hasRestDay = golfDaySessions.some(s => s.isRest) || gymDaySessions.some(s => s.isRest)

              // Build combined row list: calendar events first, then plan sessions
              const sessionRows = []
              selectedDayEvents.filter(e => !e._isTrain).forEach(ev => {
                sessionRows.push({ type: 'event', ev, key: `evt-${ev.id}` })
              })
              golfDaySessions.forEach((session, si) => {
                if (!session.isRest) sessionRows.push({ type: 'golf', plan: golfPlan, dayIdx, si, session, key: `golf-${golfPlan?.id}-${dayIdx}-${si}` })
              })
              gymDaySessions.forEach((session, si) => {
                if (!session.isRest) sessionRows.push({ type: 'gym', plan: gymPlan, dayIdx, si, session, key: `gym-${gymPlan?.id}-${dayIdx}-${si}` })
              })

              const hasAnything = sessionRows.length > 0 || hasRestDay

              return (
                <div style={{ margin: '8px auto 0', maxWidth: '980px', width: '100%' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.accent, fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>SESSÕES DO DIA</div>

                  {!hasAnything && (
                    <div style={{ ...cardShell, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', color: t.textFaint }}>Sem sessões planeadas</div>
                      <button onClick={() => openSchedulePicker(selectedDayStr)}
                        style={{ background: 'transparent', border: `1px solid ${t.accent}`, borderRadius: '999px', color: t.accent, padding: '6px 14px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        Registar Sessão
                      </button>
                    </div>
                  )}

                  {hasRestDay && (
                    <div style={{ ...cardShell, padding: '12px 14px', borderLeft: '3px solid #f59e0b', marginBottom: '8px' }}>
                      <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>DIA DE DESCANSO</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sessionRows.map((row, rowIdx) => {
                      const isExpanded = expandedSession === row.key
                      const rating = sessionRatings[`__sr_${row.key}__`] || null
                      const ratingInfo = RATING_OPTIONS.find(o => o.value === rating)
                      const ratingSmile = ratingInfo?.face || ''
                      const ratingColor = ratingInfo?.color || null

                      let color, iconKind, title, subtitle, tagCount, duration
                      if (row.type === 'golf') {
                        const vis = getEventVisual('golf', row.session.cat, '')
                        color = vis.color; iconKind = vis.svgKind
                        title = (row.session.cat || 'GOLF').toUpperCase()
                        subtitle = row.session.session_type === 'coach' ? 'Com Coach' : row.session.session_type === 'auto' ? 'Autónomo' : (row.session.notes || '')
                        tagCount = (row.session.items || []).filter(i => !i.isRest).length
                        duration = row.session.duration || null
                      } else if (row.type === 'gym') {
                        const vis = getEventVisual('gym', row.session.cat, '')
                        color = vis.color; iconKind = vis.svgKind
                        title = (row.session.cat || 'GINÁSIO').toUpperCase()
                        subtitle = row.session.session_type === 'coach' ? 'Com Coach' : (row.session.notes || '')
                        tagCount = (row.session.items || []).filter(i => !i.isRest).length
                        duration = row.session.duration || null
                      } else {
                        const vis = getEventVisual(null, row.ev.category, row.ev.title)
                        iconKind = vis.svgKind
                        color = row.ev.color || vis.color
                        title = row.ev.title
                        subtitle = row.ev.category || ''
                        tagCount = null; duration = null
                      }

                      const activeItems = row.type !== 'event'
                        ? (row.session.items || []).map((item, ii) => ({ ...item, _ii: ii })).filter(i => !i.isRest)
                        : []
                      const activityKey = getActivityKey(row)
                      const sessionDone = activityKey !== null && completedByKey[activityKey] !== undefined
                        ? completedByKey[activityKey]
                        : (row.session?.status === 'done')
                      const markerGrad = row.type === 'golf'
                        ? 'linear-gradient(180deg, #378ADD 0%, #2563eb 100%)'
                        : row.type === 'gym'
                          ? 'linear-gradient(180deg, #52E8A0 0%, #16a34a 100%)'
                          : row.type === 'event'
                            ? `linear-gradient(180deg, ${color} 0%, ${color} 100%)`
                            : `linear-gradient(180deg, ${color} 0%, ${color} 100%)`
                      const markerGlow = row.type === 'golf'
                        ? 'rgba(55,138,221,0.16)'
                        : row.type === 'gym'
                          ? 'rgba(82,232,160,0.16)'
                          : 'rgba(255,255,255,0.16)'

                      return (
                        <div key={row.key}>
                          <div className="session-card" style={{ ...cardShell, overflow: 'hidden', padding: 0, '--session-color': color, '--session-shadow': `${color}24` }}>
                            <div onClick={() => activeItems.length > 0 && setExpandedSession(isExpanded ? null : row.key)} style={{ display: 'flex', alignItems: 'stretch', cursor: activeItems.length > 0 ? 'pointer' : 'default' }}>

                              {/* Left marker block */}
                              <div style={{ width: '74px', background: markerGrad, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minHeight: '92px', boxShadow: `inset 0 0 0 1px ${markerGlow}` }}>
                                <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <SessionGlyph kind={iconKind} size={40} />
                                </div>
                              </div>

                              {/* Content */}
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '12px 14px', gap: '12px', minWidth: 0 }}>

                                {/* Left: title + subtitle + tags */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '12px', fontWeight: 900, color, letterSpacing: '0.8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{title}</div>
                                  {subtitle && <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{subtitle}</div>}
                                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px', alignItems: 'center' }}>
                                    {tagCount !== null && tagCount > 0 && (
                                      <span style={{ fontSize: '10px', color, background: color + '12', border: `1px solid ${color}40`, borderRadius: '999px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 800 }}>
                                        <span style={{ fontSize: '10px', lineHeight: 1 }}>{isExpanded ? '▴' : '▾'}</span>
                                        {isExpanded ? 'Ocultar' : 'Ver'} {tagCount} exercício{tagCount !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {false && tagCount !== null && tagCount > 0 && (
                                      <span style={{ fontSize: '10px', color, background: color + '12', border: `1px solid ${color}40`, borderRadius: '999px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 800 }}>
                                        <span style={{ fontSize: '11px' }}>↕</span>{tagCount} exercício{tagCount !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {duration && (
                                      <span style={{ fontSize: '10px', color: t.textMuted, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ fontSize: '11px' }}>⏱</span>{duration} min
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Fiz */}
                                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                  {ratingSmile && (
                                    <span title={ratingInfo?.label} style={{ color: ratingColor, fontSize: '22px', fontWeight: 900, lineHeight: 1 }}>
                                      {ratingSmile}
                                    </span>
                                  )}
                                  <button onClick={() => toggleActivityDone(row)}
                                    style={{ background: sessionDone ? t.success : 'transparent', border: `2px solid ${t.success}`, borderRadius: '8px', color: sessionDone ? t.navTextActive : t.success, padding: '9px 18px', cursor: 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {String.fromCharCode(10003) + ' Fiz'}
                                  </button>
                                </div>

                              </div>
                            </div>

                            {/* Drill-down: exercises */}
                            {isExpanded && activeItems.length > 0 && (
                              <div style={{ padding: '0 14px 12px 14px', borderTop: `1px solid ${t.border}` }}>
                                <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  {activeItems.map((item, idx) => {
                                    const prog = item.progress ?? (item.done ? 100 : 0)
                                    const ic = EXERCISE_PALETTE[idx % EXERCISE_PALETTE.length]
                                    return (
                                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '7px 10px', borderLeft: `3px solid ${prog === 100 ? '#22c55e' : ic}`, background: `${prog === 100 ? '#22c55e' : ic}10`, borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0 }}>
                                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: prog === 100 ? '#22c55e' : ic, flexShrink: 0 }} />
                                          <div style={{ fontSize: '12px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{item.name}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                          {[[0,'Não fiz','#6b7280'],[50,'50%','#f59e0b'],[100,'Fiz','#22c55e']].map(([val, label, aCol]) => (
                                            <button key={val} onClick={() => row.plan && savePlanProgress(row.plan, row.dayIdx, row.si, item._ii, val)}
                                              style={{ background: prog === val ? aCol : 'transparent', border: `1px solid ${prog === val ? aCol : t.border}`, borderRadius: '999px', color: prog === val ? t.navTextActive : t.textMuted, padding: '3px 9px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: 700 }}>
                                              {label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      )
                    })}
                  </div>

                  {/* Nota do dia */}
                  <div style={{ ...cardShell, padding: '12px 14px', marginTop: '8px' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>NOTA DO DIA</div>
                    <textarea value={calNote} onChange={e => setCalNote(e.target.value)}
                      placeholder="Escreve uma nota sobre o treino de hoje..."
                      rows={3}
                      style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, padding: '6px 10px', fontSize: '12px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '64px' }} />
                  </div>
                </div>
              )
            })()}
          </div>
        </section>
        )}

        {view === 'week' && (
        <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <HeaderBar
            label="Semana"
            range={weekRangeLabel}
            onPrev={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); setView('week') }}
            onNext={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); setView('week') }}
            onToday={() => { setCurrentDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())); setView('week') }}
            onAdd={() => openSchedulePicker(todayIso)}
          />
          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{ display: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => openSchedulePicker()}
                  style={{ background: t.accent, border: 'none', borderRadius: '999px', color: t.navTextActive, padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 3px 12px ${t.accent}42` }}>
                  <span style={{ fontSize: '15px', lineHeight: 1 }}>+</span> Evento
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: '999px', padding: '4px' }}>
                  {(['day', 'week', 'month', 'year']).map(v => (
                    <button key={v} onClick={() => switchView(v)}
                      style={{ background: view === v ? t.accent : 'transparent', border: 'none', borderRadius: '999px', color: view === v ? t.navTextActive : t.textMuted, padding: '6px 12px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: view === v ? 800 : 600 }}>
                      {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : 'Ano'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[[ 'events', 'Eventos', '#378ADD' ], [ 'golf', 'Golf', activityColor('golf') ], [ 'gym', 'Ginásio', activityColor('gym') ]].map(([key, label, color]) => (
                  <button key={key} onClick={() => setCalFilters(p => ({ ...p, [key]: !p[key] }))}
                    style={{ background: calFilters[key] ? color + '18' : 'transparent', border: `1px solid ${calFilters[key] ? color : t.border}`, borderRadius: '999px', color: calFilters[key] ? color : t.textMuted, padding: '5px 11px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: calFilters[key] ? 700 : 500 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <ProgressBar
                value={weekLoad}
                label="Carga semanal"
                color={weekRestDays === 0 ? t.danger : t.accent}
                onInfo={() => setShowLoadInfo(v => !v)}
                showInfo={showLoadInfo}
                infoText={`Pontos por dia: competição = 1.5 · treino = 1.0 · só appointment = 0.5. Máximo recomendado = 6 dias ativos (1 dia de descanso obrigatório). Esta semana: ${weekLoadScore.toFixed(1)} / 6 = ${weekLoad}%${weekRestDays === 0 ? ' ⚠️ Sem dia de descanso esta semana.' : ` (${weekRestDays} dia${weekRestDays > 1 ? 's' : ''} de descanso)`}`}
              />
              <div style={{ ...cardShell, padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: t.textMuted, fontWeight: 700, marginBottom: '4px' }}>Objetivo da semana</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: t.text, lineHeight: 1.35 }}>{weekObjective}</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '760px', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', gap: '8px' }}>
                {weekDays.map((day, i) => {
                  const dateStr = fmtDate(day)
                  const dayEvts = getEventsForDay(day)
                  const isToday = dateStr === todayIso
                  return (
                    <DayColumn
                      key={i}
                      day={day}
                      eventsForDay={dayEvts}
                      isToday={isToday}
                      trainingLog={getTrainingLogForDay(dateStr)}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </section>
        )}

        {view === 'month' && (
        <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <HeaderBar
            label="Mês"
            range={`${monthLabels[month]} ${year}`}
            onPrev={() => setCurrentDate(new Date(year, month - 1, 1))}
            onNext={() => setCurrentDate(new Date(year, month + 1, 1))}
            onToday={() => { setCurrentDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)); setDayDetailDate(todayIso); setView('month') }}
            onAdd={() => openSchedulePicker(todayIso)}
          />
          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {categories.slice(0, 6).map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', color: t.textMuted, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  <div style={{ width: '12px', height: '4px', borderRadius: '2px', background: c.color }} />
                  {c.name}
                </div>
              ))}
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '420px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', padding: '4px 4px 0', background: t.bg }}>
                  {weekdayLabels.map(d => (
                    <div key={d} style={{ padding: '5px 8px', textAlign: 'center', fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: t.textMuted }}>{d}</div>
                  ))}
                </div>
              <div className="cal-grid" style={{ minWidth: '420px' }}>
                {monthDays.map((day, i) => {
                  const dateStr = fmtDate(day.date)
                  const dayEvts = getEventsForDay(day.date)
                  const isToday = dateStr === todayIso
                  const sorted = sortCalendarEvents(dayEvts)
                  const hasComp = sorted.some(isCompetitionEvent)
                  const hasTrain = sorted.some(ev => ev._isTrain)
                  const mPhase = hasComp ? 'peak' : hasTrain ? 'build' : null
                  const mPhaseColor = mPhase === 'peak' ? '#ef4444' : mPhase === 'build' ? '#f59e0b' : null
                  return (
                    <div key={i} className={`cal-cell${isToday ? ' today-cell' : ''}`} onClick={() => openDayDetail(dateStr)}
                      style={{ background: isToday ? t.accent + '12' : day.current ? t.surface : t.bg, borderTop: mPhaseColor ? `3px solid ${mPhaseColor}` : undefined, opacity: day.current ? 1 : 0.45 }}>
                      <div style={{ marginBottom: '3px' }}>
                        {isToday
                          ? <span className="today-badge">{day.date.getDate()}</span>
                          : <span style={{ fontSize: '12px', color: day.current ? t.text : t.textFaint, fontWeight: 700 }}>{day.date.getDate()}</span>
                        }
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {sorted.slice(0, 2).map((ev, ei) => {
                          const evVis = getEventVisual(ev._isTrain ? ev.type : null, ev.category, ev.title)
                          const evColor = ev._isTrain ? (ev._color || evVis.color) : (ev.color || getCatColor(ev.category) || evVis.color)
                          return (
                            <div key={ev.id || ei} onClick={e => { e.stopPropagation(); if (ev._isTrain) { openDayDetail(dateStr) } else { openEdit(ev) } }}
                              style={{ display: 'flex', alignItems: 'center', gap: '3px', background: evColor + '12', borderRadius: '4px', padding: '2px 4px', cursor: 'pointer', minWidth: 0, borderLeft: `2px solid ${evColor}`, overflow: 'hidden' }}>
                              <span style={{ fontSize: '9px', lineHeight: 1, flexShrink: 0 }}>{evVis.icon}</span>
                              <span style={{ fontSize: '9px', fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.title || ev.session_name || ev.name || ev.cat}</span>
                            </div>
                          )
                        })}
                        {sorted.length > 2 && <div style={{ fontSize: '8px', color: t.textMuted, fontWeight: 700, paddingLeft: '2px' }}>+{sorted.length - 2}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {view === 'year' && (
        <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <HeaderBar
            label="Ano"
            range={`Visão anual  ${year}`}
            onPrev={() => setCurrentDate(new Date(year - 1, month, 1))}
            onNext={() => setCurrentDate(new Date(year + 1, month, 1))}
            onToday={() => { setCurrentDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)); setDayDetailDate(todayIso); setView('year') }}
            onAdd={() => openSchedulePicker(todayIso)}
          />
          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {categories.map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', color: t.textMuted, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  <div style={{ width: '12px', height: '4px', borderRadius: '2px', background: c.color }} />
                  {c.name}
                </div>
              ))}
            </div>
            <div className="annual-grid" style={{ gap: '12px' }}>
              {Array.from({ length: 12 }, (_, m) => {
                const monthEvents = events.filter(e => e.start_date?.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`))
                return <MonthCard key={m} monthIndex={m} eventsForMonth={monthEvents} />
              })}
            </div>

          </div>
        </section>
        )}
      </div>
    </div>
  )
}










