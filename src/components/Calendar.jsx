import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SCHEDULE_TYPES, TOURNAMENT_CATEGORIES, DEFAULT_CATEGORIES } from '../constants/eventCategories'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const STATUS = ['confirmed','optional','cancelled']

const EMPTY_FORM = {
  title: '', start_date: '', end_date: '', category: 'Competição', status: 'confirmed',
  color: '#378ADD', result: '', position: '', notes: '', fez_campo: false,
  time: '', duration: '', course: '', holes: '18', score: '',
}

export default function Calendar({ theme, t, user, lang = 'en', onNavigate, events = [], trainingPlans = [], onEventsChanged, initScheduleType, onInitConsumed }) {
  const [view, setView] = useState('month')
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
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState(null)
  const [calFilters, setCalFilters] = useState({ events: true, golf: true, gym: true })

  const today = new Date().toISOString().split('T')[0]

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('event_categories').select('*')
    if (data && data.length > 0) setCategories(data)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const openSchedulePicker = (date) => {
    setPendingDate(date || today)
    setShowTypeModal(true)
  }

  const selectScheduleType = (type, date) => {
    setShowTypeModal(false)
    setEditEvent(null)
    setScheduleType(type.id)
    const d = date || pendingDate || today
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
  }

  useEffect(() => {
    if (!initScheduleType) return
    const type = SCHEDULE_TYPES.find(s => s.id === initScheduleType)
    if (type) { selectScheduleType(type, today); onInitConsumed?.() }
  }, [initScheduleType]) // eslint-disable-line react-hooks/exhaustive-deps

  const openDayDetail = (dateStr) => {
    setDayDetailDate(dateStr)
    const d = new Date(dateStr + 'T12:00:00')
    setCurrentDate(d)
    setView('day')
  }

  const openEdit = (e) => {
    // Torneio events are stored with a tournament-specific category (e.g. 'Circuito Nacional'),
    // not with 'Competição', so we check TOURNAMENT_CATEGORIES first.
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
    const isCampoType = scheduleType === 'campo' && !editEvent
    const extras = []
    if (form.time) extras.push(`Hora: ${form.time}`)
    if (form.duration) extras.push(`Duração: ${form.duration}`)
    if (isCampoType && form.holes) extras.push(`Buracos: ${form.holes}`)
    if (isCampoType && form.score) extras.push(`Score: ${form.score}`)
    const notesStr = extras.length > 0
      ? extras.join(' · ') + (form.notes ? '\n' + form.notes : '')
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

    if (editEvent) {
      await supabase.from('events').update(payload).eq('id', editEvent.id)
    } else {
      await supabase.from('events').insert({ ...payload, created_by: 'user' })
    }
    setSaving(false)
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
    else if (v === 'day') { setCurrentDate(now); setDayDetailDate(today) }
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
            trainingSessions.push({ ...session, _isTrain: true, type: 'golf', _color: '#22c55e', name: (session.cat || 'Golf') + typeTag })
          if (calFilters.gym && planType === 'gym')
            trainingSessions.push({ ...session, _isTrain: true, type: 'gym', _color: '#f97316', name: (session.cat || 'Gym') + typeTag })
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

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);background:${t.surface};border-radius:0 0 14px 14px;overflow:hidden;border:1px solid ${t.border};border-top:none;}
        .cal-cell{background:${t.bg};padding:6px;min-height:66px;cursor:pointer;transition:background 0.1s;border-right:0.5px solid ${t.border};border-bottom:0.5px solid ${t.border};}
        .cal-cell:hover{background:${t.accent}08;}
        .cal-cell.today-cell{background:${t.accent}15 !important;box-shadow:inset 0 0 0 2px ${t.accent}55;}
        .cal-week-grid{display:grid;grid-template-columns:repeat(7,1fr);background:${t.surface};border-radius:0 0 14px 14px;overflow:hidden;border:1px solid ${t.border};border-top:none;}
        .cal-week-cell{background:${t.bg};padding:8px 6px;min-height:160px;cursor:pointer;transition:background 0.1s;border-right:0.5px solid ${t.border};border-bottom:0.5px solid ${t.border};}
        .cal-week-cell:hover{background:${t.accent}08;}
        .cal-week-cell.today-cell{background:${t.accent}15 !important;box-shadow:inset 0 0 0 2px ${t.accent}55;}
        .today-badge{background:${t.accent};color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;line-height:1;}
        .today-badge-lg{background:${t.accent};color:#fff;width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;line-height:1;}
        .annual-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .cal-year-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
        .type-btn:hover{transform:scale(1.03);box-shadow:0 4px 16px rgba(0,0,0,0.15);}
        .type-btn{transition:all 0.15s;}
        @media(max-width:768px){.annual-grid{grid-template-columns:repeat(2,1fr)}.cal-cell{min-height:40px;padding:3px}.cal-week-cell{min-height:100px;padding:4px}}
        @media(max-width:600px){.cal-year-stats{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      {/* Delete Confirm Modal */}
      {deleteConfirmEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px 32px', maxWidth: '380px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: t.text }}>Apagar este evento?</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
              <b style={{ color: t.text }}>{deleteConfirmEvent.title}</b><br/>
              {deleteConfirmEvent.start_date}{deleteConfirmEvent.end_date !== deleteConfirmEvent.start_date ? ` → ${deleteConfirmEvent.end_date}` : ''}
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
              {pendingDate && pendingDate !== today ? `Para ${pendingDate} · ` : ''}Que tipo de agendamento?
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
                  {editEvent ? `Editar · ${editEvent.title}` : schedTypeInfo ? schedTypeInfo.label : 'Novo evento'}
                </div>
                {!editEvent && schedTypeInfo && <div style={{ fontSize: '11px', color: schedTypeInfo.color, fontWeight: 600, marginTop: '2px' }}>{form.start_date}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* ── EDITING EXISTING EVENT: full generic form ── */}
              {editEvent && (<>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>NOME</div>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do evento" style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>INÍCIO</div>
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
                    <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>POSIÇÃO</div>
                    <input type="number" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="Ex: 3" style={inp} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.fez_campo} onChange={e => setForm(p => ({ ...p, fez_campo: e.target.checked }))} style={{ width: '15px', height: '15px', accentColor: t.accent, cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px', color: t.text, fontFamily: F }}>Fez campo</span>
                </label>
              </>)}

              {/* ── NEW TORNEIO ── */}
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
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>INÍCIO</div>
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
                  <div style={{ fontSize: '10px', letterSpacing: '1px', color: t.textMuted, marginBottom: '8px', fontWeight: 600 }}>RESULTADO (preencher após o torneio)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>Resultado</div>
                      <input value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} placeholder="Top 10, Cut, DNF..." style={inp} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>Posição</div>
                      <input type="number" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="Ex: 3" style={inp} />
                    </div>
                  </div>
                </div>
              </>)}

              {/* ── NEW CAMPO ── */}
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

              {/* ── NEW APPOINTMENT (golf_coach, gym, mental_coach, fisio, massagem, other) ── */}
              {!editEvent && isAppointment && (<>
                {scheduleType === 'other' && (
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>TÍTULO</div>
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
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>DURAÇÃO</div>
                    <input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="Ex: 1h30" style={inp} />
                  </div>
                </div>
              </>)}

              {/* Notes — always shown */}
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>NOTAS</div>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações..." style={{ ...inp, minHeight: '60px', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '18px', justifyContent: 'space-between' }}>
              <div>
                {editEvent && <button onClick={deleteEvent} style={{ background: 'transparent', border: `1px solid ${t.danger}`, borderRadius: '20px', color: t.danger, padding: '7px 14px', cursor: 'pointer', fontSize: '11px', fontFamily: F }}>Apagar</button>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setShowModal(false); setScheduleType(null) }} style={btn(false)}>Cancelar</button>
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

      {/* Page header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.accent, fontWeight: 700, marginBottom: '3px' }}>CALENDAR</div>
        <div style={{ fontSize: '11px', color: t.textMuted }}>Calendário de competições e treinos</div>
      </div>

      {/* Toolbar */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px 14px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>

        {/* Left: Novo agendamento + nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => openSchedulePicker()}
            style={{ background: t.accent, border: 'none', borderRadius: '24px', color: '#fff', padding: '9px 20px', cursor: 'pointer', fontSize: '13px', fontFamily: F, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 3px 12px ${t.accent}55`, letterSpacing: '0.2px' }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Novo agendamento
          </button>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {view === 'month' && <>
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 6px' }}>‹</button>
              <div style={{ fontSize: '14px', fontWeight: 700, color: t.text, minWidth: '150px', textAlign: 'center' }}>{MONTHS[month]} {year}</div>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 6px' }}>›</button>
            </>}
            {view === 'week' && (() => {
              const days = getWeekDays()
              const s = days[0], e = days[6]
              const label = s.getMonth() === e.getMonth()
                ? `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`
                : `${s.getDate()} ${MONTHS[s.getMonth()].slice(0,3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0,3)} ${e.getFullYear()}`
              return <>
                <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d) }} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 6px' }}>‹</button>
                <div style={{ fontSize: '13px', fontWeight: 700, color: t.text, minWidth: '200px', textAlign: 'center' }}>{label}</div>
                <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d) }} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 6px' }}>›</button>
              </>
            })()}
            {view === 'day' && dayDetailDate && (() => {
              const d = new Date(dayDetailDate + 'T12:00:00')
              const prevDay = new Date(d); prevDay.setDate(d.getDate() - 1)
              const nextDay = new Date(d); nextDay.setDate(d.getDate() + 1)
              return <>
                <button onClick={() => { const ds = fmtDate(prevDay); setDayDetailDate(ds); setCurrentDate(prevDay) }} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 6px' }}>‹</button>
                <div style={{ fontSize: '13px', fontWeight: 700, color: t.text, minWidth: '180px', textAlign: 'center' }}>
                  {d.getDate()} {MONTHS[d.getMonth()]} {d.getFullYear()}
                </div>
                <button onClick={() => { const ds = fmtDate(nextDay); setDayDetailDate(ds); setCurrentDate(nextDay) }} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 6px' }}>›</button>
              </>
            })()}
            {view === 'year' && <div style={{ fontSize: '15px', fontWeight: 700, color: t.text }}>Ano {year}</div>}
          </div>
        </div>

        {/* Right: view buttons + filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['day', 'week', 'month', 'year']).map(v => (
            <button key={v} onClick={() => switchView(v)}
              style={{ background: view === v ? t.accent + '18' : 'transparent', border: `1px solid ${view === v ? t.accent : t.border}`, borderRadius: '20px', color: view === v ? t.accent : t.textMuted, padding: '4px 12px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: view === v ? 700 : 500 }}>
              {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : 'Anual'}
            </button>
          ))}
          <div style={{ width: '1px', height: '14px', background: t.border }} />
          {[['events', 'Eventos', '#378ADD'], ['golf', 'Golf', '#22c55e'], ['gym', 'Ginásio', '#f97316']].map(([key, label, color]) => (
            <button key={key} onClick={() => setCalFilters(p => ({ ...p, [key]: !p[key] }))}
              style={{ background: calFilters[key] ? color + '22' : 'transparent', border: `1px solid ${calFilters[key] ? color : t.border}`, borderRadius: '20px', color: calFilters[key] ? color : t.textMuted, padding: '4px 10px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: calFilters[key] ? 700 : 500 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', padding: '8px 16px', background: t.surface, borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', color: t.textMuted, fontWeight: 500 }}>
            <div style={{ width: '12px', height: '3px', borderRadius: '2px', background: c.color }} />
            {c.name}
          </div>
        ))}
      </div>

      {/* ── MONTH VIEW ── */}
      {view === 'month' && (
        <div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div className="cal-grid" style={{ minWidth: '420px' }}>
              {WEEKDAYS.map(d => (
                <div key={d} style={{ background: t.bg, padding: '8px', textAlign: 'center', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: t.textMuted, borderRight: `0.5px solid ${t.border}`, borderBottom: `0.5px solid ${t.border}` }}>{d}</div>
              ))}
              {getDaysInMonth(year, month).map((day, i) => {
                const dateStr = fmtDate(day.date)
                const dayEvts = getEventsForDay(day.date)
                const isToday = dateStr === today
                return (
                  <div key={i} className={`cal-cell${isToday ? ' today-cell' : ''}`} onClick={() => openDayDetail(dateStr)}
                    style={{ background: isToday ? t.accent + '15' : day.current ? t.surface : t.bg, borderRight: `0.5px solid ${t.border}`, borderBottom: `0.5px solid ${t.border}` }}>
                    <div style={{ marginBottom: '4px' }}>
                      {isToday
                        ? <span className="today-badge">{day.date.getDate()}</span>
                        : <span style={{ fontSize: '12px', color: day.current ? t.text : t.textFaint, fontWeight: 600 }}>{day.date.getDate()}</span>
                      }
                    </div>
                    {dayEvts.slice(0, 2).map((ev, ei) => (
                      <div key={ev.id || ei} onClick={e => { e.stopPropagation(); if (ev._isTrain) { onNavigate?.('training', { date: dateStr }) } else { openEdit(ev) } }}
                        style={{ background: ev._isTrain ? ev._color + '33' : (ev.color || getCatColor(ev.category)), borderRadius: '4px', padding: '2px 5px', fontSize: '10px', fontWeight: 700, color: ev._isTrain ? ev._color : '#fff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', border: ev._isTrain ? `1px solid ${ev._color}44` : 'none' }}>
                        {ev._isTrain ? (ev.type === 'golf' ? '⛳' : '💪') + ' ' : ''}{ev.title || ev.session_name || ev.name || ev.cat}
                      </div>
                    ))}
                    {dayEvts.length > 2 && <div style={{ fontSize: '9px', color: t.textMuted, fontWeight: 600 }}>+{dayEvts.length - 2}</div>}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', color: t.textMuted }}>
            {MONTHS[month]}: {events.filter(e => e.start_date?.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length} eventos
          </div>
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="cal-week-grid" style={{ minWidth: '500px' }}>
            {getWeekDays().map((day, i) => {
              const dateStr = fmtDate(day)
              const isToday = dateStr === today
              const dayLabel = WEEKDAYS[(day.getDay() + 6) % 7]
              return (
                <div key={`h${i}`} style={{ background: isToday ? t.accent + '20' : t.bg, padding: '8px 6px', textAlign: 'center', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: isToday ? t.accent : t.textMuted, borderRight: `0.5px solid ${t.border}`, borderBottom: `0.5px solid ${t.border}` }}>
                  {dayLabel}
                  {isToday && <div style={{ fontSize: '8px', color: t.accent, fontWeight: 800 }}>HOJE</div>}
                </div>
              )
            })}
            {getWeekDays().map((day, i) => {
              const dateStr = fmtDate(day)
              const dayEvts = getEventsForDay(day)
              const isToday = dateStr === today
              return (
                <div key={i} className={`cal-week-cell${isToday ? ' today-cell' : ''}`} onClick={() => openDayDetail(dateStr)}>
                  <div style={{ marginBottom: '6px' }}>
                    {isToday
                      ? <span className="today-badge-lg">{day.getDate()}</span>
                      : <span style={{ fontSize: '17px', fontWeight: 600, color: t.text, lineHeight: 1 }}>{day.getDate()}</span>
                    }
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {dayEvts.map((ev, ei) => (
                      <div key={ev.id || ei} onClick={e => { e.stopPropagation(); if (ev._isTrain) { onNavigate?.('training', { date: dateStr }) } else { openEdit(ev) } }}
                        style={{ background: ev._isTrain ? ev._color + '33' : (ev.color || getCatColor(ev.category)), borderRadius: '3px', padding: '3px 5px', fontSize: '10px', fontWeight: 600, color: ev._isTrain ? ev._color : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', border: ev._isTrain ? `1px solid ${ev._color}44` : 'none' }}>
                        {ev._isTrain ? (ev.type === 'golf' ? '⛳' : '💪') + ' ' : ''}{ev.title || ev.name || ev.cat}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── DAY VIEW ── */}
      {view === 'day' && dayDetailDate && (() => {
        const d = new Date(dayDetailDate + 'T12:00:00')
        const dayEvts = getEventsForDay(dayDetailDate)
        const isToday = dayDetailDate === today
        const wdNames = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
        return (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderTop: 'none', borderRadius: '0 0 14px 14px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'center', background: isToday ? t.accent : t.border + '44', borderRadius: '14px', padding: '10px 16px', minWidth: '56px' }}>
                  <div style={{ fontSize: '30px', fontWeight: 900, color: isToday ? '#fff' : t.text, lineHeight: 1 }}>{d.getDate()}</div>
                  <div style={{ fontSize: '9px', color: isToday ? 'rgba(255,255,255,0.8)' : t.textMuted, fontWeight: 700, letterSpacing: '1px', marginTop: '2px' }}>{MONTHS[d.getMonth()].slice(0,3).toUpperCase()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: t.text }}>{wdNames[d.getDay()]}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>{MONTHS[d.getMonth()]} {d.getFullYear()}</div>
                  {isToday && <div style={{ fontSize: '10px', color: t.accent, fontWeight: 700, letterSpacing: '1px', marginTop: '3px' }}>HOJE</div>}
                </div>
              </div>
              <button onClick={() => openSchedulePicker(dayDetailDate)}
                style={{ background: t.accent, border: 'none', borderRadius: '20px', color: '#fff', padding: '9px 18px', cursor: 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 2px 8px ${t.accent}44` }}>
                <span style={{ fontSize: '14px' }}>+</span> Agendar
              </button>
            </div>

            {dayEvts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: t.textFaint }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>📅</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: t.textMuted }}>Sem eventos neste dia</div>
                <div style={{ fontSize: '11px', color: t.textFaint, marginTop: '4px' }}>Clica em "+ Agendar" para adicionar</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dayEvts.map((ev, ei) => {
                  const evColor = ev._isTrain ? ev._color : (ev.color || getCatColor(ev.category))
                  const typeInfo = SCHEDULE_TYPES.find(s => s.category === ev.category)
                  return (
                    <div key={ev.id || ei}
                      onClick={() => { if (ev._isTrain) { onNavigate?.('training', { date: dayDetailDate }) } else { openEdit(ev) } }}
                      style={{ background: evColor + '10', border: `1px solid ${evColor}35`, borderLeft: `4px solid ${evColor}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>
                        {ev._isTrain ? (ev.type === 'golf' ? '⛳' : '💪') : (typeInfo?.icon || '📅')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: t.text, marginBottom: '2px' }}>{ev.title || ev.session_name || ev.name || ev.cat}</div>
                        <div style={{ fontSize: '11px', color: evColor, fontWeight: 600 }}>{ev.category || (ev.type === 'golf' ? 'Golf' : 'Gym')}</div>
                        {ev.notes && <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '5px', lineHeight: 1.5 }}>{ev.notes.split('\n')[0]}</div>}
                        {ev.result && <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '3px' }}>Resultado: {ev.result}{ev.position ? ` · Pos. ${ev.position}` : ''}</div>}
                      </div>
                      {!ev._isTrain && <div style={{ fontSize: '11px', color: t.textMuted, flexShrink: 0, marginTop: '2px' }}>✏️</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── ANNUAL VIEW ── */}
      {view === 'year' && (
        <div>
          <div className="annual-grid">
            {Array.from({ length: 12 }, (_, m) => {
              const monthEvents = events.filter(e => e.start_date?.startsWith(`${year}-${String(m+1).padStart(2,'0')}`))
              return (
                <div key={m} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', letterSpacing: '2px', color: t.textMuted, marginBottom: '10px', textTransform: 'uppercase', fontWeight: 600 }}>{MONTHS[m]}</div>
                  {monthEvents.length === 0
                    ? <div style={{ fontSize: '11px', color: t.textFaint }}>Sem eventos</div>
                    : monthEvents.map(ev => (
                      <div key={ev.id} onClick={() => openEdit(ev)}
                        style={{ marginBottom: '5px', background: getCatColor(ev.category) + '15', border: `1px solid ${getCatColor(ev.category)}44`, borderLeft: `3px solid ${getCatColor(ev.category)}`, borderRadius: '3px', padding: '4px 7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', cursor: 'pointer' }}>
                        <div style={{ fontSize: '12px', color: getCatColor(ev.category), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.title}</div>
                        <div style={{ fontSize: '11px', color: t.textFaint, whiteSpace: 'nowrap' }}>
                          {ev.start_date?.slice(8)}{ev.end_date && ev.end_date !== ev.start_date ? `–${ev.end_date?.slice(8)}` : ''}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.textMuted, marginBottom: '10px', fontWeight: 600 }}>SEASON OVERVIEW</div>
            <div className="cal-year-stats">
              {[
                { label: 'CONFIRMED', value: confirmed, color: t.accentLight },
                { label: 'OPTIONAL', value: optional, color: t.textMuted },
                { label: 'TOTAL EVENTS', value: yearEvents.length, color: t.text },
                { label: 'COMP DAYS', value: yearEvents.filter(e => e.status !== 'cancelled').reduce((acc, e) => { if (!e.start_date) return acc; const s = new Date(e.start_date); const en = new Date(e.end_date || e.start_date); return acc + Math.round((en - s) / 86400000) + 1 }, 0), color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '14px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '12px', fontWeight: 600 }}>BY CATEGORY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(yearEvents.reduce((acc, e) => {
                  const cat = e.category || 'Other'
                  if (!acc[cat]) acc[cat] = { count: 0, color: e.color || t.accent, days: 0 }
                  acc[cat].count++
                  if (e.start_date) { const s = new Date(e.start_date); const en = new Date(e.end_date || e.start_date); acc[cat].days += Math.round((en - s) / 86400000) + 1 }
                  return acc
                }, {})).sort((a, b) => b[1].count - a[1].count).map(([cat, data]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: data.color, flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: t.text, flex: 1, fontWeight: 500 }}>{cat}</div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>{data.days}d</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: t.text, minWidth: '24px', textAlign: 'right' }}>{data.count}</div>
                    <div style={{ width: '80px', height: '4px', background: t.border, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(data.count / yearEvents.length) * 100}%`, background: data.color, borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
