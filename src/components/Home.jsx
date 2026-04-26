import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function Sparkline({ data, t, target }) {
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
    const pts = data.slice(-10)
    if (pts.length < 2) {
      ctx.fillStyle = t.textMuted; ctx.font = '11px system-ui'; ctx.textAlign = 'center'
      ctx.fillText('Sem dados', W/2, H/2); return
    }
    const vals = pts.map(d => parseFloat(d.value))
    const tgt = target || 95
    const minV = Math.min(...vals, tgt * 0.85) * 0.98
    const maxV = Math.max(...vals, tgt) * 1.02
    const range = maxV - minV || 1
    const pad = { t: 20, r: 12, b: 32, l: 44 }
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b
    const xOf = i => pad.l + (i / (pts.length - 1)) * cw
    const yOf = v => pad.t + ch - ((v - minV) / range) * ch
    const gridVals = [Math.round(minV), Math.round((minV + maxV) / 2), Math.round(maxV)]
    gridVals.forEach(v => {
      const y = yOf(v)
      ctx.strokeStyle = t.border; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke()
      ctx.fillStyle = t.textMuted; ctx.font = '9px system-ui'; ctx.textAlign = 'right'
      ctx.fillText(v, pad.l - 4, y + 3)
    })
    if (tgt >= minV && tgt <= maxV) {
      const y = yOf(tgt)
      ctx.strokeStyle = '#52E8A066'; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#52E8A0'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'left'
      ctx.fillText(tgt, pad.l + 3, y - 3)
    }
    pts.forEach((d, i) => {
      if (i === 0 || i === pts.length - 1 || i === Math.floor(pts.length / 2)) {
        const x = xOf(i)
        const date = new Date(d.entry_date + 'T12:00:00')
        ctx.fillStyle = t.textMuted; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
        ctx.fillText(`${date.getDate()}/${date.getMonth()+1}`, x, pad.t + ch + 18)
      }
    })
    ctx.beginPath()
    pts.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(parseFloat(d.value))) : ctx.lineTo(xOf(i), yOf(parseFloat(d.value))) })
    ctx.lineTo(xOf(pts.length-1), pad.t + ch); ctx.lineTo(xOf(0), pad.t + ch); ctx.closePath()
    ctx.fillStyle = 'rgba(91,138,255,0.06)'; ctx.fill()
    ctx.beginPath()
    pts.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(parseFloat(d.value))) : ctx.lineTo(xOf(i), yOf(parseFloat(d.value))) })
    ctx.strokeStyle = '#378ADD'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke()
    pts.forEach((d, i) => {
      const x = xOf(i), y = yOf(parseFloat(d.value))
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#378ADD'; ctx.fill()
      const isLast = i === pts.length - 1
      const isMax = parseFloat(d.value) === Math.max(...vals)
      if (isLast || isMax) {
        ctx.fillStyle = isLast ? t.text : '#52E8A0'
        ctx.font = `bold 10px system-ui`; ctx.textAlign = 'center'
        ctx.fillText(d.value, x, y - 9)
      }
    })
  }, [data, target, t])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100px', display: 'block' }} />
}

function MiniSpark({ pts, t, color = '#378ADD' }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || pts.length < 2) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height; ctx.clearRect(0, 0, W, H)
    const vals = pts.map(p => parseFloat(p.value))
    const minV = Math.min(...vals), maxV = Math.max(...vals)
    const range = maxV - minV || 1
    const pad = { t: 4, r: 4, b: 4, l: 4 }
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b
    const xOf = i => pad.l + (i / (pts.length - 1)) * cw
    const yOf = v => pad.t + ch - ((v - minV) / range) * ch
    ctx.beginPath()
    pts.forEach((p, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(parseFloat(p.value))) : ctx.lineTo(xOf(i), yOf(parseFloat(p.value))) })
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke()
    const lx = xOf(pts.length-1), ly = yOf(vals[vals.length-1])
    ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill()
  }, [pts, color, t])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '36px', display: 'block' }} />
}

function WeeklyBarChart({ weeks, t }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !weeks.length) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)
    const maxVal = Math.max(...weeks.map(w => w.count), 1)
    const pad = { t: 14, r: 4, b: 22, l: 4 }
    const cw = W - pad.l - pad.r
    const ch = H - pad.t - pad.b
    const barW = cw / weeks.length
    weeks.forEach((w, i) => {
      const bh = Math.max(w.count > 0 ? (w.count / maxVal) * ch : 0, w.count > 0 ? 3 : 0)
      const x = pad.l + i * barW + barW * 0.12
      const bw = barW * 0.76
      const y = pad.t + ch - bh
      const barColor = w.isCurrent ? '#52E8A0'
        : w.completion == null ? '#378ADD44'
        : w.completion >= 80 ? '#378ADD'
        : w.completion >= 50 ? '#f59e0b88' : '#f8717188'
      ctx.fillStyle = barColor
      ctx.fillRect(x, y, bw, bh)
      if (w.count > 0) {
        ctx.fillStyle = w.isCurrent ? '#52E8A0' : t.textMuted
        ctx.font = `${w.isCurrent ? 'bold ' : ''}9px system-ui`
        ctx.textAlign = 'center'
        ctx.fillText(w.count, x + bw / 2, y - 2)
      }
      ctx.fillStyle = t.textMuted
      ctx.font = '7px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(w.label, x + bw / 2, H - 4)
    })
  }, [weeks, t])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '90px', display: 'block' }} />
}

function DonutChart({ segments, total, t }) {
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
    const cx = W / 2, cy = H / 2
    const r = Math.min(W, H) / 2 - 4
    const innerR = r * 0.56
    if (!segments.length || total === 0) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = t.border; ctx.lineWidth = 2; ctx.stroke()
      return
    }
    let angle = -Math.PI / 2
    segments.forEach(seg => {
      const sweep = (seg.value / total) * Math.PI * 2
      ctx.beginPath(); ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, angle, angle + sweep)
      ctx.closePath(); ctx.fillStyle = seg.color; ctx.fill()
      angle += sweep
    })
    ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
    ctx.fillStyle = t.surface || t.bg; ctx.fill()
    ctx.fillStyle = t.text; ctx.font = 'bold 13px system-ui'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(total, cx, cy)
    ctx.textBaseline = 'alphabetic'
  }, [segments, total, t])
  return <canvas ref={canvasRef} style={{ width: '130px', height: '130px', display: 'block', flexShrink: 0 }} />
}

function KpiLineChart({ entries, t, F, cardStyle }) {
  const allMetrics = [...new Set(
    entries.filter(e => e.metric_id && e.value && e.entry_date && e.metric_id !== '__notes__').map(e => e.metric_id)
  )].sort()
  const MLABELS = {
    swing_speed:'Vel. Swing', smash_factor:'Smash Factor', carry:'Carry Driver',
    stack_speed:'The Stack', deadlift:'Deadlift', medball:'Med Ball', thoracic:'Mobilidade',
  }
  const [metric, setMetric] = useState(allMetrics[0] || '')
  const [view, setView] = useState('chart')
  const [period, setPeriod] = useState('all')
  const canvasRef = useRef(null)

  useEffect(() => { if (!metric && allMetrics.length) setMetric(allMetrics[0]) }, [allMetrics.join(',')])

  const cutoff = (() => {
    const now = new Date()
    if (period === '1m') { const d = new Date(now); d.setMonth(d.getMonth()-1); return d.toISOString().split('T')[0] }
    if (period === '3m') { const d = new Date(now); d.setMonth(d.getMonth()-3); return d.toISOString().split('T')[0] }
    if (period === '6m') { const d = new Date(now); d.setMonth(d.getMonth()-6); return d.toISOString().split('T')[0] }
    if (period === '1a') { const d = new Date(now); d.setFullYear(d.getFullYear()-1); return d.toISOString().split('T')[0] }
    return null
  })()
  const pts = entries
    .filter(e => e.metric_id === metric && e.value && e.entry_date && (!cutoff || e.entry_date >= cutoff))
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || view !== 'chart') return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)
    if (pts.length < 2) {
      ctx.fillStyle = t.textMuted; ctx.font = '11px system-ui'; ctx.textAlign = 'center'
      ctx.fillText(pts.length === 0 ? 'Sem dados' : '1 registo', W/2, H/2); return
    }
    const vals = pts.map(p => parseFloat(p.value))
    const minV = Math.min(...vals), maxV = Math.max(...vals)
    const range = maxV - minV || 1
    const pad = { t: 18, r: 10, b: 24, l: 38 }
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b
    const xOf = i => pad.l + (i / (pts.length - 1)) * cw
    const yOf = v => pad.t + ch - ((v - minV) / range) * ch
    ;[minV, (minV + maxV) / 2, maxV].forEach(v => {
      const y = yOf(v)
      ctx.strokeStyle = t.border; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke()
      ctx.fillStyle = t.textMuted; ctx.font = '8px system-ui'; ctx.textAlign = 'right'
      ctx.fillText(parseFloat(v.toFixed(1)), pad.l - 3, y + 3)
    })
    ;[0, Math.floor(pts.length / 2), pts.length - 1].forEach(i => {
      const d = new Date(pts[i].entry_date + 'T12:00:00')
      ctx.fillStyle = t.textMuted; ctx.font = '8px system-ui'; ctx.textAlign = 'center'
      ctx.fillText(`${d.getDate()}/${d.getMonth()+1}`, xOf(i), H - 4)
    })
    ctx.beginPath()
    pts.forEach((p, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(parseFloat(p.value))) : ctx.lineTo(xOf(i), yOf(parseFloat(p.value))) })
    ctx.lineTo(xOf(pts.length - 1), pad.t + ch); ctx.lineTo(xOf(0), pad.t + ch); ctx.closePath()
    ctx.fillStyle = 'rgba(55,138,221,0.06)'; ctx.fill()
    ctx.beginPath()
    pts.forEach((p, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(parseFloat(p.value))) : ctx.lineTo(xOf(i), yOf(parseFloat(p.value))) })
    ctx.strokeStyle = '#378ADD'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke()
    pts.forEach((p, i) => {
      const x = xOf(i), y = yOf(parseFloat(p.value))
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#378ADD'; ctx.fill()
      if (i === pts.length - 1) {
        ctx.fillStyle = t.text; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'
        ctx.fillText(p.value, x, y - 7)
      }
    })
  }, [pts, view, t])

  const si = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '4px', color: t.text, padding: '4px 8px', fontSize: '11px', fontFamily: F, outline: 'none' }
  const PERS = [{k:'1m',l:'1M'},{k:'3m',l:'3M'},{k:'6m',l:'6M'},{k:'1a',l:'1A'},{k:'all',l:'Tudo'}]
  const btnStyle = (active) => ({ padding:'3px 7px', borderRadius:'4px', border:`1px solid ${active?'#378ADD':t.border}`, background:active?'#378ADD15':'transparent', color:active?'#378ADD':t.textMuted, cursor:'pointer', fontSize:'9px', fontFamily:F })

  return (
    <div style={cardStyle}>
      <div style={{display:'flex',gap:'5px',marginBottom:'10px',flexWrap:'wrap',alignItems:'center'}}>
        <select value={metric} onChange={e => setMetric(e.target.value)} style={{...si,flex:1,minWidth:'110px'}}>
          {allMetrics.map(m => <option key={m} value={m}>{MLABELS[m]||m}</option>)}
        </select>
        <div style={{display:'flex',gap:'2px'}}>
          {['chart','table'].map(v => (
            <button key={v} onClick={() => setView(v)} style={btnStyle(view===v)}>
              {v==='chart'?'Gráfico':'Tabela'}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:'2px'}}>
          {PERS.map(p => <button key={p.k} onClick={() => setPeriod(p.k)} style={btnStyle(period===p.k)}>{p.l}</button>)}
        </div>
      </div>
      {view === 'chart' ? (
        <canvas ref={canvasRef} style={{width:'100%',height:'120px',display:'block'}}/>
      ) : (
        <div style={{maxHeight:'180px',overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
            <thead><tr>
              {['DATA','VALOR','Δ'].map(h => <th key={h} style={{textAlign:h==='DATA'?'left':'right',padding:'4px 6px',color:t.textMuted,fontSize:'9px',letterSpacing:'1px',borderBottom:`1px solid ${t.border}`}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[...pts].reverse().map((p, i, arr) => {
                const prev = arr[i + 1]
                const delta = prev ? (parseFloat(p.value) - parseFloat(prev.value)).toFixed(2) : null
                return (
                  <tr key={p.id||i} style={{borderBottom:`1px solid ${t.border}`}}>
                    <td style={{padding:'5px 6px',color:t.textMuted}}>{new Date(p.entry_date+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}</td>
                    <td style={{padding:'5px 6px',textAlign:'right',fontWeight:700,color:t.text}}>{p.value}</td>
                    <td style={{padding:'5px 6px',textAlign:'right',fontSize:'10px',color:delta==null?t.textMuted:parseFloat(delta)>=0?'#52E8A0':'#f87171'}}>
                      {delta==null?'—':(parseFloat(delta)>=0?'+':'')+delta}
                    </td>
                  </tr>
                )
              })}
              {!pts.length && <tr><td colSpan={3} style={{padding:'16px',textAlign:'center',color:t.textMuted,fontStyle:'italic'}}>Sem dados</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const PERIOD_OPTIONS = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '3 meses' },
  { key: 'all', label: 'Tudo' },
]
const COMP_PERIOD_OPTIONS = [
  { key: '30d', label: '30d' },
  { key: '90d', label: '3m' },
  { key: '1y', label: '1a' },
  { key: 'all', label: 'Tudo' },
]

export default function Home({ theme, t, onNavigate, onRegister, user, profile, lang = 'en' }) {
  const [entries, setEntries] = useState([])
  const [events, setEvents] = useState([])
  const [trainingPlans, setTrainingPlans] = useState([])
  const [compStats, setCompStats] = useState([])
  const [period, setPeriod] = useState('30d')
  const [compPeriod, setCompPeriod] = useState('all')
  const [goals, setGoals] = useState([])
  const [kpiModal, setKpiModal] = useState(null)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [kpiOrder, setKpiOrder] = useState(['smash_factor','carry','stack_speed','deadlift','medball','thoracic'])
  const [statPrefs, setStatPrefs] = useState(null)
  const [statPanelOpen, setStatPanelOpen] = useState(false)
  const [compConfig, setCompConfig] = useState([])

  const ATHLETE_DEFAULTS = { hcp: '1.1', wagr: '—', prev_hcp: null, prev_wagr: null, club: 'Vale de Janelas', category: 'Sub-18', fed: 'FPG', fed_num: '43832' }
  const [athlete, setAthlete] = useState(ATHLETE_DEFAULTS)
  const [editingAthlete, setEditingAthlete] = useState(false)
  const [athleteForm, setAthleteForm] = useState(ATHLETE_DEFAULTS)
  const [athleteSaving, setAthleteSaving] = useState(false)

  useEffect(() => {
    supabase.from('entries').select('*').order('entry_date', { ascending: true }).then(({ data }) => setEntries(data || []))
    supabase.from('events').select('*').order('start_date').then(({ data }) => setEvents(data || []))
    supabase.from('training_plans').select('*').order('week_start', { ascending: false }).then(({ data }) => setTrainingPlans(data || []))
    supabase.from('competition_stats').select('*').order('event_date', { ascending: false }).then(({ data }) => setCompStats(data || []))
    supabase.from('comp_config').select('*').order('sort_order', { ascending: true }).then(({ data }) => { if (data?.length) setCompConfig(data) })
    if (user?.id) {
      supabase.from('profiles').select('hcp,wagr,prev_hcp,prev_wagr,athlete_club,category,fed,fed_num,home_kpi_order,home_stat_prefs').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            const a = {
              hcp: data.hcp || '1.1',
              wagr: data.wagr || '—',
              prev_hcp: data.prev_hcp || null,
              prev_wagr: data.prev_wagr || null,
              club: data.athlete_club || 'Vale de Janelas',
              category: data.category || 'Sub-18',
              fed: data.fed || 'FPG',
              fed_num: data.fed_num || '43832',
            }
            setAthlete(a); setAthleteForm(a)
            if (data.home_kpi_order) {
              try { setKpiOrder(JSON.parse(data.home_kpi_order)) } catch (_) {}
            }
            if (data.home_stat_prefs) {
              try { setStatPrefs(JSON.parse(data.home_stat_prefs)) } catch (_) {}
            }
          }
        })
    }
  }, [user])

  useEffect(() => {
    supabase.from('goals').select('*').order('created_at', { ascending: false }).then(({ data }) => setGoals(data || []))
  }, [])

  const saveAthlete = async () => {
    if (!user?.id) return
    setAthleteSaving(true)
    const toVal = (v) => (v && v !== '—' ? v : null)
    const updatePayload = {
      hcp: toVal(athleteForm.hcp),
      wagr: toVal(athleteForm.wagr),
      athlete_club: athleteForm.club,
      category: athleteForm.category,
      fed: athleteForm.fed,
      fed_num: athleteForm.fed_num,
    }
    if (athlete.hcp !== athleteForm.hcp && toVal(athlete.hcp)) updatePayload.prev_hcp = toVal(athlete.hcp)
    if (athlete.wagr !== athleteForm.wagr && toVal(athlete.wagr)) updatePayload.prev_wagr = toVal(athlete.wagr)
    await supabase.from('profiles').update(updatePayload).eq('id', user.id)
    setAthlete(athleteForm); setAthleteSaving(false); setEditingAthlete(false)
  }

  const saveKpiPrefs = async (order) => {
    if (!user?.id) return
    setSavingPrefs(true)
    await supabase.from('profiles').update({ home_kpi_order: JSON.stringify(order) }).eq('id', user.id)
    setSavingPrefs(false)
  }

  const saveStatPrefs = async (keys) => {
    if (!user?.id) return
    await supabase.from('profiles').update({ home_stat_prefs: JSON.stringify(keys) }).eq('id', user.id)
  }

  // Period filter for session counts
  const periodStart = (() => {
    const now = new Date()
    if (period === '7d') { const d = new Date(now); d.setDate(d.getDate()-7); return d.toISOString().split('T')[0] }
    if (period === '30d') { const d = new Date(now); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0] }
    if (period === '90d') { const d = new Date(now); d.setDate(d.getDate()-90); return d.toISOString().split('T')[0] }
    return null
  })()
  const filteredEntries = periodStart ? entries.filter(e => e.entry_date >= periodStart) : entries

  const swingEntries = entries.filter(e => e.metric_id === 'swing_speed' && e.value && e.entry_date)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  const bestSwing = swingEntries.length ? Math.max(...swingEntries.map(e => parseFloat(e.value))) : null
  const lastSwing = swingEntries.length ? parseFloat(swingEntries[swingEntries.length - 1].value) : null
  const lastDate = swingEntries.length ? swingEntries[swingEntries.length - 1].entry_date : null

  const [swingGoal, setSwingGoal] = useState(null)
  useEffect(() => {
    supabase.from('goals').select('*').eq('metric_id', 'swing_speed').order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data && data.length > 0) setSwingGoal(data[0]) })
  }, [])
  const swingTarget = swingGoal ? parseFloat(swingGoal.target_value) : 95
  const pct = lastSwing ? Math.min(100, Math.round((lastSwing / swingTarget) * 100)) : 0
  const delta = swingEntries.length > 1 ? (parseFloat(swingEntries[swingEntries.length - 1].value) - parseFloat(swingEntries[swingEntries.length - 2].value)).toFixed(1) : null

  const golfMetrics = ['swing_speed', 'smash_factor', 'carry', 'stack_speed']
  const gymMetrics = ['deadlift', 'medball', 'thoracic']
  const golfSessions = [...new Set(filteredEntries.filter(e => golfMetrics.includes(e.metric_id)).map(e => e.entry_date))].length
  const gymSessions = [...new Set(filteredEntries.filter(e => gymMetrics.includes(e.metric_id)).map(e => e.entry_date))].length

  const todayStr = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter(e => e.start_date >= todayStr && e.status !== 'cancelled' && e.status !== 'cancelado').slice(0, 6)
  const nextComp = upcomingEvents[0]
  const daysToNext = nextComp ? Math.ceil((new Date(nextComp.start_date) - new Date()) / 86400000) : null

  const lastMetrics = {}
  entries.sort((a, b) => (b.entry_date || '').localeCompare(a.entry_date || '')).forEach(e => { if (!lastMetrics[e.metric_id]) lastMetrics[e.metric_id] = e })

  const F = "'Inter', system-ui, -apple-system, sans-serif"
  const inp = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '4px', color: t.text, padding: '5px 8px', fontSize: '12px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }

  const formatDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : ''

  const ALL_KPIS = [
    { id: 'smash_factor', label: 'SMASH FACTOR', unit: '', color: '#378ADD' },
    { id: 'carry', label: 'CARRY DRIVER', unit: 'm', color: '#378ADD' },
    { id: 'stack_speed', label: 'THE STACK', unit: 'mph', color: '#378ADD' },
    { id: 'deadlift', label: 'DEADLIFT', unit: 'kg', color: '#52E8A0' },
    { id: 'medball', label: 'MED BALL', unit: 'm', color: '#52E8A0' },
    { id: 'thoracic', label: 'MOBILIDADE', unit: '°', color: '#52E8A0' },
  ]
  const orderedKpis = [
    ...kpiOrder.map(id => ALL_KPIS.find(k => k.id === id)).filter(Boolean),
    ...ALL_KPIS.filter(k => !kpiOrder.includes(k.id)),
  ].filter(k => lastMetrics[k.id])

  const todayDate = new Date()
  const weekStartDate = new Date(todayDate)
  weekStartDate.setDate(todayDate.getDate() - (todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1))
  const weekStartStr = weekStartDate.toISOString().split('T')[0]
  const DAYS_PT_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const todayDayPT = DAYS_PT_SHORT[todayDate.getDay()]

  const getWeekSessions = (plan) => {
    if (!plan?.days) return []
    const sessions = []
    if (Array.isArray(plan.days)) {
      const dayNames = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
      plan.days.forEach((dayData, i) => {
        if (dayData?.sessions?.length > 0 && !dayData.sessions[0]?.isRest) {
          sessions.push({ day: dayNames[i], type: plan.plan_type === 'gym' ? 'Gym' : 'Golf', detail: dayData.sessions[0]?.cat || dayData.sessions[0]?.name || 'Treino' })
        }
      })
    } else {
      Object.entries(plan.days).forEach(([day, dayData]) => {
        if (dayData?.golf?.length > 0) sessions.push({ day, type: 'Golf', detail: dayData.golf[0]?.category || 'Golf' })
        if (dayData?.gym?.length > 0) sessions.push({ day, type: 'Gym', detail: dayData.gym[0]?.category || 'Gym' })
      })
    }
    return sessions
  }
  const currentPlan = trainingPlans.find(p => p.week_start <= weekStartStr && p.week_end >= weekStartStr) || trainingPlans[0]
  const weekSessions = getWeekSessions(currentPlan)

  // HCP / WAGR deltas (compare with previous values)
  const hcpDelta = athlete.prev_hcp && athlete.hcp && athlete.hcp !== '—'
    ? (parseFloat(athlete.hcp) - parseFloat(athlete.prev_hcp)).toFixed(1)
    : null
  const wagrDelta = athlete.prev_wagr && athlete.wagr && athlete.wagr !== '—' && athlete.prev_wagr !== '—'
    ? parseInt(athlete.wagr) - parseInt(athlete.prev_wagr)
    : null

  // Plan coverage (Slot B)
  const latestPlanEnd = trainingPlans.length > 0
    ? trainingPlans.reduce((max, p) => p.week_end > max ? p.week_end : max, '')
    : null

  const nextTrainingDate = (() => {
    for (let i = 0; i <= 14; i++) {
      const d = new Date(todayDate); d.setDate(todayDate.getDate() + i)
      const ds = d.toISOString().split('T')[0]
      const plan = trainingPlans.find(p => p.week_start <= ds && p.week_end >= ds)
      if (!plan?.days) continue
      if (Array.isArray(plan.days)) {
        const dow = d.getDay(); const di = dow === 0 ? 6 : dow - 1
        const day = plan.days[di]
        if (day?.sessions?.length > 0 && !day.sessions[0]?.isRest) return ds
      } else {
        const dayName = DAYS_PT_SHORT[d.getDay()]
        const dayData = plan.days[dayName]
        if (dayData?.golf?.length > 0 || dayData?.gym?.length > 0) return ds
      }
    }
    return null
  })()

  const nextCoachDate = (() => {
    for (let i = 0; i <= 14; i++) {
      const d = new Date(todayDate); d.setDate(todayDate.getDate() + i)
      const ds = d.toISOString().split('T')[0]
      const plan = trainingPlans.find(p => p.week_start <= ds && p.week_end >= ds)
      if (!plan?.days || !Array.isArray(plan.days)) continue
      const dow = d.getDay(); const di = dow === 0 ? 6 : dow - 1
      const day = plan.days[di]
      if (day?.sessions?.some(s => s.session_type === 'coach' && !s.isRest)) return ds
    }
    return null
  })()

  // Weekly training load: last 8 weeks from entries (unique session dates per week)
  const weeklyLoad = (() => {
    const today = new Date()
    return Array.from({ length: 8 }, (_, i) => {
      const wkOffset = 7 - i
      const d = new Date(today); d.setDate(today.getDate() - 7 * wkOffset)
      const wd = d.getDay()
      const wsD = new Date(d); wsD.setDate(d.getDate() - (wd === 0 ? 6 : wd - 1))
      const weD = new Date(wsD); weD.setDate(wsD.getDate() + 6)
      const ws = wsD.toISOString().split('T')[0]
      const we = weD.toISOString().split('T')[0]
      const uniqueDates = new Set(entries.filter(e => e.entry_date >= ws && e.entry_date <= we && e.metric_id !== '__notes__').map(e => e.entry_date))
      const isCurrent = ws === weekStartStr
      const label = wsD.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }).slice(0, 5)
      const plan = trainingPlans.find(p => p.week_start <= ws && p.week_end >= ws) || trainingPlans.find(p => p.week_start <= we && p.week_end >= we)
      let planned = 0
      if (plan?.days && Array.isArray(plan.days)) planned = plan.days.filter(d => d?.sessions?.length > 0 && !d.sessions[0]?.isRest).length
      else if (plan?.days && !Array.isArray(plan.days)) planned = Object.values(plan.days).filter(d => (d?.golf?.length||0)+(d?.gym?.length||0)>0).length
      const completion = planned > 0 ? Math.min(100, Math.round((uniqueDates.size / planned) * 100)) : null
      return { ws, label, count: uniqueDates.size, isCurrent, planned, completion }
    })
  })()

  // Donut: golf vs gym session distribution across the 8-week window
  const donutSegments = (() => {
    const winStart = weeklyLoad[0]?.ws || ''
    const golfDates = new Set(entries.filter(e => golfMetrics.includes(e.metric_id) && e.entry_date >= winStart).map(e => e.entry_date))
    const gymDates = new Set(entries.filter(e => gymMetrics.includes(e.metric_id) && e.entry_date >= winStart).map(e => e.entry_date))
    const segs = []
    if (golfDates.size > 0) segs.push({ label: 'Golfe', value: golfDates.size, color: '#378ADD' })
    if (gymDates.size > 0) segs.push({ label: 'Ginásio', value: gymDates.size, color: '#52E8A0' })
    return segs
  })()
  const donutTotal = donutSegments.reduce((s, seg) => s + seg.value, 0)

  // Active KPIs (Slot C): each KPI with last value + next registration date
  const activeKpis = ALL_KPIS.map(k => {
    const kpiEntries = entries.filter(e => e.metric_id === k.id && e.value && e.entry_date)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    const last = kpiEntries[kpiEntries.length - 1]
    if (!last) return null
    const lastD = new Date(last.entry_date + 'T12:00:00')
    const nextD = new Date(lastD); nextD.setDate(nextD.getDate() + 7)
    const nextDateStr = nextD.toISOString().split('T')[0]
    const isOverdue = nextDateStr < todayStr
    const prevEntry = kpiEntries[kpiEntries.length - 2]
    const d = prevEntry ? (parseFloat(last.value) - parseFloat(prevEntry.value)).toFixed(2) : null
    return { ...k, lastValue: last.value, lastDate: last.entry_date, nextDate: nextDateStr, isOverdue, delta: d }
  }).filter(Boolean)

  // Competition stats filtered by compPeriod
  const compPeriodStart = (() => {
    const now = new Date()
    if (compPeriod === '30d') { const d = new Date(now); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0] }
    if (compPeriod === '90d') { const d = new Date(now); d.setDate(d.getDate()-90); return d.toISOString().split('T')[0] }
    if (compPeriod === '1y') { const d = new Date(now); d.setFullYear(d.getFullYear()-1); return d.toISOString().split('T')[0] }
    return null
  })()
  const filteredCompStats = compPeriodStart ? compStats.filter(s => s.event_date >= compPeriodStart) : compStats

  // Slot E stats
  const fcScores = filteredCompStats.map(s => parseFloat(s.values?.score)).filter(v => !isNaN(v))
  const fcPositions = filteredCompStats.map(s => parseFloat(s.values?.position)).filter(v => !isNaN(v))
  const fcFairways = filteredCompStats.map(s => parseFloat(s.values?.fairways)).filter(v => !isNaN(v))
  const fcGir = filteredCompStats.map(s => parseFloat(s.values?.gir)).filter(v => !isNaN(v))
  const fcPutts = filteredCompStats.map(s => parseFloat(s.values?.putts)).filter(v => !isNaN(v))
  const avgScore = fcScores.length ? (fcScores.reduce((a,b)=>a+b,0)/fcScores.length).toFixed(1) : null
  const bestPos = fcPositions.length ? Math.min(...fcPositions) : null
  const top10 = filteredCompStats.filter(s => parseFloat(s.values?.position) <= 10).length
  const avgFairways = fcFairways.length ? (fcFairways.reduce((a,b)=>a+b,0)/fcFairways.length).toFixed(1) : null
  const avgGir = fcGir.length ? (fcGir.reduce((a,b)=>a+b,0)/fcGir.length).toFixed(1) : null
  const avgPutts = fcPutts.length ? (fcPutts.reduce((a,b)=>a+b,0)/fcPutts.length).toFixed(1) : null
  const lastScore = filteredCompStats.length > 0 ? filteredCompStats[0].values?.score : null

  // Best result ever — filter by valid numeric score, then find minimum
  const scoresAll = compStats.filter(s => {
    const sc = s.values?.score
    return sc !== undefined && sc !== null && String(sc).trim() !== '' && !isNaN(parseFloat(sc))
  })
  const bestResult = scoresAll.length > 0
    ? scoresAll.reduce((best, s) => parseFloat(s.values.score) < parseFloat(best.values.score) ? s : best)
    : null
  const isNewPR = bestResult && compStats.length > 0 && compStats[0]?.id === bestResult?.id

  // Upcoming competitions for Slot A
  const isCompEvent = e => (e.category||'').toLowerCase().includes('competi') || (e.title||'').toLowerCase().includes('torneio')
  const upcomingComps = events.filter(e => e.start_date >= todayStr && !['cancelled','cancelado'].includes(e.status||'')).filter(isCompEvent).slice(0, 5)
  const slotAItems = upcomingComps.length > 0 ? upcomingComps : upcomingEvents.slice(0, 5)

  // 2026 competition stats
  const stats2026 = compStats.filter(s => (s.event_date||'').startsWith('2026'))
  const s26scores = stats2026.map(s => parseFloat(s.values?.score)).filter(v => !isNaN(v))
  const s26pos    = stats2026.map(s => parseFloat(s.values?.position)).filter(v => !isNaN(v))
  const s26fw     = stats2026.map(s => parseFloat(s.values?.fairways)).filter(v => !isNaN(v))
  const s26gir    = stats2026.map(s => parseFloat(s.values?.gir)).filter(v => !isNaN(v))
  const s26putts  = stats2026.map(s => parseFloat(s.values?.putts)).filter(v => !isNaN(v))
  const s26AvgScore  = s26scores.length ? (s26scores.reduce((a,b)=>a+b,0)/s26scores.length).toFixed(1) : null
  const s26BestPos   = s26pos.length ? Math.min(...s26pos) : null
  const s26Top10     = stats2026.filter(s => parseFloat(s.values?.position) <= 10).length
  const s26AvgFw     = s26fw.length ? (s26fw.reduce((a,b)=>a+b,0)/s26fw.length).toFixed(1) : null
  const s26AvgGir    = s26gir.length ? (s26gir.reduce((a,b)=>a+b,0)/s26gir.length).toFixed(1) : null
  const s26AvgPutts  = s26putts.length ? (s26putts.reduce((a,b)=>a+b,0)/s26putts.length).toFixed(1) : null
  const s26LastScore = stats2026[0]?.values?.score
  const s26BestScore = s26scores.length ? Math.min(...s26scores) : null

  // Two separate donuts: Golf categories + Gym exercises (last 4 weeks)
  const GOLF_COLORS = ['#6366f1','#818cf8','#a5b4fc','#c7d2fe','#e0e7ff']
  const GYM_COLORS  = ['#06b6d4','#67e8f9','#a5f3fc','#e0f2fe','#0891b2']
  const fwaStr4w = (() => { const d = new Date(); d.setDate(d.getDate()-28); return d.toISOString().split('T')[0] })()

  const golfDonut = (() => {
    const counts = {}
    trainingPlans.filter(p => p.week_end >= fwaStr4w && p.plan_type !== 'gym').forEach(plan => {
      if (!plan.days || !Array.isArray(plan.days)) return
      plan.days.forEach(dayData => {
        dayData?.sessions?.forEach(session => {
          if (session.isRest) return
          ;(session.items||[]).forEach(item => {
            const c = item.cat || 'Outro'
            counts[c] = (counts[c]||0)+1
          })
        })
      })
    })
    return Object.entries(counts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])
      .map(([l,v],i) => ({ label:l==='Putt'?'Putting':l, value:v, color:GOLF_COLORS[i%GOLF_COLORS.length] }))
  })()

  const gymDonut = (() => {
    const counts = {}
    trainingPlans.filter(p => p.week_end >= fwaStr4w && p.plan_type === 'gym').forEach(plan => {
      if (!plan.days || !Array.isArray(plan.days)) return
      plan.days.forEach(dayData => {
        dayData?.sessions?.forEach(session => {
          if (session.isRest) return
          ;(session.items||[]).forEach(item => {
            const c = item.cat || item.name || 'Exercício'
            counts[c] = (counts[c]||0)+1
          })
          if (!(session.items||[]).length) {
            const c = session.cat || session.name || 'Ginásio'
            counts[c] = (counts[c]||0)+1
          }
        })
      })
    })
    return Object.entries(counts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])
      .map(([l,v],i) => ({ label:l, value:v, color:GYM_COLORS[i%GYM_COLORS.length] }))
  })()

  const golfDonutTotal = golfDonut.reduce((s,g)=>s+g.value, 0)
  const gymDonutTotal  = gymDonut.reduce((s,g)=>s+g.value, 0)

  // Next coach sessions separated by type
  const nextGolfCoachDate = (() => {
    for (let i = 0; i <= 14; i++) {
      const d = new Date(todayDate); d.setDate(todayDate.getDate()+i)
      const ds = d.toISOString().split('T')[0]
      const plan = trainingPlans.find(p => p.plan_type==='golf' && p.week_start<=ds && p.week_end>=ds)
      if (!plan?.days || !Array.isArray(plan.days)) continue
      const dow = d.getDay(); const di = dow===0?6:dow-1
      if (plan.days[di]?.sessions?.some(s => s.session_type==='coach' && !s.isRest)) return ds
    }
    return null
  })()
  const nextGymCoachDate = (() => {
    for (let i = 0; i <= 14; i++) {
      const d = new Date(todayDate); d.setDate(todayDate.getDate()+i)
      const ds = d.toISOString().split('T')[0]
      const plan = trainingPlans.find(p => p.plan_type==='gym' && p.week_start<=ds && p.week_end>=ds)
      if (!plan?.days || !Array.isArray(plan.days)) continue
      const dow = d.getDay(); const di = dow===0?6:dow-1
      if (plan.days[di]?.sessions?.some(s => s.session_type==='coach' && !s.isRest)) return ds
    }
    return null
  })()

  const openKpiModal = (k) => {
    const kpiEntries = entries.filter(e => e.metric_id === k.id && e.value && e.entry_date)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    setKpiModal({ ...k, allEntries: kpiEntries })
  }

  const moveKpi = (id, dir) => {
    const idx = kpiOrder.indexOf(id)
    if (idx === -1) return
    const arr = [...kpiOrder]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setKpiOrder(arr)
    saveKpiPrefs(arr)
  }

  const card = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px 18px' }
  const fmtScore = v => { const n = parseFloat(v); return isNaN(n) ? '—' : n >= 0 ? `+${v}` : String(v) }

  // Fixed 9 stats + dynamic extras discoverable via ⚙
  const ALL_STATS = [
    { k:'torneios',   l:'TORNEIOS',    v: String(stats2026.length || '—'),                                      c: t.text },
    { k:'ult_score',  l:'ÚLT. SCORE',  v: s26LastScore != null ? String(s26LastScore) : '—',                    c: t.text },
    { k:'avg_score',  l:'MÉDIA SCORE', v: s26AvgScore  != null ? s26AvgScore : '—',                             c: t.text },
    { k:'best_score', l:'MELHOR',      v: s26BestScore != null ? String(s26BestScore) : '—',                    c: '#10b981' },
    { k:'best_pos',   l:'MELHOR POS.', v: s26BestPos   != null ? `#${s26BestPos}` : '—',                        c: '#6366f1' },
    { k:'top10',      l:'TOP 10',      v: s26Top10 > 0 ? `${s26Top10}×` : '0×',                                c: s26Top10 > 0 ? '#f59e0b' : t.textMuted },
    { k:'fairways',   l:'FAIRWAYS',    v: s26AvgFw    != null ? `${s26AvgFw}%` : '—',                           c: t.text },
    { k:'gir',        l:'GIR',         v: s26AvgGir   != null ? `${s26AvgGir}%` : '—',                          c: t.text },
    { k:'putts',      l:'PUTTS/RND',   v: s26AvgPutts != null ? s26AvgPutts : '—',                             c: t.text },
  ]
  const DEFAULT_STAT_KEYS = ALL_STATS.map(s => s.k)
  const activeStatKeys = statPrefs || DEFAULT_STAT_KEYS
  const activeStats = ALL_STATS.filter(s => activeStatKeys.includes(s.k))

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .hm-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .hm-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
        .hm-main{display:grid;grid-template-columns:1fr 360px;gap:10px}
        .hm-left{display:flex;flex-direction:column;gap:10px}
        .hm-right{display:flex;flex-direction:column;gap:10px}
        .hm-stats{display:flex;flex-direction:row;flex-wrap:nowrap;overflow-x:auto;align-items:stretch}
        .hm-epoch-row{display:flex;gap:10px;margin-bottom:10px;align-items:stretch}
        .hm-agenda-cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
        @media(max-width:768px){
          .hm-main{grid-template-columns:1fr}
          .hm-grid2{grid-template-columns:1fr}
          .hm-epoch-row{flex-direction:column}
          .hm-agenda-cols{grid-template-columns:1fr}
          .hm-stats{flex-wrap:wrap}
        }
        @media(max-width:540px){
          .hm-grid3{grid-template-columns:1fr 1fr}
        }
      `}</style>

      {/* ── KPI MODAL ── */}
      {kpiModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:'20px' }}
          onClick={e => { if (e.target===e.currentTarget) setKpiModal(null) }}>
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:'14px',padding:'24px',width:'100%',maxWidth:'480px',maxHeight:'80vh',overflowY:'auto' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
              <div>
                <div style={{ fontSize:'10px',letterSpacing:'2px',color:kpiModal.color,fontWeight:600,marginBottom:'2px' }}>{kpiModal.label}</div>
                <div style={{ fontSize:'22px',fontWeight:900,color:t.text,lineHeight:1 }}>
                  {kpiModal.allEntries.length ? kpiModal.allEntries[kpiModal.allEntries.length-1].value : '—'}
                  <span style={{ fontSize:'13px',color:t.textMuted,marginLeft:'4px' }}>{kpiModal.unit}</span>
                </div>
              </div>
              <button onClick={()=>setKpiModal(null)} style={{ background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'6px 12px',cursor:'pointer',fontFamily:F,fontSize:'12px' }}>Fechar</button>
            </div>
            {kpiModal.allEntries.length >= 2 && <div style={{ marginBottom:'16px' }}><MiniSpark pts={kpiModal.allEntries} t={t} color={kpiModal.color} /></div>}
            <div className="hm-grid3" style={{ marginBottom:'16px' }}>
              {[
                { l:'MELHOR', v: kpiModal.allEntries.length ? Math.max(...kpiModal.allEntries.map(e=>parseFloat(e.value))).toFixed(2) : '—' },
                { l:'MÍNIMO', v: kpiModal.allEntries.length ? Math.min(...kpiModal.allEntries.map(e=>parseFloat(e.value))).toFixed(2) : '—' },
                { l:'REGISTOS', v: kpiModal.allEntries.length },
              ].map(item => (
                <div key={item.l} style={{ background:t.bg,borderRadius:'8px',padding:'10px 12px' }}>
                  <div style={{ fontSize:'8px',letterSpacing:'2px',color:t.textMuted,marginBottom:'4px',fontWeight:600 }}>{item.l}</div>
                  <div style={{ fontSize:'18px',fontWeight:800,color:t.text }}>{item.v}<span style={{ fontSize:'10px',color:t.textMuted,marginLeft:'2px' }}>{item.l!=='REGISTOS'?kpiModal.unit:''}</span></div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'8px' }}>HISTÓRICO COMPLETO</div>
            <div style={{ display:'flex',flexDirection:'column',gap:'4px',maxHeight:'200px',overflowY:'auto' }}>
              {[...kpiModal.allEntries].reverse().map((e, i) => {
                const prev = kpiModal.allEntries[kpiModal.allEntries.length - 2 - i]
                const d = prev ? (parseFloat(e.value) - parseFloat(prev.value)).toFixed(2) : null
                return (
                  <div key={e.id||i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:'6px',background:t.bg,border:`1px solid ${t.border}` }}>
                    <div style={{ fontSize:'12px',color:t.textMuted }}>{new Date(e.entry_date+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'})}</div>
                    <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
                      {d !== null && <div style={{ fontSize:'10px',color:parseFloat(d)>=0?'#52E8A0':'#f87171',fontWeight:600 }}>{parseFloat(d)>=0?'+':''}{d}{kpiModal.unit}</div>}
                      <div style={{ fontSize:'14px',fontWeight:800,color:t.text }}>{e.value}<span style={{ fontSize:'10px',color:t.textMuted,marginLeft:'2px' }}>{kpiModal.unit}</span></div>
                    </div>
                  </div>
                )
              })}
              {!kpiModal.allEntries.length && <div style={{ fontSize:'12px',color:t.textMuted,fontStyle:'italic',padding:'12px' }}>Sem registos.</div>}
            </div>
            <div style={{ display:'flex',gap:'6px',marginTop:'14px',paddingTop:'14px',borderTop:`1px solid ${t.border}` }}>
              <button onClick={()=>{ moveKpi(kpiModal.id,'up') }} style={{ background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F }}>↑ Subir</button>
              <button onClick={()=>{ moveKpi(kpiModal.id,'down') }} style={{ background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F }}>↓ Descer</button>
              <div style={{ fontSize:'10px',color:t.textMuted,marginLeft:'auto',display:'flex',alignItems:'center' }}>{savingPrefs ? 'A guardar...' : 'Ordem guardada'}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      {editingAthlete ? (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
            {[['hcp','Handicap'],['wagr','WAGR'],['club','Clube'],['category','Categoria'],['fed','Federação'],['fed_num','Nº Federado']].map(([k,l]) => (
              <div key={k}>
                <div style={{ fontSize: '8px', color: t.textMuted, marginBottom: '3px', letterSpacing: '1px' }}>{l.toUpperCase()}</div>
                <input value={athleteForm[k] || ''} onChange={e => setAthleteForm(p => ({...p,[k]:e.target.value}))} style={inp} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={saveAthlete} disabled={athleteSaving} style={{ background: '#378ADD', border: 'none', borderRadius: '6px', color: '#fff', padding: '6px 16px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: F, opacity: athleteSaving ? 0.7 : 1 }}>{athleteSaving ? 'A GUARDAR...' : 'GUARDAR'}</button>
            <button onClick={() => setEditingAthlete(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '6px 16px', fontSize: '11px', cursor: 'pointer', fontFamily: F }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '12px' }}>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#378ADD', fontWeight: 600, marginBottom: '3px' }}>PERFORMANCE · GOLF</div>
            <div style={{ fontSize: '19px', fontWeight: 700, color: t.text, lineHeight: 1.2 }}>Francisca Salgado</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {[
                { label: 'HCP',   value: athlete.hcp || '—',      color: '#378ADD' },
                { label: 'WAGR',  value: athlete.wagr || '—',     color: t.text },
                { label: 'CLUBE', value: athlete.club || '—',     color: t.text },
                { label: 'CAT.',  value: athlete.category || '—', color: t.text },
                { label: 'FED',   value: athlete.fed_num || '—',  color: t.text },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '8px', letterSpacing: '2px', color: t.textMuted, marginBottom: '2px', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button onClick={() => { setAthleteForm({...athlete}); setEditingAthlete(true) }} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '4px', color: t.textMuted, padding: '2px 7px', fontSize: '9px', cursor: 'pointer', fontFamily: F, lineHeight: '1.4' }}>Editar perfil</button>
              <a href="https://www.wagr.com/playerprofile/francisca-salgado-43158" target="_blank" rel="noreferrer" style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '4px', color: t.textMuted, padding: '2px 7px', fontSize: '9px', fontFamily: F, textDecoration: 'none', lineHeight: '1.4', display: 'inline-block' }}>WAGR ↗</a>
              <a href="https://portal.fpg.pt/handicaps-course-rating/pesquisa-de-handicaps/" target="_blank" rel="noreferrer" style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '4px', color: t.textMuted, padding: '2px 7px', fontSize: '9px', fontFamily: F, textDecoration: 'none', lineHeight: '1.4', display: 'inline-block' }}>FPG ↗</a>
            </div>
          </div>
        </div>
      )}

      {/* ── LINHA 1 — ÉPOCA 2026 + MELHOR RESULTADO (cards side-by-side) ── */}
      <div className="hm-epoch-row">

        {/* Card ÉPOCA 2026 */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '12px 16px', flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:t.textMuted, fontWeight:600 }}>ÉPOCA 2026</div>
            <div style={{ position:'relative' }}>
              <button onClick={() => setStatPanelOpen(v => !v)}
                style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:'4px', color:t.textMuted, padding:'2px 8px', fontSize:'9px', cursor:'pointer', fontFamily:F, lineHeight:'1.4' }}>
                ⚙ Configurar
              </button>
              {statPanelOpen && (
                <>
                  <div onClick={() => setStatPanelOpen(false)} style={{ position:'fixed', inset:0, zIndex:10 }} />
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 4px)', zIndex:20, background:t.surface, border:`1px solid ${t.border}`, borderRadius:'8px', padding:'10px 12px', minWidth:'170px', boxShadow:'0 6px 24px rgba(0,0,0,0.35)' }}>
                    <div style={{ fontSize:'8px', letterSpacing:'1px', color:t.textMuted, marginBottom:'8px', fontWeight:600 }}>STATS VISÍVEIS</div>
                    {ALL_STATS.map(s => {
                      const checked = activeStatKeys.includes(s.k)
                      return (
                        <label key={s.k} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'3px 0', cursor:'pointer', fontSize:'11px', color:t.text }}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const next = e.target.checked ? [...activeStatKeys, s.k] : activeStatKeys.filter(k => k !== s.k)
                            setStatPrefs(next); saveStatPrefs(next)
                          }} style={{ accentColor:'#378ADD', cursor:'pointer' }} />
                          {s.l}
                        </label>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="hm-stats">
            {activeStats.map((item, i, arr) => (
              <div key={item.k} style={{ flex:1, padding:'0 10px', borderRight: i < arr.length - 1 ? `1px solid ${t.border}` : 'none', minWidth:'60px', textAlign:'center' }}>
                <div style={{ fontSize:'22px', fontWeight:900, color:item.c, lineHeight:1, whiteSpace:'nowrap' }}>{item.v}</div>
                <div style={{ fontSize:'9px', color:t.textMuted, marginTop:'4px', letterSpacing:'0.5px', textTransform:'uppercase' }}>{item.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Card MELHOR RESULTADO */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 18px', width:'220px', flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ fontSize:'8px', letterSpacing:'2px', color:'#5b8aff', fontWeight:600, marginBottom:'8px' }}>MELHOR RESULTADO</div>
          {bestResult ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                <span style={{ fontSize:'22px', lineHeight:1 }}>🏆</span>
                <div style={{ fontSize:'26px', fontWeight:900, lineHeight:1, color: parseFloat(bestResult.values?.score)<=0?'#52E8A0':'#f87171' }}>
                  {fmtScore(bestResult.values?.score)}
                </div>
                {isNewPR && (
                  <div style={{ fontSize:'9px', color:'#52E8A0', background:'#052a1a', borderRadius:'4px', padding:'2px 7px', fontWeight:700 }}>novo PR</div>
                )}
              </div>
              <div style={{ fontSize:'11px', fontWeight:600, color:t.text, marginBottom:'2px' }}>{bestResult.event_name || '—'}</div>
              <div style={{ fontSize:'10px', color:t.textMuted }}>
                {formatDate(bestResult.event_date)}{bestResult.values?.par ? ` · Par ${bestResult.values.par}` : ''}
              </div>
            </>
          ) : (
            <div style={{ fontSize:'11px', color:t.textMuted, fontStyle:'italic' }}>Sem dados</div>
          )}
        </div>

      </div>

      {/* ── AGENDA & ALERTAS — full width, 3 colunas ── */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'12px 16px', marginBottom:'10px' }}>
        <div style={{ fontSize:'9px', letterSpacing:'2px', color:t.textMuted, fontWeight:600, marginBottom:'10px' }}>AGENDA & ALERTAS</div>
        <div className="hm-agenda-cols">

          {/* Col 1 — Próximo treino com coach */}
          <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
            <div style={{ fontSize:'8px', letterSpacing:'1px', color:t.textMuted, fontWeight:600, marginBottom:'2px' }}>PRÓXIMO TREINO COM COACH</div>
            {[
              { label:'Golf Coach', date: nextGolfCoachDate, color:'#378ADD' },
              { label:'Gym Coach',  date: nextGymCoachDate,  color:'#52E8A0' },
            ].map(({ label, date, color }) => (
              <div key={label} onClick={() => onNavigate('training')} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background:t.bg, borderRadius:'7px', cursor:'pointer' }}>
                <div style={{ fontSize:'11px', color:t.textMuted }}>{label}</div>
                <div style={{ fontSize:'11px', fontWeight:700, color: date && date < todayStr ? '#f87171' : color }}>
                  {date ? formatDate(date) : '—'}
                </div>
              </div>
            ))}
          </div>

          {/* Col 2 — Programar treinos */}
          <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
            <div style={{ fontSize:'8px', letterSpacing:'1px', color:t.textMuted, fontWeight:600, marginBottom:'2px' }}>PROGRAMAR TREINOS</div>
            {(() => {
              const golfEnd = trainingPlans.filter(p=>p.plan_type==='golf').reduce((m,p)=>p.week_end>m?p.week_end:m,'')
              const gymEnd  = trainingPlans.filter(p=>p.plan_type==='gym').reduce((m,p)=>p.week_end>m?p.week_end:m,'')
              return [
                { label:'Golf — plano até', end: golfEnd },
                { label:'Gym — plano até',  end: gymEnd  },
              ].map(({ label, end }) => {
                const isOk = end >= todayStr
                const overdue = !end || end < todayStr
                const overdueDays = overdue && end ? Math.ceil((new Date(todayStr) - new Date(end+'T12:00:00')) / 86400000) : 0
                return (
                  <div key={label} onClick={() => onNavigate('training')} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background: overdue ? '#f8717108' : t.bg, border:`1px solid ${overdue ? '#f8717133' : t.border}`, borderRadius:'7px', cursor:'pointer' }}>
                    <div style={{ fontSize:'11px', color:t.textMuted }}>{label}</div>
                    {isOk
                      ? <div style={{ fontSize:'11px', fontWeight:700, color:'#52E8A0' }}>OK · {formatDate(end)}</div>
                      : <div style={{ fontSize:'11px', fontWeight:700, color:'#f87171', display:'flex', alignItems:'center', gap:'4px' }}>
                          <span>⚠</span>{overdueDays > 0 ? `${overdueDays}d em atraso` : 'Sem plano'}
                        </div>
                    }
                  </div>
                )
              })
            })()}
          </div>

          {/* Col 3 — Registar prioridades */}
          <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
            <div style={{ fontSize:'8px', letterSpacing:'1px', color:t.textMuted, fontWeight:600, marginBottom:'2px' }}>REGISTAR PRIORIDADES</div>
            {(() => {
              const overdueKpis = activeKpis.filter(k => k.isOverdue)
              return (
                <div onClick={() => onNavigate('performance')} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background: overdueKpis.length > 0 ? '#f8717108' : t.bg, border:`1px solid ${overdueKpis.length > 0 ? '#f8717133' : t.border}`, borderRadius:'7px', cursor:'pointer' }}>
                  <div style={{ fontSize:'11px', color:t.textMuted }}>KPIs de performance</div>
                  {overdueKpis.length > 0
                    ? <div style={{ fontSize:'11px', fontWeight:700, color:'#f87171', display:'flex', alignItems:'center', gap:'4px' }}><span>⚠</span>{overdueKpis.length} em atraso</div>
                    : <div style={{ fontSize:'11px', fontWeight:700, color:'#52E8A0' }}>OK · todos em dia</div>
                  }
                </div>
              )
            })()}
          </div>

        </div>
      </div>

      {/* ── MAIN GRID — esquerda + direita ── */}
      <div className="hm-main">
        <div className="hm-left">

          {/* Treino — 2 donuts + barra carga */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '12px 16px' }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:t.textMuted, fontWeight:600, marginBottom:'10px' }}>TREINO — DISTRIBUIÇÃO E CARGA</div>
            <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>

              {/* Donuts: 55% da largura */}
              <div style={{ flex:'0 0 55%', display:'flex', gap:'10px' }}>

                {/* Golf donut */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'8px', letterSpacing:'1px', color:'#6366f1', fontWeight:600, marginBottom:'6px' }}>GOLF</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <DonutChart segments={golfDonut} total={golfDonutTotal} t={t} />
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px', minWidth:0 }}>
                      {golfDonut.length === 0
                        ? <div style={{ fontSize:'10px', color:t.textMuted, fontStyle:'italic' }}>Sem dados</div>
                        : golfDonut.slice(0,5).map(seg => (
                          <div key={seg.label} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:seg.color, flexShrink:0 }}/>
                            <div style={{ fontSize:'10px', color:t.textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              {seg.label} <span style={{ fontWeight:700, color:t.text }}>{golfDonutTotal>0?Math.round(seg.value/golfDonutTotal*100):0}%</span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>

                {/* Gym donut */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'8px', letterSpacing:'1px', color:'#3b82f6', fontWeight:600, marginBottom:'6px' }}>GYM</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <DonutChart segments={gymDonut} total={gymDonutTotal} t={t} />
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px', minWidth:0 }}>
                      {gymDonut.length === 0
                        ? <div style={{ fontSize:'10px', color:t.textMuted, fontStyle:'italic' }}>Sem dados</div>
                        : gymDonut.slice(0,5).map(seg => (
                          <div key={seg.label} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:seg.color, flexShrink:0 }}/>
                            <div style={{ fontSize:'10px', color:t.textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              {seg.label} <span style={{ fontWeight:700, color:t.text }}>{gymDonutTotal>0?Math.round(seg.value/gymDonutTotal*100):0}%</span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>

              </div>

              {/* Barra carga semanal: 45% */}
              <div style={{ flex:'0 0 45%', minWidth:0 }}>
                <div style={{ fontSize:'8px', letterSpacing:'1px', color:t.textMuted, fontWeight:600, marginBottom:'6px' }}>CARGA SEMANAL</div>
                <WeeklyBarChart weeks={weeklyLoad} t={t} />
                <div style={{ display:'flex', gap:'8px', marginTop:'4px', flexWrap:'wrap' }}>
                  {[{c:'#52E8A0',l:'Actual'},{c:'#378ADD',l:'≥80%'},{c:'#f59e0b',l:'50–79%'},{c:'#f87171',l:'<50%'}].map(({c,l})=>(
                    <div key={l} style={{ display:'flex', alignItems:'center', gap:'3px' }}>
                      <div style={{ width:'7px', height:'7px', borderRadius:'2px', background:c }}/>
                      <span style={{ fontSize:'8px', color:t.textMuted }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Indicadores de Performance — 2 gráficos */}
          <div className="hm-grid2">
            <KpiLineChart entries={entries} t={t} F={F} cardStyle={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'12px 16px' }} />
            <KpiLineChart entries={entries} t={t} F={F} cardStyle={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'12px 16px' }} />
          </div>


        </div>

        <div className="hm-right">

          {/* Próximas Competições */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '12px 14px' }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:t.textMuted, fontWeight:600, marginBottom:'10px' }}>PRÓXIMAS COMPETIÇÕES</div>
            {upcomingEvents.length === 0 ? (
              <div style={{ fontSize:'11px', color:t.textMuted, fontStyle:'italic' }}>Sem eventos</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {upcomingEvents.slice(0,3).map(ev => {
                  const d = Math.ceil((new Date(ev.start_date) - new Date()) / 86400000)
                  return (
                    <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'7px 10px', background:t.bg, borderRadius:'8px', border:`1px solid ${d<=14?'#f59e0b33':t.border}` }}>
                      <div style={{ textAlign:'center', flexShrink:0, minWidth:'36px' }}>
                        <div style={{ fontSize:'26px', fontWeight:900, color:d<=14?'#f59e0b':'#378ADD', lineHeight:1 }}>{d}</div>
                        <div style={{ fontSize:'7px', color:t.textMuted, letterSpacing:'0.5px', fontWeight:600 }}>DIAS</div>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'10px', fontWeight:600, color:t.text, lineHeight:'1.3' }}>{ev.title}</div>
                        <div style={{ fontSize:'9px', color:t.textMuted }}>{formatDate(ev.start_date)}{ev.end_date&&ev.end_date!==ev.start_date?` – ${formatDate(ev.end_date)}`:''}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Evolução HCP */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'12px 16px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'90px', gap:'6px', opacity:0.6 }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:'#378ADD', fontWeight:700 }}>EVOLUÇÃO HCP</div>
            <div style={{ fontSize:'10px', color:t.textMuted, fontStyle:'italic' }}>Em breve — S2</div>
          </div>

          {/* Evolução WAGR */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'12px 16px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'90px', gap:'6px', opacity:0.6 }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:'#52E8A0', fontWeight:700 }}>EVOLUÇÃO WAGR</div>
            <div style={{ fontSize:'10px', color:t.textMuted, fontStyle:'italic' }}>Em breve — S2</div>
          </div>

        </div>
      </div>
    </div>
  )
}