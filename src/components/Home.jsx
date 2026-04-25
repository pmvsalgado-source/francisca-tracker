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

// Mini sparkline for KPI modal history
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

const PERIOD_OPTIONS = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '3 meses' },
  { key: 'all', label: 'Tudo' },
]

export default function Home({ theme, t, onNavigate, onRegister, user, profile, lang = 'en' }) {
  const [entries, setEntries] = useState([])
  const [events, setEvents] = useState([])
  const [trainingPlans, setTrainingPlans] = useState([])
  const [compStats, setCompStats] = useState([])
  const [period, setPeriod] = useState('30d')
  const [kpiModal, setKpiModal] = useState(null) // { id, label, unit, entries }
  const [kpiPrefs, setKpiPrefs] = useState(null) // from Supabase
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [kpiOrder, setKpiOrder] = useState(['smash_factor','carry','stack_speed','deadlift','medball','thoracic'])

  const ATHLETE_DEFAULTS = { hcp: '1.1', wagr: '—', club: 'Vale de Janelas', category: 'Sub-18', fed: 'FPG', fed_num: '43832' }
  const [athlete, setAthlete] = useState(ATHLETE_DEFAULTS)
  const [editingAthlete, setEditingAthlete] = useState(false)
  const [athleteForm, setAthleteForm] = useState(ATHLETE_DEFAULTS)
  const [athleteSaving, setAthleteSaving] = useState(false)

  useEffect(() => {
    supabase.from('entries').select('*').order('entry_date', { ascending: true }).then(({ data }) => setEntries(data || []))
    supabase.from('events').select('*').order('start_date').then(({ data }) => setEvents(data || []))
    supabase.from('training_plans').select('*').order('week_start', { ascending: false }).limit(4).then(({ data }) => setTrainingPlans(data || []))
    supabase.from('competition_stats').select('*').order('event_date', { ascending: false }).then(({ data }) => setCompStats(data || []))
    if (user?.id) {
      supabase.from('profiles').select('hcp,wagr,athlete_club,category,fed,fed_num,home_kpi_order').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            const a = { hcp: data.hcp || '1.1', wagr: data.wagr || '—', club: data.athlete_club || 'Vale de Janelas', category: data.category || 'Sub-18', fed: data.fed || 'FPG', fed_num: data.fed_num || '43832' }
            setAthlete(a); setAthleteForm(a)
            if (data.home_kpi_order) {
              try { setKpiOrder(JSON.parse(data.home_kpi_order)) } catch (_) {}
            }
          }
        })
    }
  }, [user])

  const saveAthlete = async () => {
    if (!user?.id) return
    setAthleteSaving(true)
    await supabase.from('profiles').update({
      hcp: athleteForm.hcp, wagr: athleteForm.wagr, athlete_club: athleteForm.club,
      category: athleteForm.category, fed: athleteForm.fed, fed_num: athleteForm.fed_num,
    }).eq('id', user.id)
    setAthlete(athleteForm); setAthleteSaving(false); setEditingAthlete(false)
  }

  const saveKpiPrefs = async (order) => {
    if (!user?.id) return
    setSavingPrefs(true)
    await supabase.from('profiles').update({ home_kpi_order: JSON.stringify(order) }).eq('id', user.id)
    setSavingPrefs(false)
  }

  // Period filter
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

  // Period-filtered session counts
  const golfMetrics = ['swing_speed', 'smash_factor', 'carry', 'stack_speed']
  const gymMetrics = ['deadlift', 'medball', 'thoracic']
  const golfSessions = [...new Set(filteredEntries.filter(e => golfMetrics.includes(e.metric_id)).map(e => e.entry_date))].length
  const gymSessions = [...new Set(filteredEntries.filter(e => gymMetrics.includes(e.metric_id)).map(e => e.entry_date))].length

  const today = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter(e => e.start_date >= today && e.status !== 'cancelled' && e.status !== 'cancelado').slice(0, 4)
  const nextComp = upcomingEvents[0]
  const daysToNext = nextComp ? Math.ceil((new Date(nextComp.start_date) - new Date()) / 86400000) : null

  const lastMetrics = {}
  entries.sort((a, b) => (b.entry_date || '').localeCompare(a.entry_date || '')).forEach(e => { if (!lastMetrics[e.metric_id]) lastMetrics[e.metric_id] = e })

  const F = "'Inter', system-ui, -apple-system, sans-serif"
  const inp = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '4px', color: t.text, padding: '5px 8px', fontSize: '12px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }

  const formatDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : ''

  // All KPI definitions (ordered by kpiOrder)
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

  // Competition stats
  const scores = compStats.map(s => parseFloat(s.values?.score)).filter(v => !isNaN(v))
  const positions = compStats.map(s => parseFloat(s.values?.position)).filter(v => !isNaN(v))
  const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null
  const bestPos = positions.length ? Math.min(...positions) : null
  const top10 = compStats.filter(s => parseFloat(s.values?.position) <= 10).length
  const recentResults = compStats.slice(0, 3)

  // Training this week
  const todayDate = new Date()
  const weekStart = new Date(todayDate); weekStart.setDate(todayDate.getDate() - (todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1))
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const currentPlan = trainingPlans.find(p => p.week_start <= weekStartStr && p.week_end >= weekStartStr) || trainingPlans[0]
  const DAYS_PT_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const todayDayPT = DAYS_PT_SHORT[todayDate.getDay()]

  const getWeekSessions = (plan) => {
    if (!plan?.days) return []
    const sessions = []
    Object.entries(plan.days).forEach(([day, dayData]) => {
      if (dayData?.golf?.length > 0) sessions.push({ day, type: 'Golf', detail: dayData.golf[0]?.category || 'Golf' })
      if (dayData?.gym?.length > 0) sessions.push({ day, type: 'Gym', detail: dayData.gym[0]?.category || 'Gym' })
    })
    return sessions
  }
  const weekSessions = getWeekSessions(currentPlan)
  const todaySession = weekSessions.find(s => s.day === todayDayPT)

  // KPI deep-dive modal
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

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .h-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
        .h-bottom{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .h-hero-sub{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
        .h-today-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
        .home-3col{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        @media(max-width:700px){.h-bottom{grid-template-columns:1fr}.h-kpi{grid-template-columns:repeat(2,1fr)}.h-today-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:420px){.h-kpi{grid-template-columns:1fr 1fr}.h-today-grid{grid-template-columns:1fr 1fr}.home-3col{grid-template-columns:1fr 1fr}}
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
            <div className="home-3col" style={{ marginBottom:'16px' }}>
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

      {/* ── ATHLETE EDIT FORM ── */}
      {editingAthlete && (
        <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:'12px',padding:'18px',marginBottom:'14px' }}>
          <div style={{ fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'14px' }}>EDITAR PERFIL</div>
          <div className="home-3col" style={{ marginBottom:'14px' }}>
            {[['hcp','Handicap'],['wagr','WAGR'],['club',lang==='pt'?'Clube':'Club'],['category',lang==='pt'?'Categoria':'Category'],['fed',lang==='pt'?'Federação':'Federation'],['fed_num',lang==='pt'?'Nº Federado':'Fed. No.']].map(([k,l]) => (
              <div key={k}>
                <div style={{ fontSize:'8px',color:t.textMuted,marginBottom:'4px',letterSpacing:'1px',fontWeight:600 }}>{l.toUpperCase()}</div>
                <input value={athleteForm[k]||''} onChange={e=>setAthleteForm(p=>({...p,[k]:e.target.value}))} style={inp}/>
              </div>
            ))}
          </div>
          <div style={{ display:'flex',gap:'8px' }}>
            <button onClick={saveAthlete} disabled={athleteSaving} style={{ background:t.accent,border:'none',borderRadius:'8px',color:theme==='dark'?'#000':'#fff',padding:'8px 18px',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:F,opacity:athleteSaving?0.7:1 }}>{athleteSaving?'A guardar...':'Guardar'}</button>
            <button onClick={()=>setEditingAthlete(false)} style={{ background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px 16px',fontSize:'12px',cursor:'pointer',fontFamily:F }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ── HERO CARD ── */}
      {!editingAthlete && (
        <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:'16px',padding:'20px 22px',marginBottom:'14px',position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:'3px',background:'linear-gradient(90deg,#378ADD,#52E8A0)' }}/>

          {/* Top row: swing speed + athlete badge */}
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px' }}>
            <div>
              <div style={{ fontSize:'8px',letterSpacing:'3px',color:t.textMuted,fontWeight:600,marginBottom:'8px' }}>
                {lang==='pt'?'DRIVE VELOCITY — OBJECTIVO':'DRIVE VELOCITY — GOAL'}
              </div>
              <div style={{ fontSize:'58px',fontWeight:900,letterSpacing:'-3px',lineHeight:0.95,color:t.text }}>
                {lastSwing ? lastSwing.toFixed(1) : '—'}
                <span style={{ fontSize:'18px',color:'#378ADD',letterSpacing:0,fontWeight:700 }}> mph</span>
              </div>
              {delta !== null && (
                <div style={{ fontSize:'12px',color:parseFloat(delta)>=0?'#52E8A0':'#f87171',fontWeight:700,marginTop:'8px',display:'flex',alignItems:'center',gap:'4px' }}>
                  {parseFloat(delta)>=0?'▲':'▼'} {Math.abs(delta)} mph vs sessão anterior
                  {lastDate && <span style={{ color:t.textMuted,fontWeight:400,fontSize:'10px' }}>· {formatDate(lastDate)}</span>}
                </div>
              )}
            </div>
            <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'8px',flexShrink:0 }}>
              <div style={{ background:'#378ADD15',border:'1px solid #378ADD33',borderRadius:'10px',padding:'8px 14px',textAlign:'center' }}>
                <div style={{ fontSize:'22px',fontWeight:900,color:'#378ADD',lineHeight:1 }}>{athlete.hcp||'—'}</div>
                <div style={{ fontSize:'8px',color:t.textMuted,letterSpacing:'1.5px',fontWeight:600,marginTop:'1px' }}>HCP</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'11px',color:t.text,fontWeight:600 }}>{athlete.club}</div>
                <div style={{ fontSize:'10px',color:t.textMuted }}>{athlete.category} · {athlete.fed} {athlete.fed_num}</div>
              </div>
              <div style={{ display:'flex',gap:'5px',flexWrap:'wrap',justifyContent:'flex-end' }}>
                <button onClick={()=>{ setAthleteForm({...athlete}); setEditingAthlete(true) }}
                  style={{ background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'3px 8px',fontSize:'9px',cursor:'pointer',fontFamily:F,letterSpacing:'1px' }}>
                  EDITAR
                </button>
                <a href="https://www.wagr.com/playerprofile/francisca-salgado-43158" target="_blank" rel="noreferrer"
                  style={{ background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'3px 8px',fontSize:'9px',cursor:'pointer',fontFamily:F,textDecoration:'none',letterSpacing:'1px' }}>
                  WAGR ↗
                </a>
                <a href="https://portal.fpg.pt/handicaps-course-rating/pesquisa-de-handicaps/" target="_blank" rel="noreferrer"
                  style={{ background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'3px 8px',fontSize:'9px',cursor:'pointer',fontFamily:F,textDecoration:'none',letterSpacing:'1px' }}>
                  FPG ↗
                </a>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom:'14px' }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'5px' }}>
              <div style={{ fontSize:'9px',color:t.textMuted,letterSpacing:'2px' }}>
                PROGRESSO PARA {swingTarget} MPH
              </div>
              <div style={{ fontSize:'12px',fontWeight:900,color:'#378ADD' }}>{pct}%</div>
            </div>
            <div style={{ height:'4px',background:t.border,borderRadius:'2px',overflow:'hidden' }}>
              <div style={{ height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#378ADD,#52E8A0)',borderRadius:'2px' }}/>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:'9px',marginTop:'4px' }}>
              <span style={{ color:t.textMuted }}>80 mph</span>
              {bestSwing && <span style={{ color:'#52E8A0' }}>● {bestSwing.toFixed(1)} {lang==='pt'?'recorde':'record'}</span>}
              <span style={{ color:'#378ADD' }}>{swingTarget} mph</span>
            </div>
          </div>

          {/* Sparkline */}
          <Sparkline data={swingEntries} t={t} target={swingTarget} />

          {/* Sessions + Next comp sub-row */}
          <div className="h-hero-sub">
            <div style={{ background:t.bg,borderRadius:'10px',padding:'10px 14px',display:'flex',alignItems:'center',gap:'12px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'8px',letterSpacing:'2px',color:'#378ADD',marginBottom:'2px',fontWeight:600 }}>GOLFE</div>
                <div style={{ fontSize:'26px',fontWeight:900,color:t.text,lineHeight:1,letterSpacing:'-1px' }}>{golfSessions}</div>
                <div style={{ fontSize:'10px',color:t.textMuted }}>sessões · {period}</div>
              </div>
              <div style={{ flex:1,borderLeft:`1px solid ${t.border}`,paddingLeft:'12px' }}>
                <div style={{ fontSize:'8px',letterSpacing:'2px',color:'#52E8A0',marginBottom:'2px',fontWeight:600 }}>GINÁSIO</div>
                <div style={{ fontSize:'26px',fontWeight:900,color:t.text,lineHeight:1,letterSpacing:'-1px' }}>{gymSessions}</div>
                <div style={{ fontSize:'10px',color:t.textMuted }}>sessões · {period}</div>
              </div>
            </div>
            {nextComp && daysToNext !== null ? (
              <div style={{ background:'#f59e0b0d',border:'1px solid #f59e0b33',borderRadius:'10px',padding:'10px 14px',display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ textAlign:'center',flexShrink:0 }}>
                  <div style={{ fontSize:'28px',fontWeight:900,color:'#f59e0b',lineHeight:1,letterSpacing:'-1px' }}>{daysToNext}</div>
                  <div style={{ fontSize:'8px',color:t.textMuted,letterSpacing:'1.5px',fontWeight:600 }}>DIAS</div>
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:'8px',letterSpacing:'2px',color:'#f59e0b',fontWeight:700,marginBottom:'2px' }}>🏆 PRÓXIMA</div>
                  <div style={{ fontSize:'11px',fontWeight:700,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{nextComp.title}</div>
                  <div style={{ fontSize:'10px',color:t.textMuted }}>{formatDate(nextComp.start_date)}{nextComp.end_date&&nextComp.end_date!==nextComp.start_date?` – ${formatDate(nextComp.end_date)}`:''}</div>
                </div>
              </div>
            ) : (
              <div style={{ background:t.bg,borderRadius:'10px',padding:'10px 14px' }}>
                <div style={{ fontSize:'8px',letterSpacing:'2px',color:t.textMuted,marginBottom:'4px',fontWeight:600 }}>WAGR</div>
                <div style={{ fontSize:'22px',fontWeight:900,color:t.text,lineHeight:1 }}>{athlete.wagr||'—'}</div>
                <div style={{ fontSize:'10px',color:t.textMuted,marginTop:'2px' }}>ranking mundial</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PERIOD FILTER ── */}
      <div style={{ display:'flex',gap:'5px',marginBottom:'14px',flexWrap:'wrap',alignItems:'center' }}>
        <div style={{ fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginRight:'4px' }}>PERÍODO</div>
        {PERIOD_OPTIONS.map(opt => (
          <button key={opt.key} onClick={()=>setPeriod(opt.key)}
            style={{ padding:'4px 12px',borderRadius:'16px',border:`1px solid ${period===opt.key?'#378ADD':t.border}`,
              background:period===opt.key?'#378ADD15':'transparent',color:period===opt.key?'#378ADD':t.textMuted,
              cursor:'pointer',fontSize:'11px',fontWeight:period===opt.key?700:400,fontFamily:F }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── HOJE — treino do dia ── */}
      {weekSessions.length > 0 && (
        <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:'12px',padding:'14px 18px',marginBottom:'14px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' }}>
            <div style={{ fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600 }}>
              {lang==='pt'?'TREINO ESTA SEMANA':'TRAINING THIS WEEK'}
            </div>
            <button onClick={()=>onNavigate&&onNavigate('training')}
              style={{ background:'transparent',border:'none',color:'#378ADD',fontSize:'11px',cursor:'pointer',fontFamily:F,padding:0 }}>
              Ver plano →
            </button>
          </div>
          <div className="h-today-grid">
            {weekSessions.slice(0,8).map((s,i) => {
              const isToday = s.day === todayDayPT
              const color = s.type==='Golf' ? '#378ADD' : '#52E8A0'
              return (
                <div key={i} style={{ background:isToday?color+'18':t.bg,border:`1px solid ${isToday?color+'55':t.border}`,borderRadius:'8px',padding:'8px 10px' }}>
                  <div style={{ fontSize:'9px',letterSpacing:'1px',color:isToday?color:t.textMuted,fontWeight:700,marginBottom:'2px' }}>
                    {s.day}{isToday&&' · HOJE'}
                  </div>
                  <div style={{ fontSize:'11px',fontWeight:isToday?700:500,color:isToday?t.text:t.textMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                    {s.detail}
                  </div>
                  <div style={{ marginTop:'4px',display:'inline-flex',padding:'1px 6px',borderRadius:'4px',fontSize:'8px',fontWeight:700,
                    background:s.type==='Golf'?'#378ADD18':'#52E8A018',color }}>
                    {s.type}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── KPI GRID — todos os KPIs como cards ── */}
      {orderedKpis.length > 0 && (
        <div className="h-kpi">
          {orderedKpis.map(k => {
            const entry = lastMetrics[k.id]
            const prevEntries = entries.filter(e=>e.metric_id===k.id&&e.value).sort((a,b)=>(a.entry_date||'').localeCompare(b.entry_date||''))
            const d = prevEntries.length>1 ? (parseFloat(prevEntries[prevEntries.length-1].value)-parseFloat(prevEntries[prevEntries.length-2].value)).toFixed(2) : null
            const isGolf = golfMetrics.includes(k.id)
            const accent = isGolf ? '#378ADD' : '#52E8A0'
            return (
              <div key={k.id} onClick={()=>openKpiModal(k)}
                style={{ background:t.surface,border:`1px solid ${t.border}`,borderLeft:`3px solid ${accent}`,borderRadius:'10px',padding:'14px 16px',cursor:'pointer',transition:'opacity 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.8'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                <div style={{ fontSize:'8px',letterSpacing:'2px',color:accent,marginBottom:'8px',fontWeight:600 }}>
                  {k.label} ↗
                </div>
                <div style={{ fontSize:'28px',fontWeight:900,color:t.text,lineHeight:1,letterSpacing:'-1px' }}>
                  {entry?entry.value:'—'}<span style={{ fontSize:'11px',color:t.textMuted,letterSpacing:0,fontWeight:400 }}>{entry?` ${k.unit}`:''}</span>
                </div>
                {d!==null && (
                  <div style={{ fontSize:'10px',color:parseFloat(d)>=0?'#52E8A0':'#f87171',marginTop:'6px',fontWeight:700 }}>
                    {parseFloat(d)>=0?'↑':'↓'} {Math.abs(d)}{k.unit}
                  </div>
                )}
                {!d && entry && (
                  <div style={{ fontSize:'10px',color:t.textFaint||t.textMuted,marginTop:'6px' }}>
                    {new Date(entry.entry_date+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── BOTTOM GRID: competição + resultados + eventos ── */}
      <div className="h-bottom">
        {/* Competição */}
        <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:'12px',padding:'16px 18px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' }}>
            <div style={{ fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600 }}>
              {lang==='pt'?'STATS COMPETIÇÃO':'COMPETITION STATS'}
            </div>
            <button onClick={()=>onNavigate&&onNavigate('competition')}
              style={{ background:'transparent',border:'none',color:'#378ADD',fontSize:'11px',cursor:'pointer',fontFamily:F,padding:0 }}>
              Ver stats →
            </button>
          </div>
          {compStats.length===0 ? (
            <div style={{ fontSize:'12px',color:t.textMuted,fontStyle:'italic' }}>
              {lang==='pt'?'Sem competições registadas':'No competitions recorded'}
            </div>
          ) : (
            <>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px' }}>
                {[
                  { label:lang==='pt'?'MÉDIA SCORE':'AVG SCORE', value:avgScore?(parseFloat(avgScore)>=0?`+${avgScore}`:avgScore):'—', color:'#378ADD' },
                  { label:lang==='pt'?'MELHOR POS.':'BEST POS.', value:bestPos?`#${bestPos}`:'—', color:'#52E8A0' },
                  { label:'TOP 10', value:`${top10}×`, color:t.text },
                  { label:lang==='pt'?'TORNEIOS':'EVENTS', value:compStats.length, color:t.text },
                ].map((item,i) => (
                  <div key={i} style={{ background:t.bg,borderRadius:'8px',padding:'10px 12px' }}>
                    <div style={{ fontSize:'8px',color:t.textMuted,letterSpacing:'1px',marginBottom:'4px',fontWeight:600 }}>{item.label}</div>
                    <div style={{ fontSize:'20px',fontWeight:800,color:item.color,letterSpacing:'-0.5px' }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:'1px' }}>
                {recentResults.map((r,i) => {
                  const score=r.values?.score; const pos=r.values?.position; const scoreNum=parseFloat(score)
                  return (
                    <div key={i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:i<recentResults.length-1?`0.5px solid ${t.border}`:'none' }}>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:'11px',fontWeight:600,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.event_name}</div>
                        <div style={{ fontSize:'10px',color:t.textMuted }}>{formatDate(r.event_date)}</div>
                      </div>
                      <div style={{ textAlign:'right',flexShrink:0,marginLeft:'8px' }}>
                        {score&&<div style={{ fontSize:'12px',fontWeight:700,color:t.text }}>{scoreNum>=0?`+${score}`:score}</div>}
                        {pos&&<div style={{ fontSize:'10px',fontWeight:600,color:'#378ADD' }}>#{pos}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Eventos + Swing sub-KPIs */}
        <div style={{ display:'flex',flexDirection:'column',gap:'12px' }}>
          {/* Upcoming events */}
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:'12px',padding:'16px 18px' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' }}>
              <div style={{ fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600 }}>
                {lang==='pt'?'PRÓXIMOS EVENTOS':'UPCOMING EVENTS'}
              </div>
              <button onClick={()=>onNavigate&&onNavigate('calendar')}
                style={{ background:'transparent',border:'none',color:'#378ADD',fontSize:'11px',cursor:'pointer',fontFamily:F,padding:0 }}>
                Calendário →
              </button>
            </div>
            {upcomingEvents.length===0 ? (
              <div style={{ fontSize:'12px',color:t.textMuted,fontStyle:'italic' }}>Sem eventos próximos</div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
                {upcomingEvents.slice(0,4).map(ev => {
                  const d=Math.ceil((new Date(ev.start_date)-new Date())/86400000)
                  return (
                    <div key={ev.id} style={{ display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',background:t.bg,borderRadius:'8px' }}>
                      <div style={{ width:'3px',height:'32px',background:ev.color||'#378ADD',borderRadius:'2px',flexShrink:0 }}/>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:'11px',fontWeight:600,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ev.title}</div>
                        <div style={{ fontSize:'10px',color:t.textMuted }}>{formatDate(ev.start_date)}{ev.end_date&&ev.end_date!==ev.start_date?` – ${formatDate(ev.end_date)}`:''}</div>
                      </div>
                      <div style={{ fontSize:'13px',fontWeight:700,color:d<=7?'#f59e0b':'#378ADD',flexShrink:0 }}>{d}d</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Golf sub-KPIs quick view */}
          {orderedKpis.filter(k=>['smash_factor','carry','stack_speed'].includes(k.id)).length>0 && (
            <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:'12px',padding:'14px 18px' }}>
              <div style={{ fontSize:'9px',letterSpacing:'2px',color:'#378ADD',fontWeight:600,marginBottom:'10px' }}>GOLF KPIs</div>
              <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
                {orderedKpis.filter(k=>['smash_factor','carry','stack_speed'].includes(k.id)).map(k => {
                  const entry=lastMetrics[k.id]
                  const prevE=entries.filter(e=>e.metric_id===k.id&&e.value).sort((a,b)=>(a.entry_date||'').localeCompare(b.entry_date||''))
                  const d=prevE.length>1?(parseFloat(prevE[prevE.length-1].value)-parseFloat(prevE[prevE.length-2].value)).toFixed(2):null
                  return (
                    <div key={k.id} onClick={()=>openKpiModal(k)}
                      style={{ display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',padding:'2px 0' }}
                      onMouseEnter={e=>e.currentTarget.style.opacity='0.7'}
                      onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                      <div style={{ fontSize:'11px',color:t.textMuted,fontWeight:600 }}>{k.label}</div>
                      <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                        {d!==null&&<div style={{ fontSize:'10px',color:parseFloat(d)>=0?'#52E8A0':'#f87171',fontWeight:700 }}>{parseFloat(d)>=0?'↑':'↓'}{Math.abs(d)}</div>}
                        <div style={{ fontSize:'14px',fontWeight:800,color:t.text }}>{entry?entry.value:'—'}<span style={{ fontSize:'10px',color:t.textMuted,fontWeight:400 }}>{entry?k.unit:''}</span></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
