import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// comp_config table needed: id (uuid pk), stat_fields (jsonb), visible_columns (jsonb), summary_cards (jsonb), updated_at (timestamptz)

const DEFAULT_STAT_FIELDS = [
  { id: 'score', label: 'Score', unit: '', lower_better: true },
  { id: 'position', label: 'Position', unit: '', lower_better: true },
  { id: 'fairways_hit', label: 'Fairways Hit', unit: '%', lower_better: false },
  { id: 'gir', label: 'Greens in Regulation', unit: '%', lower_better: false },
  { id: 'putts', label: 'Putts per Round', unit: '', lower_better: true },
  { id: 'scrambling', label: 'Scrambling', unit: '%', lower_better: false },
  { id: 'drive_distance', label: 'Drive Distance', unit: 'm', lower_better: false },
  { id: 'drive_accuracy', label: 'Drive Accuracy', unit: '%', lower_better: false },
]

const DEFAULT_SUMMARY_CARDS = [
  { id: 'total', type: 'count', label: 'COMPETITIONS' },
  { id: 'best_position', type: 'best', fieldId: 'position', label: 'BEST POSITION' },
  { id: 'avg_score', type: 'avg', fieldId: 'score', label: 'AVG SCORE' },
  { id: 'top10', type: 'top10', label: 'TOP 10s' },
]

export default function CompStats({ theme, t, user, events = [] }) {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  // Config
  const [statFields, setStatFields] = useState(DEFAULT_STAT_FIELDS)
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_STAT_FIELDS.map(f => f.id))
  const [summaryCards, setSummaryCards] = useState(DEFAULT_SUMMARY_CARDS)
  const [configId, setConfigId] = useState(null)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState('fields')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [detailStat, setDetailStat] = useState(null)
  const [editStat, setEditStat] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Entry form
  const [form, setForm] = useState({ event_id: '', event_name: '', event_date: '', values: {}, notes: '' })

  // Settings forms
  const [newField, setNewField] = useState({ label: '', unit: '', lower_better: false })
  const [editingField, setEditingField] = useState(null)
  const [newCard, setNewCard] = useState({ type: 'best', fieldId: '', label: '' })

  const F = "'Inter', system-ui, sans-serif"
  const card = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '20px' }
  const inp = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, padding: '7px 10px', fontSize: '13px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('competition_stats').select('*').order('event_date', { ascending: false })
    setStats(data || [])
    setLoading(false)
  }, [])

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase.from('comp_config').select('*').limit(1).maybeSingle()
    if (data) {
      setConfigId(data.id)
      if (data.stat_fields?.length) setStatFields(data.stat_fields)
      if (data.visible_columns?.length) setVisibleColumns(data.visible_columns)
      if (data.summary_cards?.length) setSummaryCards(data.summary_cards)
    }
  }, [])

  useEffect(() => { fetchData(); fetchConfig() }, [fetchData, fetchConfig])

  const persistConfig = async (fields, columns, cards) => {
    const payload = { stat_fields: fields, visible_columns: columns, summary_cards: cards, updated_at: new Date().toISOString() }
    if (configId) {
      await supabase.from('comp_config').update(payload).eq('id', configId)
    } else {
      const { data } = await supabase.from('comp_config').insert(payload).select().maybeSingle()
      if (data?.id) setConfigId(data.id)
    }
  }

  // ── Entry handlers ─────────────────────────────────────────────────────────
  const openNew = () => {
    setEditStat(null)
    setSaveError(null)
    setForm({ event_id: '', event_name: '', event_date: new Date().toISOString().split('T')[0], values: {}, notes: '' })
    setShowModal(true)
  }

  const openEdit = (s) => {
    setEditStat(s)
    setSaveError(null)
    setForm({ event_id: s.event_id || '', event_name: s.event_name, event_date: s.event_date, values: s.values || {}, notes: s.notes || '' })
    setShowModal(true)
  }

  const saveStat = async () => {
    if (!form.event_name || !form.event_date) return
    if (!user) {
      setSaveError('Sessão expirada. Faz login novamente.')
      return
    }
    setSaving(true)
    setSaveError(null)

    // Strip empty-string values so JSONB only stores actual data
    const cleanValues = Object.fromEntries(
      Object.entries(form.values).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )

    // Only send columns that definitely exist in competition_stats
    const payload = {
      event_id: form.event_id || null,
      event_name: form.event_name,
      event_date: form.event_date,
      values: cleanValues,
      notes: form.notes || null,
    }

    console.log('[CompStats] saveStat payload:', JSON.stringify(payload))

    let result
    if (editStat) {
      result = await supabase.from('competition_stats').update(payload).eq('id', editStat.id)
    } else {
      result = await supabase.from('competition_stats').insert(payload)
    }

    console.log('[CompStats] saveStat result:', result?.error ?? 'ok')

    if (result?.error) {
      console.error('[CompStats] save error:', result.error)
      setSaveError(result.error.message || 'Erro ao guardar. Verifica a consola.')
      setSaving(false)
      return
    }

    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    await supabase.from('competition_stats').delete().eq('id', deleteConfirm.id)
    setDeleteConfirm(null)
    fetchData()
  }

  const selectEvent = (eventId) => {
    const ev = events.find(e => e.id === eventId)
    if (ev) setForm(p => ({ ...p, event_id: ev.id, event_name: ev.title, event_date: ev.start_date }))
  }

  // ── Config handlers ────────────────────────────────────────────────────────
  const addField = () => {
    if (!newField.label) return
    const id = newField.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const updatedFields = [...statFields, { id, ...newField }]
    const updatedCols = [...visibleColumns, id]
    setStatFields(updatedFields)
    setVisibleColumns(updatedCols)
    setNewField({ label: '', unit: '', lower_better: false })
    persistConfig(updatedFields, updatedCols, summaryCards)
  }

  const saveFieldEdit = () => {
    if (!editingField) return
    const updated = statFields.map((f, i) =>
      i === editingField.idx ? { ...f, label: editingField.label, unit: editingField.unit, lower_better: editingField.lower_better } : f
    )
    setStatFields(updated)
    setEditingField(null)
    persistConfig(updated, visibleColumns, summaryCards)
  }

  const removeField = (idx) => {
    const fieldId = statFields[idx].id
    const updatedFields = statFields.filter((_, i) => i !== idx)
    const updatedCols = visibleColumns.filter(c => c !== fieldId)
    const updatedCards = summaryCards.filter(c => c.fieldId !== fieldId)
    setStatFields(updatedFields)
    setVisibleColumns(updatedCols)
    setSummaryCards(updatedCards)
    persistConfig(updatedFields, updatedCols, updatedCards)
  }

  const toggleColumn = (fieldId) => {
    const updated = visibleColumns.includes(fieldId)
      ? visibleColumns.filter(c => c !== fieldId)
      : [...visibleColumns, fieldId]
    setVisibleColumns(updated)
    persistConfig(statFields, updated, summaryCards)
  }

  const addCard = () => {
    if (!newCard.label) return
    if ((newCard.type === 'best' || newCard.type === 'avg') && !newCard.fieldId) return
    const updated = [...summaryCards, { id: `card_${Date.now()}`, ...newCard }]
    setSummaryCards(updated)
    setNewCard({ type: 'best', fieldId: '', label: '' })
    persistConfig(statFields, visibleColumns, updated)
  }

  const removeCard = (id) => {
    const updated = summaryCards.filter(c => c.id !== id)
    setSummaryCards(updated)
    persistConfig(statFields, visibleColumns, updated)
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const getBest = (fieldId) => {
    const field = statFields.find(f => f.id === fieldId)
    const vals = stats.map(s => parseFloat(s.values?.[fieldId])).filter(v => !isNaN(v))
    if (!vals.length) return null
    return field?.lower_better ? Math.min(...vals) : Math.max(...vals)
  }

  const computeCard = (c) => {
    const field = statFields.find(f => f.id === c.fieldId)
    switch (c.type) {
      case 'count':  return { value: stats.length, unit: '', color: t.accentLight }
      case 'top10':  return { value: stats.filter(s => parseFloat(s.values?.position) <= 10).length, unit: '', color: '#f59e0b' }
      case 'best': {
        const vals = stats.map(s => parseFloat(s.values?.[c.fieldId])).filter(v => !isNaN(v))
        if (!vals.length) return { value: '—', unit: '', color: '#52E8A0' }
        const best = field?.lower_better ? Math.min(...vals) : Math.max(...vals)
        return { value: c.fieldId === 'position' ? `#${best}` : best, unit: field?.unit || '', color: '#52E8A0' }
      }
      case 'avg': {
        const vals = stats.map(s => parseFloat(s.values?.[c.fieldId])).filter(v => !isNaN(v))
        if (!vals.length) return { value: '—', unit: '', color: t.text }
        return { value: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1), unit: field?.unit || '', color: t.text }
      }
      default: return { value: '—', unit: '', color: t.text }
    }
  }

  const tableFields = statFields.filter(f => visibleColumns.includes(f.id))

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setSettingsTab(key)}
      style={{ flex: 1, background: settingsTab === key ? t.surface : 'transparent', border: settingsTab === key ? `1px solid ${t.border}` : 'none', borderRadius: '6px', color: settingsTab === key ? t.text : t.textMuted, padding: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: F }}>
      {label}
    </button>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .comp-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
        @media(max-width:600px){.comp-cards{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      {/* Detail Modal */}
      {detailStat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.accent, marginBottom: '4px', fontWeight: 600 }}>COMPETITION DETAIL</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{detailStat.event_name}</div>
                <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '2px' }}>{detailStat.event_date}</div>
              </div>
              <button onClick={() => setDetailStat(null)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {statFields.slice(0, 4).map(f => {
                const val = detailStat.values?.[f.id]
                return val ? (
                  <div key={f.id} style={{ background: t.bg, borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>{f.label.toUpperCase()}</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: t.accentLight }}>{val}{f.unit}</div>
                  </div>
                ) : null
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {statFields.slice(4).map(f => {
                const val = detailStat.values?.[f.id]
                return val ? (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: t.bg, borderRadius: '6px' }}>
                    <span style={{ fontSize: '12px', color: t.textMuted }}>{f.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: t.text }}>{val}{f.unit}</span>
                  </div>
                ) : null
              })}
            </div>
            {detailStat.notes && (
              <div style={{ padding: '12px 14px', background: t.bg, borderRadius: '8px', borderLeft: `3px solid ${t.accent}`, marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>NOTES</div>
                <div style={{ fontSize: '13px', color: t.text, lineHeight: 1.6 }}>{detailStat.notes}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { openEdit(detailStat); setDetailStat(null) }}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted, padding: '9px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
                Edit Stats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px 32px', maxWidth: '380px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: t.text }}>Delete this entry?</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
              Stats for <b style={{ color: t.text }}>{deleteConfirm.event_name}</b> will be permanently deleted.
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: F }}>Cancel</button>
              <button onClick={confirmDelete} style={{ background: t.danger, border: 'none', borderRadius: '6px', color: '#fff', padding: '8px 20px', cursor: 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 700 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>Configure Stats</div>
              <button onClick={() => setShowSettings(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: t.bg, borderRadius: '8px', padding: '4px' }}>
              {tabBtn('fields', 'Fields')}
              {tabBtn('columns', 'Table Columns')}
              {tabBtn('cards', 'Summary Cards')}
            </div>

            {/* Tab: Fields */}
            {settingsTab === 'fields' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  {statFields.map((f, i) => (
                    <div key={f.id} style={{ background: t.bg, borderRadius: '6px', padding: '8px 10px' }}>
                      {editingField?.idx === i ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <input value={editingField.label} onChange={e => setEditingField(p => ({ ...p, label: e.target.value }))} style={{ ...inp, flex: 2, minWidth: '100px' }} />
                          <input value={editingField.unit} onChange={e => setEditingField(p => ({ ...p, unit: e.target.value }))} placeholder="unit" style={{ ...inp, width: '60px' }} />
                          <label style={{ fontSize: '11px', color: t.textMuted, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={!!editingField.lower_better} onChange={e => setEditingField(p => ({ ...p, lower_better: e.target.checked }))} />
                            ↓ better
                          </label>
                          <button onClick={saveFieldEdit} style={{ background: t.accent, border: 'none', borderRadius: '4px', color: theme === 'dark' ? '#000' : '#fff', padding: '5px 10px', cursor: 'pointer', fontSize: '11px', fontFamily: F }}>Save</button>
                          <button onClick={() => setEditingField(null)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '4px', color: t.textMuted, padding: '5px 8px', cursor: 'pointer', fontSize: '11px', fontFamily: F }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, fontSize: '13px', color: t.text }}>{f.label}</div>
                          {f.unit && <div style={{ fontSize: '11px', color: t.textMuted }}>{f.unit}</div>}
                          <div style={{ fontSize: '10px', color: t.textFaint }}>{f.lower_better ? '↓ melhor' : '↑ melhor'}</div>
                          <button onClick={() => setEditingField({ idx: i, label: f.label, unit: f.unit || '', lower_better: !!f.lower_better })}
                            style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '13px', padding: '2px 6px' }}>✎</button>
                          <button onClick={() => removeField(i)}
                            style={{ background: 'transparent', border: 'none', color: t.danger, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px 4px' }}>×</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '12px' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, marginBottom: '8px', fontWeight: 600 }}>ADD FIELD</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input value={newField.label} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))}
                      placeholder="Field name" style={{ ...inp, flex: 2, minWidth: '120px' }}
                      onKeyDown={e => e.key === 'Enter' && addField()} />
                    <input value={newField.unit} onChange={e => setNewField(p => ({ ...p, unit: e.target.value }))}
                      placeholder="unit" style={{ ...inp, width: '60px' }} />
                    <label style={{ fontSize: '11px', color: t.textMuted, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={newField.lower_better} onChange={e => setNewField(p => ({ ...p, lower_better: e.target.checked }))} />
                      ↓ better
                    </label>
                    <button onClick={addField} style={{ background: t.accent, border: 'none', borderRadius: '6px', color: theme === 'dark' ? '#000' : '#fff', padding: '7px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: F, whiteSpace: 'nowrap' }}>+ Add</button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Columns */}
            {settingsTab === 'columns' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>Escolhe que colunas aparecem na tabela de resultados.</div>
                {statFields.map(f => (
                  <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: t.bg, borderRadius: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={visibleColumns.includes(f.id)} onChange={() => toggleColumn(f.id)} />
                    <span style={{ fontSize: '13px', color: t.text, flex: 1 }}>{f.label}</span>
                    {f.unit && <span style={{ fontSize: '11px', color: t.textMuted }}>{f.unit}</span>}
                    <span style={{ fontSize: '10px', color: t.textFaint }}>{f.lower_better ? '↓' : '↑'}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Tab: Cards */}
            {settingsTab === 'cards' && (
              <div>
                <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '10px' }}>Métricas que aparecem no resumo de época no topo.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  {summaryCards.map(c => {
                    const fieldLabel = statFields.find(f => f.id === c.fieldId)?.label || c.fieldId
                    const typeLabel = c.type === 'count' ? 'Total comps' : c.type === 'top10' ? 'Count pos ≤ 10' : c.type === 'best' ? `Best ${fieldLabel}` : `Avg ${fieldLabel}`
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: t.bg, borderRadius: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: t.text }}>{c.label}</div>
                          <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '2px' }}>{typeLabel}</div>
                        </div>
                        <button onClick={() => removeCard(c.id)}
                          style={{ background: 'transparent', border: 'none', color: t.danger, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px 6px' }}>×</button>
                      </div>
                    )
                  })}
                  {summaryCards.length === 0 && (
                    <div style={{ fontSize: '12px', color: t.textFaint, padding: '16px', textAlign: 'center' }}>Nenhum card configurado.</div>
                  )}
                </div>
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '12px' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, marginBottom: '10px', fontWeight: 600 }}>ADD CARD</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>TIPO</div>
                        <select value={newCard.type} onChange={e => setNewCard(p => ({ ...p, type: e.target.value, fieldId: '' }))} style={inp}>
                          <option value="count">Total Competições</option>
                          <option value="top10">Top 10 (posição ≤ 10)</option>
                          <option value="best">Melhor valor de campo</option>
                          <option value="avg">Média de campo</option>
                        </select>
                      </div>
                      {(newCard.type === 'best' || newCard.type === 'avg') && (
                        <div>
                          <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>CAMPO</div>
                          <select value={newCard.fieldId} onChange={e => setNewCard(p => ({ ...p, fieldId: e.target.value }))} style={inp}>
                            <option value="">— escolhe —</option>
                            {statFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>LABEL</div>
                      <input value={newCard.label} onChange={e => setNewCard(p => ({ ...p, label: e.target.value }))}
                        placeholder="ex: MELHOR SCORE" style={inp}
                        onKeyDown={e => e.key === 'Enter' && addCard()} />
                    </div>
                    <button onClick={addCard} style={{ background: t.accent, border: 'none', borderRadius: '6px', color: theme === 'dark' ? '#000' : '#fff', padding: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: F }}>+ Add Card</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entry Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 999, padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '520px', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{editStat ? 'Edit Stats' : 'Add Competition Stats'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {events.length > 0 && (
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>IMPORTAR DO CALENDÁRIO</div>
                  <select value={form.event_id} onChange={e => selectEvent(e.target.value)} style={inp}>
                    <option value="">— Selecionar evento —</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title} ({ev.start_date})</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>NOME DA COMPETIÇÃO</div>
                  <input value={form.event_name} onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))} placeholder="ex: French International U21" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>DATA</div>
                  <input type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {statFields.map(field => (
                  <div key={field.id}>
                    <div style={{ fontSize: '9px', letterSpacing: '1px', color: t.textMuted, marginBottom: '5px', fontWeight: 600 }}>
                      {field.label.toUpperCase()}{field.unit ? ` (${field.unit})` : ''}
                    </div>
                    <input type="number" step="0.1" value={form.values[field.id] || ''}
                      onChange={e => setForm(p => ({ ...p, values: { ...p.values, [field.id]: e.target.value } }))}
                      placeholder="—" style={inp} />
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>NOTAS</div>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Notas, condições, destaques..." style={{ ...inp, minHeight: '64px', resize: 'vertical' }} />
              </div>
            </div>
            {saveError && (
              <div style={{ color: t.danger, fontSize: '12px', padding: '8px 10px', background: t.dangerBg || '#1a0808', borderRadius: '6px', marginTop: '12px', borderLeft: `3px solid ${t.danger}` }}>
                ⚠ {saveError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'space-between' }}>
              <div>
                {editStat && (
                  <button onClick={() => { setDeleteConfirm(editStat); setShowModal(false) }}
                    style={{ background: 'transparent', border: `1px solid ${t.danger}`, borderRadius: '6px', color: t.danger, padding: '8px 14px', cursor: 'pointer', fontSize: '12px', fontFamily: F }}>
                    Delete
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: F }}>Cancelar</button>
                <button onClick={saveStat} disabled={saving || !form.event_name}
                  style={{ background: !form.event_name ? t.navActive : t.accent, border: 'none', borderRadius: '6px', color: !form.event_name ? t.textMuted : (theme === 'dark' ? '#000' : '#fff'), padding: '8px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: F }}>
                  {saving ? 'A guardar...' : 'Guardar Stats'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.accent, marginBottom: '3px', fontWeight: 700 }}>COMPETITIONS</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: t.text, lineHeight: 1.1 }}>Histórico Competitivo</div>
          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '3px' }}>Tournament history and statistics</div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => { setSettingsTab('fields'); setShowSettings(true) }}
            style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '20px', color: t.textMuted, padding: '5px 14px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: F }}>
            Configurar
          </button>
          <button onClick={openNew}
            style={{ background: 'transparent', border: `1px solid ${t.accent}`, borderRadius: '20px', color: t.accent, padding: '5px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
            + Adicionar Stats
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {stats.length > 0 && summaryCards.length > 0 && (
        <div className="comp-cards">
          {summaryCards.map(c => {
            const { value, unit, color } = computeCard(c)
            return (
              <div key={c.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '14px 16px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '2px', color: t.textMuted, marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>{c.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color, lineHeight: 1 }}>
                  {value}
                </div>
                {unit && <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '2px' }}>{unit}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Stats Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted, fontSize: '13px' }}>A carregar...</div>
      ) : stats.length === 0 ? (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>Sem stats de competição ainda.</div>
          <button onClick={openNew}
            style={{ background: 'transparent', border: `1px solid ${t.accent}`, borderRadius: '20px', color: t.accent, padding: '6px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
            Adicionar Primeira Competição
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '500px' }}>
            <thead>
              <tr style={{ background: t.surface }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: t.textMuted, fontWeight: 700, fontSize: '9px', letterSpacing: '2px', borderBottom: `1px solid ${t.border}` }}>COMPETIÇÃO</th>
                <th style={{ padding: '10px 10px', textAlign: 'left', color: t.textMuted, fontWeight: 700, fontSize: '9px', letterSpacing: '1px', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>DATA</th>
                {tableFields.map(f => (
                  <th key={f.id} style={{ padding: '10px 10px', textAlign: 'center', color: t.textMuted, fontWeight: 700, fontSize: '9px', letterSpacing: '1px', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                    {f.label.toUpperCase()}{f.unit ? ` (${f.unit})` : ''}
                  </th>
                ))}
                <th style={{ borderBottom: `1px solid ${t.border}`, width: '44px' }}></th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, rowIdx) => (
                <tr key={stat.id} style={{ borderTop: `1px solid ${t.border}`, background: rowIdx % 2 === 0 ? 'transparent' : t.bg + '55' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, cursor: 'pointer', color: t.text }}
                    onClick={() => setDetailStat(stat)}>
                    <span style={{ color: t.accent }}>{stat.event_name}</span>
                  </td>
                  <td style={{ padding: '10px 10px', color: t.textMuted, whiteSpace: 'nowrap', fontSize: '11px' }}>{stat.event_date}</td>
                  {tableFields.map(f => {
                    const val = stat.values?.[f.id]
                    const best = getBest(f.id)
                    const isBest = val !== undefined && val !== '' && parseFloat(val) === best
                    return (
                      <td key={f.id} style={{ padding: '10px 10px', textAlign: 'center', color: isBest ? t.success : val ? t.text : t.textFaint, fontWeight: isBest ? 800 : val ? 600 : 400, fontSize: isBest ? '13px' : '12px' }}>
                        {val ? `${val}${f.unit || ''}` : '—'}
                        {isBest && <span style={{ fontSize: '8px', marginLeft: '3px', color: t.success }}>★</span>}
                      </td>
                    )
                  })}
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(stat) }} title="Editar"
                      style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, cursor: 'pointer', padding: '4px 8px', fontSize: '10px', fontFamily: F }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {stats.some(s => s.notes) && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.textMuted, fontWeight: 600, marginBottom: '4px' }}>NOTES</div>
          {stats.filter(s => s.notes).map(stat => (
            <div key={stat.id} style={{ padding: '10px 14px', background: t.surface, border: `1px solid ${t.border}`, borderLeft: `3px solid ${t.accent}`, borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '4px' }}>{stat.event_name} · {stat.event_date}</div>
              <div style={{ fontSize: '13px', color: t.text, lineHeight: 1.6 }}>{stat.notes}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
