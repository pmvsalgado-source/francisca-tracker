import { useState, useEffect, useCallback } from 'react'
import {
  getCompetitions, saveCompetition, deleteCompetition,
  getCompConfig, saveCompConfig,
} from '../services/competitionsService'
import { isCompetitionEvent } from '../constants/eventCategories'
import EmptyState from './EmptyState'

// ── Constants ──────────────────────────────────────────────────────────────────
const DEFAULT_STAT_FIELDS = [
  { id: 'score',          label: 'Score',                unit: '',  lower_better: true  },
  { id: 'position',       label: 'Position',             unit: '',  lower_better: true  },
  { id: 'fairways_hit',   label: 'Fairways Hit',         unit: '%', lower_better: false },
  { id: 'gir',            label: 'Greens in Regulation', unit: '%', lower_better: false },
  { id: 'putts',          label: 'Putts per Round',      unit: '',  lower_better: true  },
  { id: 'scrambling',     label: 'Scrambling',           unit: '%', lower_better: false },
  { id: 'drive_distance', label: 'Drive Distance',       unit: 'm', lower_better: false },
  { id: 'drive_accuracy', label: 'Drive Accuracy',       unit: '%', lower_better: false },
]

// Fields recorded per round (auto-summed for totals on save)
const ROUND_FIELD_IDS = ['score', 'fairways_hit', 'gir', 'putts']
const EMPTY_ROUND     = { score: '', fairways_hit: '', gir: '', putts: '' }
const EMPTY_CUSTOM_STAT = { id: '', label: '', value: '' }

// ── Helpers ────────────────────────────────────────────────────────────────────
const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)} ${PT_MONTHS[parseInt(m) - 1]} ${y}`
}

function fmtRange(start, end) {
  if (!end || end === start) return fmtDate(start)
  const [sy, sm, sd] = start.split('-')
  const [ey, em, ed] = end.split('-')
  if (sy === ey && sm === em)
    return `${parseInt(sd)} – ${parseInt(ed)} ${PT_MONTHS[parseInt(sm) - 1]} ${sy}`
  return `${parseInt(sd)} ${PT_MONTHS[parseInt(sm) - 1]} – ${parseInt(ed)} ${PT_MONTHS[parseInt(em) - 1]} ${ey}`
}

function catBadge(t) {
  return { bg: t.subtleBg, color: t.textMuted }
}

function getDaysBetween(start, end) {
  const days = []
  const s = new Date(start + 'T00:00:00')
  const e = new Date((end || start) + 'T00:00:00')
  while (s <= e) { days.push(s.toISOString().split('T')[0]); s.setDate(s.getDate() + 1) }
  return days
}

function numRoundsFromEvent(ev) {
  if (!ev || !ev.end_date || ev.end_date === ev.start_date) return 1
  return getDaysBetween(ev.start_date, ev.end_date).length
}

function roundsFromValues(values, n) {
  if (values?.rounds?.length) {
    const base = values.rounds.map(r => ({ ...EMPTY_ROUND, ...r }))
    while (base.length < n) base.push({ ...EMPTY_ROUND })
    return base.slice(0, n)
  }
  const r0 = {
    score:        String(values?.score        ?? ''),
    fairways_hit: String(values?.fairways_hit ?? ''),
    gir:          String(values?.gir          ?? ''),
    putts:        String(values?.putts        ?? ''),
  }
  const rounds = [r0]
  for (let i = 1; i < n; i++) rounds.push({ ...EMPTY_ROUND })
  return rounds
}

function prettifyKey(key = '') {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function CompStats({ theme, t, user, events = [] }) {
  const [stats,       setStats]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [fetchError,  setFetchError]  = useState(null)

  // Config
  const [statFields,     setStatFields]     = useState(DEFAULT_STAT_FIELDS)
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_STAT_FIELDS.map(f => f.id))
  const [configId,       setConfigId]       = useState(null)

  // Modals
  const [showModal,     setShowModal]     = useState(false)
  const [showSettings,  setShowSettings]  = useState(false)
  const [settingsTab,   setSettingsTab]   = useState('fields')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editStat,      setEditStat]      = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState(null)
  const [expandedRows,  setExpandedRows]  = useState(new Set())

  // Form — rounds[] for per-round fields; values{} for flat fields (position, etc.)
  const [form, setForm] = useState({
    event_id: '', event_name: '', event_date: '', event_end_date: '',
    rounds: [{ ...EMPTY_ROUND }], values: {}, customStats: [], notes: '',
  })

  // Settings forms
  const [newField,     setNewField]     = useState({ label: '', unit: '', lower_better: false })
  const [editingField, setEditingField] = useState(null)

  const F   = "'Inter', system-ui, sans-serif"
  const inp = {
    background: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px',
    color: t.text, padding: '8px 10px', fontSize: '13px', fontFamily: F,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await getCompetitions()
      setStats(rows); setFetchError(null)
    } catch (err) {
      console.error('fetchData:', err)
      setFetchError(err.message || 'Erro ao carregar competições.')
    } finally { setLoading(false) }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const data = await getCompConfig()
      if (data) {
        setConfigId(data.id)
        if (data.stat_fields?.length)    setStatFields(data.stat_fields)
        if (data.visible_columns?.length) setVisibleColumns(data.visible_columns)
      }
    } catch (err) { console.error('fetchConfig:', err) }
  }, [])

  useEffect(() => { fetchData(); fetchConfig() }, [fetchData, fetchConfig])

  // ── Derived data (calendar is source of truth) ─────────────────────────────
  const playedTournaments = events
    .filter(ev => isCompetitionEvent(ev) && ev.status === 'played')
    .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))

  const linkedStats   = playedTournaments.map(ev => stats.find(s => s.event_id === ev.id) || null)

  // A record only counts as "has data" when its rounds array contains real values.
  // Flat root-level score without rounds is treated as legacy/incomplete.
  function recordHasRounds(s) {
    return Array.isArray(s?.values?.rounds) &&
      s.values.rounds.some(r => ROUND_FIELD_IDS.some(id => r[id] != null && r[id] !== ''))
  }
  const statsWithData = linkedStats.filter(s => s && (
    recordHasRounds(s) ||
    Object.entries(s.values || {}).some(([k, v]) =>
      !ROUND_FIELD_IDS.includes(k) && k !== 'rounds' && v !== null && v !== undefined && v !== ''
    )
  ))

  // ── KPI values ─────────────────────────────────────────────────────────────
  const kpiVals = (fieldId) =>
    statsWithData.map(s => parseFloat(s.values?.[fieldId])).filter(v => !isNaN(v))

  const kpiAvg  = (fieldId) => { const v = kpiVals(fieldId); return v.length ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : '—' }
  const kpiBest = (fieldId) => { const v = kpiVals(fieldId); return v.length ? Math.min(...v) : null }

  // ── Expand rows ────────────────────────────────────────────────────────────
  const toggleExpand = (id) =>
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // ── Entry handlers ─────────────────────────────────────────────────────────
  const openFromTournament = (ev) => {
    const existing = stats.find(s => s.event_id === ev.id) || null
    const n        = numRoundsFromEvent(ev)
    const rounds   = roundsFromValues(existing?.values, n)
    const flatValues = {}
    const customStats = []
    if (existing?.values) {
      Object.entries(existing.values).forEach(([k, v]) => {
        if (k === 'rounds' || ROUND_FIELD_IDS.includes(k)) return
        if (statFields.some(f => f.id === k)) flatValues[k] = v
        else customStats.push({ id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: prettifyKey(k), value: v ?? '' })
      })
    }
    setEditStat(existing)
    setSaveError(null)
    setForm({
      event_id:       existing?.event_id   || ev.id,
      event_name:     existing?.event_name || ev.title,
      event_date:     existing?.event_date || ev.start_date,
      event_end_date: ev.end_date || ev.start_date,
      rounds, values: flatValues, customStats, notes: existing?.notes || '',
    })
    setShowModal(true)
  }

  const updateRound = (idx, field, value) =>
    setForm(p => ({ ...p, rounds: p.rounds.map((r, i) => i === idx ? { ...r, [field]: value } : r) }))

  const addCustomStat = () =>
    setForm(p => ({ ...p, customStats: [...p.customStats, { ...EMPTY_CUSTOM_STAT, id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }] }))

  const updateCustomStat = (idx, field, value) =>
    setForm(p => ({ ...p, customStats: p.customStats.map((s, i) => i === idx ? { ...s, [field]: value } : s) }))

  const removeCustomStat = (idx) =>
    setForm(p => ({ ...p, customStats: p.customStats.filter((_, i) => i !== idx) }))

  const saveStat = async () => {
    if (!form.event_name || !form.event_date) return
    if (!user) { setSaveError('Sessão expirada. Faz login novamente.'); return }
    setSaving(true); setSaveError(null)

    const totals = {}
    ROUND_FIELD_IDS.forEach(id => {
      const sum = form.rounds.reduce((acc, r) => acc + (parseFloat(r[id]) || 0), 0)
      if (sum > 0) totals[id] = sum
    })
    const cleanRounds = form.rounds
      .map(r => { const c = {}; ROUND_FIELD_IDS.forEach(id => { if (r[id] !== '' && r[id] != null) c[id] = r[id] }); return c })
      .filter(r => Object.keys(r).length > 0)
    const cleanFlat = Object.fromEntries(
      Object.entries(form.values).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )
    const customFlat = Object.fromEntries(
      form.customStats
        .map(s => {
          const key = String(s.label || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
          return key && s.value !== '' && s.value !== null && s.value !== undefined ? [key, s.value] : null
        })
        .filter(Boolean)
    )
    const values = { ...(cleanRounds.length ? { rounds: cleanRounds } : {}), ...totals, ...cleanFlat, ...customFlat }

    try {
      await saveCompetition({ event_id: form.event_id || null, event_name: form.event_name, event_date: form.event_date, values, notes: form.notes || null }, editStat?.id || null)
    } catch (err) {
      console.error('[CompStats] save error:', err)
      setSaveError(err.message || 'Erro ao guardar. Verifica a consola.')
      setSaving(false); return
    }
    setSaving(false); setShowModal(false); fetchData()
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    try { await deleteCompetition(deleteConfirm.id); setDeleteConfirm(null); fetchData() }
    catch (err) { console.error('confirmDelete:', err) }
  }

  // ── Config handlers ────────────────────────────────────────────────────────
  const persistConfig = async (fields, columns) => {
    try {
      const result = await saveCompConfig({ stat_fields: fields, visible_columns: columns, updated_at: new Date().toISOString() }, configId || null)
      if (!configId && result?.id) setConfigId(result.id)
    } catch (err) { console.error('persistConfig:', err) }
  }

  const addField = () => {
    if (!newField.label) return
    const id = newField.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const updatedFields = [...statFields, { id, ...newField }]
    const updatedCols   = [...visibleColumns, id]
    setStatFields(updatedFields); setVisibleColumns(updatedCols)
    setNewField({ label: '', unit: '', lower_better: false })
    persistConfig(updatedFields, updatedCols)
  }

  const saveFieldEdit = () => {
    if (!editingField) return
    const updated = statFields.map((f, i) => i === editingField.idx ? { ...f, label: editingField.label, unit: editingField.unit, lower_better: editingField.lower_better } : f)
    setStatFields(updated); setEditingField(null); persistConfig(updated, visibleColumns)
  }

  const removeField = (idx) => {
    const fieldId     = statFields[idx].id
    const updFields   = statFields.filter((_, i) => i !== idx)
    const updCols     = visibleColumns.filter(c => c !== fieldId)
    setStatFields(updFields); setVisibleColumns(updCols); persistConfig(updFields, updCols)
  }

  const toggleColumn = (fieldId) => {
    const updated = visibleColumns.includes(fieldId)
      ? visibleColumns.filter(c => c !== fieldId)
      : [...visibleColumns, fieldId]
    setVisibleColumns(updated); persistConfig(statFields, updated)
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const tableFields    = statFields.filter(f => visibleColumns.includes(f.id))
  const flatStatFields = statFields.filter(f => !ROUND_FIELD_IDS.includes(f.id))

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .cs-row:hover td { background: ${t.bg} !important }
        .cs-row { cursor: pointer }
        .cs-edit-btn:hover { border-color: ${t.accent} !important; color: ${t.accent} !important }
      `}</style>

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, background:t.overlayBg, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:t.modalBg, border:`1px solid ${t.border}`, borderRadius:'14px', padding:'28px 32px', maxWidth:'380px', width:'90%' }}>
            <div style={{ fontSize:'16px', fontWeight:700, marginBottom:'8px' }}>Apagar estas stats?</div>
            <div style={{ fontSize:'13px', color:t.textMuted, marginBottom:'24px', lineHeight:1.6 }}>
              Stats de <b style={{ color:t.text }}>{deleteConfirm.event_name}</b> serão apagadas permanentemente.
            </div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:'6px', color:t.textMuted, padding:'8px 16px', cursor:'pointer', fontSize:'12px', fontFamily:F }}>Cancelar</button>
              <button onClick={confirmDelete} style={{ background:t.danger, border:'none', borderRadius:'6px', color:t.navTextActive, padding:'8px 20px', cursor:'pointer', fontSize:'12px', fontFamily:F, fontWeight:700 }}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings modal ── */}
      {showSettings && (
        <div style={{ position:'fixed', inset:0, background:t.overlayBg, display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:'16px' }}>
          <div style={{ background:t.modalBg, border:`1px solid ${t.border}`, borderRadius:'14px', padding:'28px', width:'100%', maxWidth:'520px', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'16px', fontWeight:700 }}>Configurar Campos</div>
              <button onClick={() => setShowSettings(false)} style={{ background:'transparent', border:'none', color:t.textMuted, cursor:'pointer', fontSize:'22px', lineHeight:1 }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:t.bg, borderRadius:'8px', padding:'4px' }}>
              {['fields','columns'].map(k => (
                <button key={k} onClick={() => setSettingsTab(k)}
                  style={{ flex:1, background:settingsTab===k ? t.surface : 'transparent', border:settingsTab===k ? `1px solid ${t.border}` : 'none', borderRadius:'6px', color:settingsTab===k ? t.text : t.textMuted, padding:'7px', cursor:'pointer', fontSize:'11px', fontWeight:600, fontFamily:F }}>
                  {k === 'fields' ? 'Campos' : 'Colunas visíveis'}
                </button>
              ))}
            </div>

            {settingsTab === 'fields' && (
              <div>
                <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'14px' }}>
                  {statFields.map((f, i) => (
                    <div key={f.id} style={{ background:t.bg, borderRadius:'6px', padding:'8px 10px' }}>
                      {editingField?.idx === i ? (
                        <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
                          <input value={editingField.label} onChange={e => setEditingField(p => ({ ...p, label: e.target.value }))} style={{ ...inp, flex:2, minWidth:'100px' }} />
                          <input value={editingField.unit}  onChange={e => setEditingField(p => ({ ...p, unit:  e.target.value }))} placeholder="unit" style={{ ...inp, width:'60px' }} />
                          <label style={{ fontSize:'11px', color:t.textMuted, display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', whiteSpace:'nowrap' }}>
                            <input type="checkbox" checked={!!editingField.lower_better} onChange={e => setEditingField(p => ({ ...p, lower_better: e.target.checked }))} />↓ melhor
                          </label>
                          <button onClick={saveFieldEdit} style={{ background:t.accent, border:'none', borderRadius:'4px', color:t.navTextActive, padding:'5px 10px', cursor:'pointer', fontSize:'11px', fontFamily:F }}>Guardar</button>
                          <button onClick={() => setEditingField(null)} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:'4px', color:t.textMuted, padding:'5px 8px', cursor:'pointer', fontSize:'11px', fontFamily:F }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ flex:1, fontSize:'13px', color:t.text }}>{f.label}</div>
                          {ROUND_FIELD_IDS.includes(f.id) && <div style={{ fontSize:'9px', color:t.accent, fontWeight:600 }}>POR ROUND</div>}
                          {f.unit && <div style={{ fontSize:'11px', color:t.textMuted }}>{f.unit}</div>}
                          <div style={{ fontSize:'10px', color:t.textFaint }}>{f.lower_better ? '↓' : '↑'}</div>
                          <button onClick={() => setEditingField({ idx:i, label:f.label, unit:f.unit||'', lower_better:!!f.lower_better })}
                            style={{ background:'transparent', border:'none', color:t.textMuted, cursor:'pointer', fontSize:'13px', padding:'2px 6px' }}>✎</button>
                          <button onClick={() => removeField(i)}
                            style={{ background:'transparent', border:'none', color:t.danger, cursor:'pointer', fontSize:'18px', lineHeight:1, padding:'2px 4px' }}>×</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:'12px' }}>
                  <div style={{ fontSize:'10px', letterSpacing:'2px', color:t.textMuted, marginBottom:'8px', fontWeight:600 }}>ADICIONAR CAMPO</div>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
                    <input value={newField.label} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))} placeholder="Nome do campo" style={{ ...inp, flex:2, minWidth:'120px' }} onKeyDown={e => e.key==='Enter' && addField()} />
                    <input value={newField.unit}  onChange={e => setNewField(p => ({ ...p, unit:  e.target.value }))} placeholder="unidade" style={{ ...inp, width:'70px' }} />
                    <label style={{ fontSize:'11px', color:t.textMuted, display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', whiteSpace:'nowrap' }}>
                      <input type="checkbox" checked={newField.lower_better} onChange={e => setNewField(p => ({ ...p, lower_better: e.target.checked }))} />↓ melhor
                    </label>
                    <button onClick={addField} style={{ background:t.accent, border:'none', borderRadius:'6px', color:t.navTextActive, padding:'7px 14px', cursor:'pointer', fontSize:'12px', fontWeight:700, fontFamily:F, whiteSpace:'nowrap' }}>+ Adicionar</button>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'columns' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <div style={{ fontSize:'12px', color:t.textMuted, marginBottom:'6px' }}>Seleciona as colunas visíveis na tabela.</div>
                {statFields.map(f => (
                  <label key={f.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:t.bg, borderRadius:'6px', cursor:'pointer' }}>
                    <input type="checkbox" checked={visibleColumns.includes(f.id)} onChange={() => toggleColumn(f.id)} />
                    <span style={{ fontSize:'13px', color:t.text, flex:1 }}>{f.label}</span>
                    {f.unit && <span style={{ fontSize:'11px', color:t.textMuted }}>{f.unit}</span>}
                    <span style={{ fontSize:'10px', color:t.textFaint }}>{f.lower_better ? '↓' : '↑'}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Entry modal ── */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:t.overlayBg, display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:'16px' }}>
          <div style={{ background:t.modalBg, border:`1px solid ${t.border}`, borderRadius:'14px', padding:'22px 24px', width:'100%', maxWidth:'620px' }}>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
              <div>
                <div style={{ fontSize:'15px', fontWeight:700 }}>{editStat ? 'Editar Stats' : 'Preencher Stats'}</div>
                <div style={{ fontSize:'12px', color:t.textMuted, marginTop:'2px' }}>{form.event_name}</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background:'transparent', border:'none', color:t.textMuted, cursor:'pointer', fontSize:'22px', lineHeight:1, marginLeft:'12px' }}>×</button>
            </div>

            {/* ── Single-round: flat 4-col grid ── */}
            {form.rounds.length === 1 ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'12px' }}>
                {[{id:'score',label:'Score'},{id:'fairways_hit',label:'FIR'},{id:'gir',label:'GIR'},{id:'putts',label:'Putts'}].map((f, fi) => (
                  <div key={f.id}>
                    <div style={{ fontSize:'9px', letterSpacing:'1px', color:t.textMuted, fontWeight:600, marginBottom:'4px' }}>{f.label.toUpperCase()}</div>
                    <input type="number" step="0.1" value={form.rounds[0][f.id] || ''}
                      onChange={e => updateRound(0, f.id, e.target.value)}
                      autoFocus={fi === 0}
                      placeholder="—" style={{ ...inp, padding:'6px 8px' }} />
                  </div>
                ))}
                {flatStatFields.map(field => (
                  <div key={field.id}>
                    <div style={{ fontSize:'9px', letterSpacing:'1px', color:t.textMuted, fontWeight:600, marginBottom:'4px' }}>
                      {field.label.toUpperCase()}{field.unit ? ` (${field.unit})` : ''}
                    </div>
                    <input type="number" step="0.1" value={form.values[field.id] || ''}
                      onChange={e => setForm(p => ({ ...p, values: { ...p.values, [field.id]: e.target.value } }))}
                      placeholder="—" style={{ ...inp, padding:'6px 8px' }} />
                  </div>
                ))}
              </div>
            ) : (
              /* ── Multi-round: rows = fields, cols = rounds ── */
              <div style={{ marginBottom:'12px' }}>
                {(() => {
                  const days = form.event_end_date && form.event_end_date !== form.event_date
                    ? getDaysBetween(form.event_date, form.event_end_date) : []
                  const n = form.rounds.length
                  const cols = `100px repeat(${n}, 1fr)`
                  const ROUND_ROWS = [{id:'score',label:'Score'},{id:'fairways_hit',label:'FIR'},{id:'gir',label:'GIR'},{id:'putts',label:'Putts'}]
                  const totalScore = form.rounds.reduce((s, r) => s + (parseFloat(r.score) || 0), 0)
                  return (
                    <>
                      {/* Column headers */}
                      <div style={{ display:'grid', gridTemplateColumns:cols, gap:'6px', marginBottom:'6px' }}>
                        <div />
                        {form.rounds.map((_, i) => (
                          <div key={i} style={{ textAlign:'center', fontSize:'10px', color:t.accent, fontWeight:700, letterSpacing:'1px' }}>
                            R{i+1}{days[i] ? ` · ${parseInt(days[i].split('-')[2])}` : ''}
                          </div>
                        ))}
                      </div>
                      {/* Round field rows */}
                      {ROUND_ROWS.map((f, fi) => (
                        <div key={f.id} style={{ display:'grid', gridTemplateColumns:cols, gap:'6px', marginBottom:'5px', alignItems:'center' }}>
                          <div style={{ fontSize:'11px', color:t.textMuted, fontWeight:600 }}>{f.label}</div>
                          {form.rounds.map((round, i) => (
                            <input key={i} type="number" step="0.1" value={round[f.id] || ''}
                              onChange={e => updateRound(i, f.id, e.target.value)}
                              autoFocus={fi === 0 && i === 0}
                              placeholder="—" style={{ ...inp, padding:'6px 8px', textAlign:'center' }} />
                          ))}
                        </div>
                      ))}
                      {/* Total */}
                      {totalScore > 0 && (
                        <div style={{ display:'grid', gridTemplateColumns:cols, gap:'6px', alignItems:'center', marginTop:'4px', marginBottom:'8px' }}>
                          <div style={{ fontSize:'10px', color:t.textMuted, fontWeight:700 }}>TOTAL</div>
                          <div style={{ gridColumn:`2 / span ${n}`, fontSize:'13px', fontWeight:800, color:t.accent }}>
                            {form.rounds.map(r => r.score || '—').join(' + ')} = {totalScore}
                          </div>
                        </div>
                      )}
                      {/* Flat fields */}
                      {flatStatFields.length > 0 && (
                        <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:'10px', marginTop:'4px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                          {flatStatFields.map(field => (
                            <div key={field.id}>
                              <div style={{ fontSize:'9px', letterSpacing:'1px', color:t.textMuted, fontWeight:600, marginBottom:'4px' }}>
                                {field.label.toUpperCase()}{field.unit ? ` (${field.unit})` : ''}
                              </div>
                              <input type="number" step="0.1" value={form.values[field.id] || ''}
                                onChange={e => setForm(p => ({ ...p, values: { ...p.values, [field.id]: e.target.value } }))}
                                placeholder="—" style={{ ...inp, padding:'6px 8px' }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {/* Custom stats */}
            <div style={{ marginBottom:'12px' }}>
              {form.customStats.map((stat, idx) => (
                <div key={stat.id} style={{ display:'grid', gridTemplateColumns:'1fr 90px auto', gap:'6px', alignItems:'center', marginBottom:'6px' }}>
                  <input type="text" value={stat.label} onChange={e => updateCustomStat(idx, 'label', e.target.value)}
                    placeholder="Nome" autoFocus={idx === form.customStats.length - 1}
                    style={{ ...inp, padding:'6px 8px' }} />
                  <input type="text" value={stat.value} onChange={e => updateCustomStat(idx, 'value', e.target.value)}
                    placeholder="Valor" style={{ ...inp, padding:'6px 8px' }} />
                  <button onClick={() => removeCustomStat(idx)}
                    style={{ background:'transparent', border:'none', color:t.danger, cursor:'pointer', fontSize:'18px', lineHeight:1, padding:'2px 6px' }}>×</button>
                </div>
              ))}
              <button onClick={addCustomStat}
                style={{ background:'transparent', border:`1px dashed ${t.border}`, borderRadius:'6px', color:t.textMuted, padding:'5px 12px', cursor:'pointer', fontSize:'11px', fontFamily:F, width:'100%' }}>
                + Adicionar stat extra
              </button>
            </div>

            {/* Notes */}
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notas..." rows={2}
              style={{ ...inp, resize:'vertical', marginBottom:'14px' }} />

            {saveError && (
              <div style={{ color:t.danger, fontSize:'12px', padding:'7px 10px', background:t.dangerBg, borderRadius:'6px', marginBottom:'12px', borderLeft:`3px solid ${t.danger}` }}>⚠ {saveError}</div>
            )}

            {/* Actions */}
            <div style={{ display:'flex', gap:'10px', justifyContent:'space-between' }}>
              <div>
                {editStat && (
                  <button onClick={() => { setDeleteConfirm(editStat); setShowModal(false) }}
                    style={{ background:'transparent', border:`1px solid ${t.danger}`, borderRadius:'6px', color:t.danger, padding:'7px 14px', cursor:'pointer', fontSize:'12px', fontFamily:F }}>
                    Apagar
                  </button>
                )}
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setShowModal(false)}
                  style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:'6px', color:t.textMuted, padding:'7px 16px', cursor:'pointer', fontSize:'12px', fontFamily:F }}>Cancelar</button>
                <button onClick={saveStat} disabled={saving || !form.event_name}
                  style={{ background:form.event_name ? t.accent : t.border, border:'none', borderRadius:'6px', color:t.navTextActive, padding:'7px 24px', cursor:form.event_name ? 'pointer' : 'not-allowed', fontSize:'13px', fontWeight:700, fontFamily:F, opacity:form.event_name ? 1 : 0.5 }}>
                  {saving ? 'A guardar...' : 'Guardar Stats'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <div style={{ fontSize:'10px', letterSpacing:'3px', color:t.accent, marginBottom:'4px', fontWeight:700 }}>COMPETIÇÕES</div>
          <div style={{ fontSize:'24px', fontWeight:800, color:t.text, lineHeight:1.15 }}>Histórico Competitivo</div>
          <div style={{ fontSize:'12px', color:t.textMuted, marginTop:'4px' }}>Torneios marcados como jogados no calendário</div>
        </div>
        <button onClick={() => { setSettingsTab('fields'); setShowSettings(true) }}
          style={{ display:'flex', alignItems:'center', gap:'6px', background:'transparent', border:`1px solid ${t.border}`, borderRadius:'20px', color:t.textMuted, padding:'6px 16px', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:F }}>
          <span style={{ fontSize:'13px' }}>⚙</span> Configurar
        </button>
      </div>

      {/* ── 5 KPI Cards ── */}
      {(() => {
        // Score average per round (not per tournament total)
        const allRoundScores = statsWithData.flatMap(s =>
          (s.values?.rounds || []).map(r => parseFloat(r.score)).filter(v => !isNaN(v) && v > 0)
        )
        const avgScore = allRoundScores.length
          ? (allRoundScores.reduce((a, b) => a + b, 0) / allRoundScores.length).toFixed(1)
          : '—'
        const bestPos  = kpiBest('position')
        const top10    = statsWithData.filter(s => parseFloat(s.values?.position) <= 10).length
        const avgGir   = kpiAvg('gir')

        const cards = [
          { label:'COMPETIÇÕES',    icon:'🏁', value: playedTournaments.length,                           color: t.text   },
          { label:'MÉDIA SCORE',    icon:'📈', value: avgScore,                                            color: t.text   },
          { label:'MELHOR POSIÇÃO', icon:'🏆', value: bestPos != null ? `#${bestPos}` : '—',              color: t.success },
          { label:'TOP 10',         icon:'⭐', value: top10,                                               color:'#F59E0B'  },
          { label:'MÉDIA GIR',      icon:'🎯', value: avgGir !== '—' ? `${avgGir}%` : '—',               color: t.text   },
        ]
        return (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px', marginBottom:'24px' }}>
            {cards.map(card => (
              <div key={card.label} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'14px', padding:'16px 18px', display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:t.accentBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
                  {card.icon}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:'9px', letterSpacing:'1.5px', color:t.textMuted, fontWeight:700, marginBottom:'4px', whiteSpace:'nowrap' }}>{card.label}</div>
                  <div style={{ fontSize:'26px', fontWeight:900, color:card.color, lineHeight:1 }}>{card.value}</div>
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Error ── */}
      {fetchError && (
        <div style={{ color:t.danger, fontSize:'13px', padding:'12px 16px', background:t.dangerBg, borderRadius:'8px', border:`1px solid ${t.danger}`, marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
          <span>⚠ {fetchError}</span>
          <button onClick={fetchData} disabled={loading} style={{ background:'transparent', border:`1px solid ${t.danger}`, borderRadius:'6px', color:t.danger, padding:'4px 12px', cursor:'pointer', fontSize:'12px', fontFamily:F, fontWeight:600 }}>{loading ? 'A tentar...' : 'Tentar novamente'}</button>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div style={{ padding:'60px', textAlign:'center', color:t.textMuted, fontSize:'13px' }}>A carregar...</div>
      ) : playedTournaments.length === 0 ? (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'14px' }}>
          <EmptyState icon="🏌️" message="Sem competições jogadas ainda." subMessage="Marca um torneio como 'Jogado ✓' no calendário para aparecer aqui." t={t} />
        </div>
      ) : (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'14px', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${t.border}` }}>
                <th style={{ padding:'12px 20px', textAlign:'left', color:t.textMuted, fontWeight:600, fontSize:'10px', letterSpacing:'1.5px', whiteSpace:'nowrap' }}>COMPETIÇÃO</th>
                <th style={{ padding:'12px 12px', textAlign:'left', color:t.textMuted, fontWeight:600, fontSize:'10px', letterSpacing:'1.5px', whiteSpace:'nowrap' }}>DATA</th>
                <th style={{ padding:'12px 12px', textAlign:'left', color:t.textMuted, fontWeight:600, fontSize:'10px', letterSpacing:'1.5px' }}>CATEGORIA</th>
                {tableFields.map(f => (
                  <th key={f.id} style={{ padding:'12px 8px', textAlign:'center', color:t.textMuted, fontWeight:600, fontSize:'10px', letterSpacing:'1px', width:'60px', lineHeight:1.4 }}>
                    {f.label.toUpperCase()}{f.unit ? ` (${f.unit})` : ''}
                  </th>
                ))}
                <th style={{ padding:'12px 12px', textAlign:'right', color:t.textMuted, fontWeight:600, fontSize:'10px', letterSpacing:'1.5px' }}>AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {playedTournaments.map((ev, rowIdx) => {
                const statsForEvent = stats.find(s => s.event_id === ev.id) || null
                const isMultiDay    = ev.end_date && ev.end_date !== ev.start_date
                const isExpanded    = expandedRows.has(ev.id)
                const days          = isMultiDay ? getDaysBetween(ev.start_date, ev.end_date) : []
                const rounds        = statsForEvent?.values?.rounds || []
                const hasRounds     = recordHasRounds(statsForEvent)
                const badge         = catBadge(t)
                const rowBg         = 'transparent'
                const hasData       = !!statsForEvent && (
                  hasRounds ||
                  Object.entries(statsForEvent.values || {}).some(([k, v]) =>
                    !ROUND_FIELD_IDS.includes(k) && k !== 'rounds' && v !== null && v !== undefined && v !== ''
                  )
                )

                return [
                  <tr key={ev.id} className="cs-row"
                    style={{ borderTop: rowIdx > 0 ? `1px solid ${t.border}` : 'none', background: rowBg }}
                    onClick={() => openFromTournament(ev)}>
                    <td style={{ padding:'10px 20px', fontWeight:700 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        {isMultiDay && (
                          <button onClick={e => { e.stopPropagation(); toggleExpand(ev.id) }}
                            style={{ background:'transparent', border:'none', color:t.textMuted, cursor:'pointer', fontSize:'11px', padding:'2px', lineHeight:1, flexShrink:0 }}>
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        )}
                        {!isMultiDay && <span style={{ width:'19px', flexShrink:0 }} />}
                        <span style={{ color:t.text }}>{ev.title}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px', color:t.textMuted, whiteSpace:'nowrap', fontSize:'12px' }}>
                      {fmtRange(ev.start_date, ev.end_date)}
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      {ev.category && (
                        <span style={{ background:badge.bg, color:badge.color, borderRadius:'20px', padding:'3px 10px', fontSize:'11px', fontWeight:600, whiteSpace:'nowrap' }}>
                          {ev.category}
                        </span>
                      )}
                    </td>
                    {tableFields.map(f => {
                      // Round fields require validated rounds data; non-round fields read flat value
                      const val = ROUND_FIELD_IDS.includes(f.id)
                        ? (hasRounds ? statsForEvent?.values?.[f.id] : undefined)
                        : statsForEvent?.values?.[f.id]
                      const roundBreakdown = f.id === 'score' && hasRounds && rounds.length > 1
                        ? rounds.map(r => r.score || '—').join(' + ')
                        : null
                      return (
                        <td key={f.id} style={{ padding:'10px 8px', textAlign:'center', verticalAlign:'middle', width:'60px' }}>
                          {val ? (
                            <div>
                              <div style={{ fontWeight:600, color:t.text, fontSize:'13px' }}>
                                {f.id === 'position' ? `#${val}` : val}{f.unit || ''}
                              </div>
                              {roundBreakdown && <div style={{ fontSize:'10px', color:t.textMuted, marginTop:'2px' }}>({roundBreakdown})</div>}
                            </div>
                          ) : (
                            <span style={{ color:t.textFaint }}>—</span>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ padding:'10px 12px', textAlign:'right' }} onClick={e => e.stopPropagation()}>
                      {hasData ? (
                        <button className="cs-edit-btn" onClick={() => openFromTournament(ev)}
                          style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:'6px', color:t.textMuted, cursor:'pointer', padding:'5px 12px', fontSize:'11px', fontFamily:F, fontWeight:600, transition:'border-color 0.15s, color 0.15s' }}>
                          Editar
                        </button>
                      ) : (
                        <button onClick={() => openFromTournament(ev)}
                          style={{ background:t.cardBg, border:'1px solid #D97706', borderRadius:'6px', color:'#D97706', cursor:'pointer', padding:'5px 12px', fontSize:'11px', fontFamily:F, fontWeight:700, whiteSpace:'nowrap' }}>
                          Por preencher
                        </button>
                      )}
                    </td>
                  </tr>,
                  // Drill-down sub-rows
                  ...(isExpanded ? days.map((day, di) => {
                    const r = rounds[di]
                    return (
                      <tr key={`${ev.id}-d${di}`} style={{ borderTop:`1px solid ${t.border}20`, background:t.bg + '80' }}>
                        <td style={{ padding:'8px 20px 8px 51px', color:t.textMuted, fontSize:'12px', fontWeight:500 }}>
                          Round {di + 1}
                        </td>
                        <td style={{ padding:'8px 12px', color:t.textFaint, fontSize:'12px' }}>{fmtDate(day)}</td>
                        <td />
                        {tableFields.map(f => {
                          const val = r?.[f.id]
                          return (
                            <td key={f.id} style={{ padding:'8px 12px', textAlign:'center', color:val ? t.text : t.textFaint, fontSize:'12px', fontWeight: val ? 600 : 400 }}>
                              {val || '—'}
                            </td>
                          )
                        })}
                        <td />
                      </tr>
                    )
                  }) : [])
                ]
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer ── */}
      {!loading && playedTournaments.length > 0 && (
        <div style={{ textAlign:'center', marginTop:'12px', fontSize:'12px', color:t.textMuted }}>
          {playedTournaments.length} {playedTournaments.length === 1 ? 'competição jogada' : 'competições jogadas'}
          {statsWithData.length < playedTournaments.length && (
            <span style={{ color:'#D97706' }}> · {playedTournaments.length - statsWithData.length} por preencher</span>
          )}
        </div>
      )}

      {/* ── Notes ── */}
      {statsWithData.some(s => s.notes) && (
        <div style={{ marginTop:'20px', display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ fontSize:'9px', letterSpacing:'3px', color:t.textMuted, fontWeight:600, marginBottom:'4px' }}>NOTAS</div>
          {statsWithData.filter(s => s.notes).map(stat => (
            <div key={stat.id} style={{ padding:'12px 16px', background:t.surface, border:`1px solid ${t.border}`, borderLeft:`3px solid ${t.accent}`, borderRadius:'6px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:t.textMuted, marginBottom:'4px' }}>{stat.event_name} · {fmtDate(stat.event_date)}</div>
              <div style={{ fontSize:'13px', color:t.text, lineHeight:1.6 }}>{stat.notes}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
