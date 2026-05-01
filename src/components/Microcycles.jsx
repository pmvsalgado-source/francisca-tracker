import { useState, useEffect, useCallback } from 'react'
import { getMicrocycles, getRecentEntries, insertMicrocycle, deleteMicrocycle } from '../services/microcyclesService'

export default function Microcycles({ theme, t, user, lang = 'en' }) {
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [aiError, setAiError] = useState('')
  const F = "'Inter', system-ui, sans-serif"
  const card = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '16px 20px' }

  const s = lang === 'pt'
    ? {
        section: 'TREINO', title: 'Microciclos IA', generate: 'Gerar Microciclo', generating: 'A gerar...',
        week: 'Semana', golf: 'Golfe', gym: 'Ginásio', notes: 'Notas', delete: 'Apagar',
        empty: 'Sem microciclos gerados.', emptyDesc: 'Gera o primeiro plano semanal com IA.',
        aiNote: 'Requer créditos na API do Claude.',
        mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb', sun: 'Dom',
      }
    : {
        section: 'TRAINING', title: 'AI Microcycles', generate: 'Generate Microcycle', generating: 'Generating...',
        week: 'Week', golf: 'Golf', gym: 'Gym', notes: 'Notes', delete: 'Delete',
        empty: 'No microcycles generated yet.', emptyDesc: 'Generate your first AI weekly plan.',
        aiNote: 'Requires Claude API credits.',
        mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
      }

  const DAYS = [s.mon, s.tue, s.wed, s.thu, s.fri, s.sat, s.sun]

  const getWeekDates = (offset = 0) => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      label: `${monday.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} – ${sunday.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`
    }
  }

  const fetchCycles = useCallback(async () => {
    setLoading(true)
    const data = await getMicrocycles()
    setCycles(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCycles() }, [fetchCycles])

  const generate = async () => {
    setGenerating(true)
    setAiError('')
    const week = getWeekDates(weekOffset)

    // Fetch recent entries for context
    const entries = await getRecentEntries()
    const summary = entries.map(e => `${e.entry_date} ${e.metric_id}: ${e.value}`).join('\n') || 'Sem dados'

    const prompt = `És um treinador de golfe e preparador físico especializado. Com base nos dados de performance abaixo, cria um microciclo semanal detalhado para a semana de ${week.start} a ${week.end}.

Dados recentes de Francisca Salgado (objectivo: aumentar drive de 80 para 95 mph):
${summary}

Responde APENAS com JSON válido neste formato exacto (sem markdown, sem explicações):
{
  "week_label": "${week.label}",
  "focus": "foco principal da semana em 1 frase",
  "golf": [
    {"day": "Seg", "session": "nome da sessão", "duration": "90min", "drills": ["drill 1", "drill 2", "drill 3"]}
  ],
  "gym": [
    {"day": "Ter", "session": "nome da sessão", "duration": "60min", "exercises": [{"name": "exercício", "sets": "3x8", "intensity": "70%"}]}
  ],
  "rest_days": ["Qui", "Dom"],
  "weekly_notes": "notas gerais sobre o microciclo"
}`

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const json = await res.json()
      if (json.error) { setAiError(json.error); setGenerating(false); return }

      let plan
      try {
        const text = json.text || ''
        const clean = text.replace(/```json|```/g, '').trim()
        plan = JSON.parse(clean)
      } catch {
        setAiError('Erro a processar resposta da IA.')
        setGenerating(false)
        return
      }

      await insertMicrocycle({
        week_start: week.start, week_end: week.end,
        generated_plan: plan, created_by: user.email
      })
      fetchCycles()
      setExpanded(0)
    } catch (e) {
      setAiError('Erro ao contactar a API.')
    }
    setGenerating(false)
  }

  const deleteCycle = async (id) => {
    await deleteMicrocycle(id)
    fetchCycles()
  }

  const week = getWeekDates(weekOffset)

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.accent, marginBottom: '3px', fontWeight: 600 }}>{s.section}</div>
      <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>{s.title}</div>

      {/* Generate panel */}
      <div style={{ ...card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '6px 10px', cursor: 'pointer', fontFamily: F }}>‹</button>
          <div style={{ fontSize: '14px', fontWeight: 600, minWidth: '180px', textAlign: 'center' }}>{s.week}: {week.label}</div>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '6px 10px', cursor: 'pointer', fontFamily: F }}>›</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={generate} disabled={generating}
            style={{ background: generating ? t.navActive : t.accent, border: 'none', borderRadius: '8px', color: generating ? t.textMuted : '#fff', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: F }}>
            {generating ? s.generating : s.generate}
          </button>
          <span style={{ fontSize: '11px', color: t.textMuted }}>{s.aiNote}</span>
        </div>
        {aiError && <div style={{ marginTop: '10px', fontSize: '12px', color: t.danger, background: t.dangerBg, padding: '8px 12px', borderRadius: '6px' }}>{aiError}</div>}
      </div>

      {/* Cycles list */}
      {loading ? (
        <div style={{ textAlign: 'center', color: t.textMuted, padding: '40px' }}>Loading...</div>
      ) : cycles.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{s.empty}</div>
          <div style={{ fontSize: '13px', color: t.textMuted }}>{s.emptyDesc}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cycles.map((cycle, idx) => {
            const plan = cycle.generated_plan || {}
            const isOpen = expanded === idx
            return (
              <div key={cycle.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : idx)}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{plan.week_label || `${cycle.week_start} – ${cycle.week_end}`}</div>
                    {plan.focus && <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '3px' }}>{plan.focus}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); deleteCycle(cycle.id) }}
                      style={{ background: 'transparent', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '16px' }}
                      onMouseEnter={e => e.target.style.color = t.danger}
                      onMouseLeave={e => e.target.style.color = t.textFaint}>×</button>
                    <span style={{ color: t.textMuted, fontSize: '16px' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ marginTop: '16px', borderTop: `1px solid ${t.border}`, paddingTop: '16px' }}>
                    {/* Weekly grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '16px' }}>
                      {DAYS.map(day => {
                        const golfSession = plan.golf?.find(g => g.day === day)
                        const gymSession = plan.gym?.find(g => g.day === day)
                        const isRest = plan.rest_days?.includes(day)
                        return (
                          <div key={day} style={{ background: t.bg, borderRadius: '6px', padding: '8px 6px', textAlign: 'center', border: `1px solid ${t.border}` }}>
                            <div style={{ fontSize: '10px', letterSpacing: '1px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>{day}</div>
                            {isRest && <div style={{ fontSize: '9px', color: t.textFaint, fontStyle: 'italic' }}>Rest</div>}
                            {golfSession && <div style={{ fontSize: '9px', background: t.accent + '22', color: t.accent, padding: '2px 4px', borderRadius: '3px', marginBottom: '3px' }}>{s.golf}</div>}
                            {gymSession && <div style={{ fontSize: '9px', background: '#52E8A022', color: '#52E8A0', padding: '2px 4px', borderRadius: '3px' }}>{s.gym}</div>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Golf sessions */}
                    {plan.golf?.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.accent, marginBottom: '8px', fontWeight: 600 }}>{s.golf.toUpperCase()}</div>
                        {plan.golf.map((g, i) => (
                          <div key={i} style={{ marginBottom: '10px', paddingLeft: '12px', borderLeft: `2px solid ${t.accent}` }}>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{g.day} — {g.session} <span style={{ fontSize: '11px', color: t.textMuted, fontWeight: 400 }}>({g.duration})</span></div>
                            {g.drills?.map((d, j) => <div key={j} style={{ fontSize: '12px', color: t.textMuted, marginTop: '3px' }}>· {d}</div>)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Gym sessions */}
                    {plan.gym?.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#52E8A0', marginBottom: '8px', fontWeight: 600 }}>{s.gym.toUpperCase()}</div>
                        {plan.gym.map((g, i) => (
                          <div key={i} style={{ marginBottom: '10px', paddingLeft: '12px', borderLeft: '2px solid #52E8A0' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{g.day} — {g.session} <span style={{ fontSize: '11px', color: t.textMuted, fontWeight: 400 }}>({g.duration})</span></div>
                            {g.exercises?.map((ex, j) => (
                              <div key={j} style={{ fontSize: '12px', color: t.textMuted, marginTop: '3px' }}>
                                · {ex.name} — {ex.sets} <span style={{ color: t.textFaint }}>@ {ex.intensity}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {plan.weekly_notes && (
                      <div style={{ padding: '10px 12px', background: t.bg, borderRadius: '6px', fontSize: '12px', color: t.textMuted, borderLeft: `3px solid ${t.border}` }}>
                        {plan.weekly_notes}
                      </div>
                    )}
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
