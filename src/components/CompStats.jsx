import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_STAT_FIELDS = [
  { id: 'score', label: 'Score', unit: '' },
  { id: 'position', label: 'Position', unit: '' },
  { id: 'fairways_hit', label: 'Fairways Hit', unit: '%' },
  { id: 'gir', label: 'Greens in Regulation', unit: '%' },
  { id: 'putts', label: 'Putts per Round', unit: '' },
  { id: 'scrambling', label: 'Scrambling', unit: '%' },
  { id: 'drive_distance', label: 'Drive Distance', unit: 'm' },
  { id: 'drive_accuracy', label: 'Drive Accuracy', unit: '%' },
]

export default function CompStats({ theme, t, user }) {
  const [stats, setStats] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showFieldsModal, setShowFieldsModal] = useState(false)
  const [editStat, setEditStat] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [statFields, setStatFields] = useState(DEFAULT_STAT_FIELDS)
  const [newField, setNewField] = useState({ label: '', unit: '' })
  const [form, setForm] = useState({ event_id: '', event_name: '', event_date: '', values: {}, notes: '', website: '' })
  const [detailStat, setDetailStat] = useState(null)

  const F = "'Inter', system-ui, sans-serif"
  const card = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '20px' }
  const inp = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, padding: '7px 10px', fontSize: '13px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [statsRes, eventsRes] = await Promise.all([
      supabase.from('competition_stats').select('*').order('event_date', { ascending: false }),
      supabase.from('events').select('*').order('start_date', { ascending: false })
    ])
    setStats(statsRes.data || [])
    setEvents(eventsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openNew = () => {
    setEditStat(null)
    setForm({ event_id: '', event_name: '', event_date: new Date().toISOString().split('T')[0], values: {}, notes: '', website: '' })
    setShowModal(true)
  }

  const openEdit = (s) => {
    setEditStat(s)
    setForm({ event_id: s.event_id || '', event_name: s.event_name, event_date: s.event_date, values: s.values || {}, notes: s.notes || '', website: s.website || '' })
    setShowModal(true)
  }

  const saveStat = async () => {
    if (!form.event_name || !form.event_date) return
    setSaving(true)
    const payload = { ...form, updated_by: user.email, updated_at: new Date().toISOString() }
    if (editStat) {
      await supabase.from('competition_stats').update(payload).eq('id', editStat.id)
    } else {
      await supabase.from('competition_stats').insert({ ...payload, created_by: user.email })
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  const deleteStat = async () => {
    if (!deleteConfirm) return
    await supabase.from('competition_stats').delete().eq('id', deleteConfirm.id)
    setDeleteConfirm(null)
    fetchData()
  }

  const selectEvent = (eventId) => {
    const ev = events.find(e => e.id === eventId)
    if (ev) setForm(p => ({ ...p, event_id: ev.id, event_name: ev.title, event_date: ev.start_date }))
  }

  const getBest = (fieldId) => {
    const vals = stats.map(s => parseFloat(s.values?.[fieldId])).filter(v => !isNaN(v))
    if (!vals.length) return null
    const lowerBetter = ['putts', 'position', 'score'].includes(fieldId)
    return lowerBetter ? Math.min(...vals) : Math.max(...vals)
  }

  // Summary stats
  const avgScore = stats.length ? (stats.map(s => parseFloat(s.values?.score)).filter(v => !isNaN(v)).reduce((a, b) => a + b, 0) / stats.filter(s => !isNaN(parseFloat(s.values?.score))).length).toFixed(1) : null
  const bestPos = stats.length ? Math.min(...stats.map(s => parseFloat(s.values?.position)).filter(v => !isNaN(v))) : null
  const top10 = stats.filter(s => parseFloat(s.values?.position) <= 10).length

  return (
    <div style={{ fontFamily: F, color: t.text }}>


      {/* Detail modal */}
      {detailStat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.accent, marginBottom: '4px', fontWeight: 600 }}>COMPETITION DETAIL</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: t.text }}>{detailStat.event_name}</div>
                <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '2px' }}>{detailStat.event_date}</div>
              </div>
              <button onClick={() => setDetailStat(null)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            {/* Key stats */}
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
            {/* Other stats */}
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
            {/* Notes */}
            {detailStat.notes && (
              <div style={{ padding: '12px 14px', background: t.bg, borderRadius: '8px', borderLeft: `3px solid ${t.accent}`, marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>NOTES</div>
                <div style={{ fontSize: '13px', color: t.text, lineHeight: 1.6 }}>{detailStat.notes}</div>
              </div>
            )}
            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { openEdit(detailStat); setDetailStat(null) }}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted, padding: '9px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
                Edit Stats
              </button>
              {detailStat.website && (
                <button onClick={() => window.open(detailStat.website, '_blank')}
                  style={{ flex: 1, background: t.accent, border: 'none', borderRadius: '8px', color: '#fff', padding: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
                  Ver Site ↗
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Delete modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px 32px', maxWidth: '380px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: t.text }}>Delete this entry?</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
              Stats for <b style={{ color: t.text }}>{deleteConfirm.event_name}</b> will be permanently deleted.
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: F }}>Cancel</button>
              <button onClick={deleteStat} style={{ background: t.danger, border: 'none', borderRadius: '6px', color: t.text, padding: '8px 20px', cursor: 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 700 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Stat fields modal */}
      {showFieldsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>Manage Stat Fields</div>
              <button onClick={() => setShowFieldsModal(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              {statFields.map((f, i) => (
                <div key={f.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 10px', background: t.bg, borderRadius: '6px' }}>
                  <div style={{ flex: 1, fontSize: '13px', color: t.text }}>{f.label}</div>
                  <div style={{ fontSize: '11px', color: t.textMuted, width: '40px' }}>{f.unit}</div>
                  <button onClick={() => setStatFields(p => p.filter((_, j) => j !== i))}
                    style={{ background: 'transparent', border: 'none', color: t.danger, cursor: 'pointer', fontSize: '16px' }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: `1px solid ${t.border}` }}>
              <input value={newField.label} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))} placeholder="Field name" style={{ ...inp, flex: 2 }} />
              <input value={newField.unit} onChange={e => setNewField(p => ({ ...p, unit: e.target.value }))} placeholder="unit" style={{ ...inp, width: '60px' }} />
              <button onClick={() => {
                if (!newField.label) return
                setStatFields(p => [...p, { id: newField.label.toLowerCase().replace(/\s+/g, '_'), label: newField.label, unit: newField.unit }])
                setNewField({ label: '', unit: '' })
              }} style={{ background: t.accent, border: 'none', borderRadius: '6px', color: t.text, padding: '7px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: F, whiteSpace: 'nowrap' }}>+ Add</button>
            </div>
            <button onClick={() => setShowFieldsModal(false)} style={{ width: '100%', background: t.accent, border: 'none', borderRadius: '8px', color: t.text, padding: '10px', marginTop: '16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: F }}>Done</button>
          </div>
        </div>
      )}

      {/* Entry modal */}
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
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>IMPORT FROM CALENDAR</div>
                  <select value={form.event_id} onChange={e => selectEvent(e.target.value)} style={inp}>
                    <option value="">— Select event —</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title} ({ev.start_date})</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>COMPETITION NAME</div>
                  <input value={form.event_name} onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))} placeholder="e.g. French International U21" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>DATE</div>
                  <input type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} style={inp} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {statFields.map(field => (
                  <div key={field.id}>
                    <div style={{ fontSize: '9px', letterSpacing: '1px', color: t.textMuted, marginBottom: '5px', fontWeight: 600 }}>
                      {field.label.toUpperCase()}{field.unit ? ` (${field.unit})` : ''}
                    </div>
                    <input type="number" step="0.1" value={form.values[field.id] || ''} placeholder="—"
                      onChange={e => setForm(p => ({ ...p, values: { ...p.values, [field.id]: e.target.value } }))}
                      style={inp} />
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>NOTES</div>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Performance notes, conditions, highlights..." style={{ ...inp, minHeight: '64px', resize: 'vertical' }} />
              </div>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>WEBSITE (opcional)</div>
                <input value={form.website || ''} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                  placeholder="https://..." style={inp} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'space-between' }}>
              <div>
                {editStat && <button onClick={() => { setDeleteConfirm(editStat); setShowModal(false) }}
                  style={{ background: 'transparent', border: `1px solid ${t.danger}`, borderRadius: '6px', color: t.danger, padding: '8px 14px', cursor: 'pointer', fontSize: '12px', fontFamily: F }}>Delete</button>}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: F }}>Cancel</button>
                <button onClick={saveStat} disabled={saving || !form.event_name}
                  style={{ background: !form.event_name ? t.navActive : t.accent, border: 'none', borderRadius: '6px', color: t.text, padding: '8px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: F }}>
                  {saving ? 'Saving...' : 'Save Stats'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.accent, marginBottom: '3px', fontWeight: 600 }}>COMPETITION</div>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>Competition Stats</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowFieldsModal(true)}
            style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted, padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
            ⚙ Fields
          </button>
          <button onClick={openNew}
            style={{ background: 'transparent', border: `1px solid ${t.accent}`, borderRadius: '8px', color: t.accent, padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
            + Add Stats
          </button>
        </div>
      </div>

      {/* Season summary cards */}
      {stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'COMPETITIONS', value: stats.length, unit: '', color: t.accentLight },
            { label: 'BEST POSITION', value: bestPos !== null && isFinite(bestPos) ? `#${bestPos}` : '—', unit: '', color: '#52E8A0' },
            { label: 'AVG SCORE', value: avgScore && !isNaN(avgScore) ? avgScore : '—', unit: '', color: t.text },
            { label: 'TOP 10s', value: top10, unit: '', color: '#f59e0b' },
          ].map((item, i) => (
            <div key={i} style={{ ...card, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: item.color, lineHeight: 1 }}>
                {item.value}<span style={{ fontSize: '11px', color: t.textMuted, marginLeft: '3px' }}>{item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per-field bests */}
      {stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
          {statFields.slice(2, 6).map(field => {
            const best = getBest(field.id)
            return (
              <div key={field.id} style={{ ...card, padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '5px', fontWeight: 600 }}>BEST {field.label.toUpperCase()}</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: best !== null ? '#52E8A0' : t.textFaint }}>
                  {best !== null ? best : '—'}<span style={{ fontSize: '11px', color: t.textMuted, marginLeft: '3px' }}>{field.unit}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>Loading...</div>
      ) : stats.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '14px', color: t.textMuted, marginBottom: '16px' }}>No competition stats yet.</div>
          <button onClick={openNew}
            style={{ background: t.accent, border: 'none', borderRadius: '8px', color: t.text, padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
            Add First Competition
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: t.surface }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: t.textMuted, fontWeight: 600, fontSize: '10px', letterSpacing: '2px', borderBottom: `1px solid ${t.border}` }}>COMPETITION</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: t.textMuted, fontWeight: 600, fontSize: '10px', borderBottom: `1px solid ${t.border}` }}>DATE</th>
                {statFields.map(f => (
                  <th key={f.id} style={{ padding: '10px 8px', textAlign: 'center', color: t.textMuted, fontWeight: 600, fontSize: '10px', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                    {f.label.toUpperCase()}{f.unit ? ` (${f.unit})` : ''}
                  </th>
                ))}
                <th style={{ borderBottom: `1px solid ${t.border}`, width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {stats.map(stat => (
                <tr key={stat.id} style={{ borderTop: `1px solid ${t.border}` }}>
                  <td style={{ padding: '10px 14px', color: t.accent, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setDetailStat(stat)}>{stat.event_name}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: t.textMuted, whiteSpace: 'nowrap' }}>{stat.event_date}</td>
                  {statFields.map(f => {
                    const val = stat.values?.[f.id]
                    const best = getBest(f.id)
                    const isBest = val && parseFloat(val) === best
                    return (
                      <td key={f.id} style={{ padding: '10px 8px', textAlign: 'center', color: isBest ? '#52E8A0' : val ? t.accentLight : t.textFaint, fontWeight: isBest ? 800 : val ? 600 : 400 }}>
                        {val ? `${val}${f.unit}` : '·'}
                        {isBest && <span style={{ fontSize: '8px', marginLeft: '2px' }}>★</span>}
                      </td>
                    )
                  })}
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(stat) }} title="Edit"
                      style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '5px', color: t.textMuted, cursor: 'pointer', padding: '4px 6px', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes per competition */}
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
