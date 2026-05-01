import { useState, useEffect, useRef } from 'react'
import { findCurrentPlan } from '../lib/trainingPlanUtils'
import { getHomeEntries, getHomeCompStats, getHomeCompConfig, getHomeWagrHistory, getHomeProfile, getHomeGoals, getSwingGoal, updateAthleteProfile, updateKpiOrder, updateStatPrefs } from '../services/homeService'
import { calcCurrentPhase, isCompetition, getUpcomingCompetitions } from '../lib/periodization'
import { getPlansForDate } from '../lib/trainingUtils'
import { ACTIVITY_COLORS } from '../constants/eventCategories'

const golfColor = ACTIVITY_COLORS.golf
const gymColor = ACTIVITY_COLORS.gym
const compColor = ACTIVITY_COLORS.competition

function PhaseIllustration({ phase }) {
  const w  = 'rgba(255,255,255,0.30)'
  const wm = 'rgba(255,255,255,0.16)'
  const ws = 'rgba(255,255,255,0.50)'

  /* PEAK — bandeira no green + bola perto do buraco */
  if (phase === 'PEAK') return (
    <svg width="210" height="110" viewBox="0 0 210 110" fill="none" aria-hidden="true">
      {/* green surface */}
      <ellipse cx="110" cy="96" rx="90" ry="14" fill={wm} />
      {/* hole */}
      <ellipse cx="72" cy="94" rx="9" ry="4" fill="rgba(0,0,0,0.25)" />
      {/* ball very close to hole */}
      <circle cx="96" cy="90" r="10" fill={ws} />
      <circle cx="96" cy="90" r="10" stroke={w} strokeWidth="1.5" />
      {/* dimples suggestion */}
      <circle cx="92" cy="87" r="2" fill={wm} />
      <circle cx="99" cy="86" r="2" fill={wm} />
      <circle cx="95" cy="92" r="2" fill={wm} />
      {/* flagpole */}
      <line x1="148" y1="94" x2="148" y2="14" stroke={ws} strokeWidth="3" strokeLinecap="round" />
      {/* flag waving */}
      <path d="M148,14 Q172,22 168,34 Q164,46 148,42" fill={ws} />
      {/* motion lines near ball */}
      <line x1="116" y1="84" x2="128" y2="80" stroke={w} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="118" y1="90" x2="132" y2="88" stroke={wm} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )

  /* AFINACAO — putter + bola encostada ao buraco */
  if (phase === 'AFINACAO') return (
    <svg width="210" height="110" viewBox="0 0 210 110" fill="none" aria-hidden="true">
      {/* ground */}
      <line x1="10" y1="98" x2="200" y2="98" stroke={wm} strokeWidth="1.5" />
      {/* putter shaft */}
      <line x1="40" y1="10" x2="138" y2="90" stroke={ws} strokeWidth="4" strokeLinecap="round" />
      {/* putter head */}
      <rect x="124" y="87" width="44" height="12" rx="4" fill={ws} />
      {/* hole */}
      <ellipse cx="100" cy="98" rx="11" ry="5" fill="rgba(0,0,0,0.3)" />
      {/* ball touching hole rim */}
      <circle cx="117" cy="92" r="9" fill={ws} />
      <circle cx="113" cy="89" r="2" fill={wm} />
      <circle cx="120" cy="88" r="2" fill={wm} />
      <circle cx="116" cy="94" r="2" fill={wm} />
      {/* putting line (guide) */}
      <line x1="138" y1="90" x2="117" y2="92" stroke={w} strokeWidth="1" strokeDasharray="4 3" />
    </svg>
  )

  /* DESENVOLVIMENTO — barra de pesos + taco cruzados */
  if (phase === 'DESENVOLVIMENTO') return (
    <svg width="210" height="110" viewBox="0 0 210 110" fill="none" aria-hidden="true">
      {/* golf club shaft (diagonal /) */}
      <line x1="50" y1="100" x2="160" y2="10" stroke={ws} strokeWidth="5" strokeLinecap="round" />
      {/* club head */}
      <rect x="148" y="6" width="28" height="12" rx="4" fill={ws} />
      {/* barbell bar (diagonal \) */}
      <line x1="30" y1="18" x2="182" y2="92" stroke={w} strokeWidth="5" strokeLinecap="round" />
      {/* weight discs left */}
      <ellipse cx="38" cy="24" rx="18" ry="18" fill={wm} stroke={w} strokeWidth="2.5" />
      <ellipse cx="38" cy="24" rx="10" ry="10" fill={w} />
      {/* weight discs right */}
      <ellipse cx="174" cy="86" rx="18" ry="18" fill={wm} stroke={w} strokeWidth="2.5" />
      <ellipse cx="174" cy="86" rx="10" ry="10" fill={w} />
    </svg>
  )

  /* DESENVOLVIMENTO_LIGHT — taco a bater bola no tee */
  if (phase === 'DESENVOLVIMENTO_LIGHT') return (
    <svg width="210" height="110" viewBox="0 0 210 110" fill="none" aria-hidden="true">
      {/* ground */}
      <line x1="20" y1="100" x2="200" y2="100" stroke={wm} strokeWidth="1.5" />
      {/* tee stick */}
      <line x1="140" y1="100" x2="140" y2="72" stroke={ws} strokeWidth="3" strokeLinecap="round" />
      <line x1="128" y1="72" x2="152" y2="72" stroke={ws} strokeWidth="2.5" strokeLinecap="round" />
      {/* ball on tee */}
      <circle cx="140" cy="62" r="12" fill={ws} />
      <circle cx="136" cy="58" r="3" fill={wm} />
      <circle cx="144" cy="57" r="3" fill={wm} />
      <circle cx="140" cy="65" r="3" fill={wm} />
      {/* club approaching — relaxed angle */}
      <line x1="28" y1="40" x2="122" y2="66" stroke={ws} strokeWidth="5" strokeLinecap="round" />
      <rect x="112" y="62" width="26" height="10" rx="4" fill={ws} />
      {/* swing arc (gentle) */}
      <path d="M28,40 Q70,55 122,66" stroke={w} strokeWidth="1.5" strokeDasharray="5 4" fill="none" />
    </svg>
  )

  /* ACUMULACAO — balde de bolas no range */
  if (phase === 'ACUMULACAO') return (
    <svg width="210" height="110" viewBox="0 0 210 110" fill="none" aria-hidden="true">
      {/* bucket body */}
      <path d="M65,38 L54,100 L156,100 L145,38 Z" fill={wm} stroke={w} strokeWidth="2" strokeLinejoin="round" />
      {/* bucket top ellipse */}
      <ellipse cx="105" cy="38" rx="40" ry="11" fill={w} />
      {/* handle arc */}
      <path d="M72,38 Q105,12 138,38" stroke={ws} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* balls at top of bucket */}
      <circle cx="88"  cy="32" r="11" fill={ws} />
      <circle cx="108" cy="28" r="11" fill={ws} />
      <circle cx="128" cy="32" r="11" fill={ws} />
      {/* balls scattered on ground */}
      <circle cx="36"  cy="98" r="8"  fill={w} />
      <circle cx="172" cy="94" r="7"  fill={w} />
      <circle cx="20"  cy="88" r="6"  fill={wm} />
      <circle cx="190" cy="84" r="5"  fill={wm} />
    </svg>
  )

  /* MANUTENCAO_B2B — putter + faixa de resistência */
  if (phase === 'MANUTENCAO_B2B') return (
    <svg width="210" height="110" viewBox="0 0 210 110" fill="none" aria-hidden="true">
      {/* putter shaft */}
      <line x1="30" y1="10" x2="108" y2="82" stroke={ws} strokeWidth="4" strokeLinecap="round" />
      {/* putter head */}
      <rect x="94" y="80" width="36" height="10" rx="4" fill={ws} />
      {/* ground */}
      <line x1="20" y1="100" x2="210" y2="100" stroke={wm} strokeWidth="1.5" />
      {/* resistance band — loop shape */}
      <ellipse cx="166" cy="62" rx="32" ry="44" stroke={ws} strokeWidth="5" fill="none" />
      <ellipse cx="166" cy="62" rx="18" ry="28" stroke={w} strokeWidth="3" fill="none" />
      {/* hands gripping band (top & bottom) */}
      <rect x="152" y="14" width="28" height="10" rx="5" fill={w} />
      <rect x="152" y="96" width="28" height="10" rx="5" fill={w} />
    </svg>
  )

  /* DESCARGA — colchão de yoga + faixa leve */
  if (phase === 'DESCARGA') return (
    <svg width="210" height="110" viewBox="0 0 210 110" fill="none" aria-hidden="true">
      {/* yoga mat flat */}
      <rect x="20" y="72" width="148" height="26" rx="6" fill={w} />
      {/* mat rolled end */}
      <ellipse cx="168" cy="85" rx="14" ry="13" fill={ws} />
      <ellipse cx="168" cy="85" rx="7"  ry="6"  fill={w} />
      {/* mat texture lines */}
      <line x1="20" y1="80" x2="154" y2="80" stroke={wm} strokeWidth="1" />
      <line x1="20" y1="87" x2="154" y2="87" stroke={wm} strokeWidth="1" />
      <line x1="20" y1="94" x2="154" y2="94" stroke={wm} strokeWidth="1" />
      {/* resistance band above — soft curve */}
      <path d="M40,50 Q80,20 120,50 Q160,80 190,44" stroke={ws} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M40,56 Q80,26 120,56 Q160,86 190,50" stroke={wm} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )

  /* DESCANSO — taco encostado à parede, pesos no chão */
  return (
    <svg width="210" height="110" viewBox="0 0 210 110" fill="none" aria-hidden="true">
      {/* wall */}
      <line x1="178" y1="8" x2="178" y2="102" stroke={w} strokeWidth="2" />
      {/* floor */}
      <line x1="18" y1="102" x2="200" y2="102" stroke={w} strokeWidth="2" />
      {/* golf club leaning against wall */}
      <line x1="178" y1="16" x2="136" y2="100" stroke={ws} strokeWidth="5" strokeLinecap="round" />
      <rect x="122" y="96" width="24" height="8" rx="3" fill={ws} />
      {/* barbell on floor */}
      <line x1="40" y1="96" x2="112" y2="96" stroke={ws} strokeWidth="5" strokeLinecap="round" />
      {/* weight disc left */}
      <ellipse cx="36"  cy="96" rx="16" ry="16" fill={wm} stroke={w} strokeWidth="2.5" />
      <ellipse cx="36"  cy="96" rx="8"  ry="8"  fill={w} />
      {/* weight disc right */}
      <ellipse cx="116" cy="96" rx="16" ry="16" fill={wm} stroke={w} strokeWidth="2.5" />
      <ellipse cx="116" cy="96" rx="8"  ry="8"  fill={w} />
    </svg>
  )
}

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

export default function Home({ theme, t, onNavigate, onRegister, user, profile, lang = 'en', events = [], trainingPlans = [] }) {
  const [entries, setEntries] = useState([])
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
    getHomeEntries().then(data => setEntries(data)).catch(console.error)
    getHomeCompStats().then(data => setCompStats(data)).catch(console.error)
    getHomeCompConfig().then(data => { if (data.length) setCompConfig(data) }).catch(console.error)
    if (user?.id) {
      getHomeWagrHistory(user.id).then(data => setWagrHistory(data)).catch(console.error)
      getHomeProfile(user.id).then(data => {
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
    getHomeGoals().then(data => setGoals(data)).catch(console.error)
  }, [])

  const saveAthlete = async () => {
    if (!user?.id) return
    setAthleteSaving(true)
    try {
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
      await updateAthleteProfile(user.id, updatePayload)
      setAthlete(athleteForm); setEditingAthlete(false)
    } catch (err) {
      console.error('saveAthlete:', err)
    } finally {
      setAthleteSaving(false)
    }
  }

  const saveKpiPrefs = async (order) => {
    if (!user?.id) return
    setSavingPrefs(true)
    try {
      await updateKpiOrder(user.id, order)
    } catch (err) {
      console.error('saveKpiPrefs:', err)
    } finally {
      setSavingPrefs(false)
    }
  }

  const saveStatPrefs = async (keys) => {
    if (!user?.id) return
    try {
      await updateStatPrefs(user.id, keys)
    } catch (err) {
      console.error('saveStatPrefs:', err)
    }
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
    getSwingGoal().then(goal => { if (goal) setSwingGoal(goal) })
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
  const currentPlan = findCurrentPlan(trainingPlans, weekStartStr)
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

  const upcomingComps = events.filter(e => e.start_date >= todayStr && !['cancelled','cancelado'].includes(e.status||'')).filter(isCompetition).slice(0, 5)
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

  // New computed values for Option-B layout

  const phaseInfo = calcCurrentPhase(events)
  const currentPhase = {
    name: phaseInfo.phase.replace(/_/g, ' '),
    situation: phaseInfo.heroLead || phaseInfo.reason,
    todayFocus: phaseInfo.heroGuidance || phaseInfo.recommendedTrainingFocus,
  }
  const heroGuidanceLines = String(phaseInfo.heroGuidance || phaseInfo.recommendedTrainingFocus || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const heroMainLine = heroGuidanceLines[0] || currentPhase.situation || ''
  const heroWeekLines = heroGuidanceLines.slice(1, 4)
  const heroTextColor = ['AFINACAO', 'DESCANSO'].includes(phaseInfo.phase) ? '#111827' : '#ffffff'
  const premiumCard = {
    background: theme === 'dark'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))'
      : 'linear-gradient(180deg, #ffffff 0%, #fbfcff 100%)',
    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.13)' : 'rgba(15,23,42,0.075)'}`,
    boxShadow: theme === 'dark' ? '0 22px 54px rgba(0,0,0,0.38)' : '0 22px 54px rgba(15,23,42,0.09)',
  }
  const sectionTitleStyle = {
    fontSize:'11px',
    letterSpacing:'2.4px',
    color:t.textMuted,
    fontWeight:950,
    marginBottom:'16px',
    textTransform:'uppercase',
  }
  const sessionGroups = session => {
    const items = Array.isArray(session.tasks) && session.tasks.length
      ? session.tasks
      : Array.isArray(session.raw?.items) ? session.raw.items : []
    const title = String(session.title || '').toLowerCase()
    return [...new Set(
      items
        .map(item => item.cat || item.category || item.group)
        .filter(Boolean)
        .filter(cat => cat !== 'Descanso')
        .filter(cat => String(cat).toLowerCase() !== title)
    )]
  }
  const sessionDisplayTitle = session => session.type === 'gym' ? 'Ginásio' : 'Golfe'
  const sessionFocusItems = session => {
    const display = sessionDisplayTitle(session).toLowerCase()
    const title = String(session.title || '').trim()
    const titleLower = title.toLowerCase()
    const titleAsTheme = title && !['golf', 'golfe', 'treino', 'ginásio', 'ginasio'].includes(titleLower) && titleLower !== display
      ? [title]
      : []
    return [...new Set([...titleAsTheme, ...sessionGroups(session)])]
  }
  const sessionMeta = session => [
    session.duration ? `${session.duration} min` : null,
    ...sessionFocusItems(session),
  ].filter(Boolean).join(' · ')
  const planSessionLabel = session => {
    const title = sessionDisplayTitle(session)
    const focus = sessionFocusItems(session)
    return focus.length ? `${title} — ${focus.join(' • ')}` : title
  }
  const TargetIcon = ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="5.5" fill="none" stroke={color} strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2.1" fill="none" stroke={color} strokeWidth="1.4" />
      <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
  const DumbbellIcon = ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M4 5v6M12 5v6M5.5 6.5h5M2.5 6v4M13.5 6v4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <rect x="1.5" y="5.2" width="1.4" height="5.6" rx="0.5" fill={color} />
      <rect x="3.3" y="4.2" width="1.2" height="7.6" rx="0.5" fill={color} opacity="0.88" />
      <rect x="11.5" y="4.2" width="1.2" height="7.6" rx="0.5" fill={color} opacity="0.88" />
      <rect x="13.1" y="5.2" width="1.4" height="5.6" rx="0.5" fill={color} />
    </svg>
  )
  const AlertIcon = ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M8 2.2 14 13H2L8 2.2Z" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6v3.2M8 10.8h.01" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )

  // 7-day week (Mon-Sun starting from weekStartDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate)
    d.setDate(weekStartDate.getDate() + i)
    return d
  })

  // Today's checklist: plan sessions (via shared util) + calendar events
  const todayPlanSessions = getPlansForDate(trainingPlans, todayStr)
  const todayCalEvents = events.filter(e => e.start_date <= todayStr && (e.end_date || e.start_date) >= todayStr)

  const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(todayDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0]
  const tomorrowPlanSessions = getPlansForDate(trainingPlans, tomorrowStr)
  const tomorrowCalEvents = events.filter(e => e.start_date <= tomorrowStr && (e.end_date || e.start_date) >= tomorrowStr)

  const todayTasks = (() => {
    const tasks = []
    todayPlanSessions.forEach(session => {
      const isCoach = session.coachType === 'coach'
      const type = session.type === 'gym' ? 'Ginásio' : 'Golf'
      tasks.push({
        label: isCoach ? `Treino com Coach — ${type}` : `Treino ${type}`,
        detail: session.title || '',
        color: session.type === 'gym' ? gymColor : golfColor,
      })
    })
    todayCalEvents.forEach(e => {
      const isComp = isCompetition(e)
      const cat = (e.category || '').toLowerCase()
      const isGolf = !isComp && (cat.includes('treino') || cat.includes('camp'))
      tasks.push({
        label: e.title || 'Evento',
        detail: isComp ? 'Competição' : isGolf ? 'Golf' : e.category || '',
        color: isComp ? compColor : isGolf ? golfColor : gymColor,
        badge: isComp ? 'COMP' : null,
        badgeColor: compColor,
      })
    })
    return tasks
  })()

  const enrichedTodayTasks = todayTasks

  const tomorrowTasks = (() => {
    const tasks = []
    tomorrowPlanSessions.forEach(session => {
      const isCoach = session.coachType === 'coach'
      const type = session.type === 'gym' ? 'Ginásio' : 'Golf'
      tasks.push({ label: isCoach ? `Coach — ${type}` : `Treino ${type}`, detail: session.title || '', color: session.type === 'gym' ? gymColor : golfColor })
    })
    tomorrowCalEvents.forEach(e => {
      const isComp = isCompetition(e)
      const cat = (e.category || '').toLowerCase()
      const isGolf = !isComp && (cat.includes('treino') || cat.includes('camp'))
      tasks.push({ label: e.title || 'Evento', detail: isComp ? 'Competição' : isGolf ? 'Golf' : e.category || '', color: isComp ? compColor : isGolf ? golfColor : gymColor, badge: isComp ? 'COMP' : null, badgeColor: compColor })
    })
    return tasks
  })()

  // Normalise a raw date value to 'YYYY-MM-DD' (handles full timestamps)
  const normDate = raw => { if (!raw) return ''; const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : '' }

  // Next competition - use normDate so timestamp-format start_dates compare correctly
  const nextCompetition = events
    .filter(e => isCompetition(e) && normDate(e.start_date || e.date || e.start) >= todayStr && !['cancelled','cancelado'].includes(e.status || ''))
    .sort((a, b) => normDate(a.start_date || a.date || a.start).localeCompare(normDate(b.start_date || b.date || b.start)))[0] || null
  const daysToNextComp = nextCompetition
    ? Math.max(0, Math.ceil((new Date(nextCompetition.start_date) - new Date()) / 86400000))
    : null

  const upcomingCompsAll = getUpcomingCompetitions(
    events.filter(e => !['cancelled','cancelado'].includes(e.status || '')),
    todayStr, 4
  )

  // Performance snapshot - HCP · WAGR · Vel. Swing
  const snapshotKpis = (() => {
    const kpis = []

    // HCP (lower = better, so down is good)
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

    // WAGR from wagr_history (lower rank = better, so down rank is good)
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

  // Recovery status - derived from past events, no dedicated data model
  const RECOVERY_TYPES = [
    { key: 'massage', label: 'Massagem',     keywords: ['massagem', 'massage', 'reiki'] },
    { key: 'physio',  label: 'Fisioterapia', keywords: ['fisio', 'physio'] },
    { key: 'mental',  label: 'Coach Mental', keywords: ['mental', 'psicolog'] },
  ]
  const recoveryStatus = RECOVERY_TYPES.map(type => {
    const past = events
      .filter(e => {
        const title = (e.title || '').toLowerCase()
        const cat   = (e.category || '').toLowerCase()
        return type.keywords.some(kw => title.includes(kw) || cat.includes(kw))
      })
      .sort((a, b) => normDate(b.start_date || b.date).localeCompare(normDate(a.start_date || a.date)))
    const lastDateStr = past[0] ? normDate(past[0].start_date || past[0].date) : null
    const daysSince = lastDateStr
      ? Math.floor((new Date() - new Date(lastDateStr + 'T12:00:00')) / 86400000)
      : null
    return { ...type, lastDateStr, daysSince, alert: daysSince === null || daysSince > 25 }
  })

  // Agenda items - real scheduled sessions only (max 3)
  const agendaItems = (() => {
    const items = []
    if (nextGolfCoachDate) items.push({ label: 'Coach · Golf',     date: nextGolfCoachDate, color: golfColor })
    if (nextGymCoachDate)  items.push({ label: 'Coach · Ginásio',  date: nextGymCoachDate,  color: gymColor })
    const coachDates = new Set([nextGolfCoachDate, nextGymCoachDate].filter(Boolean))
    if (nextTrainingDate && !coachDates.has(nextTrainingDate)) {
      const sessions = getPlansForDate(trainingPlans, nextTrainingDate)
      const first = sessions[0]
      const label = sessions.length
        ? sessions.map(planSessionLabel).join(' • ')
        : 'Treino'
      items.push({ label, date: nextTrainingDate, color: first?.type === 'gym' ? gymColor : golfColor })
    }
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  })()

  const coachReminders = (() => {
    const reminders = []
    const hasGolfPlan = trainingPlans.some(p => (p.plan_type === 'golf' || !p.plan_type) && p.week_start <= weekStartStr && p.week_end >= weekStartStr)
    const hasGymPlan  = trainingPlans.some(p => p.plan_type === 'gym' && p.week_start <= weekStartStr && p.week_end >= weekStartStr)
    if (!hasGolfPlan) reminders.push({ label: 'Plano golf em falta' })
    if (!hasGymPlan)  reminders.push({ label: 'Plano ginásio em falta' })
    return reminders
  })()

  // Alert colour
  const alertColor = phaseInfo.restAlertLevel === 'red' ? '#f87171'
    : phaseInfo.restAlertLevel === 'yellow' ? '#f59e0b'
    : '#52E8A0'
  const alertBorder = phaseInfo.restAlert ? alertColor : t.border

  // Day labels Mon-Sun
  const DAY_LABELS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

  const weekCard = (
    <div style={{ ...premiumCard, borderRadius:'24px', padding:'22px 24px' }}>
      <div style={sectionTitleStyle}>ESTA SEMANA</div>
      <div style={{ marginBottom:'10px', paddingBottom:'8px', borderBottom:`1px solid ${t.border}` }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:'8px', flexWrap:'wrap', marginBottom:'6px' }}>
          <div style={{ fontSize:'9px', letterSpacing:'1.8px', fontWeight:900, textTransform:'uppercase', color:t.textMuted, background:t.bg, padding:'2px 7px', borderRadius:'999px', flexShrink:0 }}>
            {currentPhase.name}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'6px', alignItems:'stretch' }}>
          {String(phaseInfo.heroGuidance || phaseInfo.recommendedTrainingFocus || '').split('\n').filter(Boolean).slice(0, 3).map((line, idx) => {
            const Icon = idx === 0 ? TargetIcon : idx === 1 ? DumbbellIcon : AlertIcon
            return (
              <div key={idx} style={{ display:'flex', alignItems:'flex-start', gap:'6px', minWidth:0, lineHeight:1.05 }}>
                <div style={{ flex:'0 0 auto', color:t.textMuted, marginTop:'1px' }}>
                  <Icon color={t.textMuted} />
                </div>
                <div style={{
                  fontSize:'10px',
                  fontWeight:500,
                  lineHeight:1.1,
                  color: t.textMuted,
                  overflow:'hidden',
                  whiteSpace:'normal',
                  wordBreak:'break-word',
                  overflowWrap:'anywhere',
                  paddingTop:'1px',
                }}>
                  {line}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
        {weekDays.map((day, i) => {
          const ds = day.toISOString().split('T')[0]
          const dayEvts = events.filter(e => {
            const start = normDate(e.start_date || e.date || e.start)
            const end = normDate(e.end_date || e.end) || start
            return start <= ds && end >= ds
          })
          const isToday = ds === todayStr
          const isPast  = ds < todayStr
          const compEvts = dayEvts.filter(isCompetition)
          const golfEvts = dayEvts.filter(e => { const c = (e.category||'').toLowerCase(); return !isCompetition(e) && (c.includes('treino') || c.includes('training') || c.includes('camp')) })
          const gymEvts  = dayEvts.filter(e => (e.category||'').toLowerCase().includes('gym'))
          const daySessions = getPlansForDate(trainingPlans, ds)
          const dayItems = [
            ...compEvts.map(e => ({ label: e.title?.slice(0, 30) || 'Competição', color: compColor, weight:850, view:'competition', title:'Abrir competição' })),
            ...golfEvts.map(e => ({ label: e.title?.slice(0, 30) || 'Golf', color:golfColor, weight:760, view:'calendar', opts:{ date:ds }, title:'Abrir calendário' })),
            ...gymEvts.map(e => ({ label: e.title?.slice(0, 30) || 'Ginásio', color:gymColor, weight:760, view:'calendar', opts:{ date:ds }, title:'Abrir calendário' })),
            ...daySessions.map(session => ({
              label: planSessionLabel(session),
              color: session.type === 'gym' ? gymColor : golfColor,
              weight:720,
              view:'calendar',
              opts:{ date:ds },
              title:'Abrir plano',
            })),
          ]

          const firstItem = dayItems[0]
          const label = firstItem ? firstItem.label : (isPast ? '' : '—')
          const dot = firstItem?.color || null

          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 10px', borderRadius:'12px', background:isToday ? `${t.accent}14` : compEvts.length ? '#ef44440d' : 'transparent', border:isToday ? `1px solid ${t.accent}33` : compEvts.length ? '1px solid #ef444422' : '1px solid transparent', opacity: isPast && !isToday ? 0.46 : 1 }}>
              <div style={{ width:'34px', fontSize:'12px', color: isToday ? t.accent : t.textMuted, fontWeight: isToday ? 900 : 750, flexShrink:0 }}>
                {DAY_LABELS[i]}
              </div>
              {dot && <div style={{ width:compEvts.length?'9px':'7px', height:compEvts.length?'9px':'7px', borderRadius:'50%', background:dot, flexShrink:0, boxShadow:`0 0 0 4px ${dot}18` }} />}
              {!dot && <div style={{ width:'7px', height:'7px', flexShrink:0 }} />}
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:'6px', overflow:'hidden', whiteSpace:'nowrap' }}>
                {dayItems.length ? dayItems.map((item, idx) => (
                  <button key={`${item.label}-${idx}`} type="button" onClick={() => onNavigate && onNavigate(item.view, item.opts)} title={item.title} style={{
                    display:'inline-flex',
                    alignItems:'center',
                    maxWidth: idx === 0 ? '52%' : '34%',
                    minWidth:0,
                    padding:'3px 8px',
                    borderRadius:'999px',
                    background:`${item.color}12`,
                    border:`1px solid ${item.color}26`,
                    color: isToday ? t.text : item.color,
                    fontSize:'12px',
                    fontWeight:item.weight,
                    overflow:'hidden',
                    textOverflow:'ellipsis',
                    whiteSpace:'nowrap',
                    flexShrink:1,
                    cursor:'pointer',
                    fontFamily:F,
                  }}>
                    {item.label}
                  </button>
                )) : (
                  <span style={{ color:t.textFaint, fontSize:'14px', fontWeight:500 }}>{label || '—'}</span>
                )}
              </div>
              {isToday && <div style={{ fontSize:'9px', letterSpacing:'1px', color:t.accent, fontWeight:900, background:t.accentBg||t.bg, padding:'3px 8px', borderRadius:'999px', flexShrink:0, textTransform:'uppercase' }}>Hoje</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
  return (
    <div style={{ fontFamily:F, color:t.text, minHeight:'100%', background: theme === 'dark' ? t.bg : '#f8fafc' }}>
      <style>{`
        *{box-sizing:border-box}
        .hm-page-shell{width:100%;max-width:1380px;margin:0 auto;padding:28px 34px 40px}
        .hm2-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
        .hm-athlete-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
        .hm-row{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;margin-bottom:16px;align-items:start}
        .hm-row3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px;align-items:stretch}
        .hm-week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
        .hm-btn-reset{background:transparent;border:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;width:100%}
        @media(max-width:900px){.hm-row{grid-template-columns:1fr}.hm-row3{grid-template-columns:1fr}}
        @media(max-width:768px){
          .hm-page-shell{padding:16px 14px 28px}
          .hm2-grid3{grid-template-columns:1fr 1fr}
          .hm-athlete-grid{grid-template-columns:repeat(2,1fr)}
          .hm-week-grid{gap:3px}
        }
        @media(max-width:480px){
          .hm2-grid3{grid-template-columns:1fr}
          .hm-athlete-grid{grid-template-columns:1fr}
        }
      `}</style>

      <div className="hm-page-shell">

      {/* ─── KPI MODAL ─── */}
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

      {/* ─── HERO BANNER ─── */}
      {editingAthlete ? (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'16px', padding:'20px', marginBottom:'16px' }}>
          <div className="hm-athlete-grid">
            {[['hcp','Handicap'],['wagr','WAGR'],['club','Clube'],['category','Categoria'],['fed','Federação'],['fed_num','Nº Federado']].map(([k,l]) => (
              <div key={k}>
                <div style={{ fontSize:'8px', color:t.textMuted, marginBottom:'3px', letterSpacing:'1px' }}>{l.toUpperCase()}</div>
                <input value={athleteForm[k] || ''} onChange={e => setAthleteForm(p => ({...p,[k]:e.target.value}))} style={inp} />
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
            <button onClick={saveAthlete} disabled={athleteSaving} style={{ background:'#378ADD', border:'none', borderRadius:'6px', color:'#fff', padding:'6px 16px', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:F, opacity:athleteSaving?0.7:1 }}>{athleteSaving ? 'A GUARDAR...' : 'GUARDAR'}</button>
            <button onClick={() => setEditingAthlete(false)} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:'6px', color:t.textMuted, padding:'6px 16px', fontSize:'11px', cursor:'pointer', fontFamily:F }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{
          borderRadius:'16px',
          padding:'20px 40px',
          marginBottom:'16px',
          background:`linear-gradient(125deg, ${phaseInfo.phaseColor} 0%, ${phaseInfo.phaseColor}d0 55%, ${phaseInfo.phaseColor}90 100%)`,
          position:'relative',
          overflow:'hidden',
          minHeight:'126px',
          display:'flex',
          flexDirection:'column',
          justifyContent:'center',
        }}>
          {/* edit button */}
          <button onClick={() => { setAthleteForm({...athlete}); setEditingAthlete(true) }}
            style={{ position:'absolute', top:'12px', right:'12px', background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.30)', borderRadius:'8px', color:heroTextColor, padding:'5px 10px', cursor:'pointer', fontSize:'13px', fontFamily:F, opacity:0.85 }} title="Editar perfil">✎</button>
          {/* crown + phase name */}
          <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'8px', position:'relative', zIndex:1 }}>
            <span style={{ fontSize:'24px', lineHeight:1 }}>👑</span>
            <div style={{ fontSize:'clamp(30px,4vw,52px)', fontWeight:950, color:heroTextColor, lineHeight:0.92, letterSpacing:'-0.02em', textTransform:'uppercase' }}>
              {currentPhase.name}
            </div>
          </div>
          {/* subtitle */}
          {currentPhase.situation && (
            <div style={{ fontSize:'clamp(13px,1.4vw,17px)', fontWeight:700, color:heroTextColor, opacity:0.95, position:'relative', zIndex:1 }}>
              {currentPhase.situation}
            </div>
          )}
          {/* illustration + HCP + WAGR — right side, vertically centred */}
          <div style={{ position:'absolute', right:'16px', bottom:'14px', display:'flex', alignItems:'flex-end', gap:'12px', zIndex:1, pointerEvents:'none' }}>
            <div style={{ opacity:0.85 }}>
              <PhaseIllustration phase={phaseInfo.phase} />
            </div>
            {athlete.hcp && athlete.hcp !== '—' && (
              <div style={{ background:'rgba(255,255,255,0.22)', border:'1px solid rgba(255,255,255,0.35)', borderRadius:'999px', padding:'4px 14px', display:'flex', alignItems:'center', gap:'6px', pointerEvents:'auto' }}>
                <span style={{ fontSize:'10px', fontWeight:800, color:heroTextColor, opacity:0.75, letterSpacing:'1px' }}>HCP</span>
                <span style={{ fontSize:'15px', fontWeight:900, color:heroTextColor }}>{athlete.hcp}</span>
              </div>
            )}
            {displayWagr && displayWagr !== '—' && (
              <div style={{ background:'rgba(255,255,255,0.22)', border:'1px solid rgba(255,255,255,0.35)', borderRadius:'999px', padding:'4px 14px', display:'flex', alignItems:'center', gap:'6px', pointerEvents:'auto' }}>
                <span style={{ fontSize:'10px', fontWeight:800, color:heroTextColor, opacity:0.75, letterSpacing:'1px' }}>WAGR</span>
                <span style={{ fontSize:'15px', fontWeight:900, color:heroTextColor }}>#{displayWagr}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ROW 1: HOJE | AMANHÃ | PRÓXIMA COMPETIÇÃO ─── */}
      <div className="hm-row3">

        {/* HOJE */}
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'16px', padding:'20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
            <div style={{ fontSize:'16px', fontWeight:900, color:t.text, letterSpacing:'0.5px' }}>HOJE</div>
            <div style={{ fontSize:'13px', color:t.textMuted, fontWeight:600 }}>
              {todayDate.toLocaleDateString('pt-PT', { weekday:'long', day:'2-digit', month:'2-digit' })}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'18px' }}>
            {todayPlanSessions.length > 0 ? todayPlanSessions.map((session, i) => {
              const isGym = session.type === 'gym'
              const color = isGym ? gymColor : golfColor
              return (
                <button key={i} className="hm-btn-reset" onClick={() => onNavigate && onNavigate('calendar', { date: todayStr })}
                  style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ width:'46px', height:'46px', borderRadius:'50%', background: isGym ? `${gymColor}22` : `${golfColor}22`, border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'20px' }}>
                    {isGym ? '⊕' : '⛳'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'15px', fontWeight:800, color:t.text }}>{sessionDisplayTitle(session)}</div>
                    {sessionMeta(session) && <div style={{ fontSize:'13px', color:t.textMuted, marginTop:'2px' }}>{sessionMeta(session)}</div>}
                  </div>
                  <div style={{ color:t.textMuted, fontSize:'18px', flexShrink:0 }}>›</div>
                </button>
              )
            }) : (
              <div>
                <div style={{ fontSize:'15px', fontWeight:700, color:t.text, marginBottom:'4px' }}>Plano ainda não definido</div>
                <div style={{ fontSize:'13px', color:t.textMuted }}>A aguardar planeamento do coach</div>
              </div>
            )}
          </div>
          <button onClick={() => onNavigate && onNavigate('calendar', { date: todayStr })}
            style={{ width:'100%', background:phaseInfo.phaseColor, border:'none', borderRadius:'10px', color:heroTextColor, padding:'13px', fontSize:'14px', fontWeight:800, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
            Ver plano completo →
          </button>
        </div>

        {/* AMANHÃ */}
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'16px', padding:'20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
            <div style={{ fontSize:'16px', fontWeight:900, color:t.text, letterSpacing:'0.5px' }}>AMANHÃ</div>
            <div style={{ fontSize:'13px', color:t.textMuted, fontWeight:600 }}>
              {tomorrowDate.toLocaleDateString('pt-PT', { weekday:'long', day:'2-digit', month:'2-digit' })}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {tomorrowPlanSessions.length > 0 ? tomorrowPlanSessions.map((session, i) => {
              const isGym = session.type === 'gym'
              const color = isGym ? gymColor : golfColor
              return (
                <button key={i} className="hm-btn-reset" onClick={() => onNavigate && onNavigate('calendar', { date: tomorrowStr })}
                  style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ width:'46px', height:'46px', borderRadius:'50%', background: isGym ? `${gymColor}22` : `${golfColor}22`, border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'20px' }}>
                    {isGym ? '⊕' : '⛳'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'15px', fontWeight:800, color:t.text }}>{sessionDisplayTitle(session)}</div>
                    {sessionMeta(session) && <div style={{ fontSize:'13px', color:t.textMuted, marginTop:'2px' }}>{sessionMeta(session)}</div>}
                  </div>
                  <div style={{ color:t.textMuted, fontSize:'18px', flexShrink:0 }}>›</div>
                </button>
              )
            }) : (
              <div>
                <div style={{ fontSize:'15px', fontWeight:700, color:t.text, marginBottom:'4px' }}>Plano ainda não definido</div>
                <div style={{ fontSize:'13px', color:t.textMuted }}>A aguardar planeamento do coach</div>
              </div>
            )}
          </div>
        </div>

        {/* PRÓXIMA COMPETIÇÃO */}
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'16px', padding:'20px' }}>
          <div style={{ fontSize:'11px', letterSpacing:'2px', color: daysToNextComp != null && daysToNextComp <= 7 ? '#ef4444' : '#f59e0b', fontWeight:800, textTransform:'uppercase', marginBottom:'16px' }}>
            PRÓXIMA COMPETIÇÃO
          </div>
          {upcomingCompsAll.length > 0 ? (
            <>
              <div style={{ display:'flex', alignItems:'flex-start', gap:'20px', marginBottom:'16px' }}>
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontSize:'64px', fontWeight:950, color:'#ef4444', lineHeight:0.88 }}>{daysToNextComp ?? '—'}</div>
                  <div style={{ fontSize:'10px', letterSpacing:'2px', color:t.textMuted, fontWeight:800, marginTop:'6px' }}>DIAS</div>
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:'16px', fontWeight:900, color:t.text, lineHeight:1.25 }}>{upcomingCompsAll[0].title}</div>
                  <div style={{ fontSize:'13px', color:t.textMuted, fontWeight:600, marginTop:'5px' }}>
                    {formatDate(upcomingCompsAll[0].start_date)}
                    {upcomingCompsAll[0].end_date && upcomingCompsAll[0].end_date !== upcomingCompsAll[0].start_date
                      ? ` — ${formatDate(upcomingCompsAll[0].end_date)}` : ''}
                  </div>
                </div>
              </div>
              {upcomingCompsAll.length > 1 && (
                <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
                  {upcomingCompsAll.slice(1, 4).map((comp, i) => {
                    const d = Math.max(0, Math.ceil((new Date(normDate(comp.start_date) + 'T12:00:00') - new Date()) / 86400000))
                    return (
                      <button key={i} className="hm-btn-reset" onClick={() => onNavigate && onNavigate('calendar')}
                        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', minWidth:0 }}>
                          <span style={{ fontSize:'13px' }}>🏆</span>
                          <div style={{ fontSize:'13px', color:t.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:650 }}>{comp.title}</div>
                        </div>
                        <div style={{ fontSize:'12px', color:t.textMuted, flexShrink:0, fontWeight:750 }}>{d}d</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize:'14px', color:t.textMuted }}>Sem competições agendadas</div>
          )}
        </div>
      </div>

      {/* ─── ROW 2: ESTA SEMANA | AGENDA ─── */}
      <div className="hm-row">

        {/* ESTA SEMANA */}
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'16px', padding:'20px' }}>
          <div style={{ fontSize:'16px', fontWeight:900, color:t.text, marginBottom:'16px' }}>ESTA SEMANA</div>
          <div className="hm-week-grid">
            {weekDays.map((day, i) => {
              const ds = day.toISOString().split('T')[0]
              const isToday = ds === todayStr
              const isPast  = ds < todayStr
              const dayEvts = events.filter(e => {
                const s = normDate(e.start_date || e.date || e.start)
                const end = normDate(e.end_date || e.end) || s
                return s <= ds && end >= ds
              })
              const compEvts = dayEvts.filter(isCompetition)
              const daySessions = getPlansForDate(trainingPlans, ds)
              const hasComp = compEvts.length > 0
              const gymSess = daySessions.filter(s => s.type === 'gym')
              const golfSess = daySessions.filter(s => s.type !== 'gym')
              const hasGolf = !hasComp && golfSess.length > 0
              const hasGym  = !hasComp && !hasGolf && gymSess.length > 0
              const actLabel = hasComp
                ? (compEvts[0].title?.slice(0, 12) || 'Competição')
                : hasGolf
                  ? (golfSess[0]?.title?.slice(0, 12) || 'Golf')
                  : hasGym
                    ? 'Ginásio'
                    : ''
              return (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', padding:'10px 4px', borderRadius:'10px', background: isToday ? `${t.accent}12` : 'transparent', border: isToday ? `1px solid ${t.accent}33` : '1px solid transparent', opacity: isPast && !isToday ? 0.5 : 1 }}>
                  <div style={{ fontSize:'12px', fontWeight: isToday ? 900 : 700, color: isToday ? t.accent : t.textMuted }}>
                    {DAY_LABELS[i]}
                  </div>
                  <div style={{ height:'28px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {hasComp
                      ? <span style={{ fontSize:'20px' }}>🏆</span>
                      : hasGolf
                        ? <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#378ADD', boxShadow:'0 0 0 3px #378ADD22' }} />
                        : hasGym
                          ? <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#52E8A0', boxShadow:'0 0 0 3px #52E8A022' }} />
                          : <span style={{ color:t.textFaint, fontSize:'14px', fontWeight:500 }}>—</span>
                    }
                  </div>
                  <div style={{ fontSize:'10px', color:t.textMuted, fontWeight:600, textAlign:'center', lineHeight:1.25, minHeight:'20px', wordBreak:'break-word' }}>
                    {actLabel}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AGENDA */}
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:'16px', padding:'20px' }}>
          <div style={{ fontSize:'16px', fontWeight:900, color:t.text, marginBottom:'16px' }}>AGENDA</div>

          {/* Coach/training items */}
          {agendaItems.map((item, i) => {
            const daysAway = Math.ceil((new Date(item.date + 'T12:00:00') - new Date()) / 86400000)
            const badge = daysAway <= 0 ? 'Hoje' : daysAway === 1 ? 'Amanhã' : `${daysAway}d`
            const isGym = item.color === gymColor
            const badgeColor = daysAway <= 0 ? golfColor : daysAway === 1 ? gymColor : t.textMuted
            return (
              <button key={`ag-${i}`} className="hm-btn-reset" onClick={() => onNavigate && onNavigate('calendar', { date: item.date })}
                style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:`1px solid ${t.border}` }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'50%', background: isGym ? `${gymColor}18` : `${golfColor}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'16px' }}>
                  {isGym ? '⊕' : '🚶'}
                </div>
                <div style={{ flex:1, fontSize:'14px', fontWeight:700, color:t.text }}>{item.label}</div>
                <div style={{ fontSize:'12px', fontWeight:800, color:badgeColor, background:`${badgeColor}18`, border:`1px solid ${badgeColor}30`, borderRadius:'999px', padding:'3px 10px', whiteSpace:'nowrap', flexShrink:0 }}>
                  {badge}
                </div>
                <div style={{ color:t.textMuted, fontSize:'18px', flexShrink:0, lineHeight:1 }}>›</div>
              </button>
            )
          })}

          {/* Recovery & Mental */}
          <div style={{ paddingTop:'12px' }}>
            <div style={{ fontSize:'13px', fontWeight:800, color:'#f59e0b', marginBottom:'10px' }}>Recovery & Mental</div>
            {recoveryStatus.map((r, i) => (
              <button key={`rec-${i}`} className="hm-btn-reset" onClick={() => onNavigate && onNavigate('calendar', { scheduleType: r.key === 'massage' ? 'massagem' : r.key === 'physio' ? 'fisio' : 'mental_coach' })}
                style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom: i < recoveryStatus.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                <div style={{ flex:1, fontSize:'14px', fontWeight:700, color:t.text }}>{r.label}</div>
                <div style={{ fontSize:'12px', color: r.alert ? '#f59e0b' : t.textMuted, fontWeight:650, whiteSpace:'nowrap' }}>
                  {r.daysSince === null ? 'Sem registo' : `${r.daysSince}d`}
                </div>
                <div style={{ color:t.textMuted, fontSize:'18px', flexShrink:0, lineHeight:1 }}>›</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      </div>
    </div>
  )
}
