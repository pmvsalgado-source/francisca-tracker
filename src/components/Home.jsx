import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { calcCurrentPhase } from '../lib/periodization'

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

function MiniSpark({ pts, color = '#378ADD' }) {
  if (pts.length < 2) return null
  const vals = pts.map(p => parseFloat(p.value))
  const minV = Math.min(...vals), maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const VW = 100, VH = 36
  const pad = { t: 4, r: 4, b: 4, l: 4 }
  const cw = VW - pad.l - pad.r, ch = VH - pad.t - pad.b
  const xOf = i => pad.l + (i / (pts.length - 1)) * cw
  const yOf = v => pad.t + ch - ((v - minV) / range) * ch
  const polyPoints = pts.map((p, i) => `${xOf(i)},${yOf(parseFloat(p.value))}`).join(' ')
  const lx = xOf(pts.length - 1), ly = yOf(vals[vals.length - 1])
  return (
    <svg width="100%" height="36" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none"
      style={{ display: 'block', maxWidth: '100%', overflow: 'hidden' }}>
      <polyline points={polyPoints} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  )
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
  return <canvas ref={canvasRef} style={{ width: 'min(130px, 100%)', height: '130px', display: 'block', flexShrink: 0 }} />
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
  const [todayChecked, setTodayChecked] = useState({})
  const [wagrHistory, setWagrHistory] = useState([])

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
      supabase.from('wagr_history').select('*').eq('user_id', user.id).then(({ data }) => setWagrHistory(data || []))
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

  const hcpDelta = athlete.prev_hcp && athlete.hcp && athlete.hcp !== '—'
    ? (parseFloat(athlete.hcp) - parseFloat(athlete.prev_hcp)).toFixed(1)
    : null
  const wagrDelta = athlete.prev_wagr && athlete.wagr && athlete.wagr !== '—' && athlete.prev_wagr !== '—'
    ? parseInt(athlete.wagr) - parseInt(athlete.prev_wagr)
    : null

  // WAGR from wagr_history (latest entry by year/week)
  const sortedWagrH = [...wagrHistory].sort((a, b) => (b.year * 100 + b.week) - (a.year * 100 + a.week))
  const latestWagrH = sortedWagrH[0]
  const prevWagrH   = sortedWagrH[1]
  const wagrRank    = latestWagrH?.rank ?? null
  const wagrDeltaH  = (wagrRank != null && prevWagrH?.rank != null) ? wagrRank - prevWagrH.rank : null
  const displayWagr = wagrRank != null ? String(wagrRank) : (athlete.wagr || '—')
  const displayWagrDelta = wagrDeltaH ?? wagrDelta

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

  const compPeriodStart = (() => {
    const now = new Date()
    if (compPeriod === '30d') { const d = new Date(now); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0] }
    if (compPeriod === '90d') { const d = new Date(now); d.setDate(d.getDate()-90); return d.toISOString().split('T')[0] }
    if (compPeriod === '1y') { const d = new Date(now); d.setFullYear(d.getFullYear()-1); return d.toISOString().split('T')[0] }
    return null
  })()
  const filteredCompStats = compPeriodStart ? compStats.filter(s => s.event_date >= compPeriodStart) : compStats

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

  const scoresAll = compStats.filter(s => {
    const sc = s.values?.score
    return sc !== undefined && sc !== null && String(sc).trim() !== '' && !isNaN(parseFloat(sc))
  })
  const bestResult = scoresAll.length > 0
    ? scoresAll.reduce((best, s) => parseFloat(s.values.score) < parseFloat(best.values.score) ? s : best)
    : null
  const isNewPR = bestResult && compStats.length > 0 && compStats[0]?.id === bestResult?.id

  const isCompEvent = e => (e.category||'').toLowerCase().includes('competi') || (e.title||'').toLowerCase().includes('torneio')
  const upcomingComps = events.filter(e => e.start_date >= todayStr && !['cancelled','cancelado'].includes(e.status||'')).filter(isCompEvent).slice(0, 5)
  const slotAItems = upcomingComps.length > 0 ? upcomingComps : upcomingEvents.slice(0, 5)

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

  // ── New computed values for Option-B layout ───────────────────────────────

  const phaseInfo = calcCurrentPhase(events)

  // 7-day week (Mon–Sun starting from weekStartDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate)
    d.setDate(weekStartDate.getDate() + i)
    return d
  })

  // Today's checklist: plan sessions + calendar events
  const todayDayIndex = todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1
  const todayPlanDay = currentPlan?.days && Array.isArray(currentPlan.days)
    ? currentPlan.days[todayDayIndex]
    : null
  const todayCalEvents = events.filter(e => e.start_date <= todayStr && (e.end_date || e.start_date) >= todayStr)

  const todayTasks = (() => {
    const tasks = []
    todayPlanDay?.sessions?.forEach(session => {
      if (session.isRest) return
      const isCoach = session.session_type === 'coach'
      const type = currentPlan?.plan_type === 'gym' ? 'Ginásio' : 'Golf'
      tasks.push({
        label: isCoach ? `Treino com Coach — ${type}` : `Treino ${type}`,
        detail: session.cat || session.name || '',
        color: currentPlan?.plan_type === 'gym' ? '#52E8A0' : '#378ADD',
      })
    })
    todayCalEvents.forEach(e => {
      const isComp = isCompEvent(e)
      const cat = (e.category || '').toLowerCase()
      const isGolf = !isComp && (cat.includes('treino') || cat.includes('camp'))
      tasks.push({
        label: e.title || 'Evento',
        detail: isComp ? 'Competição' : isGolf ? 'Golf' : e.category || '',
        color: isComp ? '#ef4444' : isGolf ? '#378ADD' : '#52E8A0',
        badge: isComp ? 'COMP' : null,
        badgeColor: '#ef4444',
      })
    })
    return tasks
  })()

  // Next competition
  console.log('[competitions]', events.filter(e => (e.category||'').toLowerCase().includes('competi')).map(e => ({ name: e.title, date: e.start_date || e.date, category: e.category })))
  console.log('[today]', new Date().toISOString())
  const nextCompetition = events
    .filter(e => isCompEvent(e) && e.start_date >= todayStr && !['cancelled','cancelado'].includes(e.status || ''))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null
  const daysToNextComp = nextCompetition
    ? Math.max(0, Math.ceil((new Date(nextCompetition.start_date) - new Date()) / 86400000))
    : null

  // Performance snapshot — HCP · WAGR · Vel. Swing
  const snapshotKpis = (() => {
    const kpis = []

    // HCP (lower = better, so ↓ is good)
    if (athlete.hcp && athlete.hcp !== '—') {
      const hcpVal = parseFloat(athlete.hcp)
      const hcpPrev = athlete.prev_hcp ? parseFloat(athlete.prev_hcp) : null
      const diff = hcpPrev != null ? hcpVal - hcpPrev : 0
      kpis.push({
        id: 'hcp', label: 'HCP', unit: '', color: '#378ADD',
        value: athlete.hcp,
        trend: hcpPrev == null ? '→' : diff < -0.05 ? '↑' : diff > 0.05 ? '↓' : '→',
        pts: [],
      })
    }

    // WAGR from wagr_history (lower rank = better, so ↓ rank is good)
    if (wagrRank != null) {
      const diff = wagrDeltaH ?? 0
      kpis.push({
        id: 'wagr', label: 'WAGR', unit: '', color: '#52E8A0',
        value: String(wagrRank),
        trend: wagrDeltaH == null ? '→' : diff < 0 ? '↑' : diff > 0 ? '↓' : '→',
        pts: sortedWagrH.slice(0, 8).reverse().map(h => ({ entry_date: h.reference_date || `${h.year}-01-01`, value: String(h.rank) })).filter(h => h.value !== 'null'),
      })
    }

    // Vel. Swing from entries
    const swingEntries = entries.filter(e => e.metric_id === 'swing_speed' && e.value && e.entry_date)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    if (swingEntries.length) {
      const last = swingEntries[swingEntries.length - 1]
      const prev = swingEntries[swingEntries.length - 2]
      const diff = prev ? parseFloat(last.value) - parseFloat(prev.value) : 0
      kpis.push({
        id: 'swing_speed', label: 'VEL. SWING', unit: 'mph', color: '#a855f7',
        value: last.value,
        trend: !prev ? '→' : diff > 0.05 ? '↑' : diff < -0.05 ? '↓' : '→',
        pts: swingEntries.slice(-8),
      })
    }

    return kpis.slice(0, 3)
  })()

  // Recovery & support events (last 30 days)
  const thirtyDaysAgoStr = (() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0] })()
  const RECOVERY_KW = ['massagem','massage','fisio','physio','mental','recuper','recovery','reiki','psicolog']
  const recoveryEvents = events.filter(e => {
    if (e.start_date < thirtyDaysAgoStr) return false
    const title = (e.title || '').toLowerCase()
    return RECOVERY_KW.some(kw => title.includes(kw))
  })
  const showRecovery = recoveryEvents.length > 0 || phaseInfo.restAlertLevel === 'red'

  // Alert colour
  const alertColor = phaseInfo.restAlertLevel === 'red' ? '#f87171'
    : phaseInfo.restAlertLevel === 'yellow' ? '#f59e0b'
    : '#52E8A0'
  const alertBorder = phaseInfo.restAlert ? alertColor : t.border

  // Day labels Mon–Sun
  const DAY_LABELS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .hm2-main{display:grid;grid-template-columns:1fr 320px;gap:12px}
        .hm2-left{display:flex;flex-direction:column;gap:12px}
        .hm2-right{display:flex;flex-direction:column;gap:12px}
        .hm2-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
        .hm-athlete-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
        @media(max-width:768px){
          .hm2-main{grid-template-columns:1fr}
          .hm2-grid3{grid-template-columns:1fr 1fr}
          .hm-athlete-grid{grid-template-columns:repeat(2,1fr)}
        }
        @media(max-width:480px){
          .hm2-grid3{grid-template-columns:1fr}
          .hm-athlete-grid{grid-template-columns:1fr}
        }
      `}</style>

      {/* ── KPI MODAL (preserved) ── */}
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
            {kpiModal.allEntries.length >= 2 && <div style={{ marginBottom:'16px', overflow:'hidden' }}><MiniSpark pts={kpiModal.allEntries} color={kpiModal.color} /></div>}
            <div className="hm2-grid3" style={{ marginBottom:'16px' }}>
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

      {/* ── 1. HEADER ── */}
      <div style={{ marginBottom:'14px' }}>
        {editingAthlete ? (
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'16px' }}>
            <div className="hm-athlete-grid">
              {[['hcp','Handicap'],['wagr','WAGR'],['club','Clube'],['category','Categoria'],['fed','Federação'],['fed_num','Nº Federado']].map(([k,l]) => (
                <div key={k}>
                  <div style={{ fontSize:'8px', color:t.textMuted, marginBottom:'3px', letterSpacing:'1px' }}>{l.toUpperCase()}</div>
                  <input value={athleteForm[k] || ''} onChange={e => setAthleteForm(p => ({...p,[k]:e.target.value}))} style={inp} />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={saveAthlete} disabled={athleteSaving} style={{ background:'#378ADD', border:'none', borderRadius:'6px', color:'#fff', padding:'6px 16px', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:F, opacity:athleteSaving?0.7:1 }}>{athleteSaving ? 'A GUARDAR...' : 'GUARDAR'}</button>
              <button onClick={() => setEditingAthlete(false)} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:'6px', color:t.textMuted, padding:'6px 16px', fontSize:'11px', cursor:'pointer', fontFamily:F }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap' }}>
            {/* Name + HCP + WAGR */}
            <div style={{ display:'flex', alignItems:'center', gap:'20px', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:'9px', letterSpacing:'3px', color:'#378ADD', fontWeight:700, marginBottom:'2px' }}>PERFORMANCE · GOLF</div>
                <div style={{ fontSize:'20px', fontWeight:800, color:t.text, lineHeight:1 }}>{profile?.name || 'Francisca Salgado'}</div>
              </div>
              <div style={{ display:'flex', gap:'16px' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'8px', letterSpacing:'1px', color:'#378ADD', fontWeight:700, marginBottom:'2px' }}>HCP</div>
                  <div style={{ fontSize:'20px', fontWeight:900, color:t.text, lineHeight:1 }}>{athlete.hcp || '—'}</div>
                  {hcpDelta && <div style={{ fontSize:'10px', color:parseFloat(hcpDelta)<0?'#52E8A0':'#f87171', marginTop:'1px' }}>{parseFloat(hcpDelta)<0?'▼':'▲'} {Math.abs(parseFloat(hcpDelta))}</div>}
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'8px', letterSpacing:'1px', color:'#52E8A0', fontWeight:700, marginBottom:'2px' }}>WAGR</div>
                  <div style={{ fontSize:'20px', fontWeight:900, color:t.text, lineHeight:1 }}>{displayWagr}</div>
                  {displayWagrDelta != null && <div style={{ fontSize:'10px', color:displayWagrDelta<0?'#52E8A0':'#f87171', marginTop:'1px' }}>{displayWagrDelta<0?'▼':'▲'} {Math.abs(displayWagrDelta)}</div>}
                </div>
              </div>
            </div>
            {/* Action buttons */}
            <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
              <button style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:'8px', color:t.textMuted, padding:'6px 10px', cursor:'default', fontSize:'14px', lineHeight:1 }} title="Notificações (em breve)">🔔</button>
              <button onClick={() => { setAthleteForm({...athlete}); setEditingAthlete(true) }} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:'8px', color:t.textMuted, padding:'6px 10px', cursor:'pointer', fontSize:'14px', lineHeight:1 }} title="Editar perfil">⚙</button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. HERO — FASE ATUAL ── */}
      <div style={{ background: phaseInfo.phaseColor, borderRadius:'16px', padding:'28px 32px', marginBottom:'14px' }}>
        <div style={{ fontSize:'9px', letterSpacing:'3px', color:'rgba(255,255,255,0.65)', fontWeight:700, marginBottom:'8px' }}>FASE ATUAL</div>
        <div style={{ fontSize:'52px', fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'-1px', marginBottom:'12px' }}>
          {phaseInfo.phase.replace(/_/g, ' ')}
        </div>
        {phaseInfo.daysToNextCompetition != null ? (
          <div style={{ display:'inline-flex', alignItems:'baseline', gap:'8px', background:'rgba(0,0,0,0.18)', borderRadius:'10px', padding:'8px 16px', marginBottom:'14px' }}>
            <span style={{ fontSize:'36px', fontWeight:900, color:'#fff', lineHeight:1 }}>{phaseInfo.daysToNextCompetition}</span>
            <span style={{ fontSize:'14px', color:'rgba(255,255,255,0.85)', fontWeight:600 }}>dias para competir</span>
          </div>
        ) : (
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', marginBottom:'14px', fontStyle:'italic' }}>Sem competições agendadas</div>
        )}
        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.75)', fontWeight:500 }}>{phaseInfo.recommendedTrainingFocus}</div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="hm2-main">

        {/* ── LEFT COLUMN ── */}
        <div className="hm2-left">

          {/* ── 3. HOJE ── */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'14px 16px' }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:t.textMuted, fontWeight:600, marginBottom:'12px' }}>
              HOJE — {todayDate.toLocaleDateString('pt-PT', { weekday:'long', day:'2-digit', month:'short' }).toUpperCase()}
            </div>
            {todayTasks.length === 0 ? (
              <div style={{ fontSize:'12px', color:t.textMuted, fontStyle:'italic' }}>Sem tarefas agendadas para hoje.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {todayTasks.map((task, i) => (
                  <label key={i} style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', userSelect:'none' }}>
                    <input
                      type="checkbox"
                      checked={!!todayChecked[i]}
                      onChange={() => setTodayChecked(p => ({...p, [i]: !p[i]}))}
                      style={{ accentColor: task.color || t.accent, width:'15px', height:'15px', cursor:'pointer', flexShrink:0 }}
                    />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color: todayChecked[i] ? t.textMuted : t.text, textDecoration: todayChecked[i] ? 'line-through' : 'none' }}>{task.label}</div>
                      {task.detail && <div style={{ fontSize:'10px', color:t.textMuted, marginTop:'1px' }}>{task.detail}</div>}
                    </div>
                    {task.badge && (
                      <div style={{ fontSize:'9px', color:task.badgeColor||t.accent, background:(task.badgeColor||t.accent)+'22', borderRadius:'4px', padding:'2px 7px', flexShrink:0, fontWeight:700, letterSpacing:'0.5px' }}>{task.badge}</div>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ── 4. SEMANA ── */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'14px 16px' }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:t.textMuted, fontWeight:600, marginBottom:'12px' }}>ESTA SEMANA</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
              {weekDays.map((day, i) => {
                const ds = day.toISOString().split('T')[0]
                const dayEvts = events.filter(e => e.start_date <= ds && (e.end_date || e.start_date) >= ds)
                const isToday = ds === todayStr
                const isPast  = ds < todayStr
                const hasComp = dayEvts.some(e => isCompEvent(e))
                const hasGolf = dayEvts.some(e => { const c = (e.category||'').toLowerCase(); return !isCompEvent(e) && (c.includes('treino') || c.includes('camp')) })
                const hasGym  = dayEvts.some(e => (e.category||'').toLowerCase().includes('gym'))
                const dotColor = hasComp ? '#ef4444' : hasGolf ? '#378ADD' : hasGym ? '#52E8A0' : null
                return (
                  <div key={i} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'8px', color:isToday ? t.accent : t.textMuted, fontWeight:isToday?700:400, marginBottom:'5px', letterSpacing:'0.3px' }}>{DAY_LABELS[i]}</div>
                    <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:isToday ? t.accent+'22' : 'transparent', border:isToday ? `2px solid ${t.accent}` : `1px solid ${dotColor ? dotColor+'55' : t.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>
                      {dotColor
                        ? <div style={{ width:'9px', height:'9px', borderRadius:'50%', background:dotColor, opacity:isPast?0.55:1 }} />
                        : <div style={{ fontSize:'9px', color:isPast?t.textFaint:t.textMuted }}>{day.getDate()}</div>
                      }
                    </div>
                    {dayEvts.length > 0 && (
                      <div style={{ fontSize:'7px', color:dotColor||t.textMuted, marginTop:'3px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'34px', margin:'3px auto 0' }}>
                        {dayEvts[0].title?.slice(0,5)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display:'flex', gap:'12px', marginTop:'10px', flexWrap:'wrap' }}>
              {[{c:'#ef4444',l:'Comp.'},{c:'#378ADD',l:'Golf'},{c:'#52E8A0',l:'Gym'}].map(({c,l}) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:c }} />
                  <span style={{ fontSize:'9px', color:t.textMuted }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 5. PRÓXIMA COMPETIÇÃO ── */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'14px 16px' }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:t.textMuted, fontWeight:600, marginBottom:'10px' }}>PRÓXIMA COMPETIÇÃO</div>
            {nextCompetition ? (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                  <div style={{ textAlign:'center', flexShrink:0, minWidth:'52px' }}>
                    <div style={{ fontSize:'40px', fontWeight:900, lineHeight:1, color: daysToNextComp <= 7 ? '#ef4444' : daysToNextComp <= 14 ? '#f59e0b' : '#378ADD' }}>{daysToNextComp}</div>
                    <div style={{ fontSize:'8px', letterSpacing:'1px', color:t.textMuted, fontWeight:600 }}>DIAS</div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'14px', fontWeight:700, color:t.text, lineHeight:'1.3', marginBottom:'4px' }}>{nextCompetition.title}</div>
                    <div style={{ fontSize:'11px', color:t.textMuted }}>
                      {formatDate(nextCompetition.start_date)}{nextCompetition.end_date && nextCompetition.end_date !== nextCompetition.start_date ? ` – ${formatDate(nextCompetition.end_date)}` : ''}
                    </div>
                    {nextCompetition.location && <div style={{ fontSize:'10px', color:t.textFaint, marginTop:'2px' }}>📍 {nextCompetition.location}</div>}
                  </div>
                </div>
                {phaseInfo.phase === 'PEAK' && (
                  <div style={{ marginTop:'10px', padding:'8px 12px', background:'#ef444415', border:'1px solid #ef444433', borderRadius:'8px', fontSize:'11px', color:'#ef4444', fontWeight:600 }}>
                    🏁 Competição esta semana — executar o plano sem mudanças
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize:'12px', color:t.textMuted, fontStyle:'italic' }}>Sem competições agendadas.</div>
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="hm2-right">

          {/* ── 6. ESTADO DE CARGA ── */}
          <div style={{ background:t.surface, border:`1.5px solid ${alertBorder}`, borderRadius:'12px', padding:'14px 16px' }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:t.textMuted, fontWeight:600, marginBottom:'10px' }}>ESTADO DE CARGA</div>
            {phaseInfo.restAlert ? (
              <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                <div style={{ fontSize:'24px', lineHeight:1, flexShrink:0 }}>{phaseInfo.restAlertLevel === 'red' ? '🔴' : '🟡'}</div>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:alertColor, marginBottom:'4px' }}>
                    {phaseInfo.restAlertLevel === 'red' ? 'Carga crítica' : 'Carga elevada'}
                  </div>
                  <div style={{ fontSize:'11px', color:t.textMuted, lineHeight:1.5 }}>{phaseInfo.reason}</div>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ fontSize:'22px', lineHeight:1 }}>✅</div>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#52E8A0' }}>Carga equilibrada ✓</div>
              </div>
            )}
          </div>

          {/* ── 7. PERFORMANCE SNAPSHOT ── */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'14px 16px', overflow:'hidden' }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:t.textMuted, fontWeight:600, marginBottom:'12px' }}>PERFORMANCE SNAPSHOT</div>
            {snapshotKpis.length === 0 ? (
              <div style={{ fontSize:'12px', color:t.textMuted, fontStyle:'italic' }}>Sem dados de performance.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {snapshotKpis.map(kpi => (
                  <div key={kpi.id} style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'8px', letterSpacing:'1.5px', color:t.textMuted, fontWeight:600, marginBottom:'2px' }}>{kpi.label}</div>
                      <div style={{ display:'flex', alignItems:'baseline', gap:'4px' }}>
                        <div style={{ fontSize:'22px', fontWeight:900, color:kpi.color, lineHeight:1 }}>{kpi.value}</div>
                        <div style={{ fontSize:'11px', color:t.textMuted }}>{kpi.unit}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:'20px', color:kpi.trend==='↑'?'#52E8A0':kpi.trend==='↓'?'#f87171':t.textMuted, flexShrink:0, fontWeight:700 }}>{kpi.trend}</div>
                    {kpi.pts.length >= 2 && (
                      <div style={{ width:'56px', minWidth:0, flexShrink:0, overflow:'hidden' }}>
                        <MiniSpark pts={kpi.pts} color={kpi.color} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 8. RECOVERY & SUPPORT ── */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'14px 16px' }}>
            <div style={{ fontSize:'9px', letterSpacing:'2px', color:t.textMuted, fontWeight:600, marginBottom:'10px' }}>RECOVERY & SUPPORT</div>
            {recoveryEvents.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {recoveryEvents.map((e, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:t.bg, borderRadius:'7px' }}>
                    <div style={{ fontSize:'11px', color:t.text, fontWeight:600 }}>{e.title}</div>
                    <div style={{ fontSize:'10px', color:t.textMuted }}>{formatDate(e.start_date)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div style={{ fontSize:'11px', color:t.textMuted, fontStyle:'italic', marginBottom:'12px' }}>
                  {phaseInfo.restAlertLevel === 'red'
                    ? 'Carga crítica — agendar sessão de recuperação.'
                    : 'Sem sessões registadas nos últimos 30 dias.'}
                </div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {['Massagem', 'Physio', 'Mental Coach'].map(type => (
                    <button key={type} onClick={() => onNavigate && onNavigate('calendar')}
                      style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:'8px', color:t.textMuted, padding:'5px 12px', fontSize:'11px', cursor:'pointer', fontFamily:F, fontWeight:500 }}>
                      + {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
