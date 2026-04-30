import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { SCHEDULE_TYPES, TOURNAMENT_CATEGORIES, DEFAULT_CATEGORIES, activityColor, activityColorFromCategory } from '../constants/eventCategories'
import { calcWeekPhase, PHASE_COLORS } from '../lib/periodization'

const MONTHS = ['Janeiro','Fevereiro','Maro','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sb','Dom']
const STATUS = ['confirmed','optional','cancelled']

const EXERCISE_PALETTE = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6','#06b6d4','#f97316','#ef4444','#22c55e','#a855f7']

const WELLNESS_METRICS = [
  { id: '__w_energia__',  label: 'Energia',       icon: '⚡', color: '#22c55e' },
  { id: '__w_sono__',     label: 'Sono',           icon: '🌙', color: '#4f46e5' },
  { id: '__w_cansaco__',  label: 'Cansaço',        icon: '💪', color: '#f59e0b' },
  { id: '__w_dores__',    label: 'Dores / Lesões', icon: '🩹', color: '#f43f5e' },
  { id: '__w_stress__',   label: 'Stress',         icon: '🌀', color: '#14b8a6' },
]

const EMPTY_FORM = {
  title: '', start_date: '', end_date: '', category: 'Competio', status: 'confirmed',
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
  const focusDateRef = useRef(null)

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const todayIso = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`
  const monthLabels = ['Janeiro', 'Fevereiro', 'Maro', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sb', 'Dom']
  const weekdayFullLabels = ['Domingo', 'Segunda', 'Tera', 'Quarta', 'Quinta', 'Sexta', 'Sbado']

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('event_categories').select('*')
    if (data && data.length > 0) setCategories(data)
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
    const d = new Date(dateStr + 'T12:00:00')
    const dow = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
    const ws = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    const plan = trainingPlans.find(p => p.week_start === ws && p.plan_type === 'golf')
      || trainingPlans.find(p => p.week_start === ws)
    setCalNote(plan?.athlete_notes || '')
  }, [dayDetailDate, trainingPlans, todayIso])

  useEffect(() => {
    const d = new Date()
    const dateStr = dayDetailDate || `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    supabase.from('entries')
      .select('metric_id, value')
      .eq('entry_date', dateStr)
      .in('metric_id', WELLNESS_METRICS.map(m => m.id))
      .then(({ data }) => {
        const map = {}
        ;(data || []).forEach(r => { map[r.metric_id] = Number(r.value) })
        setWellnessData(map)
      })
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

    let result
    if (editEvent) {
      result = await supabase.from('events').update(payload).eq('id', editEvent.id)
    } else {
      result = await supabase.from('events').insert({ ...payload, created_by: 'user' })
    }
    setSaving(false)
    if (result.error) {
      setSaveError(result.error.message || 'Erro ao guardar o evento. Tenta novamente.')
      return
    }
    setShowModal(false)
    setScheduleType(null)
    onEventsChanged?.()
  }

  const deleteEvent = () => setDeleteConfirmEvent(editEvent)

  const confirmDeleteEvent = async () => {
    if (!deleteConfirmEvent) return
    await supabase.from('events').delete().eq('id', deleteConfirmEvent.id)
    setDeleteConfirmEvent(null)
    setShowModal(false)
    onEventsChanged?.()
  }

  const saveCat = async () => {
    await supabase.from('event_categories').insert({ ...catForm, created_by: 'user' })
    setCategories(p => [...p, catForm])
    setCatForm({ name: '', color: '#378ADD' })
    setShowCatModal(false)
  }

  const getCatColor = (catName) => categories.find(c => c.name === catName)?.color || '#777'

  const getWeekDays = () => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentDate)
    d.setDate(currentDate.getDate() + i)
    return d
  })

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
        day.sessions.forEach(session => {
          const typeTag = session.session_type === 'coach' ? ' [C]' : session.session_type === 'auto' ? ' [A]' : ''
          if (calFilters.golf && planType === 'golf')
            trainingSessions.push({ ...session, _isTrain: true, type: 'golf', _color: activityColor('golf'), name: (session.cat || 'Golf') + typeTag, done: session.status === 'done' })
          if (calFilters.gym && planType === 'gym')
            trainingSessions.push({ ...session, _isTrain: true, type: 'gym', _color: activityColor('gym'), name: (session.cat || 'Gym') + typeTag, done: session.status === 'done' })
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
    startDow = startDow === 0 ? 6 : startDow - 1
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
    await supabase.from('training_plans').update({
      days: newDays,
      updated_at: new Date().toISOString(),
      updated_by: user?.email || '',
    }).eq('id', plan.id)
    onPlansChanged?.()
  }

  const saveCalNote = async (noteText) => {
    const ws = getWeekStartForDate(selectedDayStr)
    const plan = trainingPlans.find(p => p.week_start === ws && p.plan_type === 'golf')
      || trainingPlans.find(p => p.week_start === ws)
    if (!plan) return
    setCalNoteSaving(true)
    await supabase.from('training_plans').update({
      athlete_notes: noteText,
      updated_at: new Date().toISOString(),
    }).eq('id', plan.id)
    setCalNoteSaving(false)
    onPlansChanged?.()
  }

  const saveWellness = async (metricId, value) => {
    setWellnessData(p => ({ ...p, [metricId]: value }))
    const { data } = await supabase.from('entries')
      .select('id').eq('entry_date', selectedDayStr).eq('metric_id', metricId).limit(1)
    if (data && data.length > 0) {
      await supabase.from('entries').update({ value, updated_at: new Date().toISOString(), updated_by: user?.email || '' }).eq('id', data[0].id)
    } else {
      await supabase.from('entries').insert({ entry_date: selectedDayStr, metric_id: metricId, value, updated_at: new Date().toISOString(), updated_by: user?.email || '' })
    }
  }

  useEffect(() => {
    const dateStr = dayDetailDate || todayIso
    supabase.from('entries')
      .select('metric_id, value')
      .eq('entry_date', dateStr)
      .like('metric_id', '__sr_%')
      .then(({ data }) => {
        const map = {}
        ;(data || []).forEach(r => { map[r.metric_id] = r.value })
        setSessionRatings(map)
      })
  }, [dayDetailDate, todayIso])

  const saveSessionRating = async (sessionKey, dateStr, val) => {
    const metricId = `__sr_${sessionKey}__`
    setSessionRatings(p => ({ ...p, [metricId]: val }))
    const { data } = await supabase.from('entries')
      .select('id').eq('entry_date', dateStr).eq('metric_id', metricId).limit(1)
    if (val === null) {
      if (data && data.length > 0) {
        await supabase.from('entries').delete().eq('id', data[0].id)
      }
    } else if (data && data.length > 0) {
      await supabase.from('entries').update({ value: val, updated_at: new Date().toISOString(), updated_by: user?.email || '' }).eq('id', data[0].id)
    } else {
      await supabase.from('entries').insert({ entry_date: dateStr, metric_id: metricId, value: val, updated_at: new Date().toISOString(), updated_by: user?.email || '' })
    }
  }

  const markSessionDone = async (plan, dayIdx, si) => {
    const newDays = JSON.parse(JSON.stringify(plan.days || []))
    const session = newDays[dayIdx]?.sessions?.[si]
    if (!session) return
    session.status = 'done'
    await supabase.from('training_plans').update({
      days: newDays,
      updated_at: new Date().toISOString(),
      updated_by: user?.email || '',
    }).eq('id', plan.id)
    onPlansChanged?.()
  }

  const toggleSessionStatus = async (plan, dayIdx, si, nextStatus) => {
    const newDays = JSON.parse(JSON.stringify(plan.days || []))
    const session = newDays[dayIdx]?.sessions?.[si]
    if (!session) return
    session.status = nextStatus
    await supabase.from('training_plans').update({
      days: newDays,
      updated_at: new Date().toISOString(),
      updated_by: user?.email || '',
    }).eq('id', plan.id)
    onPlansChanged?.()
  }

  const selectedDayStr = dayDetailDate || todayIso
  const selectedDayDate = new Date(selectedDayStr + 'T12:00:00')
  const selectedDayEvents = getEventsForDay(selectedDayStr)
  const weekPhaseData = calcWeekPhase(getWeekStartForDate(selectedDayStr), events)
  const weekDays = getWeekDays()
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]
  const weekRangeLabel = weekStart && weekEnd
    ? (weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()}${weekEnd.getDate()} ${monthLabels[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${weekStart.getDate()} ${monthLabels[weekStart.getMonth()].slice(0, 3)}  ${weekEnd.getDate()} ${monthLabels[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`)
    : ''
  const monthDays = getDaysInMonth(year, month)
  const weekEvents = weekDays.flatMap(day => getEventsForDay(day))
  const weekTrainings = weekEvents.filter(ev => ev._isTrain).length
  const weekCompetitions = weekEvents.filter(ev => !ev._isTrain && (ev.category === 'Competio' || TOURNAMENT_CATEGORIES.some(tc => tc.name === ev.category))).length
  const weekCalendarEvents = weekEvents.filter(ev => !ev._isTrain).length
  const weekLoad = Math.max(0, Math.min(100, Math.round((weekEvents.length / 8) * 100)))
  const weekObjective = weekEvents.find(ev => !ev._isTrain)?.title || weekEvents.find(ev => ev._isTrain)?.title || 'Gerir carga com clareza'
  const selectedDayObjective = selectedDayEvents.find(ev => ev._isTrain)?.title || selectedDayEvents[0]?.title || 'Sem eventos definidos'
  const selectedDaySubtitle = selectedDayEvents.length > 0
    ? `${selectedDayEvents.length} bloco${selectedDayEvents.length === 1 ? '' : 's'} planeado${selectedDayEvents.length === 1 ? '' : 's'}`
    : 'Sem eventos definidos'

  const cardShell = {
    background: '#fff',
    border: `1px solid ${t.border}`,
    borderRadius: '16px',
    boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03)',
  }

  const HeaderBar = ({ label, range, onPrev, onNext, onAdd }) => (
    <div style={{ ...cardShell, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '9px', letterSpacing: '1.8px', color: t.accent, fontWeight: 700, marginBottom: '3px', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: t.text, lineHeight: 1.2 }}>{range}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={onPrev} style={{ background: '#fff', border: `1px solid ${t.border}`, borderRadius: '999px', color: t.textMuted, width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>&lt;</button>
          <button onClick={onNext} style={{ background: '#fff', border: `1px solid ${t.border}`, borderRadius: '999px', color: t.textMuted, width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>&gt;</button>
        </div>
        <button onClick={onAdd} style={{ background: t.accent, border: 'none', borderRadius: '999px', color: '#fff', height: '32px', padding: '0 14px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 800, boxShadow: `0 3px 10px ${t.accent}2b` }}>+ Evento</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: `1px solid ${t.border}`, borderRadius: '999px', padding: '4px' }}>
          {(['day', 'week', 'month', 'year']).map(v => (
            <button key={v} onClick={() => switchView(v)}
              style={{ background: view === v ? t.accent : 'transparent', border: 'none', borderRadius: '999px', color: view === v ? '#fff' : t.textMuted, padding: '6px 12px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: view === v ? 800 : 600 }}>
              {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Ms' : 'Ano'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[[ 'events', 'Eventos', '#378ADD' ], [ 'golf', 'Golf', '#22c55e' ], [ 'gym', 'Ginsio', '#f97316' ]].map(([key, label, color]) => (
            <button key={key} onClick={() => setCalFilters(p => ({ ...p, [key]: !p[key] }))}
              style={{ background: calFilters[key] ? color + '18' : '#fff', border: `1px solid ${calFilters[key] ? color : t.border}`, borderRadius: '999px', color: calFilters[key] ? color : t.textMuted, padding: '5px 10px', cursor: 'pointer', fontSize: '9px', fontFamily: F, fontWeight: calFilters[key] ? 700 : 500, letterSpacing: '0.8px' }}>
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
          <button onClick={onPrev} style={{ background: '#fff', border: `1px solid ${t.border}`, borderRadius: '999px', color: t.textMuted, width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>&lt;</button>
          <button onClick={onNext} style={{ background: '#fff', border: `1px solid ${t.border}`, borderRadius: '999px', color: t.textMuted, width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>&gt;</button>
        </div>
        <button onClick={onAdd} style={{ background: t.danger, border: 'none', borderRadius: '999px', color: '#fff', height: '32px', padding: '0 14px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 800, boxShadow: `0 3px 10px ${t.danger}2b` }}>+ Agendar</button>
      </div>
    </div>
  )

  const phaseFromSelectedDay = (() => {
    if (selectedDayEvents.some(ev => !ev._isTrain && (ev.category === 'Competio' || TOURNAMENT_CATEGORIES.some(tc => tc.name === ev.category)))) return 'PEAK'
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

  const SessionGlyph = ({ kind, color = '#fff' }) => {
    const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }
    if (kind === 'golf') {
      return (
        <svg {...common}>
          <line x1="8" y1="21" x2="8" y2="4" />
          <path d="M8 4l8 3-8 3z" fill={color} stroke="none" />
          <circle cx="16" cy="18" r="2" fill={color} stroke="none" />
        </svg>
      )
    }
    if (kind === 'gym') {
      return (
        <svg {...common}>
          <rect x="4" y="9" width="4" height="6" rx="1" fill={color} stroke="none" />
          <rect x="16" y="9" width="4" height="6" rx="1" fill={color} stroke="none" />
          <rect x="9" y="10" width="6" height="4" rx="1" fill={color} stroke="none" />
        </svg>
      )
    }
    if (kind === 'mental') {
      return (
        <svg {...common}>
          <path d="M7 13c-1.5 0-3-1.2-3-3s1.5-3 3-3c.3-1.5 1.8-2.5 3.3-2.5 1.2 0 2.2.5 2.9 1.4.5-.2 1-.3 1.6-.3 1.9 0 3.5 1.6 3.5 3.5 1.2.4 2 1.6 2 2.9 0 1.6-1.3 2.9-2.9 2.9H7z" />
        </svg>
      )
    }
    if (kind === 'comp') {
      return (
        <svg {...common}>
          <path d="M12 3l2.4 4.8 5.3.8-3.9 3.8.9 5.3L12 15.8 7.3 17.7l.9-5.3-3.9-3.8 5.3-.8z" fill={color} stroke="none" />
        </svg>
      )
    }
    if (kind === 'recovery') {
      return (
        <svg {...common}>
          <path d="M6 14h3l2-5 2 10 2-5h3" />
        </svg>
      )
    }
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="5" />
      </svg>
    )
  }

  const EventCard = ({ event, compact = false, onClick }) => {
    const color = event._isTrain ? event._color : (event.color || getCatColor(event.category))
    const typeInfo = SCHEDULE_TYPES.find(s => s.category === event.category)
    const checked = !!(event.done || event.completed || event.checked || event.fez_campo)
    const icon = event._isTrain
      ? (event.type === 'golf' ? 'G' : 'GYM')
      : (typeInfo?.icon || '"')
    return (
      <div onClick={onClick}
        style={{ ...cardShell, padding: compact ? '8px 10px' : '12px 12px', borderLeft: `3px solid ${color}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ width: compact ? '20px' : '22px', height: compact ? '20px' : '22px', borderRadius: '50%', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? '12px' : '13px', flexShrink: 0, marginTop: '1px' }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? '12px' : '13px', fontWeight: 800, color: t.text, lineHeight: 1.2 }}>{event.title || event.session_name || event.name || event.cat}</div>
          <div style={{ fontSize: '9px', color: color, fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase', marginTop: '2px' }}>{event.category || (event.type === 'golf' ? 'Golf' : 'Ginasio')}</div>
          {!compact && event.notes && <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '5px', lineHeight: 1.45 }}>{event.notes.split('\n')[0]}</div>}
        </div>
        {!checked && <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `1.5px solid ${color}`, flexShrink: 0, marginTop: '2px' }} />}
        {checked && <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', fontSize: '11px', fontWeight: 800 }}>OK</div>}
      </div>
    )
  }

  const ProgressBar = ({ value, label, color }) => (
    <div style={{ ...cardShell, padding: '12px 14px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
        <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: t.textMuted, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: '22px', fontWeight: 900, color }}>{value}%</div>
      </div>
      <div style={{ height: '6px', borderRadius: '999px', background: t.border, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color, borderRadius: '999px' }} />
      </div>
    </div>
  )

  const DayColumn = ({ day, dayLabel, eventsForDay, isToday, trainingLog }) => (
    <div style={{ ...cardShell, padding: '12px', minHeight: '220px', background: isToday ? t.accentBg : '#fff' }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '1.4px', textTransform: 'uppercase', color: isToday ? t.accent : t.textMuted, fontWeight: 800 }}>{dayLabel}</div>
        <div style={{ fontSize: '20px', fontWeight: 900, color: t.text, lineHeight: 1, marginTop: '4px' }}>{day.getDate()}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {eventsForDay.map((ev, idx) => (
          <EventCard key={ev.id || idx} event={ev} compact onClick={() => { if (ev._isTrain) { openDayDetail(fmtDate(day)) } else { openEdit(ev) } }} />
        ))}
      </div>
      {trainingLog?.hasPlan && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {trainingLog.sessions.filter(s => !s.isRest).map((session, si) => {
              const isGolf = session.planType === 'golf'
              const color = isGolf ? activityColor('golf') : activityColor('gym')
              const sessItems = (session.items || []).filter(i => !i.isRest)
              const pct = sessItems.length > 0
                ? Math.round(sessItems.reduce((a, i) => a + (i.progress ?? (i.done ? 100 : 0)), 0) / sessItems.length)
                : null
              return (
                <div key={si} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: color + '14', border: `1px solid ${color}35`, borderRadius: '999px', padding: '3px 8px' }}>
                  <span style={{ fontSize: '10px' }}>{isGolf ? '⛳' : '💪'}</span>
                  {pct !== null && <span style={{ fontSize: '10px', fontWeight: 700, color }}>{pct}%</span>}
                  {pct === null && <span style={{ fontSize: '10px', fontWeight: 600, color }}>—</span>}
                </div>
              )
            })}
            {trainingLog.sessions.some(s => s.isRest) && (
              <div style={{ display: 'flex', alignItems: 'center', background: '#f59e0b14', border: '1px solid #f59e0b35', borderRadius: '999px', padding: '3px 8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b' }}>Descanso</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const getCalendarPriority = (ev) => {
    if (!ev) return 3
    if (!ev._isTrain && (ev.category === 'Competição' || TOURNAMENT_CATEGORIES.some(tc => tc.name === ev.category))) return 0
    if (ev._isTrain) return 1
    return 2
  }

  const sortCalendarEvents = (list) => [...list].sort((a, b) => getCalendarPriority(a) - getCalendarPriority(b))

  const MonthCard = ({ monthIndex, eventsForMonth }) => (
    <div style={{ ...cardShell, padding: '12px', background: '#fff', height: '178px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.accent, marginBottom: '10px', textTransform: 'uppercase', fontWeight: 700, flexShrink: 0 }}>{monthLabels[monthIndex]}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: 0, overflow: 'hidden' }}>
        {sortCalendarEvents(eventsForMonth).slice(0, 3).map(ev => (
          <div key={ev.id} onClick={() => openEdit(ev)}
            style={{ ...cardShell, padding: '7px 9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', cursor: 'pointer', borderLeft: `3px solid ${getCatColor(ev.category)}`, minWidth: 0 }}>
            <div style={{ fontSize: '12px', color: getCatColor(ev.category), fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{ev.title}</div>
            <div style={{ fontSize: '11px', color: t.textFaint, whiteSpace: 'nowrap', flexShrink: 0 }}>{ev.start_date?.slice(8)}{ev.end_date && ev.end_date !== ev.start_date ? `–${ev.end_date?.slice(8)}` : ''}</div>
          </div>
        ))}
        {eventsForMonth.length > 3 && <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: 700, paddingLeft: '2px' }}>+{eventsForMonth.length - 3}</div>}
        {eventsForMonth.length === 0 && <div style={{ fontSize: '11px', color: t.textFaint }}>Sem eventos</div>}
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:124px;background:${t.surface};border-radius:0 0 14px 14px;overflow:hidden;border:1px solid ${t.border};border-top:none;}
        .cal-cell{background:${t.bg};padding:6px;height:124px;min-height:124px;max-height:124px;cursor:pointer;transition:background 0.1s;border-right:0.5px solid ${t.border};border-bottom:0.5px solid ${t.border};display:flex;flex-direction:column;overflow:hidden;}
        .cal-cell:hover{background:${t.accent}08;}
        .cal-cell.today-cell{background:${t.accent}15 !important;box-shadow:inset 0 0 0 2px ${t.accent}55;}
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
        .session-card{transition:box-shadow 0.15s,transform 0.15s;cursor:pointer;}
        .session-card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.10);transform:translateY(-1px);}
        @media(max-width:768px){.annual-grid{grid-template-columns:repeat(2,1fr)}.cal-cell{height:96px;min-height:96px;max-height:96px;padding:3px}.cal-week-cell{min-height:100px;padding:4px}}
        @media(max-width:600px){.cal-year-stats{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      {/* Delete Confirm Modal */}
      {deleteConfirmEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px 32px', maxWidth: '380px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: t.text }}>Apagar este evento?</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
              <b style={{ color: t.text }}>{deleteConfirmEvent.title}</b><br/>
              {deleteConfirmEvent.start_date}{deleteConfirmEvent.end_date !== deleteConfirmEvent.start_date ? `   ${deleteConfirmEvent.end_date}` : ''}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirmEvent(null)} style={btn(false)}>Cancelar</button>
              <button onClick={confirmDeleteEvent} style={{ background: t.danger, border: 'none', borderRadius: '20px', color: '#fff', padding: '7px 16px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 700 }}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Type Picker */}
      {showTypeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '18px', padding: '28px', width: '90%', maxWidth: '440px' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '460px', maxHeight: '92vh', overflowY: 'auto' }}>

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
                      {STATUS.map(s => <option key={s} value={s}>{s === 'confirmed' ? 'Confirmado' : s === 'optional' ? 'Opcional' : 'Cancelado'}</option>)}
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
                    {STATUS.map(s => <option key={s} value={s}>{s === 'confirmed' ? 'Confirmado' : s === 'optional' ? 'Opcional' : 'Cancelado'}</option>)}
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
                  style={{ background: saving ? t.surface : (schedTypeInfo?.color || t.accent), border: 'none', borderRadius: '20px', color: '#fff', padding: '7px 20px', cursor: (saving || !canSave) ? 'not-allowed' : 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 700, opacity: !canSave ? 0.5 : 1 }}>
                  {saving ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '24px', width: '90%', maxWidth: '340px' }}>
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
              <button onClick={saveCat} style={{ background: t.accent, border: 'none', borderRadius: '20px', color: '#fff', padding: '7px 16px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 700 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'none' }}>
        <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.accent, fontWeight: 700, marginBottom: '4px' }}>CALENDAR</div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: t.text }}>Calendrio</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {view === 'day' && (
        <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03)' }}>
          <HeaderBar
            label="Dia"
            range={`${selectedDayDate.getDate()} ${monthLabels[selectedDayDate.getMonth()]} ${selectedDayDate.getFullYear()}  ${['Domingo', 'Segunda-feira', 'Tera-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sbado'][selectedDayDate.getDay()]}`}
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
            onToday={() => { setDayDetailDate(todayIso); setCurrentDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)); setView('day') }}
            onAdd={() => openSchedulePicker(selectedDayStr)}
          />
          <div style={{ background: weekPhaseData.phaseColor, padding: '6px 16px' }}>
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
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: t.textMuted }}>Sem eventos</div>
                    <div style={{ fontSize: '11px', color: t.textFaint, marginTop: '4px' }}>Usa + Evento para criar um registo.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '220px', paddingRight: '2px' }}>
                    {selectedDayEvents.map((ev, ei) => (
                      <EventCard
                        key={ev.id || ei}
                        event={ev}
                        onClick={() => { if (ev._isTrain) { openDayDetail(selectedDayStr) } else { openEdit(ev) } }}
                      />
                    ))}
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
                            <button key={i} onClick={() => saveWellness(m.id, i + 1)}
                              style={{ width: '15px', height: '15px', borderRadius: '50%', border: `1.5px solid ${i < val ? m.color : t.border}`, background: i < val ? m.color : 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0, transition: 'all 0.12s' }} />
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
                <div style={{ marginTop: '8px' }}>
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

                      let color, iconKind, title, subtitle, tagCount, duration
                      if (row.type === 'golf') {
                        color = activityColor('golf'); iconKind = 'golf'
                        title = (row.session.cat || 'GOLF').toUpperCase()
                        subtitle = row.session.session_type === 'coach' ? 'Com Coach' : row.session.session_type === 'auto' ? 'Autónomo' : (row.session.notes || '')
                        tagCount = (row.session.items || []).filter(i => !i.isRest).length
                        duration = row.session.duration || null
                      } else if (row.type === 'gym') {
                        color = activityColor('gym'); iconKind = 'gym'
                        title = (row.session.cat || 'GINÁSIO').toUpperCase()
                        subtitle = row.session.session_type === 'coach' ? 'Com Coach' : (row.session.notes || '')
                        tagCount = (row.session.items || []).filter(i => !i.isRest).length
                        duration = row.session.duration || null
                      } else {
                        const cat = `${row.ev.category || ''} ${row.ev.title || ''}`
                        color = row.ev.color || activityColorFromCategory(cat)
                        if (color === activityColor('competition')) iconKind = 'comp'
                        else if (color === activityColor('golf')) iconKind = 'golf'
                        else if (color === activityColor('mental')) iconKind = 'mental'
                        else if (color === activityColor('fisio') || color === activityColor('massagem')) iconKind = 'recovery'
                        else if (color === activityColor('gym')) iconKind = 'gym'
                        else iconKind = 'event'
                        title = row.ev.title
                        subtitle = row.ev.category || ''
                        tagCount = null; duration = null
                      }

                      const activeItems = row.type !== 'event'
                        ? (row.session.items || []).map((item, ii) => ({ ...item, _ii: ii })).filter(i => !i.isRest)
                        : []
                      const sessionDone = row.session?.status === 'done'
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
                        <div key={row.key} className="session-card" style={{ ...cardShell, overflow: 'hidden', padding: 0 }}>
                          <div onClick={() => activeItems.length > 0 && setExpandedSession(isExpanded ? null : row.key)} style={{ display: 'flex', alignItems: 'stretch', cursor: activeItems.length > 0 ? 'pointer' : 'default' }}>

                            {/* Left marker block */}
                            <div style={{ width: '74px', background: markerGrad, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minHeight: '92px', boxShadow: `inset 0 0 0 1px ${markerGlow}` }}>
                              <div style={{ position: 'absolute', top: '8px', left: '8px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: '#fff', fontFamily: F, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                                {rowIdx + 1}
                              </div>
                              {sessionDone && (
                                <div style={{ position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                                  ✓
                                </div>
                              )}
                              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}>
                                <SessionGlyph kind={iconKind} />
                              </div>
                              <div style={{ position: 'absolute', left: '12px', bottom: '10px', right: '12px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.18)' }} />
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '12px 14px', gap: '12px', minWidth: 0 }}>

                              {/* Left: title + subtitle + tags */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 900, color, letterSpacing: '0.8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{title}</div>
                                {subtitle && <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{subtitle}</div>}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '5px', alignItems: 'center' }}>
                                  {tagCount !== null && tagCount > 0 && (
                                    <span style={{ fontSize: '10px', color: t.textMuted, display: 'flex', alignItems: 'center', gap: '3px' }}>
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

                              {/* Middle: Como correu? */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                <div style={{ fontSize: '9px', color: t.textMuted, fontWeight: 600, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Como correu?</div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  {[['mau','✕','Mau','#ef4444'],['medio','●','Médio','#f59e0b'],['bom','✓','Bom','#22c55e']].map(([val, sym, label, bc]) => (
                                    <button key={val} onClick={() => saveSessionRating(row.key, selectedDayStr, rating === val ? null : val)}
                                      style={{ background: rating === val ? bc : '#fff', border: `1.5px solid ${bc}`, borderRadius: '20px', color: rating === val ? '#fff' : bc, padding: '4px 9px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                                      <span>{sym}</span>{label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Right: Fiz */}
                              <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                <button onClick={row.plan ? () => toggleSessionStatus(row.plan, row.dayIdx, row.si, sessionDone ? 'pending' : 'done') : undefined}
                                  style={{ background: sessionDone ? '#16a34a' : 'transparent', border: `2px solid ${sessionDone ? '#16a34a' : '#22c55e'}`, borderRadius: '8px', color: sessionDone ? '#fff' : '#16a34a', padding: '9px 18px', cursor: row.plan ? 'pointer' : 'default', fontSize: '12px', fontFamily: F, fontWeight: 700, whiteSpace: 'nowrap', boxShadow: sessionDone ? '0 2px 6px rgba(34,197,94,0.3)' : 'none' }}>
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
                                            style={{ background: prog === val ? aCol : 'transparent', border: `1px solid ${prog === val ? aCol : t.border}`, borderRadius: '999px', color: prog === val ? '#fff' : t.textMuted, padding: '3px 9px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: 700 }}>
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
                      )
                    })}
                  </div>

                  {/* Nota do dia */}
                  {(golfPlan || gymPlan) && (
                    <div style={{ ...cardShell, padding: '12px 14px', marginTop: '8px' }}>
                      <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>NOTA DO DIA</div>
                      <textarea value={calNote} onChange={e => setCalNote(e.target.value)}
                        placeholder="Escreve uma nota sobre o treino de hoje..."
                        rows={3}
                        style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, padding: '6px 10px', fontSize: '12px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '64px' }} />
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </section>
        )}

        {view === 'week' && (
        <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03)' }}>
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
                  style={{ background: t.accent, border: 'none', borderRadius: '999px', color: '#fff', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 3px 12px ${t.accent}42` }}>
                  <span style={{ fontSize: '15px', lineHeight: 1 }}>+</span> Evento
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: '999px', padding: '4px' }}>
                  {(['day', 'week', 'month', 'year']).map(v => (
                    <button key={v} onClick={() => switchView(v)}
                      style={{ background: view === v ? t.accent : 'transparent', border: 'none', borderRadius: '999px', color: view === v ? '#fff' : t.textMuted, padding: '6px 12px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: view === v ? 800 : 600 }}>
                      {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Ms' : 'Ano'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[[ 'events', 'Eventos', '#378ADD' ], [ 'golf', 'Golf', activityColor('golf') ], [ 'gym', 'Ginsio', activityColor('gym') ]].map(([key, label, color]) => (
                  <button key={key} onClick={() => setCalFilters(p => ({ ...p, [key]: !p[key] }))}
                    style={{ background: calFilters[key] ? color + '18' : 'transparent', border: `1px solid ${calFilters[key] ? color : t.border}`, borderRadius: '999px', color: calFilters[key] ? color : t.textMuted, padding: '5px 11px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: calFilters[key] ? 700 : 500 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <ProgressBar value={weekLoad} label="Carga semanal" color={t.accent} />
              <div style={{ ...cardShell, padding: '12px 14px', background: '#fff' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: t.textMuted, fontWeight: 700, marginBottom: '4px' }}>Objetivo da semana</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: t.text, lineHeight: 1.35 }}>{weekObjective}</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '760px', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', gap: '8px' }}>
                {weekDays.map((day, i) => {
                  const dateStr = fmtDate(day)
                  const dayLabel = weekdayLabels[(day.getDay() + 6) % 7]
                  const dayEvts = getEventsForDay(day)
                  const isToday = dateStr === todayIso
                  const phaseLabel = dayEvts.some(ev => !ev._isTrain && (ev.category === 'Competio' || TOURNAMENT_CATEGORIES.some(tc => tc.name === ev.category)))
                    ? 'Peak'
                    : dayEvts.some(ev => ev._isTrain)
                      ? 'Build'
                      : 'Recovery'
                  const phaseColor = phaseLabel === 'Peak' ? '#ef4444' : phaseLabel === 'Build' ? '#f59e0b' : '#94a3b8'
                  return (
                    <DayColumn
                      key={i}
                      day={day}
                      dayLabel={`${dayLabel}  ${phaseLabel}`}
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
        <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03)' }}>
          <HeaderBar
            label="Ms"
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
              <div className="cal-grid" style={{ minWidth: '420px' }}>
                {weekdayLabels.map(d => (
                  <div key={d} style={{ background: t.bg, padding: '8px', textAlign: 'center', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: t.textMuted, borderRight: `0.5px solid ${t.border}`, borderBottom: `0.5px solid ${t.border}` }}>{d}</div>
                ))}
                {monthDays.map((day, i) => {
                  const dateStr = fmtDate(day.date)
                  const dayEvts = getEventsForDay(day.date)
                  const isToday = dateStr === todayIso
                  return (
                    <div key={i} className={`cal-cell${isToday ? ' today-cell' : ''}`} onClick={() => openDayDetail(dateStr)}
                      style={{ background: isToday ? t.accent + '15' : day.current ? t.surface : t.bg, borderRight: `0.5px solid ${t.border}`, borderBottom: `0.5px solid ${t.border}` }}>
                      <div style={{ marginBottom: '4px' }}>
                        {isToday
                          ? <span className="today-badge">{day.date.getDate()}</span>
                          : <span style={{ fontSize: '12px', color: day.current ? t.text : t.textFaint, fontWeight: 600 }}>{day.date.getDate()}</span>
                        }
                      </div>
                      {sortCalendarEvents(dayEvts).slice(0, 2).map((ev, ei) => (
                        <div key={ev.id || ei} onClick={e => { e.stopPropagation(); if (ev._isTrain) { openDayDetail(dateStr) } else { openEdit(ev) } }}
                          style={{ background: ev._isTrain ? ev._color + '24' : (ev.color || getCatColor(ev.category)), borderRadius: '5px', padding: '2px 5px', fontSize: '10px', fontWeight: 700, color: ev._isTrain ? ev._color : '#fff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', border: ev._isTrain ? `1px solid ${ev._color}44` : 'none', flexShrink: 0 }}>
                          {ev._isTrain ? (ev.type === 'golf' ? 'G' : 'GYM') : ''}{ev.title || ev.session_name || ev.name || ev.cat}
                        </div>
                      ))}
                      {dayEvts.length > 2 && <div style={{ fontSize: '9px', color: t.textMuted, fontWeight: 700, marginTop: '1px' }}>+{dayEvts.length - 2}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
        )}

        {view === 'year' && (
        <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03)' }}>
          <HeaderBar
            label="Ano"
            range={`Viso anual  ${year}`}
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










