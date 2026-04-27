import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Goals from './Goals'
import HcpWagr from './HcpWagr'

const DEFAULT_METRICS = [
  { id: 'swing_speed', label: 'Velocidade de Swing', unit: 'mph', category: 'golfe', target: 95 },
  { id: 'smash_factor', label: 'Smash Factor', unit: '', category: 'golfe', target: 1.48 },
  { id: 'carry', label: 'Carry Médio Driver', unit: 'm', category: 'golfe', target: null },
  { id: 'stack_speed', label: 'The Stack', unit: 'mph', category: 'golfe', target: null },
  { id: 'deadlift', label: 'Trap Bar Deadlift', unit: 'kg', category: 'ginasio', target: null },
  { id: 'medball', label: 'Medicine Ball Throw', unit: 'm', category: 'ginasio', target: null },
  { id: 'thoracic', label: 'Mobilidade Torácica', unit: '°', category: 'ginasio', target: null },
]

function SparkChart({ data, metricId, unit, target, theme, t }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)
    const pts = data.filter(d => d.metric_id === metricId && d.value && !isNaN(parseFloat(d.value)) && d.entry_date)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    if (!pts.length) {
      ctx.fillStyle = t.textMuted; ctx.font = '12px Inter,system-ui'; ctx.textAlign = 'center'
      ctx.fillText('Sem dados ainda', W / 2, H / 2); return
    }
    const vals = pts.map(d => parseFloat(d.value))
    const allVals = target ? [...vals, target] : vals
    const minV = Math.min(...allVals) * 0.97, maxV = Math.max(...allVals) * 1.03
    const range = maxV - minV || 1
    const pad = { t: 28, r: 20, b: 48, l: 56 }
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b
    const xOf = i => pad.l + (pts.length > 1 ? (i / (pts.length - 1)) * cw : cw / 2)
    const yOf = v => pad.t + ch - ((v - minV) / range) * ch
    for (let i = 0; i <= 4; i++) {
      const v = minV + (range * i / 4), y = yOf(v)
      ctx.strokeStyle = t.border; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke()
      ctx.fillStyle = t.textMuted; ctx.font = '10px Inter,system-ui'; ctx.textAlign = 'right'
      ctx.fillText(v.toFixed(1) + (unit || ''), pad.l - 6, y + 4)
    }
    if (target) {
      const y = yOf(target)
      ctx.strokeStyle = '#52E8A0'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4])
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#52E8A0'; ctx.font = 'bold 10px Inter,system-ui'; ctx.textAlign = 'left'
      ctx.fillText('Objectivo: ' + target + (unit || ''), pad.l + 4, y - 5)
    }
    pts.forEach((d, i) => {
      const x = xOf(i)
      const lbl = new Date(d.entry_date + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
      ctx.fillStyle = t.textMuted; ctx.font = '10px Inter,system-ui'; ctx.textAlign = 'center'
      ctx.fillText(lbl, x, pad.t + ch + 18)
    })
    ctx.beginPath()
    pts.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(parseFloat(d.value))) : ctx.lineTo(xOf(i), yOf(parseFloat(d.value))) })
    ctx.lineTo(xOf(pts.length - 1), pad.t + ch); ctx.lineTo(xOf(0), pad.t + ch); ctx.closePath()
    ctx.fillStyle = 'rgba(61,107,255,0.08)'; ctx.fill()
    ctx.beginPath()
    pts.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(parseFloat(d.value))) : ctx.lineTo(xOf(i), yOf(parseFloat(d.value))) })
    ctx.strokeStyle = t.accent; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke()
    pts.forEach((d, i) => {
      const x = xOf(i), y = yOf(parseFloat(d.value))
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = t.accent; ctx.fill()
      ctx.fillStyle = t.accentLight; ctx.font = 'bold 10px Inter,system-ui'; ctx.textAlign = 'center'
      ctx.fillText(d.value + (unit || ''), x, y - 10)
    })
  }, [data, metricId, theme, unit, target, t])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '220px', display: 'block' }} />
}

export default function Performance({ theme, t, user, lang = 'en', initialTab = 'focus' }) {
  // Normalise: evolution tab no longer exists as separate — map it to focus
  const [subTab, setSubTab] = useState(initialTab === 'evolution' ? 'focus' : initialTab)
  const [entries, setEntries] = useState([])
  const [metrics, setMetrics] = useState(DEFAULT_METRICS)
  const [loading, setLoading] = useState(true)
  const [chartMetric, setChartMetric] = useState('swing_speed')
  const [chartView, setChartView] = useState('chart')
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], values: {}, notes: '' })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [newMetric, setNewMetric] = useState({ label: '', unit: '', category: 'golfe', target: '' })
  const [savingKpis, setSavingKpis] = useState(false)
  const [kpiMsg, setKpiMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const [trainingPlans, setTrainingPlans] = useState([])
  const [goalsError, setGoalsError] = useState(false)

  const F = "'Inter', system-ui, sans-serif"
  const card = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px 22px' }
  const inp = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, padding: '7px 10px', fontSize: '13px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const btn = (active) => ({
    background: active ? t.text : 'transparent',
    border: `1px solid ${active ? t.text : t.border}`,
    borderRadius: '20px', color: active ? t.bg : t.textMuted,
    padding: '6px 18px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 700, letterSpacing: '1px',
  })

  const fetchMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('metrics').select('*').order('sort_order', { ascending: true })
      if (!error && data && data.length > 0) {
        setMetrics(data.map(m => ({ id: m.metric_id, label: m.label, unit: m.unit || '', category: m.category || 'golfe', target: m.target ? parseFloat(m.target) : null, active: m.active !== false })))
      }
    } catch (_) {}
  }, [])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('entries').select('*').order('entry_date', { ascending: true })
      if (error) throw error
      setEntries(data || [])
    } catch (e) {
      console.error('Erro ao carregar registos:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMetrics(); fetchEntries() }, [fetchMetrics, fetchEntries])

  useEffect(() => {
    supabase.from('training_plans').select('*').order('week_start', { ascending: false }).limit(8)
      .then(({ data }) => setTrainingPlans(data || []))
  }, [])

  const saveEntry = async () => {
    setSaving(true); setSaveError('')
    try {
      const rows = Object.entries(form.values)
        .filter(([, v]) => v !== '' && v !== undefined)
        .map(([metric_id, value]) => ({ metric_id, value: String(value), entry_date: form.date, updated_by: user.email, updated_at: new Date().toISOString() }))
      if (form.notes) rows.push({ metric_id: '__notes__', value: form.notes, entry_date: form.date, updated_by: user.email, updated_at: new Date().toISOString() })
      if (!rows.length) { setSaving(false); setSaveError('Nenhum valor introduzido.'); return }
      const { error } = await supabase.from('entries').upsert(rows, { onConflict: 'entry_date,metric_id' })
      if (error) throw error
      setSavedMsg('Guardado ✓'); setTimeout(() => setSavedMsg(''), 3000)
      setForm(p => ({ ...p, values: {}, notes: '' }))
      fetchEntries()
    } catch (e) {
      setSaveError('Erro ao guardar: ' + (e.message || 'tente novamente'))
    }
    setSaving(false)
  }

  const doDelete = async (date) => {
    try {
      const ids = dateMap[date] ? Object.values(dateMap[date]).map(e => e.id).filter(Boolean) : []
      const noteEntry = entries.find(e => e.entry_date === date && e.metric_id === '__notes__')
      if (noteEntry) ids.push(noteEntry.id)
      for (const id of ids) await supabase.from('entries').delete().eq('id', id)
    } catch (e) {
      console.error('Erro ao apagar:', e)
    }
    setDeleteConfirm(null); fetchEntries()
  }

  const saveKpis = async () => {
    setSavingKpis(true); setKpiMsg('')
    try {
      const metricsData = metrics.map((m, i) => ({
        metric_id: m.id, label: m.label, unit: m.unit || '',
        category: m.category || 'golfe', target: m.target || null,
        sort_order: i, created_by: user.email, active: m.active !== false,
      }))
      const { error } = await supabase.rpc('save_metrics', { metrics_data: metricsData })
      if (error) throw error
      setKpiMsg('Prioridades guardadas ✓')
    } catch (e) {
      const msg = e?.message || ''
      if (msg.includes('function') || msg.includes('does not exist')) {
        // Fallback: upsert individually
        try {
          for (const m of metrics) {
            await supabase.from('metrics').upsert({
              metric_id: m.id, label: m.label, unit: m.unit || '',
              category: m.category || 'golfe', target: m.target || null,
              active: m.active !== false, created_by: user.email,
            }, { onConflict: 'metric_id' })
          }
          setKpiMsg('Prioridades guardadas ✓')
        } catch (e2) {
          setKpiMsg('Erro ao guardar: ' + (e2.message || 'tente novamente'))
        }
      } else {
        setKpiMsg('Erro: ' + msg)
      }
    }
    setSavingKpis(false)
    setTimeout(() => setKpiMsg(''), 5000)
  }

  const dateMap = {}
  entries.forEach(e => { if (!e.entry_date) return; if (!dateMap[e.entry_date]) dateMap[e.entry_date] = {}; dateMap[e.entry_date][e.metric_id] = { value: e.value, id: e.id } })
  const sortedDates = Object.keys(dateMap).sort().reverse()

  const swingPts = entries.filter(e => e.metric_id === 'swing_speed' && e.value).sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  const lastSwing = swingPts.length ? parseFloat(swingPts[swingPts.length - 1].value) : null
  const bestSwing = swingPts.length ? Math.max(...swingPts.map(e => parseFloat(e.value))) : null
  const swingTarget = metrics.find(m => m.id === 'swing_speed')?.target || 95
  const pct = lastSwing ? Math.min(100, Math.round((lastSwing / swingTarget) * 100)) : 0
  const delta = swingPts.length > 1 ? (parseFloat(swingPts[swingPts.length - 1].value) - parseFloat(swingPts[swingPts.length - 2].value)).toFixed(1) : null

  // Training context
  const nextTraining = (() => {
    for (let offset = 0; offset <= 14; offset++) {
      const d = new Date(); d.setDate(d.getDate() + offset)
      const dow = d.getDay(); const dayIdx = dow === 0 ? 6 : dow - 1
      const monday = new Date(d); monday.setDate(d.getDate() - dayIdx); monday.setHours(12, 0, 0, 0)
      const ws = monday.toISOString().split('T')[0]
      const plan = trainingPlans.find(p => p.week_start === ws)
      if (plan?.days?.[dayIdx]?.sessions?.some(s => !s.isRest)) {
        return { offset, dayIdx }
      }
    }
    return null
  })()

  const daysSinceLastEntry = (() => {
    const last = entries.filter(e => e.entry_date && e.metric_id !== '__notes__')
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0]
    if (!last) return null
    return Math.floor((new Date() - new Date(last.entry_date + 'T12:00:00')) / 86400000)
  })()

  const subTabs = [
    [lang === 'pt' ? 'Prioridades' : 'Priorities', 'focus'],
    ['HCP & WAGR', 'hcpwagr'],
    [lang === 'pt' ? 'Registar' : 'Register', 'register'],
    [lang === 'pt' ? 'Editar KPIs' : 'Edit KPIs', 'kpis'],
  ]

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .perf-ctx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        @media(max-width:480px){.perf-ctx-grid{grid-template-columns:1fr}}
      `}</style>

      {/* Delete modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px 32px', maxWidth: '380px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: t.text, marginBottom: '8px' }}>Apagar este registo?</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
              Todos os dados de <b style={{ color: t.text }}>{new Date(deleteConfirm + 'T12:00:00').toLocaleDateString('pt-PT')}</b> serão eliminados permanentemente.
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={btn(false)}>Cancelar</button>
              <button onClick={() => doDelete(deleteConfirm)} style={{ background: t.danger, border: 'none', borderRadius: '6px', color: '#fff', padding: '8px 20px', fontFamily: F, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.accent, fontWeight: 700, marginBottom: '3px' }}>PERFORMANCE</div>
        <div style={{ fontSize: '11px', color: t.textMuted }}>{lang === 'pt' ? 'Evolução, métricas e objetivos' : 'Evolution, metrics and goals'}</div>
      </div>

      {/* Sub-nav (compact pills) */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '22px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: `1px solid ${t.border}` }}>
        {subTabs.map(([lbl, key]) => (
          <button key={key} onClick={() => setSubTab(key)}
            style={{ padding: '5px 14px', borderRadius: '20px', border: `1px solid ${subTab === key ? t.accent : t.border}`,
              background: subTab === key ? t.accent + '18' : 'transparent', color: subTab === key ? t.accent : t.textMuted,
              cursor: 'pointer', fontSize: '11px', fontWeight: subTab === key ? 700 : 500, fontFamily: F, whiteSpace: 'nowrap' }}>
            {lbl}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: i === 1 ? '120px' : '72px', borderRadius: '12px', background: t.surface, border: `1px solid ${t.border}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent 0%, ${t.border} 50%, transparent 100%)`, animation: 'shimmer 1.4s infinite', backgroundSize: '200% 100%' }} />
            </div>
          ))}
          <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        </div>
      )}

      {/* ── PRIORIDADES (Focus + Evolution merged) ── */}
      {!loading && subTab === 'focus' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* KPI Strip */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {metrics.filter(m => m.id !== '__notes__').map(m => {
              const last = entries.filter(e => e.metric_id === m.id && e.value).sort((a,b) => b.entry_date.localeCompare(a.entry_date))[0]
              const prev = entries.filter(e => e.metric_id === m.id && e.value).sort((a,b) => b.entry_date.localeCompare(a.entry_date))[1]
              const delta = last && prev ? (parseFloat(last.value) - parseFloat(prev.value)) : null
              const pctOfTarget = last && m.target ? Math.min(100, Math.round((parseFloat(last.value) / m.target) * 100)) : null
              return (
                <div key={m.id} style={{ flex: '1 1 120px', minWidth: '110px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '8px', letterSpacing: '1.5px', color: t.textMuted, fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>{m.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: last ? t.text : t.textFaint, lineHeight: 1 }}>{last ? last.value : '—'}</div>
                    {m.unit && last && <div style={{ fontSize: '10px', color: t.textMuted }}>{m.unit}</div>}
                  </div>
                  {delta !== null && (
                    <div style={{ fontSize: '10px', color: delta >= 0 ? t.success : t.danger, fontWeight: 600, marginTop: '2px' }}>
                      {delta >= 0 ? '+' : ''}{delta.toFixed(1)}{m.unit}
                    </div>
                  )}
                  {pctOfTarget !== null && (
                    <div style={{ marginTop: '5px', height: '2px', background: t.border, borderRadius: '1px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pctOfTarget}%`, background: pctOfTarget >= 100 ? t.success : t.accent, borderRadius: '1px' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Training context banner */}
          <div style={{ ...card, padding: '14px 18px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, fontWeight: 600, marginBottom: '10px' }}>CONTEXTO DE TREINO</div>
            <div className="perf-ctx-grid">
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '1px', color: t.textMuted, marginBottom: '3px', fontWeight: 600 }}>PRÓXIMO TREINO</div>
                {nextTraining !== null ? (
                  <div style={{ fontSize: '15px', fontWeight: 800, color: nextTraining.offset === 0 ? '#52E8A0' : t.text }}>
                    {nextTraining.offset === 0 ? 'Hoje' : nextTraining.offset === 1 ? 'Amanhã' : `+${nextTraining.offset} dias`}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>Sem plano</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '1px', color: t.textMuted, marginBottom: '3px', fontWeight: 600 }}>ÚLTIMO REGISTO</div>
                {daysSinceLastEntry !== null ? (
                  <div style={{ fontSize: '15px', fontWeight: 800, color: daysSinceLastEntry > 7 ? '#f59e0b' : t.text }}>
                    {daysSinceLastEntry === 0 ? 'Hoje' : daysSinceLastEntry === 1 ? 'Ontem' : `${daysSinceLastEntry}d atrás`}
                    {daysSinceLastEntry > 7 && <span style={{ display: 'block', fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>⚠ sem registo recente</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: t.textMuted }}>Sem dados</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '1px', color: t.textMuted, marginBottom: '3px', fontWeight: 600 }}>TENDÊNCIA SWING</div>
                {delta !== null ? (
                  <div style={{ fontSize: '15px', fontWeight: 800, color: parseFloat(delta) >= 0 ? '#52E8A0' : '#f87171' }}>
                    {parseFloat(delta) >= 0 ? '↑' : '↓'} {Math.abs(delta)} mph
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: t.textMuted }}>— mph</div>
                )}
              </div>
            </div>
          </div>

          {/* Main focus card */}
          <div style={{ ...card, background: t.surface, border: '1px solid #378ADD33' }}>
            <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.accent, marginBottom: '6px', fontWeight: 600 }}>OBJECTIVO PRINCIPAL</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', color: t.text }}>Velocidade de Swing</div>
                <div style={{ fontSize: '14px', color: t.textMuted, marginTop: '4px' }}>
                  {lastSwing ? lastSwing.toFixed(1) : '—'} mph → <span style={{ color: '#52E8A0', fontWeight: 700 }}>{swingTarget} mph</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '52px', fontWeight: 900, color: '#378ADD', lineHeight: 1, letterSpacing: '-2px' }}>{pct}%</div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>do objectivo</div>
              </div>
            </div>
            <div style={{ marginTop: '14px', height: '6px', background: t.border, borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${t.accent}, #52E8A0)`, borderRadius: '3px', transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: t.textMuted }}>
              <span>0 mph</span>
              <span style={{ color: lastSwing ? t.accent : t.textMuted }}>{lastSwing ? `Actual: ${lastSwing} mph` : 'Sem dados'}</span>
              <span>{swingTarget} mph</span>
            </div>
          </div>

          {/* KPI summary grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            {metrics.filter(m => m.id !== 'swing_speed' && m.active !== false).map(m => {
              const pts = entries.filter(e => e.metric_id === m.id && e.value).sort((a, b) => a.entry_date.localeCompare(b.entry_date))
              const last = pts.length ? pts[pts.length - 1] : null
              const prev = pts.length > 1 ? pts[pts.length - 2] : null
              const delta = last && prev ? (parseFloat(last.value) - parseFloat(prev.value)).toFixed(1) : null
              const nextRecord = last ? (() => { const d=new Date(last.entry_date+'T12:00:00'); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0] })() : null
              const todayStr = new Date().toISOString().split('T')[0]
              const isOverdue = !!(nextRecord && nextRecord < todayStr)
              return (
                <div key={m.id} style={card}>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>{m.label.toUpperCase()}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: t.text }}>
                    {last ? last.value : '—'}<span style={{ fontSize: '10px', color: t.textMuted, marginLeft: '2px' }}>{m.unit}</span>
                  </div>
                  {delta !== null && (
                    <div style={{ fontSize: '11px', color: parseFloat(delta) >= 0 ? '#52E8A0' : t.danger, marginTop: '2px' }}>
                      {parseFloat(delta) >= 0 ? '+' : ''}{delta} {m.unit}
                    </div>
                  )}
                  {last && (
                    <div style={{ marginTop:'6px', fontSize:'9px', color:isOverdue?t.danger:t.textMuted, fontWeight:isOverdue?700:400, borderTop:`1px solid ${t.border}`, paddingTop:'5px' }}>
                      {isOverdue ? '⚠️ Registo em atraso' : `📅 Próximo: ${new Date(nextRecord+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}`}
                    </div>
                  )}
                  {m.target && last && (() => {
                    const val = parseFloat(last.value)
                    const tgt = parseFloat(m.target)
                    const exceeded = val >= tgt
                    const barPct = Math.min(100, Math.max(0, (val / tgt) * 100))
                    return (
                      <div style={{ marginTop: '6px' }}>
                        <div style={{ height: '3px', background: t.border, borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barPct}%`, background: exceeded ? '#52E8A0' : '#378ADD', borderRadius: '2px', transition: 'width 0.4s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '9px', color: t.textMuted }}>
                          <span style={{ color: exceeded ? '#52E8A0' : t.textMuted }}>{val.toFixed(1)}{m.unit}</span>
                          <span style={{ color: exceeded ? '#52E8A0' : '#378ADD' }}>{exceeded ? '✓ ' : ''}{tgt}{m.unit}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>

          {/* ── EVOLUÇÃO (inline, previously separate tab) ── */}
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, fontWeight: 600, flex: 1 }}>EVOLUÇÃO</div>
              <button onClick={() => setChartView('chart')} style={btn(chartView === 'chart')}>Gráfico</button>
              <button onClick={() => setChartView('table')} style={btn(chartView === 'table')}>Tabela</button>
              {chartView === 'chart' && (
                <select value={chartMetric} onChange={e => setChartMetric(e.target.value)}
                  style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text, padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: F, outline: 'none' }}>
                  {metrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              )}
            </div>
            {chartView === 'chart' && (
              <div style={card}>
                <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, marginBottom: '12px', fontWeight: 600 }}>
                  {metrics.find(m => m.id === chartMetric)?.label?.toUpperCase()} — EVOLUÇÃO
                </div>
                <SparkChart data={entries} metricId={chartMetric} unit={metrics.find(m => m.id === chartMetric)?.unit} target={metrics.find(m => m.id === chartMetric)?.target} theme={theme} t={t} />
              </div>
            )}
            {chartView === 'table' && (
              <div style={{ overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ background: t.surface }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: t.textMuted, fontWeight: 600, fontSize: '10px', letterSpacing: '2px', borderBottom: `1px solid ${t.border}` }}>DATA</th>
                      {metrics.map(m => <th key={m.id} style={{ padding: '10px 8px', textAlign: 'center', color: t.textMuted, fontWeight: 600, fontSize: '10px', letterSpacing: '1px', borderBottom: `1px solid ${t.border}` }}>{m.label.toUpperCase()}</th>)}
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: t.textMuted, fontWeight: 600, fontSize: '10px', borderBottom: `1px solid ${t.border}` }}>NOTAS</th>
                      <th style={{ borderBottom: `1px solid ${t.border}`, width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDates.map(date => (
                      <tr key={date} style={{ borderTop: `1px solid ${t.border}` }}>
                        <td style={{ padding: '10px 14px', color: t.textMuted, whiteSpace: 'nowrap' }}>{new Date(date + 'T12:00:00').toLocaleDateString('pt-PT')}</td>
                        {metrics.map(m => {
                          const entry = dateMap[date]?.[m.id]
                          return <td key={m.id} style={{ padding: '10px 8px', textAlign: 'center', color: entry ? t.accent : t.textMuted, fontWeight: entry ? 700 : 400 }}>{entry ? `${entry.value}${m.unit}` : '·'}</td>
                        })}
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: t.textMuted, fontSize: '12px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dateMap[date]?.['__notes__']?.value || '·'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <button onClick={() => setDeleteConfirm(date)}
                            style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}
                            onMouseEnter={e => e.target.style.color = t.danger}
                            onMouseLeave={e => e.target.style.color = t.textMuted}>×</button>
                        </td>
                      </tr>
                    ))}
                    {!sortedDates.length && (
                      <tr><td colSpan={metrics.length + 3} style={{ padding: '48px', textAlign: 'center', color: t.textMuted, fontStyle: 'italic' }}>
                        Sem registos ainda.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Goals — with error guard */}
          {!goalsError ? (
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, fontWeight: 600, marginBottom: '12px' }}>OBJECTIVOS</div>
              <GoalsWrapper theme={theme} t={t} user={user} entries={entries} lang={lang} onError={() => setGoalsError(true)} />
            </div>
          ) : (
            <div style={{ ...card, textAlign: 'center', padding: '24px', color: t.textMuted, fontSize: '13px' }}>
              Não foi possível carregar os objectivos.{' '}
              <button onClick={() => setGoalsError(false)} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontFamily: F, fontSize: '13px' }}>Tentar novamente</button>
            </div>
          )}
        </div>
      )}

      {/* ── REGISTAR ── */}
      {!loading && subTab === 'register' && (
        <div style={card}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>DATA</div>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ ...inp, width: 'auto' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {['golfe', 'ginasio'].map(cat => (
              <div key={cat}>
                <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.textMuted, marginBottom: '10px', borderBottom: `1px solid ${t.border}`, paddingBottom: '8px', fontWeight: 600 }}>{cat === 'golfe' ? 'GOLFE' : 'GINÁSIO'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {metrics.filter(m => m.category === cat).map(metric => (
                    <div key={metric.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px' }}>
                      <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500, flex: 1, marginRight: '8px' }}>
                        {metric.label}
                        {metric.unit ? <span style={{ color: t.textMuted, marginLeft: '4px', fontSize: '10px' }}>{metric.unit}</span> : ''}
                      </span>
                      <input type="number" step="0.01" placeholder="—" value={form.values[metric.id] || ''}
                        onChange={e => setForm(p => ({ ...p, values: { ...p.values, [metric.id]: e.target.value } }))}
                        style={{ width: '90px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, padding: '5px 8px', fontSize: '15px', fontWeight: 700, fontFamily: F, outline: 'none', textAlign: 'right' }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>NOTAS DA SESSÃO</div>
            <textarea placeholder="Observações, condições, sensações..." value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              style={{ ...inp, minHeight: '64px', resize: 'vertical' }} />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={saveEntry} disabled={saving}
              style={{ background: saving ? t.border : t.accent, border: 'none', borderRadius: '8px', color: saving ? t.textMuted : '#fff', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: F }}>
              {saving ? 'A guardar...' : 'Guardar Sessão'}
            </button>
            {savedMsg && <span style={{ fontSize: '13px', color: '#52E8A0', fontWeight: 600 }}>{savedMsg}</span>}
            {saveError && (
              <div style={{ fontSize: '12px', color: t.danger, fontWeight: 600, background: t.dangerBg || '#fef2f2', border: `1px solid ${t.danger}44`, borderRadius: '6px', padding: '6px 12px' }}>
                ⚠ {saveError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDITAR KPIs ── */}
      {!loading && subTab === 'kpis' && (
        <div style={card}>
          <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.textMuted, marginBottom: '14px', fontWeight: 600 }}>GERIR KPIs</div>
          <div style={{ fontSize: '9px', color: t.textMuted, letterSpacing: '1px', display: 'flex', gap: '6px', marginBottom: '4px', paddingLeft: '2px' }}>
            <div style={{ flex: 1 }}>NOME</div>
            <div style={{ width: '52px' }}>UNID.</div>
            <div style={{ width: '56px' }}>OBJ.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
            {metrics.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input value={m.label} onChange={e => setMetrics(p => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                  style={{ flex: 1, background: t.bg, border: `1px solid ${t.border}`, borderRadius: '5px', color: t.text, padding: '5px 8px', fontSize: '12px', fontFamily: F, outline: 'none' }} />
                <input value={m.unit} placeholder="—" onChange={e => setMetrics(p => p.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                  style={{ width: '52px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: '5px', color: t.text, padding: '5px 6px', fontSize: '12px', fontFamily: F, outline: 'none' }} />
                <input value={m.target || ''} placeholder="—" onChange={e => setMetrics(p => p.map((x, j) => j === i ? { ...x, target: e.target.value ? parseFloat(e.target.value) : null } : x))}
                  style={{ width: '56px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: '5px', color: t.text, padding: '5px 6px', fontSize: '12px', fontFamily: F, outline: 'none' }} />
                <button onClick={() => setMetrics(p => p.map((x, j) => j === i ? { ...x, active: !x.active } : x))}
                  title={m.active !== false ? 'Desactivar' : 'Activar'}
                  style={{ background: m.active !== false ? '#52E8A022' : t.bg, border: `1px solid ${m.active !== false ? '#52E8A0' : t.border}`, borderRadius: '4px', color: m.active !== false ? '#52E8A0' : t.textMuted, cursor: 'pointer', fontSize: '10px', padding: '3px 7px', fontFamily: F, fontWeight: 600 }}>
                  {m.active !== false ? 'ON' : 'OFF'}
                </button>
                <button onClick={() => setMetrics(p => p.filter((_, j) => j !== i))}
                  style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '16px', padding: '0', width: '24px', lineHeight: 1 }}
                  onMouseEnter={e => e.target.style.color='#f87171'} onMouseLeave={e => e.target.style.color=t.textMuted}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '12px', borderTop: `1px solid ${t.border}`, marginBottom: '14px' }}>
            <input placeholder="Nome do KPI" value={newMetric.label} onChange={e => setNewMetric(p => ({ ...p, label: e.target.value }))}
              style={{ flex: 2, minWidth: '120px', ...inp, padding: '5px 8px', fontSize: '12px' }} />
            <input placeholder="unid." value={newMetric.unit} onChange={e => setNewMetric(p => ({ ...p, unit: e.target.value }))}
              style={{ width: '60px', ...inp, padding: '5px 8px', fontSize: '12px' }} />
            <input placeholder="obj." value={newMetric.target} onChange={e => setNewMetric(p => ({ ...p, target: e.target.value }))}
              style={{ width: '64px', ...inp, padding: '5px 8px', fontSize: '12px' }} />
            <button onClick={() => {
              if (!newMetric.label) return
              setMetrics(p => [...p, { ...newMetric, id: newMetric.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(), target: newMetric.target ? parseFloat(newMetric.target) : null }])
              setNewMetric({ label: '', unit: '', category: 'golfe', target: '' })
            }} style={{ background: t.accent, border: 'none', borderRadius: '6px', color: '#fff', padding: '5px 14px', cursor: 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 600 }}>+ Adicionar</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={saveKpis} disabled={savingKpis}
              style={{ background: savingKpis ? t.border : t.accent, border: 'none', borderRadius: '6px', color: savingKpis ? t.textMuted : '#fff', padding: '8px 20px', fontFamily: F, fontWeight: 600, fontSize: '13px', cursor: savingKpis ? 'not-allowed' : 'pointer' }}>
              {savingKpis ? 'A guardar...' : 'Guardar KPIs na BD'}
            </button>
            {kpiMsg && (
              <div style={{ fontSize: '12px', color: kpiMsg.startsWith('Erro') ? t.danger : '#52E8A0', fontWeight: 600,
                background: kpiMsg.startsWith('Erro') ? (t.dangerBg || '#fef2f2') : '#0a2a1a',
                border: `1px solid ${kpiMsg.startsWith('Erro') ? t.danger+'44' : '#52E8A044'}`,
                borderRadius: '6px', padding: '6px 12px' }}>
                {kpiMsg.startsWith('Erro') ? '⚠ ' : '✓ '}{kpiMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HCP & WAGR ── */}
      {subTab === 'hcpwagr' && <HcpWagr theme={theme} t={t} user={user} />}

    </div>
  )
}

// Goals wrapper with error boundary pattern
function GoalsWrapper({ theme, t, user, entries, lang, onError }) {
  const [errored, setErrored] = useState(false)
  if (errored) { onError?.(); return null }
  try {
    return <Goals theme={theme} t={t} user={user} entries={entries} lang={lang} />
  } catch {
    setErrored(true)
    return null
  }
}
