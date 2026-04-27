import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_CATEGORIES = [
  { name: 'Competição', color: '#378ADD' },
  { name: 'Training Camp', color: '#4a7abf' },
  { name: 'Treino/Campo', color: '#4a9a5a' },
  { name: 'Optional', color: '#777' },
]

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const STATUS = ['confirmed','optional','cancelled']

export default function Calendar({ theme, t, user, lang = 'en', onNavigate, events = [], trainingPlans = [], onEventsChanged }) {
  const [view, setView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1))
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [form, setForm] = useState({ title: '', start_date: '', end_date: '', category: 'Competição', status: 'confirmed', color: '#378ADD', result: '', position: '', notes: '', fez_campo: false })
  const [catForm, setCatForm] = useState({ name: '', color: '#378ADD' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState(null)
  const [calFilters, setCalFilters] = useState({ events: true, golf: true, gym: true })

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('event_categories').select('*')
    if (data && data.length > 0) setCategories(data)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const openNew = (date) => {
    const d = date || new Date().toISOString().split('T')[0]
    setEditEvent(null)
    setForm({ title: '', start_date: d, end_date: d, category: categories[0]?.name || 'Competição', status: 'confirmed', color: categories[0]?.color || '#378ADD', result: '', position: '', notes: '', fez_campo: false })
    setShowModal(true)
  }

  const openEdit = (e) => {
    setEditEvent(e)
    setForm({ title: e.title, start_date: e.start_date, end_date: e.end_date || e.start_date, category: e.category, status: e.status, color: e.color, result: e.result || '', position: e.position || '', notes: e.notes || '', fez_campo: e.fez_campo || false })
    setShowModal(true)
  }

  const saveEvent = async () => {
    setSaving(true)
    const payload = { ...form, position: form.position ? parseInt(form.position) : null }
    if (editEvent) {
      await supabase.from('events').update(payload).eq('id', editEvent.id)
    } else {
      await supabase.from('events').insert({ ...payload, created_by: 'user' })
    }
    setSaving(false)
    setShowModal(false)
    onEventsChanged?.()
  }

  const deleteEvent = async () => {
    setDeleteConfirmEvent(editEvent)
  }

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

  const getMondayOf = (date) => {
    const d = new Date(date)
    const dow = d.getDay()
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    d.setHours(0, 0, 0, 0)
    return d
  }

  const getWeekDays = () => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentDate)
    d.setDate(currentDate.getDate() + i)
    return d
  })


  const switchView = (v) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    if (v === 'week') {
      setCurrentDate(now)  // start week view from today
    } else if (v === 'month') {
      setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
    }
    setView(v)
  }

  const getEventsForDay = (date) => {
    const d = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    const dayEvents = calFilters.events ? events.filter(e => {
      const start = e.start_date
      const end = e.end_date || e.start_date
      return d >= start && d <= end
    }) : []
    // Training sessions from training plans
    // Structure: plan.days[i] = { sessions: [{id, cat, notes, items}] }
    // days[0]=Mon … days[6]=Sun; date computed from plan.week_start + i days
    const trainingSessions = []
    trainingPlans.forEach(plan => {
      if (!plan.days || !plan.week_start) return
      const planType = plan.plan_type // 'golf' | 'gym'
      plan.days.forEach((day, dayIdx) => {
        if (!day?.sessions?.length) return
        const dayDate = new Date(plan.week_start + 'T12:00:00')
        dayDate.setDate(dayDate.getDate() + dayIdx)
        const sessionDateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth()+1).padStart(2,'0')}-${String(dayDate.getDate()).padStart(2,'0')}`
        if (sessionDateStr !== d) return
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
    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month, -startDow + i + 1)
      days.push({ date: d, current: false })
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), current: true })
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date
      days.push({ date: new Date(last.getTime() + 86400000), current: false })
    }
    return days
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = new Date().toISOString().split('T')[0]

  const F = "'Inter', system-ui, sans-serif"
  const btn = (active) => ({ background: active ? t.accent + '18' : 'transparent', border: `1px solid ${active ? t.accent : t.border}`, borderRadius: '20px', color: active ? t.accent : t.textMuted, padding: '5px 14px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: active ? 700 : 500 })
  const inp = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, padding: '6px 10px', fontSize: '13px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }

  // Annual stats
  const yearEvents = events.filter(e => e.start_date?.startsWith(year.toString()))
  const confirmed = yearEvents.filter(e => e.status === 'confirmed').length
  const optional = yearEvents.filter(e => e.status === 'optional').length

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);background:${t.surface};border-radius:0 0 14px 14px;overflow:hidden;border:1px solid ${t.border};border-top:none;}
        .cal-cell{background:${t.bg};padding:6px;min-height:62px;cursor:pointer;transition:background 0.1s;border-right:0.5px solid ${t.border};border-bottom:0.5px solid ${t.border};}
        .cal-cell:hover{background:${t.surface};}
        .cal-cell.today-cell{background:${t.accentBg};}
        .cal-week-grid{display:grid;grid-template-columns:repeat(7,1fr);background:${t.surface};border-radius:0 0 14px 14px;overflow:hidden;border:1px solid ${t.border};border-top:none;}
        .cal-week-cell{background:${t.bg};padding:8px 6px;min-height:160px;cursor:pointer;transition:background 0.1s;border-right:0.5px solid ${t.border};border-bottom:0.5px solid ${t.border};}
        .cal-week-cell:hover{background:${t.surface};}
        .cal-week-cell.today-cell{background:${t.accentBg};}
        .annual-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .cal-year-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
        @media(max-width:768px){.annual-grid{grid-template-columns:repeat(2,1fr)}.cal-cell{min-height:40px;padding:3px}.cal-week-cell{min-height:100px;padding:4px}}
        @media(max-width:600px){.cal-year-stats{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      {/* Delete Event Confirm Modal */}
      {deleteConfirmEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px 32px', maxWidth: '380px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: t.text }}>{lang === 'pt' ? 'Apagar este evento?' : 'Delete this event?'}</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
              <b style={{ color: t.text }}>{deleteConfirmEvent.title}</b><br/>
              {deleteConfirmEvent.start_date} {deleteConfirmEvent.end_date !== deleteConfirmEvent.start_date ? `→ ${deleteConfirmEvent.end_date}` : ''}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirmEvent(null)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '20px', color: t.textMuted, padding: '7px 16px', cursor: 'pointer', fontSize: '11px', fontFamily: F }}>{lang === 'pt' ? 'Cancelar' : 'Cancel'}</button>
              <button onClick={confirmDeleteEvent} style={{ background: t.danger, border: 'none', borderRadius: '20px', color: '#fff', padding: '7px 16px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 700 }}>{lang === 'pt' ? 'Apagar' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '24px', width: '90%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: t.text }}>{editEvent ? (lang === 'pt' ? 'Editar Evento' : 'Edit Event') : (lang === 'pt' ? 'Novo Evento' : 'New Event')}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>{lang==='pt'?'NOME':'NAME'}</div>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Event name" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>{lang==='pt'?'INÍCIO':'START'}</div>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>{lang==='pt'?'FIM':'END'}</div>
                  <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>{lang==='pt'?'CATEGORIA':'CATEGORY'}</div>
                  <select value={form.category} onChange={e => { const cat = categories.find(c => c.name === e.target.value); setForm(p => ({ ...p, category: e.target.value, color: cat?.color || p.color })) }} style={{ ...inp }}>
                    {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>{lang==='pt'?'ESTADO':'STATUS'}</div>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ ...inp }}>
                    {STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>{lang==='pt'?'COR':'COLOR'}</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: '36px', height: '32px', border: `1px solid ${t.border}`, borderRadius: '4px', background: 'transparent', cursor: 'pointer', padding: '2px' }} />
                  <span style={{ fontSize: '12px', color: t.textMuted }}>{form.color}</span>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '10px', marginTop: '2px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '1px', color: t.textMuted, marginBottom: '8px' }}>{lang==='pt'?'RESULTADO':'RESULT'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>Resultado</div>
                    <input value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} placeholder="e.g. Top 10, Cut, DNF" style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>Posição</div>
                    <input type="number" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="e.g. 3" style={inp} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 0' }}>
                  <input type="checkbox" checked={!!form.fez_campo} onChange={e => setForm(p => ({ ...p, fez_campo: e.target.checked }))}
                    style={{ width: '15px', height: '15px', accentColor: t.accent, cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px', color: t.text, fontFamily: F }}>Fez campo</span>
                </label>
              </div>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px' }}>{lang==='pt'?'NOTAS':'NOTES'}</div>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={lang==='pt'?'Observações...':'Notes...'} style={{ ...inp, minHeight: '60px', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'space-between' }}>
              <div>
                {editEvent && <button onClick={deleteEvent} style={{ background: 'transparent', border: `1px solid ${t.danger}`, borderRadius: '20px', color: t.danger, padding: '7px 14px', cursor: 'pointer', fontSize: '11px', fontFamily: F }}>{lang === 'pt' ? 'Apagar' : 'Delete'}</button>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowModal(false)} style={btn(false)}>Cancelar</button>
                <button onClick={saveEvent} disabled={saving || !form.title} style={{ background: saving ? t.surface : t.accent, border: 'none', borderRadius: '20px', color: '#fff', padding: '7px 16px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 700 }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '24px', width: '90%', maxWidth: '340px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: t.text }}>Nova Categoria</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="Category name" style={inp} />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={catForm.color} onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))} style={{ width: '36px', height: '32px', border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer', padding: '2px' }} />
                <span style={{ fontSize: '12px', color: t.textMuted }}>Pick a colour</span>
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
        <div style={{ fontSize: '11px', color: t.textMuted }}>{lang === 'pt' ? 'Calendário de competições e treinos' : 'Competition and training schedule'}</div>
      </div>

      {/* Cal toolbar */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px 14px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {view === 'month' && <>
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px' }}>‹</button>
            <div style={{ fontSize: '15px', fontWeight: 700, color: t.text, minWidth: '160px' }}>{MONTHS[month]} {year}</div>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px' }}>›</button>
          </>}
          {view === 'week' && (() => {
            const days = getWeekDays()
            const s = days[0], e = days[6]
            const label = s.getMonth() === e.getMonth()
              ? `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`
              : `${s.getDate()} ${MONTHS[s.getMonth()].slice(0,3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0,3)} ${e.getFullYear()}`
            return <>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d) }} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px' }}>‹</button>
              <div style={{ fontSize: '14px', fontWeight: 700, color: t.text, minWidth: '200px' }}>{label}</div>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d) }} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px' }}>›</button>
            </>
          })()}
          {view === 'year' && <div style={{ fontSize: '15px', fontWeight: 700, color: t.text }}>Ano {year}</div>}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['week', 'month', 'year']).map(v => (
            <button key={v} onClick={() => switchView(v)}
              style={{ background: view === v ? t.accent + '18' : 'transparent', border: `1px solid ${view === v ? t.accent : t.border}`, borderRadius: '20px', color: view === v ? t.accent : t.textMuted, padding: '4px 12px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: view === v ? 700 : 500 }}>
              {v === 'week' ? (lang === 'pt' ? 'Semana' : 'Week') : v === 'month' ? (lang === 'pt' ? 'Mês' : 'Month') : (lang === 'pt' ? 'Anual' : 'Annual')}
            </button>
          ))}
          <div style={{ width: '1px', height: '14px', background: t.border }}></div>
          {[['events', lang==='pt'?'Eventos':'Events', '#378ADD'], ['golf', 'Golf', '#22c55e'], ['gym', lang==='pt'?'Ginásio':'Gym', '#f97316']].map(([key, label, color]) => (
            <button key={key} onClick={() => setCalFilters(p => ({ ...p, [key]: !p[key] }))}
              style={{ background: calFilters[key] ? color + '22' : 'transparent', border: `1px solid ${calFilters[key] ? color : t.border}`, borderRadius: '20px', color: calFilters[key] ? color : t.textMuted, padding: '4px 10px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: calFilters[key] ? 700 : 500 }}>
              {label}
            </button>
          ))}
          <button onClick={() => setShowCatModal(true)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '20px', color: t.textMuted, padding: '4px 12px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: 500 }}>+ Cat</button>
          <button onClick={() => openNew()} style={{ background: t.accent, border: 'none', borderRadius: '20px', color: '#fff', padding: '4px 14px', cursor: 'pointer', fontSize: '10px', fontFamily: F, fontWeight: 700 }}>+ Evento</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', padding: '8px 16px', background: t.surface, borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', color: t.textMuted, fontWeight: 500 }}>
            <div style={{ width: '12px', height: '3px', borderRadius: '2px', background: c.color }}></div>
            {c.name}
          </div>
        ))}
      </div>

      {/* Monthly View */}
      {view === 'month' && (
        <div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div className="cal-grid" style={{ minWidth: '420px' }}>
              {WEEKDAYS.map(d => (
                <div key={d} style={{ background: t.bg, padding: '8px', textAlign: 'center', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: t.textMuted, borderRight: `0.5px solid ${t.border}`, borderBottom: `0.5px solid ${t.border}` }}>{d}</div>
              ))}
              {getDaysInMonth(year, month).map((day, i) => {
                const dayEvents = getEventsForDay(day.date)
                const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth()+1).padStart(2,'0')}-${String(day.date.getDate()).padStart(2,'0')}`
                const isToday = dateStr === today
                return (
                  <div key={i} className={`cal-cell${isToday ? ' today-cell' : ''}`} onClick={() => openNew(dateStr)}
                    style={{ background: isToday ? t.accentBg : day.current ? t.surface : t.bg, borderRight: `0.5px solid ${t.border}`, borderBottom: `0.5px solid ${t.border}` }}>
                    <div style={{ fontSize: '12px', color: day.current ? (isToday ? t.accent : t.text) : t.textFaint, fontWeight: isToday ? 800 : 600, marginBottom: '4px' }}>{day.date.getDate()}</div>
                    {dayEvents.slice(0, 2).map((ev, ei) => (
                      <div key={ev.id || ei} onClick={e => { e.stopPropagation(); if (ev._isTrain) { onNavigate?.('training', { date: dateStr }) } else { openEdit(ev) } }}
                        style={{ background: ev._isTrain ? ev._color + '33' : (ev.color || getCatColor(ev.category)), borderRadius: '4px', padding: '3px 6px', fontSize: '10px', fontWeight: 700, color: ev._isTrain ? ev._color : '#fff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', border: ev._isTrain ? `1px solid ${ev._color}44` : 'none' }}>
                        {ev._isTrain ? (ev.type === 'golf' ? '⛳' : '💪') + ' ' : ''}{ev.title || ev.session_name || ev.name || ev.cat}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div style={{ fontSize: '9px', color: t.textMuted, fontWeight: 600 }}>+{dayEvents.length - 2}</div>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Month summary */}
          <div style={{ marginTop: '12px', fontSize: '11px', color: t.textMuted, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>{MONTHS[month]}: {events.filter(e => e.start_date?.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length} eventos</span>
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="cal-week-grid" style={{ minWidth: '500px' }}>
            {/* Dynamic headers — match the actual days shown, not always Mon-Sun */}
            {getWeekDays().map((day, i) => {
              const dayLabel = WEEKDAYS[(day.getDay() + 6) % 7]
              return (
                <div key={`h${i}`} style={{ background: t.bg, padding: '8px', textAlign: 'center', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: t.textMuted, borderRight: `0.5px solid ${t.border}`, borderBottom: `0.5px solid ${t.border}` }}>{dayLabel}</div>
              )
            })}
            {getWeekDays().map((day, i) => {
              const dateStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`
              const dayEvents = getEventsForDay(day)
              const isToday = dateStr === today
              return (
                <div key={i} className={`cal-week-cell${isToday ? ' today-cell' : ''}`} onClick={() => openNew(dateStr)}>
                  <div style={{ fontSize: '17px', fontWeight: isToday ? 900 : 600, color: isToday ? t.accent : t.text, marginBottom: '6px', lineHeight: 1 }}>{day.getDate()}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {dayEvents.map((ev, ei) => (
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

      {/* Annual View */}
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

          {/* Annual stats */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.textMuted, marginBottom: '10px', fontWeight: 600 }}>SEASON OVERVIEW</div>
            <div className="cal-year-stats">
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>CONFIRMED</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: t.accentLight }}>{confirmed}</div>
              </div>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>OPTIONAL</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: t.textMuted }}>{optional}</div>
              </div>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>TOTAL EVENTS</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: t.text }}>{yearEvents.length}</div>
              </div>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>COMP DAYS</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>{yearEvents.filter(e => e.status !== 'cancelled').reduce((acc, e) => { if (!e.start_date) return acc; const s = new Date(e.start_date); const en = new Date(e.end_date || e.start_date); return acc + Math.round((en - s) / 86400000) + 1 }, 0)}</div>
              </div>
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '14px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '12px', fontWeight: 600 }}>BY CATEGORY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(yearEvents.reduce((acc, e) => { const cat = e.category || 'Other'; if (!acc[cat]) acc[cat] = { count: 0, color: e.color || t.accent, days: 0 }; acc[cat].count++; if (e.start_date) { const s = new Date(e.start_date); const en = new Date(e.end_date || e.start_date); acc[cat].days += Math.round((en - s) / 86400000) + 1 } return acc }, {})).sort((a, b) => b[1].count - a[1].count).map(([cat, data]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: data.color, flexShrink: 0 }}></div>
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
