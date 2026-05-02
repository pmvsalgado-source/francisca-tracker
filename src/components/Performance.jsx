import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronRight, CalendarDays } from 'lucide-react'
import { getEntries, saveEntries } from '../services/dashboardService'
import {
  activeFocus as defaultFocus,
  getFocusCompliance,
  getFocusAnalysis,
  getFocusMetricOptions,
  getDriverDisplay,
} from '../lib/focusProgress'

const F = "'Inter', system-ui, -apple-system, sans-serif"

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function fmtShortDate(d) {
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]}`
}
function formatDate(d) {
  if (!d) return 'Sem registo'
  const dt = new Date(d + 'T12:00:00')
  return `${dt.getDate()} ${MONTHS_PT[dt.getMonth()]} ${dt.getFullYear()}`
}

function daysUntilNextCheck(lastDate) {
  if (!lastDate) return 0
  const next = new Date(lastDate + 'T12:00:00')
  next.setDate(next.getDate() + 7)
  return Math.max(0, Math.ceil((next - new Date()) / 86400000))
}

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>{label}</div>
      {children}
    </label>
  )
}

const OVR = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.42)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '20px',
}
const modalBase = {
  background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px',
  width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto', fontFamily: F,
}

function FocusGoalChart({ entries, focus, onEdit }) {
  const canvasRef = useRef(null)
  const focusEntries = useMemo(() => entries
    .filter(e => e.metric_id === focus.metric && e.value && e.entry_date)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  , [entries, focus.metric])
  const startDate = useMemo(() => {
    const first = focusEntries[0]?.entry_date || focus.startDate
    return new Date(first + 'T12:00:00')
  }, [focus.startDate, focusEntries])
  const endDate = useMemo(() => {
    const sorted = (focus.milestones || []).slice().sort((a, b) => a.targetDate.localeCompare(b.targetDate))
    const last = sorted[sorted.length - 1]
    return last ? new Date(last.targetDate + 'T12:00:00') : new Date(startDate.getTime() + 180 * 86400000)
  }, [focus.milestones, startDate])
  const startVal = Number(focus.startValue ?? focus.currentValue)
  const targetVal = Number(focus.targetValue)
  const totalMs = endDate - startDate || 1
  const pts = useMemo(() => focusEntries
    .filter(e => new Date(e.entry_date + 'T12:00:00') >= startDate)
    .map(e => ({ date: new Date(e.entry_date + 'T12:00:00'), value: Number(e.value) }))
  , [focusEntries, startDate])

  const latest = pts[pts.length - 1]
  const latestRatio = latest ? (latest.date - startDate) / totalMs : 0
  const expectedLatest = latest ? startVal + (targetVal - startVal) * latestRatio : startVal
  const delta = latest ? latest.value - expectedLatest : 0
  const isBehind = latest ? delta < 0 : false
  const todayRatio = Math.min(1, Math.max(0, (new Date() - startDate) / totalMs))
  const daysLeft = Math.max(0, Math.ceil((endDate - new Date()) / 86400000))
  const title = focus.metric === 'swing_speed' ? 'Swing Speed' : focus.name

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !focus) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const pad = { t: 34, r: 32, b: 44, l: 74 }
    const cw = W - pad.l - pad.r
    const ch = H - pad.t - pad.b
    const allVals = [startVal, targetVal, ...pts.map(p => p.value)]
    const minV = Math.min(...allVals) * 0.96
    const maxV = Math.max(...allVals) * 1.04
    const range = maxV - minV || 1
    const xOfRatio = r => pad.l + Math.min(1, Math.max(0, r)) * cw
    const xOfDate = date => xOfRatio((date - startDate) / totalMs)
    const yOf = value => pad.t + ch - ((value - minV) / range) * ch

    for (let i = 0; i <= 4; i += 1) {
      const v = minV + (range * i / 4)
      const y = yOf(v)
      ctx.strokeStyle = '#DCE5F4'
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.moveTo(pad.l, y)
      ctx.lineTo(pad.l + cw, y)
      ctx.stroke()
      ctx.fillStyle = '#2F58B8'
      ctx.font = '12px Inter,system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(`${v.toFixed(1)}${focus.unit}`, pad.l - 8, y + 4)
    }

    const milestones = []
    let d = new Date(startDate)
    d.setMonth(d.getMonth() + 1)
    while (d < endDate) {
      const ratio = (d - startDate) / totalMs
      milestones.push({ date: new Date(d), ratio, value: startVal + (targetVal - startVal) * ratio })
      d = new Date(d)
      d.setMonth(d.getMonth() + 1)
    }

    const xLabels = [
      { ratio: 0, label: fmtShortDate(startDate) },
      ...milestones.map(m => ({ ratio: m.ratio, label: fmtShortDate(m.date) })),
      { ratio: 1, label: fmtShortDate(endDate) },
    ]
    xLabels.forEach(({ ratio, label }) => {
      const x = xOfRatio(ratio)
      ctx.strokeStyle = '#DCE5F4'
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.moveTo(x, pad.t)
      ctx.lineTo(x, pad.t + ch)
      ctx.stroke()
      ctx.fillStyle = '#2F58B8'
      ctx.font = '12px Inter,system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(label, x, pad.t + ch + 24)
    })

    ctx.beginPath()
    ctx.moveTo(xOfRatio(0), yOf(startVal))
    ctx.lineTo(xOfRatio(1), yOf(targetVal))
    ctx.strokeStyle = '#C9CDD3'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 6])
    ctx.stroke()
    ctx.setLineDash([])

    milestones.forEach(m => {
      const x = xOfRatio(m.ratio)
      const y = yOf(m.value)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#9CA3AF'
      ctx.fill()
      ctx.fillStyle = '#2F58B8'
      ctx.font = '12px Inter,system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(`${m.value.toFixed(1)}${focus.unit}`, x, y - 12)
    })

    if (!pts.length) {
      ctx.fillStyle = '#64748B'
      ctx.font = '13px Inter,system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Sem dados', W / 2, H / 2)
      return
    }

    pts.forEach((pt, i) => {
      if (i === 0) return
      const prev = pts[i - 1]
      const prevRatio = (prev.date - startDate) / totalMs
      const ratio = (pt.date - startDate) / totalMs
      const prevExpected = startVal + (targetVal - startVal) * prevRatio
      const expected = startVal + (targetVal - startVal) * ratio
      ctx.beginPath()
      ctx.moveTo(xOfDate(prev.date), yOf(prev.value))
      ctx.lineTo(xOfDate(pt.date), yOf(pt.value))
      ctx.lineTo(xOfDate(pt.date), yOf(expected))
      ctx.lineTo(xOfDate(prev.date), yOf(prevExpected))
      ctx.closePath()
      ctx.fillStyle = pt.value >= expected ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)'
      ctx.fill()
    })

    ctx.beginPath()
    pts.forEach((pt, i) => {
      const x = xOfDate(pt.date)
      const y = yOf(pt.value)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#2563EB'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.stroke()

    pts.forEach((pt, i) => {
      const ratio = (pt.date - startDate) / totalMs
      const expected = startVal + (targetVal - startVal) * ratio
      const x = xOfDate(pt.date)
      const y = yOf(pt.value)
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = pt.value >= expected ? '#4ADE80' : '#F87171'
      ctx.fill()
      if (i === pts.length - 1) {
        ctx.fillStyle = '#0F172A'
        ctx.font = 'bold 13px Inter,system-ui'
        ctx.textAlign = 'center'
        ctx.fillText(`${pt.value}${focus.unit}`, x, y - 12)
      }
    })

    ctx.fillStyle = '#2F58B8'
    ctx.font = 'bold 13px Inter,system-ui'
    ctx.textAlign = 'left'
    ctx.fillText(`Target: ${targetVal}${focus.unit}`, xOfRatio(1) - 102, yOf(targetVal) - 10)
  }, [focus, pts, startDate, endDate, startVal, targetVal, totalMs])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>{title}</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', fontSize: '16px', color: '#3158B9' }}>
            <span>{startVal}{focus.unit} → <strong style={{ color: '#0F172A' }}>{targetVal}{focus.unit}</strong></span>
            <span style={{ color: '#22C55E' }}>+{(targetVal - startVal).toFixed(1)}{focus.unit}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'grid', justifyItems: 'end', gap: '4px' }}>
          {latest && (
            <div style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${isBehind ? '#FECACA' : '#BBF7D0'}`, background: isBehind ? '#FEF2F2' : '#F0FDF4', color: isBehind ? '#F87171' : '#16A34A', borderRadius: '999px', padding: '6px 13px', fontSize: '14px', fontWeight: 850 }}>
              {isBehind ? 'Behind' : 'Ahead'} {delta >= 0 ? '+' : ''}{delta.toFixed(1)}{focus.unit}
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#3158B9', fontWeight: 650 }}>{daysLeft}d left</div>
          <button onClick={onEdit} style={{ marginTop: '-28px', marginLeft: '116px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#3158B9', borderRadius: '8px', padding: '8px 16px', fontFamily: F, fontSize: '13px', cursor: 'pointer' }}>Edit</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', letterSpacing: '2.6px', fontWeight: 800, color: '#3158B9' }}>TIME ELAPSED</div>
        <div style={{ fontSize: '12px', color: '#3158B9', fontWeight: 650 }}>{formatDate(focus.startDate)} → {formatDate(endDate.toISOString().split('T')[0])}</div>
      </div>
      <div style={{ height: '5px', background: '#D7E2F4', borderRadius: '999px', overflow: 'hidden', marginBottom: '64px' }}>
        <div style={{ width: `${todayRatio * 100}%`, height: '100%', background: '#2F86E8', borderRadius: '999px' }} />
      </div>

      <canvas ref={canvasRef} style={{ width: '100%', height: '280px', display: 'block' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '22px', color: '#3158B9', fontSize: '13px', flexWrap: 'wrap' }}>
        <span>Expected progression</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '30px', height: '2px', background: '#2563EB', display: 'inline-block' }} />Actual</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#22C55E' }}><span style={{ width: '14px', height: '14px', border: '1px solid #86EFAC', background: '#DCFCE7', borderRadius: '3px', display: 'inline-block' }} />Ahead of target</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#F87171' }}><span style={{ width: '14px', height: '14px', border: '1px solid #FCA5A5', background: '#FEE2E2', borderRadius: '3px', display: 'inline-block' }} />Behind target</span>
      </div>
    </div>
  )
}

// ─── EditFocusModal ─────────────────────────────────────────────────────────────
function EditFocusModal({ focus, onSave, onClose, inp, primary, secondary }) {
  const [d, setD] = useState({
    name: focus.name, metric: focus.metric,
    startValue: String(focus.startValue ?? focus.currentValue),
    currentValue: String(focus.currentValue),
    targetValue: String(focus.targetValue),
    unit: focus.unit, startDate: focus.startDate, objective: focus.objective || '',
  })
  const [err, setErr] = useState('')
  const set = (k, v) => setD(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!d.name.trim() || !d.metric.trim() || !d.unit.trim() || !d.startDate) { setErr('Preenche todos os campos.'); return }
    const sv = Number(d.startValue), cv = Number(d.currentValue), tv = Number(d.targetValue)
    if (isNaN(sv) || isNaN(tv) || sv >= tv) { setErr('Valor objetivo deve ser maior que valor de partida.'); return }
    onSave({ ...focus, ...d, startValue: sv, currentValue: cv, targetValue: tv })
  }

  return (
    <div style={OVR}>
      <div style={{ ...modalBase, maxWidth: '480px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '20px' }}>Alterar foco</div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <Field label="Nome do foco"><input value={d.name} onChange={e => set('name', e.target.value)} style={inp} /></Field>
          <Field label="Métrica principal (id)"><input value={d.metric} onChange={e => set('metric', e.target.value)} style={inp} placeholder="ex: swing_speed" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <Field label="Partida"><input type="number" value={d.startValue}   onChange={e => set('startValue',   e.target.value)} style={inp} /></Field>
            <Field label="Atual">  <input type="number" value={d.currentValue} onChange={e => set('currentValue', e.target.value)} style={inp} /></Field>
            <Field label="Objetivo"><input type="number" value={d.targetValue} onChange={e => set('targetValue',  e.target.value)} style={inp} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Unidade"><input value={d.unit} onChange={e => set('unit', e.target.value)} style={inp} placeholder="mph, m, kg…" /></Field>
            <Field label="Data de início"><input type="date" value={d.startDate} onChange={e => set('startDate', e.target.value)} style={inp} /></Field>
          </div>
          <Field label="Objetivo (descrição)"><input value={d.objective} onChange={e => set('objective', e.target.value)} style={inp} /></Field>
        </div>
        {err && <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '8px' }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={secondary}>Cancelar</button>
          <button onClick={save} style={primary}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ─── EditTasksModal ─────────────────────────────────────────────────────────────
function EditTasksModal({ tasks, onSave, onClose, inp, primary, secondary }) {
  const [draft, setDraft] = useState(tasks.map(t => ({ ...t })))
  const set = (i, k, v) => setDraft(p => p.map((t, idx) => idx === i ? { ...t, [k]: v } : t))

  return (
    <div style={OVR}>
      <div style={{ ...modalBase, maxWidth: '520px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '20px' }}>Editar tarefas</div>
        <div style={{ display: 'grid', gap: '14px' }}>
          {draft.map((task, i) => (
            <div key={task.id || i} style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginBottom: '10px', letterSpacing: '1px' }}>TAREFA {i + 1}</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <Field label="Nome da tarefa"><input value={task.label} onChange={e => set(i, 'label', e.target.value)} style={inp} /></Field>
                <Field label="Label curto (overview)"><input value={task.shortLabel || ''} onChange={e => set(i, 'shortLabel', e.target.value)} style={inp} placeholder="ex: Velocidade" /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <Field label="Métrica (id)"><input value={task.metric} onChange={e => set(i, 'metric', e.target.value)} style={inp} /></Field>
                  <Field label="Vezes/semana"><input type="number" min="1" max="14" value={task.expectedPerWeek ?? 1} onChange={e => set(i, 'expectedPerWeek', Number(e.target.value))} style={inp} /></Field>
                  <Field label="Unidade"><input value={task.unit || ''} onChange={e => set(i, 'unit', e.target.value)} style={inp} /></Field>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 650 }}>
                  <input type="checkbox" checked={!!task.required} onChange={e => set(i, 'required', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Obrigatória (afeta compliance)
                </label>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={secondary}>Cancelar</button>
          <button onClick={() => onSave(draft)} style={primary}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ─── EditDriversModal ──────────────────────────────────────────────────────────
function EditDriversModal({ drivers, onSave, onClose, inp, primary, secondary }) {
  const [draft, setDraft] = useState(drivers.map(d => ({ ...d })))
  const set = (i, k, v) => setDraft(p => p.map((d, idx) => idx === i ? { ...d, [k]: v } : d))

  const STATUS_OPTIONS = ['Bom', 'Médio', 'Fraco']
  const TREND_OPTIONS  = [{ value: 'up', label: '↑' }, { value: 'flat', label: '→' }, { value: 'down', label: '↓' }]

  return (
    <div style={OVR}>
      <div style={{ ...modalBase, maxWidth: '520px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '20px' }}>Editar drivers</div>
        <div style={{ display: 'grid', gap: '14px' }}>
          {draft.map((drv, i) => (
            <div key={drv.id || i} style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginBottom: '10px', letterSpacing: '1px' }}>DRIVER {i + 1}</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <Field label="Nome"><input value={drv.label} onChange={e => set(i, 'label', e.target.value)} style={inp} /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Field label="Modo">
                    <select value={drv.mode} onChange={e => set(i, 'mode', e.target.value)} style={inp}>
                      <option value="manual">Manual (coach define)</option>
                      <option value="metric">Métrica (calculado)</option>
                    </select>
                  </Field>
                  <Field label="Métrica ligada (id)"><input value={drv.linkedMetric || ''} onChange={e => set(i, 'linkedMetric', e.target.value || null)} style={inp} placeholder="opcional" /></Field>
                </div>
                {drv.mode === 'manual' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Field label="Estado">
                      <select value={drv.status || ''} onChange={e => set(i, 'status', e.target.value)} style={inp}>
                        <option value="">—</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Tendência">
                      <select value={drv.trend || 'flat'} onChange={e => set(i, 'trend', e.target.value)} style={inp}>
                        {TREND_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </Field>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={secondary}>Cancelar</button>
          <button onClick={() => onSave(draft)} style={primary}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ─── MilestonesModal ────────────────────────────────────────────────────────────
function MilestonesModal({ focus, currentValue, onClose, secondary }) {
  const milestones = focus.milestones || []
  return (
    <div style={OVR}>
      <div style={{ ...modalBase, maxWidth: '440px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '20px' }}>Milestones — {focus.name}</div>
        {milestones.length === 0 ? (
          <div style={{ color: '#94A3B8', fontSize: '14px' }}>Sem milestones definidos.</div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {milestones.map((m, i) => {
              const achieved = currentValue >= m.value
              const isNext   = !achieved && milestones.slice(0, i).every(prev => currentValue >= prev.value)
              const color  = achieved ? '#16A34A' : isNext ? '#2563EB' : '#94A3B8'
              const border = achieved ? '#BBF7D0' : isNext ? '#BFDBFE' : '#E2E8F0'
              const bg     = achieved ? '#F0FDF4' : isNext ? '#EFF6FF' : '#F8FAFC'
              const status = achieved ? 'Concluído' : isNext ? 'Em progresso' : 'Por atingir'
              return (
                <div key={i} style={{ border: `1px solid ${border}`, borderRadius: '10px', padding: '14px 16px', background: bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px', color }}>{m.value} {m.unit}</div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{m.label}</div>
                    {m.targetDate && <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Alvo: {formatDate(m.targetDate)}</div>}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color, background: '#fff', borderRadius: '6px', padding: '4px 10px', border: `1px solid ${border}`, flexShrink: 0 }}>{status}</div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={secondary}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Performance (main) ─────────────────────────────────────────────────────────
export default function Performance({ t, user }) {
  const [focus, setFocus] = useState(defaultFocus)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showRegister,    setShowRegister]    = useState(false)
  const [showEditFocus,   setShowEditFocus]   = useState(false)
  const [showEditTasks,   setShowEditTasks]   = useState(false)
  const [showEditDrivers, setShowEditDrivers] = useState(false)
  const [showMilestones,  setShowMilestones]  = useState(false)

  const [regForm, setRegForm] = useState({
    metric: defaultFocus.metric,
    date:   new Date().toISOString().split('T')[0],
    value:  '',
    unit:   defaultFocus.unit,
    notes:  '',
  })

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try { setEntries((await getEntries()) || []) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchEntries() }, [fetchEntries])

  // ── Derived ───────────────────────────────────────────────────────────────
  const focusPoints = useMemo(() =>
    entries.filter(e => e.metric_id === focus.metric && e.value && e.entry_date)
           .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  , [entries, focus.metric])

  const lastPoint    = focusPoints[focusPoints.length - 1]
  const currentValue = lastPoint ? Number(lastPoint.value) : focus.currentValue

  const twoWeeksAgo  = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 14); return d }, [])
  const previousPoint = focusPoints.filter(p => new Date(p.entry_date + 'T12:00:00') <= twoWeeksAgo).pop() ?? focusPoints[focusPoints.length - 2] ?? null
  const trend = previousPoint != null ? currentValue - Number(previousPoint.value) : null

  const compliance   = useMemo(() => getFocusCompliance(focus, entries), [focus, entries])
  const metricOptions = useMemo(() => getFocusMetricOptions(focus), [focus])

  const startValue    = focus.startValue ?? focus.currentValue
  const progressRange = focus.targetValue - startValue
  const progressPct   = progressRange === 0 ? 0 : Math.min(100, Math.max(0, ((currentValue - startValue) / progressRange) * 100))
  const missing       = Math.max(0, focus.targetValue - currentValue)

  const focusAnalysis = useMemo(() => getFocusAnalysis(focus, compliance, trend), [focus, compliance, trend])

  // ── Save entry ────────────────────────────────────────────────────────────
  const saveValue = async () => {
    if (!regForm.value) return
    setSaving(true)
    const rows = [{
      metric_id: regForm.metric, value: String(regForm.value),
      entry_date: regForm.date, updated_by: user.email, updated_at: new Date().toISOString(),
    }]
    if (regForm.notes) rows.push({
      metric_id: '__notes__', value: regForm.notes,
      entry_date: regForm.date, updated_by: user.email, updated_at: new Date().toISOString(),
    })
    await saveEntries(rows)
    setSaving(false); setShowRegister(false)
    setRegForm(p => ({ ...p, value: '', notes: '' }))
    fetchEntries()
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const card      = { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px' }
  const lbl       = { fontSize: '11px', letterSpacing: '1.6px', fontWeight: 800, color: '#2563EB' }
  const inp       = { width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 12px', fontFamily: F, fontSize: '14px', color: '#0F172A', background: '#FFFFFF', boxSizing: 'border-box' }
  const primary   = { border: 'none', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', padding: '10px 16px', fontFamily: F, fontSize: '13px', fontWeight: 800, cursor: 'pointer' }
  const secondary = { border: '1px solid #BFDBFE', borderRadius: '8px', background: '#FFFFFF', color: '#2563EB', padding: '10px 16px', fontFamily: F, fontSize: '13px', fontWeight: 800, cursor: 'pointer' }
  const smallBtn  = { border: '1px solid #E2E8F0', borderRadius: '6px', background: 'transparent', color: '#64748B', padding: '5px 10px', fontFamily: F, fontSize: '11px', fontWeight: 700, cursor: 'pointer' }

  if (loading) return <div style={{ color: t.textMuted, padding: '40px' }}>A carregar...</div>

  const tasks   = focus.tasks   || []
  const drivers = focus.drivers || []

  return (
    <div style={{ fontFamily: F, color: '#0F172A' }}>
      <style>{`
        .tp-two    { display:grid; grid-template-columns:1fr 1.2fr; gap:16px; }
        .tp-drivers{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        @media(max-width:800px){ .tp-two,.tp-drivers{ grid-template-columns:1fr; } }
      `}</style>

      {/* ── Modals ── */}
      {showEditFocus && (
        <EditFocusModal focus={focus}
          onSave={u => { setFocus(u); setShowEditFocus(false) }}
          onClose={() => setShowEditFocus(false)}
          inp={inp} primary={primary} secondary={secondary} />
      )}
      {showEditTasks && (
        <EditTasksModal tasks={tasks}
          onSave={u => { setFocus(f => ({ ...f, tasks: u })); setShowEditTasks(false) }}
          onClose={() => setShowEditTasks(false)}
          inp={inp} primary={primary} secondary={secondary} />
      )}
      {showEditDrivers && (
        <EditDriversModal drivers={drivers}
          onSave={u => { setFocus(f => ({ ...f, drivers: u })); setShowEditDrivers(false) }}
          onClose={() => setShowEditDrivers(false)}
          inp={inp} primary={primary} secondary={secondary} />
      )}
      {showMilestones && (
        <MilestonesModal focus={focus} currentValue={currentValue}
          onClose={() => setShowMilestones(false)} secondary={secondary} />
      )}
      {showRegister && (
        <div style={OVR}>
          <div style={{ ...card, width: '100%', maxWidth: '440px', padding: '22px' }}>
            <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '18px' }}>Registar novo valor</div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <Field label="Indicador">
                <select value={regForm.metric}
                  onChange={e => {
                    const m = metricOptions.find(x => x.value === e.target.value)
                    setRegForm(p => ({ ...p, metric: e.target.value, unit: m?.unit || p.unit }))
                  }} style={inp}>
                  {metricOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Data"><input type="date" value={regForm.date} onChange={e => setRegForm(p => ({ ...p, date: e.target.value }))} style={inp} /></Field>
                <Field label="Valor"><input type="number" value={regForm.value} onChange={e => setRegForm(p => ({ ...p, value: e.target.value }))} style={inp} autoFocus /></Field>
              </div>
              <Field label="Unidade"><input value={regForm.unit} onChange={e => setRegForm(p => ({ ...p, unit: e.target.value }))} style={inp} /></Field>
              <Field label="Notas (opcional)"><textarea value={regForm.notes} onChange={e => setRegForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inp, minHeight: '70px', resize: 'vertical' }} /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button onClick={() => setShowRegister(false)} style={secondary}>Cancelar</button>
              <button onClick={saveValue} disabled={saving || !regForm.value} style={{ ...primary, opacity: saving || !regForm.value ? 0.55 : 1 }}>
                {saving ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.accent, marginBottom: '4px', fontWeight: 700 }}>FOCO ATIVO</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: t.text, lineHeight: 1.15 }}>{focus.name}</div>
          <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>Regista valores, acompanha as tarefas da semana e vê a evolução do foco</div>
        </div>
        <button onClick={() => setShowEditFocus(true)} style={secondary}>Alterar foco</button>
      </div>

      {/* ── FOCO ATUAL ── */}
      <div style={{ ...card, padding: '28px 32px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 230px', gap: '24px', alignItems: 'center' }}>
        <div>
          <div style={lbl}>FOCO ATUAL</div>
          <div style={{ fontSize: '27px', fontWeight: 900, marginTop: '10px' }}>{focus.name}</div>
          <div style={{ fontSize: '46px', fontWeight: 950, marginTop: '10px', lineHeight: 1 }}>
            {currentValue} <span style={{ color: '#475569' }}>→</span> {focus.targetValue}{' '}
            <span style={{ fontSize: '21px', fontWeight: 800 }}>{focus.unit}</span>
          </div>
          <div style={{ fontSize: '14px', color: '#334155', marginTop: '12px' }}>Objetivo: {focus.objective}</div>
          <div style={{ marginTop: '24px', height: '9px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: '#2563EB', borderRadius: '999px', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#475569', fontSize: '12px' }}>
            <span>{startValue} {focus.unit}</span>
            <span>Atual: {currentValue} {focus.unit}</span>
            <span>{focus.targetValue} {focus.unit}</span>
          </div>
        </div>
        <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '24px' }}>
          <div style={{ fontSize: '28px', fontWeight: 950, color: '#2563EB' }}>Faltam {missing} {focus.unit}</div>
          <div style={{ marginTop: '22px', display: 'grid', gap: '14px', color: '#334155', fontSize: '13px' }}>
            <div>
              <CalendarDays size={17} strokeWidth={1.8} style={{ verticalAlign: 'middle', marginRight: '7px' }} />
              Último registo<br />
              <strong>{formatDate(lastPoint?.entry_date)}{lastPoint ? ` — ${currentValue} ${focus.unit}` : ''}</strong>
            </div>
            <div>
              <CalendarDays size={17} strokeWidth={1.8} style={{ verticalAlign: 'middle', marginRight: '7px' }} />
              Próximo check<br />
              <strong>Daqui a {daysUntilNextCheck(lastPoint?.entry_date)} dias</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── ESTADO + O QUE FAZER ── */}
      <div className="tp-two" style={{ marginBottom: '16px' }}>

        {/* Estado Atual */}
        <div style={{ ...card, padding: '22px' }}>
          <div style={lbl}>ESTADO ATUAL</div>
          {(() => {
            const MAP = {
              ok:      { text: 'Em dia',   bg: '#F0FDF4', color: '#16A34A' },
              warning: { text: 'Atenção',  bg: '#FFF7ED', color: '#EA580C' },
              overdue: { text: 'Atrasado', bg: '#FEF2F2', color: '#DC2626' },
            }
            const s = compliance.lastLog ? (MAP[compliance.status] ?? MAP.warning) : { text: 'Sem dados', bg: '#F1F5F9', color: '#64748B' }
            return <div style={{ display: 'inline-flex', background: s.bg, color: s.color, borderRadius: '8px', padding: '10px 14px', fontWeight: 800, marginTop: '18px', fontSize: '14px' }}>{s.text}</div>
          })()}
          <div style={{ marginTop: '22px', color: '#64748B', fontSize: '13px' }}>Tendência</div>
          {trend != null ? (
            <>
              <div style={{ fontSize: '25px', fontWeight: 900, color: trend < 0 ? '#EF4444' : '#16A34A', marginTop: '5px' }}>
                {trend > 0 ? '+' : ''}{Math.round(trend)} {focus.unit}
              </div>
              <div style={{ color: '#64748B', fontSize: '12px' }}>nas últimas 2 semanas</div>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '5px' }}>Ainda sem dados suficientes</div>
          )}
        </div>

        {/* O que Fazer */}
        <div style={{ ...card, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={lbl}>O QUE FAZER</div>
            <button onClick={() => setShowEditTasks(true)} style={smallBtn}>Editar tarefas</button>
          </div>
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            {tasks.map((task, i) => {
              const ts = compliance.tasks[task.id]
              if (!ts) return null
              const isOptional = !task.required
              return (
                <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '26px 1fr auto', alignItems: 'center', gap: '10px', color: isOptional ? '#94A3B8' : '#334155', fontSize: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: ts.complete ? '#DCFCE7' : '#F1F5F9', color: ts.complete ? '#16A34A' : '#64748B', fontWeight: 900, fontSize: '12px' }}>
                    {ts.complete ? <Check size={15} /> : i + 1}
                  </div>
                  <div>
                    {task.label}
                    {isOptional && <span style={{ fontSize: '11px', color: '#CBD5E1', marginLeft: '6px' }}>opcional</span>}
                  </div>
                  <div style={{ color: ts.complete ? '#16A34A' : isOptional ? '#CBD5E1' : '#64748B', fontWeight: 900 }}>
                    {Math.min(ts.done, ts.expected)}/{ts.expected}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowRegister(true)} style={primary}>Registar novo valor</button>
            <button onClick={() => document.getElementById('focus-evolution')?.scrollIntoView({ behavior: 'smooth' })} style={secondary}>Ver evolução</button>
          </div>
        </div>
      </div>

      {/* ── DRIVERS ── */}
      {drivers.length > 0 && (
        <div style={{ ...card, padding: '22px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={lbl}>DRIVERS DO OBJETIVO</div>
            <button onClick={() => setShowEditDrivers(true)} style={smallBtn}>Editar drivers</button>
          </div>
          <div className="tp-drivers">
            {drivers.map(driver => {
              const disp = getDriverDisplay(driver, entries)
              return (
                <div key={driver.id} style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>{driver.label}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '13px' }}>
                    <span style={{ color: disp.color, fontWeight: 900 }}>{disp.value}</span>
                    <span style={{ color: disp.color, fontSize: '20px', lineHeight: 1 }}>{disp.arrow}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── EVOLUÇÃO ── */}
      <div id="focus-evolution" style={{ ...card, padding: '24px', marginBottom: '22px' }}>
        <FocusGoalChart entries={entries} focus={focus} onEdit={() => setShowEditFocus(true)} />
        <div style={{ marginTop: '12px', background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: '10px', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', color: '#0F172A' }}>
          <div style={{ fontSize: '14px', lineHeight: 1.45 }}>{focusAnalysis}</div>
          <button onClick={() => setShowMilestones(true)} style={{ border: 'none', background: 'transparent', color: '#2563EB', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontFamily: F }}>
            Ver milestones <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
