import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import EmptyState from './EmptyState'

// ── helpers ────────────────────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return { week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7), year: d.getUTCFullYear() }
}

function weeksElapsed(tYear, tWeek, curYear, curWeek) {
  // approximate: (curYear - tYear) * 52 + (curWeek - tWeek)
  return (curYear - tYear) * 52 + (curWeek - tWeek)
}

function agingFactor(elapsed, aging = 0.02) {
  // After 52 weeks starts decaying 2% per additional week
  if (elapsed <= 52) return 1
  return Math.max(0, 1 - aging * (elapsed - 52))
}

function calcWAGR(tournaments, curWeek, curYear) {
  let ptsTotal = 0
  let divisorTotal = 0
  let divisorAdjusted = 0

  const rows = tournaments.map(t => {
    const elapsed = weeksElapsed(t.year, t.iso_week, curYear, curWeek)
    const inWindow = elapsed <= 104 // 2-year window
    const factor = agingFactor(elapsed)
    const div = (!t.is_simulated && t.divisor === 0) ? 0 : (inWindow ? 1 : 0)
    const ptsCurrent = t.pts_avg * factor * (inWindow ? 1 : 0)
    return { ...t, elapsed, factor, div, ptsCurrent }
  })

  rows.forEach(r => {
    if (r.div === 1) { divisorTotal += 1; divisorAdjusted += r.factor }
    ptsTotal += r.ptsCurrent
  })

  const pointAverage = divisorAdjusted > 0 ? ptsTotal / divisorAdjusted : 0
  return { rows, ptsTotal, divisorTotal, divisorAdjusted, pointAverage }
}

// Simulate next N weeks
function simulateWeeks(tournaments, curWeek, curYear, simTournaments = [], n = 12) {
  const results = []
  let week = curWeek, year = curYear
  const allTournaments = [...tournaments, ...simTournaments]
  for (let i = 0; i < n; i++) {
    week++
    if (week > 52) { week = 1; year++ }
    const { pointAverage, divisorAdjusted } = calcWAGR(allTournaments, week, year)
    results.push({ week, year, pointAverage: +pointAverage.toFixed(2), divisor: +divisorAdjusted.toFixed(4) })
  }
  return results
}

// ── main component ──────────────────────────────────────────────────────────
export default function HcpWagr({ theme, t, user }) {
  const F = "'Inter', system-ui, sans-serif"
  const [tab, setTab] = useState('wagr') // wagr | hcp

  // ── WAGR state ──
  const [tournaments, setTournaments] = useState([])
  const [wagrHistory, setWagrHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSimulator, setShowSimulator] = useState(false)
  const [simTournaments, setSimTournaments] = useState([])
  const [simWeeks, setSimWeeks] = useState(12)

  // Current week (manual override or auto)
  const today = new Date()
  const { week: autoWeek, year: autoYear } = getISOWeek(today)
  const [curWeek, setCurWeek] = useState(autoWeek)
  const [curYear, setCurYear] = useState(autoYear)

  // Tournament modal
  const [showTModal, setShowTModal] = useState(false)
  const [editingT, setEditingT] = useState(null)
  const [tForm, setTForm] = useState({ event_name: '', finish: '', pts_avg: '', year: new Date().getFullYear(), iso_week: autoWeek, divisor: 1, is_simulated: false })

  // WAGR history modal
  const [showHModal, setShowHModal] = useState(false)
  const [hForm, setHForm] = useState({ week: autoWeek, year: autoYear, reference_date: today.toISOString().split('T')[0], point_average: '', rank: '' })

  // ── HCP state ──
  const [hcpHistory, setHcpHistory] = useState([])
  const [showHcpModal, setShowHcpModal] = useState(false)
  const [hcpForm, setHcpForm] = useState({ date: today.toISOString().split('T')[0], hcp: '', notes: '' })

  // ── fetch ──
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [wt, wh, hh] = await Promise.all([
      supabase.from('wagr_tournaments').select('*').order('year').then(r => r.data || []),
      supabase.from('wagr_history').select('*').order('year').then(r => r.data || []),
      supabase.from('hcp_history').select('*').order('date', { ascending: false }).then(r => r.data || []),
    ])
    setTournaments(wt)
    setWagrHistory(wh)
    setHcpHistory(hh)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── WAGR calculations ──
  const { rows: tRows, ptsTotal, divisorTotal, divisorAdjusted, pointAverage } = calcWAGR(tournaments, curWeek, curYear)
  const simulation = showSimulator ? simulateWeeks(tournaments, curWeek, curYear, simTournaments, simWeeks) : []

  // ── Tournament CRUD ──
  const openNewT = () => {
    setEditingT(null)
    setTForm({ event_name: '', finish: '', pts_avg: '', year: new Date().getFullYear(), iso_week: autoWeek, divisor: 1, is_simulated: false })
    setShowTModal(true)
  }
  const openEditT = (t) => {
    setEditingT(t)
    setTForm({ event_name: t.event_name, finish: t.finish, pts_avg: t.pts_avg, year: t.year, iso_week: t.iso_week, divisor: t.divisor, is_simulated: t.is_simulated || false })
    setShowTModal(true)
  }
  const saveT = async () => {
    const payload = {
      event_name: tForm.event_name,
      finish: tForm.finish,
      pts_avg: parseFloat(tForm.pts_avg) || 0,
      year: parseInt(tForm.year),
      iso_week: parseInt(tForm.iso_week),
      divisor: parseInt(tForm.divisor),
      is_simulated: tForm.is_simulated,
      user_id: user?.id,
    }
    if (editingT) {
      await supabase.from('wagr_tournaments').update(payload).eq('id', editingT.id)
    } else {
      await supabase.from('wagr_tournaments').insert(payload)
    }
    setShowTModal(false)
    fetchAll()
  }
  const deleteT = async (id) => {
    await supabase.from('wagr_tournaments').delete().eq('id', id)
    fetchAll()
  }

  // ── WAGR History CRUD ──
  const saveH = async () => {
    await supabase.from('wagr_history').insert({
      week: parseInt(hForm.week),
      year: parseInt(hForm.year),
      reference_date: hForm.reference_date,
      point_average: parseFloat(hForm.point_average) || 0,
      rank: parseInt(hForm.rank) || null,
      user_id: user?.id,
    })
    setShowHModal(false)
    fetchAll()
  }
  const deleteH = async (id) => {
    await supabase.from('wagr_history').delete().eq('id', id)
    fetchAll()
  }

  // ── HCP CRUD ──
  const saveHcp = async () => {
    await supabase.from('hcp_history').insert({
      date: hcpForm.date,
      hcp: parseFloat(hcpForm.hcp),
      notes: hcpForm.notes || null,
      user_id: user?.id,
    })
    setShowHcpModal(false)
    fetchAll()
  }
  const deleteHcp = async (id) => {
    await supabase.from('hcp_history').delete().eq('id', id)
    fetchAll()
  }

  // ── simulator tournament ──
  const addSimT = () => {
    setSimTournaments(s => [...s, { event_name: 'Torneio Simulado', finish: '10', pts_avg: 300, year: curYear, iso_week: curWeek + 2, divisor: 1, is_simulated: true }])
  }
  const updateSimT = (i, field, val) => {
    setSimTournaments(s => s.map((t, idx) => idx === i ? { ...t, [field]: field === 'pts_avg' || field === 'iso_week' ? parseFloat(val) || 0 : val } : t))
  }
  const removeSimT = (i) => setSimTournaments(s => s.filter((_, idx) => idx !== i))

  // ── styles ──
  const card = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '16px 20px' }
  const th = { padding: '8px 10px', textAlign: 'left', color: t.textMuted, fontWeight: 600, fontSize: '10px', letterSpacing: '2px', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }
  const td = { padding: '8px 10px', fontSize: '12px', color: t.text, borderBottom: `1px solid ${t.border}` }
  const inp = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, padding: '8px 10px', fontSize: '13px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const btn = (accent) => ({ background: accent ? t.accent : 'transparent', border: `1px solid ${accent ? t.accent : t.border}`, borderRadius: '7px', color: accent ? '#fff' : t.textMuted, padding: '7px 14px', fontSize: '12px', fontWeight: accent ? 700 : 400, cursor: 'pointer', fontFamily: F })

  const currentHcp = hcpHistory[0]
  const prevHcp = hcpHistory[1]
  const hcpDelta = currentHcp && prevHcp ? (parseFloat(currentHcp.hcp) - parseFloat(prevHcp.hcp)).toFixed(1) : null

  // latest rank from history
  const latestHistory = [...wagrHistory].sort((a, b) => (b.year * 100 + b.week) - (a.year * 100 + a.week))[0]

  if (loading) return <div style={{ fontFamily: F, color: t.textMuted, padding: '40px', textAlign: 'center' }}>A carregar...</div>

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .hw-tabs { display:flex; gap:8px; margin-bottom:20px }
        .hw-grid { display:grid; grid-template-columns:1fr 320px; gap:16px }
        .hw-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px }
        .hw-table { width:100%; border-collapse:collapse; font-size:12px }
        .hw-table tr:hover td { background: ${t.bg} }
        .hw-modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:999 }
        .hw-modal { background:${t.surface};border:1px solid ${t.border};border-radius:14px;padding:24px;width:420px;max-width:95vw }
        @media(max-width:768px){
          .hw-grid{grid-template-columns:1fr}
          .hw-kpis{grid-template-columns:repeat(2,1fr)}
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.accent, marginBottom: '3px', fontWeight: 600 }}>RANKING</div>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>HCP & WAGR</div>
        </div>
        {/* Tab switcher */}
        <div className="hw-tabs">
          {[['wagr', 'WAGR'], ['hcp', 'HCP']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ ...btn(tab === id), borderColor: tab === id ? t.accent : t.border, color: tab === id ? '#fff' : t.textMuted }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ WAGR TAB ══════════════ */}
      {tab === 'wagr' && (
        <>
          {/* KPI strip */}
          <div className="hw-kpis">
            {[
              { label: 'POINT AVERAGE', value: pointAverage.toFixed(2), accent: true },
              { label: 'RANK WAGR', value: latestHistory?.rank ? `#${latestHistory.rank}` : '—' },
              { label: 'DIVISOR', value: `${divisorTotal} (${divisorAdjusted.toFixed(2)})` },
              { label: 'PTS TOTAL', value: ptsTotal.toFixed(2) },
            ].map(k => (
              <div key={k.label} style={{ ...card, padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: k.accent ? t.accent : t.textMuted, fontWeight: 600, marginBottom: '6px' }}>{k.label}</div>
                <div style={{ fontSize: k.accent ? '22px' : '18px', fontWeight: 800, color: k.accent ? t.accent : t.text }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Week selector */}
          <div style={{ ...card, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, fontWeight: 600 }}>SEMANA ATUAL</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button onClick={() => setCurWeek(w => { if (w <= 1) { setCurYear(y => y - 1); return 52 } return w - 1 })} style={btn(false)}>‹</button>
              <span style={{ fontWeight: 700, minWidth: '80px', textAlign: 'center' }}>S{curWeek} · {curYear}</span>
              <button onClick={() => setCurWeek(w => { if (w >= 52) { setCurYear(y => y + 1); return 1 } return w + 1 })} style={btn(false)}>›</button>
            </div>
            <button onClick={() => { setCurWeek(autoWeek); setCurYear(autoYear) }} style={{ ...btn(false), fontSize: '11px', color: t.accent, borderColor: t.accent }}>
              Semana atual
            </button>
          </div>

          {/* Main grid */}
          <div className="hw-grid">
            {/* Left — tournament table */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700 }}>Torneios na Janela WAGR</div>
                <button onClick={openNewT} style={btn(true)}>+ Torneio</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="hw-table">
                  <thead>
                    <tr>
                      {['TORNEIO', 'POS', 'ANO', 'SEM', 'PTS AVG', 'DECORRIDAS', 'FATOR', 'PTS ATUAL', ''].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tRows.length === 0 && (
                      <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: t.textMuted, padding: '32px' }}>Sem torneios. Adiciona o primeiro.</td></tr>
                    )}
                    {tRows.map((row) => (
                      <tr key={row.id} style={{ opacity: row.elapsed > 104 ? 0.4 : 1 }}>
                        <td style={{ ...td, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{row.event_name}</td>
                        <td style={td}>{row.finish}</td>
                        <td style={td}>{row.year}</td>
                        <td style={td}>{row.iso_week}</td>
                        <td style={td}>{parseFloat(row.pts_avg).toFixed(2)}</td>
                        <td style={td}>{row.elapsed}</td>
                        <td style={{ ...td, color: row.factor < 1 ? '#f59e0b' : t.textMuted }}>{row.factor.toFixed(2)}</td>
                        <td style={{ ...td, fontWeight: 700, color: t.accent }}>{row.ptsCurrent.toFixed(2)}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => openEditT(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: '13px' }}>✏</button>
                            <button onClick={() => deleteT(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '13px' }}>×</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right — history + controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Weekly history */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>Histórico Semanal</div>
                  <button onClick={() => { setHForm({ week: curWeek, year: curYear, reference_date: today.toISOString().split('T')[0], point_average: pointAverage.toFixed(2), rank: '' }); setShowHModal(true) }} style={btn(true)}>+ Semana</button>
                </div>
                <table className="hw-table">
                  <thead>
                    <tr>
                      {['SEM', 'ANO', 'PA', 'RANK', ''].map(h => <th key={h} style={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {wagrHistory.length === 0 && (
                      <tr><td colSpan={5}><EmptyState icon="📊" message="Sem registos." t={t} compact /></td></tr>
                    )}
                    {[...wagrHistory].sort((a, b) => (b.year * 100 + b.week) - (a.year * 100 + a.week)).map(h => (
                      <tr key={h.id}>
                        <td style={td}>{h.week}</td>
                        <td style={td}>{h.year}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{parseFloat(h.point_average).toFixed(2)}</td>
                        <td style={{ ...td, color: t.accent, fontWeight: 700 }}>{h.rank ? `#${h.rank}` : '—'}</td>
                        <td style={td}><button onClick={() => deleteH(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '13px' }}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Simulator */}
          <div style={{ ...card, marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowSimulator(s => !s)}>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>Simulador de Semanas Futuras</div>
              <span style={{ color: t.textMuted }}>{showSimulator ? '▲' : '▼'}</span>
            </div>

            {showSimulator && (
              <div style={{ marginTop: '16px', borderTop: `1px solid ${t.border}`, paddingTop: '16px' }}>
                {/* Sim tournament inputs */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: 600, letterSpacing: '1px' }}>TORNEIOS SIMULADOS</div>
                    <button onClick={addSimT} style={btn(false)}>+ Adicionar</button>
                  </div>
                  {simTournaments.map((st, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px auto', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                      <input value={st.event_name} onChange={e => updateSimT(i, 'event_name', e.target.value)} placeholder="Nome" style={{ ...inp, fontSize: '12px' }} />
                      <input value={st.finish} onChange={e => updateSimT(i, 'finish', e.target.value)} placeholder="Pos" style={{ ...inp, fontSize: '12px' }} />
                      <input type="number" value={st.pts_avg} onChange={e => updateSimT(i, 'pts_avg', e.target.value)} placeholder="Pts Avg" style={{ ...inp, fontSize: '12px' }} />
                      <input type="number" value={st.iso_week} onChange={e => updateSimT(i, 'iso_week', e.target.value)} placeholder="Sem" style={{ ...inp, fontSize: '12px' }} />
                      <button onClick={() => removeSimT(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}>×</button>
                    </div>
                  ))}
                </div>

                {/* Weeks ahead */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: 600 }}>SEMANAS À FRENTE</div>
                  {[4, 8, 12, 24].map(n => (
                    <button key={n} onClick={() => setSimWeeks(n)} style={{ ...btn(simWeeks === n), padding: '4px 10px', fontSize: '11px' }}>{n}</button>
                  ))}
                </div>

                {/* Simulation table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="hw-table">
                    <thead>
                      <tr>
                        {['SEMANA', 'ANO', 'DIVISOR', 'POINT AVERAGE PROJETADO'].map(h => <th key={h} style={th}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {simulation.map((s, i) => (
                        <tr key={i}>
                          <td style={td}>{s.week}</td>
                          <td style={td}>{s.year}</td>
                          <td style={td}>{s.divisor}</td>
                          <td style={{ ...td, fontWeight: 700, color: t.accent }}>{s.pointAverage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════ HCP TAB ══════════════ */}
      {tab === 'hcp' && (
        <>
          {/* HCP KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
            <div style={{ ...card, padding: '16px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.accent, fontWeight: 600, marginBottom: '6px' }}>HCP ATUAL</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.accent }}>{currentHcp ? currentHcp.hcp : '—'}</div>
            </div>
            <div style={{ ...card, padding: '16px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, fontWeight: 600, marginBottom: '6px' }}>VARIAÇÃO</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: hcpDelta === null ? t.text : parseFloat(hcpDelta) < 0 ? '#4ade80' : '#f87171' }}>
                {hcpDelta !== null ? (parseFloat(hcpDelta) > 0 ? '+' : '') + hcpDelta : '—'}
              </div>
            </div>
            <div style={{ ...card, padding: '16px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, fontWeight: 600, marginBottom: '6px' }}>REGISTOS</div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{hcpHistory.length}</div>
            </div>
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>Histórico HCP</div>
              <button onClick={() => { setHcpForm({ date: today.toISOString().split('T')[0], hcp: '', notes: '' }); setShowHcpModal(true) }} style={btn(true)}>+ Atualizar HCP</button>
            </div>

            {/* Mini chart — bars */}
            {hcpHistory.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', marginBottom: '16px', padding: '0 2px' }}>
                {[...hcpHistory].reverse().slice(-20).map((h, i) => {
                  const vals = hcpHistory.map(x => parseFloat(x.hcp))
                  const min = Math.min(...vals), max = Math.max(...vals)
                  const range = max - min || 1
                  const pct = ((parseFloat(h.hcp) - min) / range)
                  const height = 10 + pct * 50
                  return (
                    <div key={i} title={`${h.date}: ${h.hcp}`}
                      style={{ flex: 1, height: `${height}px`, background: t.accent + '88', borderRadius: '3px 3px 0 0', minWidth: '6px', cursor: 'default', transition: 'height 0.3s' }} />
                  )
                })}
              </div>
            )}

            <table className="hw-table">
              <thead>
                <tr>
                  {['DATA', 'HCP', 'VARIAÇÃO', 'NOTAS', ''].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {hcpHistory.length === 0 && (
                  <tr><td colSpan={5}><EmptyState icon="📈" message="Sem registos de HCP." t={t} compact /></td></tr>
                )}
                {hcpHistory.map((h, i) => {
                  const prev = hcpHistory[i + 1]
                  const delta = prev ? (parseFloat(h.hcp) - parseFloat(prev.hcp)).toFixed(1) : null
                  return (
                    <tr key={h.id}>
                      <td style={td}>{h.date}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{h.hcp}</td>
                      <td style={{ ...td, color: delta === null ? t.textMuted : parseFloat(delta) < 0 ? '#4ade80' : '#f87171' }}>
                        {delta !== null ? (parseFloat(delta) > 0 ? '+' : '') + delta : '—'}
                      </td>
                      <td style={{ ...td, color: t.textMuted }}>{h.notes || '—'}</td>
                      <td style={td}><button onClick={() => deleteHcp(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '13px' }}>×</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════ MODALS ══════════════ */}

      {/* Tournament modal */}
      {showTModal && (
        <div className="hw-modal-overlay">
          <div className="hw-modal">
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{editingT ? 'Editar Torneio' : 'Novo Torneio'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600, letterSpacing: '1px' }}>NOME DO TORNEIO</div>
                <input value={tForm.event_name} onChange={e => setTForm(f => ({ ...f, event_name: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>POSIÇÃO</div>
                  <input value={tForm.finish} onChange={e => setTForm(f => ({ ...f, finish: e.target.value }))} style={inp} placeholder="ex: 5 ou P" />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>ANO</div>
                  <input type="number" value={tForm.year} onChange={e => setTForm(f => ({ ...f, year: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>SEMANA ISO</div>
                  <input type="number" value={tForm.iso_week} onChange={e => setTForm(f => ({ ...f, iso_week: e.target.value }))} style={inp} min="1" max="52" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>PTS AVG (do site WAGR)</div>
                  <input type="number" step="0.01" value={tForm.pts_avg} onChange={e => setTForm(f => ({ ...f, pts_avg: e.target.value }))} style={inp} placeholder="ex: 450.75" />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>DIVISOR</div>
                  <select value={tForm.divisor} onChange={e => setTForm(f => ({ ...f, divisor: parseInt(e.target.value) }))} style={{ ...inp }}>
                    <option value={1}>1 — conta para divisor</option>
                    <option value={0}>0 — não conta (ex: equipa)</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowTModal(false)} style={btn(false)}>Cancelar</button>
              <button onClick={saveT} style={btn(true)}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* WAGR History modal */}
      {showHModal && (
        <div className="hw-modal-overlay">
          <div className="hw-modal">
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Registar Semana WAGR</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>SEMANA</div>
                  <input type="number" value={hForm.week} onChange={e => setHForm(f => ({ ...f, week: e.target.value }))} style={inp} min="1" max="52" />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>ANO</div>
                  <input type="number" value={hForm.year} onChange={e => setHForm(f => ({ ...f, year: e.target.value }))} style={inp} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>DATA REFERÊNCIA</div>
                <input type="date" value={hForm.reference_date} onChange={e => setHForm(f => ({ ...f, reference_date: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>POINT AVERAGE</div>
                  <input type="number" step="0.01" value={hForm.point_average} onChange={e => setHForm(f => ({ ...f, point_average: e.target.value }))} style={inp} placeholder={pointAverage.toFixed(2)} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>RANK (do site WAGR)</div>
                  <input type="number" value={hForm.rank} onChange={e => setHForm(f => ({ ...f, rank: e.target.value }))} style={inp} placeholder="ex: 1661" />
                </div>
              </div>
              <div style={{ fontSize: '11px', color: t.textMuted, background: t.bg, borderRadius: '6px', padding: '8px 10px' }}>
                Point Average calculado automaticamente: <strong style={{ color: t.accent }}>{pointAverage.toFixed(2)}</strong> — ajusta se necessário com o valor do site WAGR.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowHModal(false)} style={btn(false)}>Cancelar</button>
              <button onClick={saveH} style={btn(true)}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* HCP modal */}
      {showHcpModal && (
        <div className="hw-modal-overlay">
          <div className="hw-modal">
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Atualizar HCP</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>DATA</div>
                  <input type="date" value={hcpForm.date} onChange={e => setHcpForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>HCP</div>
                  <input type="number" step="0.1" value={hcpForm.hcp} onChange={e => setHcpForm(f => ({ ...f, hcp: e.target.value }))} style={inp} placeholder="ex: 2.4" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '4px', fontWeight: 600 }}>NOTAS</div>
                <input value={hcpForm.notes} onChange={e => setHcpForm(f => ({ ...f, notes: e.target.value }))} style={inp} placeholder="opcional" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowHcpModal(false)} style={btn(false)}>Cancelar</button>
              <button onClick={saveHcp} style={btn(true)}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
