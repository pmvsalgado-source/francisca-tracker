import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_METRICS = [
  { id: 'swing_speed', label: 'Swing Speed', unit: 'mph' },
  { id: 'smash_factor', label: 'Smash Factor', unit: '' },
  { id: 'carry', label: 'Carry Driver', unit: 'm' },
  { id: 'stack_speed', label: 'The Stack', unit: 'mph' },
  { id: 'deadlift', label: 'Trap Bar Deadlift', unit: 'kg' },
  { id: 'medball', label: 'Medicine Ball Throw', unit: 'm' },
  { id: 'thoracic', label: 'Thoracic Mobility', unit: '°' },
]

function GoalChart({ entries, goal, theme, t }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !goal) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const pad = { t: 40, r: 24, b: 52, l: 60 }
    const cw = W - pad.l - pad.r
    const ch = H - pad.t - pad.b

    const startDate = new Date(goal.start_date)
    const endDate = new Date(goal.end_date)
    const startVal = parseFloat(goal.start_value)
    const targetVal = parseFloat(goal.target_value)
    const totalDays = (endDate - startDate) / 86400000

    // Real data points
    const pts = entries
      .filter(e => e.metric_id === goal.metric_id && e.value && e.entry_date)
      .filter(e => new Date(e.entry_date) >= startDate)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      .map(e => ({ date: new Date(e.entry_date), value: parseFloat(e.value) }))

    const allVals = [startVal, targetVal, ...pts.map(p => p.value)]
    const minV = Math.min(...allVals) * 0.96
    const maxV = Math.max(...allVals) * 1.04
    const range = maxV - minV || 1

    const xOfDate = (date) => pad.l + Math.min(1, Math.max(0, (date - startDate) / (endDate - startDate) * 86400000 / 86400000 * ((date - startDate) / (endDate - startDate)))) * cw
    const xOfRatio = (r) => pad.l + Math.min(1, Math.max(0, r)) * cw
    const yOf = (v) => pad.t + ch - ((v - minV) / range) * ch

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const v = minV + (range * i / 4)
      const y = yOf(v)
      ctx.strokeStyle = t.border; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke()
      ctx.fillStyle = t.textMuted; ctx.font = '10px Inter,system-ui'; ctx.textAlign = 'right'
      ctx.fillText(v.toFixed(1) + (goal.unit || ''), pad.l - 6, y + 4)
    }

    // Milestones — monthly intervals
    const milestones = []
    let d = new Date(startDate)
    d.setMonth(d.getMonth() + 1)
    while (d < endDate) {
      const ratio = (d - startDate) / (endDate - startDate)
      const expectedVal = startVal + (targetVal - startVal) * ratio
      milestones.push({ date: new Date(d), ratio, value: expectedVal })
      d = new Date(d)
      d.setMonth(d.getMonth() + 1)
    }

    // X axis labels — start, milestones, end
    const xLabels = [
      { ratio: 0, label: startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) },
      ...milestones.map(m => ({ ratio: m.ratio, label: m.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) })),
      { ratio: 1, label: endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) },
    ]
    xLabels.forEach(({ ratio, label }) => {
      const x = xOfRatio(ratio)
      ctx.fillStyle = t.textMuted; ctx.font = '10px Inter,system-ui'; ctx.textAlign = 'center'
      ctx.fillText(label, x, pad.t + ch + 18)
      ctx.strokeStyle = t.border; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ch); ctx.stroke()
    })

    // Expected line (target progression)
    ctx.beginPath()
    ctx.moveTo(xOfRatio(0), yOf(startVal))
    ctx.lineTo(xOfRatio(1), yOf(targetVal))
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5
    ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([])

    // Milestone pins on expected line
    milestones.forEach(m => {
      const x = xOfRatio(m.ratio), y = yOf(m.value)
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '9px Inter,system-ui'; ctx.textAlign = 'center'
      ctx.fillText(m.value.toFixed(1) + (goal.unit || ''), x, y - 8)
    })

    if (pts.length < 1) {
      ctx.fillStyle = t.textMuted; ctx.font = '13px Inter,system-ui'; ctx.textAlign = 'center'
      ctx.fillText('No data yet — start logging to see progress', W / 2, H / 2)
      return
    }

    // Shade ahead/behind zones
    if (pts.length >= 1) {
      pts.forEach((pt, i) => {
        const ratio = (pt.date - startDate) / (endDate - startDate)
        const expectedAtPoint = startVal + (targetVal - startVal) * ratio
        const isAhead = pt.value >= expectedAtPoint

        const x = xOfRatio(ratio)
        const yReal = yOf(pt.value)
        const yExp = yOf(expectedAtPoint)

        if (i > 0) {
          const prevPt = pts[i - 1]
          const prevRatio = (prevPt.date - startDate) / (endDate - startDate)
          const prevExpected = startVal + (targetVal - startVal) * prevRatio
          const prevX = xOfRatio(prevRatio)
          const prevYReal = yOf(prevPt.value)
          const prevYExp = yOf(prevExpected)

          ctx.beginPath()
          ctx.moveTo(prevX, prevYReal)
          ctx.lineTo(x, yReal)
          ctx.lineTo(x, yExp)
          ctx.lineTo(prevX, prevYExp)
          ctx.closePath()
          ctx.fillStyle = isAhead ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'
          ctx.fill()
        }
      })
    }

    // Real line
    ctx.beginPath()
    pts.forEach((pt, i) => {
      const ratio = (pt.date - startDate) / (endDate - startDate)
      const x = xOfRatio(ratio), y = yOf(pt.value)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = t.accent; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke()

    // Real points
    pts.forEach((pt, i) => {
      const ratio = (pt.date - startDate) / (endDate - startDate)
      const x = xOfRatio(ratio), y = yOf(pt.value)
      const expectedAtPoint = startVal + (targetVal - startVal) * ratio
      const isAhead = pt.value >= expectedAtPoint
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = isAhead ? '#52E8A0' : '#f87171'; ctx.fill()
      if (i === pts.length - 1) {
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px Inter,system-ui'; ctx.textAlign = 'center'
        ctx.fillText(pt.value + (goal.unit || ''), x, y - 12)
      }
    })

    // Target label at end
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = 'bold 10px Inter,system-ui'; ctx.textAlign = 'left'
    ctx.fillText('Target: ' + targetVal + (goal.unit || ''), xOfRatio(1) - 80, yOf(targetVal) - 6)

  }, [entries, goal, theme, t])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '280px', display: 'block' }} />
}

export default function Goals({ theme, t, user }) {
  const [goals, setGoals] = useState([])
  const [entries, setEntries] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    metric_id: 'swing_speed',
    metric_label: 'Swing Speed',
    unit: 'mph',
    start_value: '',
    target_value: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  })

  const F = "'Inter', system-ui, sans-serif"
  const card = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '20px' }
  const inp = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, padding: '7px 10px', fontSize: '13px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }

  const fetchGoals = useCallback(async () => {
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    setGoals(data || [])
  }, [])

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase.from('entries').select('*').order('entry_date')
    setEntries(data || [])
  }, [])

  useEffect(() => { fetchGoals(); fetchEntries() }, [fetchGoals, fetchEntries])

  const openNew = () => {
    setEditGoal(null)
    setForm({ metric_id: 'swing_speed', metric_label: 'Swing Speed', unit: 'mph', start_value: '', target_value: '', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (g) => {
    setEditGoal(g)
    setForm({ metric_id: g.metric_id, metric_label: g.metric_label, unit: g.unit || '', start_value: g.start_value, target_value: g.target_value, start_date: g.start_date, end_date: g.end_date, notes: g.notes || '' })
    setShowModal(true)
  }

  const saveGoal = async () => {
    if (!form.target_value || !form.end_date || !form.start_value) return
    setSaving(true)
    const payload = { ...form, updated_by: user.email, updated_at: new Date().toISOString() }
    if (editGoal) {
      await supabase.from('goals').update(payload).eq('id', editGoal.id)
    } else {
      await supabase.from('goals').insert({ ...payload, created_by: user.email })
    }
    setSaving(false)
    setShowModal(false)
    fetchGoals()
  }

  const deleteGoal = async () => {
    if (!deleteConfirm) return
    await supabase.from('goals').delete().eq('id', deleteConfirm.id)
    setDeleteConfirm(null)
    fetchGoals()
  }

  const getStatus = (goal) => {
    const pts = entries.filter(e => e.metric_id === goal.metric_id && e.value && e.entry_date)
      .filter(e => new Date(e.entry_date) >= new Date(goal.start_date))
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    if (!pts.length) return { label: 'No Data', color: t.textMuted }
    const last = pts[pts.length - 1]
    const lastDate = new Date(last.entry_date)
    const startDate = new Date(goal.start_date)
    const endDate = new Date(goal.end_date)
    const ratio = Math.min(1, (lastDate - startDate) / (endDate - startDate))
    const expected = parseFloat(goal.start_value) + (parseFloat(goal.target_value) - parseFloat(goal.start_value)) * ratio
    const actual = parseFloat(last.value)
    const diff = actual - expected
    if (Math.abs(diff) < 0.5) return { label: 'On Track', color: '#f59e0b', diff }
    if (diff > 0) return { label: 'Ahead', color: '#52E8A0', diff }
    return { label: 'Behind', color: '#f87171', diff }
  }

  return (
    <div style={{ fontFamily: F, color: t.text }}>

      {/* Delete modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px 32px', maxWidth: '380px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Delete this goal?</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
              <b style={{ color: t.text }}>{deleteConfirm.metric_label}</b> — {deleteConfirm.start_value} → {deleteConfirm.target_value}{deleteConfirm.unit}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: F }}>Cancel</button>
              <button onClick={deleteGoal} style={{ background: 'transparent', border: `1px solid ${t.danger}`, borderRadius: '6px', color: t.danger, padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{editGoal ? 'Edit Goal' : 'New Goal'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>KPI</div>
                <select value={form.metric_id} onChange={e => {
                  const m = DEFAULT_METRICS.find(x => x.id === e.target.value)
                  setForm(p => ({ ...p, metric_id: e.target.value, metric_label: m?.label || e.target.value, unit: m?.unit || '' }))
                }} style={inp}>
                  {DEFAULT_METRICS.map(m => <option key={m.id} value={m.id}>{m.label} {m.unit ? `(${m.unit})` : ''}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>CURRENT VALUE</div>
                  <input type="number" step="0.1" placeholder="e.g. 80" value={form.start_value} onChange={e => setForm(p => ({ ...p, start_value: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>TARGET VALUE</div>
                  <input type="number" step="0.1" placeholder="e.g. 95" value={form.target_value} onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))} style={inp} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>START DATE</div>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>TARGET DATE</div>
                  <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} style={inp} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>NOTES</div>
                <textarea placeholder="Goal description or coaching notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ ...inp, minHeight: '60px', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'space-between' }}>
              <div>
                {editGoal && <button onClick={() => { setDeleteConfirm(editGoal); setShowModal(false) }}
                  style={{ background: 'transparent', border: `1px solid ${t.danger}`, borderRadius: '6px', color: t.danger, padding: '8px 14px', cursor: 'pointer', fontSize: '12px', fontFamily: F }}>Delete</button>}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: F }}>Cancel</button>
                <button onClick={saveGoal} disabled={saving || !form.target_value || !form.end_date || !form.start_value}
                  style={{ background: (!form.target_value || !form.end_date || !form.start_value) ? t.navActive : t.accent, border: 'none', borderRadius: '6px', color: t.text, padding: '8px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: F }}>
                  {saving ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.accent, marginBottom: '3px', fontWeight: 600 }}>PERFORMANCE</div>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>Goals & Milestones</div>
        </div>
        <button onClick={openNew}
          style={{ background: 'transparent', border: `1px solid ${t.accent}`, borderRadius: '8px', color: t.accent, padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
          + New Goal
        </button>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '14px', color: t.textMuted, marginBottom: '16px' }}>No goals defined yet.</div>
          <button onClick={openNew}
            style={{ background: t.accent, border: 'none', borderRadius: '8px', color: t.text, padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
            Set First Goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {goals.map(goal => {
            const status = getStatus(goal)
            const totalDiff = parseFloat(goal.target_value) - parseFloat(goal.start_value)
            const endDate = new Date(goal.end_date)
            const today = new Date()
            const daysLeft = Math.max(0, Math.round((endDate - today) / 86400000))
            const progressPct = Math.min(100, Math.max(0, ((today - new Date(goal.start_date)) / (endDate - new Date(goal.start_date))) * 100))

            return (
              <div key={goal.id} style={card}>
                {/* Goal header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>{goal.metric_label}</div>
                    <div style={{ fontSize: '13px', color: t.textMuted }}>
                      {goal.start_value}{goal.unit} → <span style={{ color: t.text, fontWeight: 700 }}>{goal.target_value}{goal.unit}</span>
                      <span style={{ marginLeft: '8px', color: totalDiff > 0 ? '#52E8A0' : '#f87171' }}>
                        {totalDiff > 0 ? '+' : ''}{totalDiff.toFixed(1)}{goal.unit}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: status.color,
                        background: status.color + '20', padding: '4px 10px', borderRadius: '20px', border: `1px solid ${status.color}40` }}>
                        {status.label}
                        {status.diff !== undefined && Math.abs(status.diff) > 0.1 && (
                          <span style={{ marginLeft: '4px', opacity: 0.8 }}>
                            {status.diff > 0 ? '+' : ''}{status.diff.toFixed(1)}{goal.unit}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '4px', textAlign: 'center' }}>
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Deadline passed'}
                      </div>
                    </div>
                    <button onClick={() => openEdit(goal)}
                      style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: F }}>
                      Edit
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', color: t.textMuted, letterSpacing: '1px', fontWeight: 600 }}>TIME ELAPSED</span>
                    <span style={{ fontSize: '10px', color: t.textMuted }}>{goal.start_date} → {goal.end_date}</span>
                  </div>
                  <div style={{ height: '4px', background: t.border, borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: t.accent, borderRadius: '2px', transition: 'width 0.3s' }} />
                  </div>
                </div>

                {/* Chart */}
                <GoalChart entries={entries} goal={goal} theme={theme} t={t} />

                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: t.textMuted }}>
                    <div style={{ width: '24px', height: '2px', background: 'rgba(255,255,255,0.3)', borderTop: '2px dashed rgba(255,255,255,0.3)' }}></div>
                    Expected progression
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: t.textMuted }}>
                    <div style={{ width: '24px', height: '2px', background: t.accent }}></div>
                    Actual
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#52E8A0' }}>
                    <div style={{ width: '12px', height: '12px', background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: '2px' }}></div>
                    Ahead of target
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#f87171' }}>
                    <div style={{ width: '12px', height: '12px', background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: '2px' }}></div>
                    Behind target
                  </div>
                </div>

                {goal.notes && (
                  <div style={{ marginTop: '12px', padding: '10px 12px', background: t.bg, borderRadius: '6px', fontSize: '12px', color: t.textMuted, borderLeft: `3px solid ${t.border}` }}>
                    {goal.notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
