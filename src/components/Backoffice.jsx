import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

import { COACH_ROLES } from '../constants/roles'

export default function Backoffice({ theme, t, user, userRole = '' }) {
  const [section, setSection] = useState('performance')
  const [entries, setEntries] = useState([])
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [competitions, setCompetitions] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const F = "'Inter', system-ui, sans-serif"
  const card = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '16px 20px' }
  const th = { padding: '10px 12px', textAlign: 'left', color: t.textMuted, fontWeight: 600, fontSize: '10px', letterSpacing: '2px', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }
  const td = { padding: '9px 12px', fontSize: '12px', color: t.text, borderBottom: `1px solid ${t.border}`, verticalAlign: 'top' }

  if (!COACH_ROLES.includes(userRole)) {
    return <div style={{ padding: '60px', textAlign: 'center', color: t.textMuted, fontFamily: F }}>Acesso restrito.</div>
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [e, m, c, g] = await Promise.all([
      supabase.from('entries').select('*').order('entry_date', { ascending: false }),
      supabase.from('messages').select('*').order('created_at', { ascending: false }),
      supabase.from('competition_stats').select('*').order('event_date', { ascending: false }),
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
    ])
    setEntries(e.data || [])
    setMessages(m.data || [])
    setCompetitions(c.data || [])
    setGoals(g.data || [])

    // Unique users from entries + messages
    const emailSet = new Set()
    const userList = []
    ;[...(e.data || []), ...(m.data || [])].forEach(row => {
      const email = row.updated_by || row.user_email || ''
      if (email && !emailSet.has(email)) {
        emailSet.add(email)
        const lastSeen = row.updated_at || row.created_at || ''
        userList.push({ email, lastSeen })
      }
    })
    setUsers(userList.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const exportAll = () => {
    const sections = [
      ['=== PERFORMANCE ==='],
      ['Data', 'Métrica', 'Valor', 'Utilizador'],
      ...entries.map(e => [e.entry_date, e.metric_id, e.value, e.updated_by || '']),
      [],
      ['=== COMPETIÇÕES ==='],
      ['Nome', 'Data', 'Score', 'Posição', 'Notas'],
      ...competitions.map(c => [c.event_name, c.event_date, c.values?.score || '', c.values?.position || '', c.notes || '']),
      [],
      ['=== OBJECTIVOS ==='],
      ['KPI', 'Início', 'Objectivo', 'Data Início', 'Data Fim', 'Criado por'],
      ...goals.map(g => [g.metric_label, g.start_value, g.target_value, g.start_date, g.end_date, g.created_by || '']),
      [],
      ['=== MENSAGENS ==='],
      ['Data', 'Utilizador', 'Mensagem'],
      ...messages.map(m => [new Date(m.created_at).toLocaleDateString('pt-PT'), m.user_name || m.user_email, m.content]),
    ]
    const tsv = sections.map(r => Array.isArray(r) ? r.join('\t') : '').join('\n')
    const blob = new Blob(['\uFEFF' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `backup_${new Date().toISOString().split('T')[0]}.xls`; a.click()
  }

  const sections = [
    { id: 'performance', label: 'Performance', count: entries.filter(e => e.metric_id !== '__notes__').length },
    { id: 'competitions', label: 'Competições', count: competitions.length },
    { id: 'goals', label: 'Objectivos', count: goals.length },
    { id: 'users', label: 'Utilizadores', count: users.length },
    { id: 'messages', label: 'Chat', count: messages.length },
  ]

  const filtered = (arr, keys) => {
    if (!filter) return arr
    return arr.filter(row => keys.some(k => String(row[k] || '').toLowerCase().includes(filter.toLowerCase())))
  }

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .bo-sections{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px}
        @media(max-width:600px){.bo-sections{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:360px){.bo-sections{grid-template-columns:1fr 1fr}}
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.danger, marginBottom: '3px', fontWeight: 600 }}>ADMIN</div>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>Backoffice</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar..."
            style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, padding: '7px 12px', fontSize: '12px', fontFamily: F, outline: 'none', width: '180px' }} />
          <button onClick={fetchAll} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted, padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: F }}>↻ Refresh</button>
          <button onClick={exportAll} style={{ background: 'transparent', border: `1px solid ${t.accent}`, borderRadius: '8px', color: t.accent, padding: '7px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: F }}>↓ Export Excel</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="bo-sections">
        {sections.map(s => (
          <div key={s.id} onClick={() => setSection(s.id)}
            style={{ ...card, cursor: 'pointer', border: `1px solid ${section === s.id ? t.accent : t.border}`, background: section === s.id ? t.accentBg : t.surface }}>
            <div style={{ fontSize: '9px', letterSpacing: '2px', color: section === s.id ? t.accent : t.textMuted, marginBottom: '6px', fontWeight: 600 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: section === s.id ? t.accentLight : t.text }}>{s.count}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: t.textMuted, padding: '40px' }}>A carregar...</div>
      ) : (
        <div style={{ overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: '10px' }}>

          {/* Performance */}
          {section === 'performance' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '500px' }}>
              <thead><tr style={{ background: t.surface }}>
                <th style={th}>DATA</th><th style={th}>MÉTRICA</th><th style={th}>VALOR</th><th style={th}>NOTAS</th><th style={th}>UTILIZADOR</th><th style={th}>ACTUALIZADO</th>
              </tr></thead>
              <tbody>
                {filtered(entries, ['entry_date','metric_id','value','updated_by']).map(e => (
                  <tr key={e.id}>
                    <td style={td}>{e.entry_date}</td>
                    <td style={{ ...td, color: e.metric_id === '__notes__' ? t.textMuted : t.accent }}>{e.metric_id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{e.value}</td>
                    <td style={{ ...td, color: t.textMuted, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.metric_id === '__notes__' ? e.value : ''}
                    </td>
                    <td style={{ ...td, color: t.textMuted }}>{e.updated_by || '—'}</td>
                    <td style={{ ...td, color: t.textMuted }}>{e.updated_at ? new Date(e.updated_at).toLocaleDateString('pt-PT') : '—'}</td>
                  </tr>
                ))}
                {!entries.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: t.textMuted, padding: '40px' }}>Sem registos.</td></tr>}
              </tbody>
            </table>
          )}

          {/* Competitions */}
          {section === 'competitions' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '500px' }}>
              <thead><tr style={{ background: t.surface }}>
                <th style={th}>COMPETIÇÃO</th><th style={th}>DATA</th><th style={th}>SCORE</th><th style={th}>POSIÇÃO</th><th style={th}>CRIADO POR</th><th style={th}>NOTAS</th>
              </tr></thead>
              <tbody>
                {filtered(competitions, ['event_name','event_date','created_by']).map(c => (
                  <tr key={c.id}>
                    <td style={{ ...td, fontWeight: 600 }}>{c.event_name}</td>
                    <td style={td}>{c.event_date}</td>
                    <td style={td}>{c.values?.score || '—'}</td>
                    <td style={td}>{c.values?.position ? `#${c.values.position}` : '—'}</td>
                    <td style={{ ...td, color: t.textMuted }}>{c.created_by || '—'}</td>
                    <td style={{ ...td, color: t.textMuted, maxWidth: '200px' }}>{c.notes || '—'}</td>
                  </tr>
                ))}
                {!competitions.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: t.textMuted, padding: '40px' }}>Sem competições.</td></tr>}
              </tbody>
            </table>
          )}

          {/* Goals */}
          {section === 'goals' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '500px' }}>
              <thead><tr style={{ background: t.surface }}>
                <th style={th}>KPI</th><th style={th}>INÍCIO</th><th style={th}>OBJECTIVO</th><th style={th}>DATA INÍCIO</th><th style={th}>DATA FIM</th><th style={th}>CRIADO POR</th>
              </tr></thead>
              <tbody>
                {filtered(goals, ['metric_label','created_by']).map(g => (
                  <tr key={g.id}>
                    <td style={{ ...td, fontWeight: 600 }}>{g.metric_label}</td>
                    <td style={td}>{g.start_value}{g.unit}</td>
                    <td style={{ ...td, color: t.accent, fontWeight: 700 }}>{g.target_value}{g.unit}</td>
                    <td style={td}>{g.start_date}</td>
                    <td style={td}>{g.end_date}</td>
                    <td style={{ ...td, color: t.textMuted }}>{g.created_by || '—'}</td>
                  </tr>
                ))}
                {!goals.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: t.textMuted, padding: '40px' }}>Sem objectivos.</td></tr>}
              </tbody>
            </table>
          )}

          {/* Users */}
          {section === 'users' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '400px' }}>
              <thead><tr style={{ background: t.surface }}>
                <th style={th}>EMAIL</th><th style={th}>ÚLTIMA ACTIVIDADE</th>
              </tr></thead>
              <tbody>
                {filtered(users, ['email']).map((u, i) => (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 600, color: t.text }}>
                      {u.email}
                    </td>
                    <td style={{ ...td, color: t.textMuted }}>{u.lastSeen ? new Date(u.lastSeen).toLocaleString('pt-PT') : '—'}</td>
                  </tr>
                ))}
                {!users.length && <tr><td colSpan={2} style={{ ...td, textAlign: 'center', color: t.textMuted, padding: '40px' }}>Sem utilizadores.</td></tr>}
              </tbody>
            </table>
          )}

          {/* Messages */}
          {section === 'messages' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '500px' }}>
              <thead><tr style={{ background: t.surface }}>
                <th style={th}>DATA</th><th style={th}>UTILIZADOR</th><th style={th}>MENSAGEM</th><th style={th}>EDITADO</th>
              </tr></thead>
              <tbody>
                {filtered(messages, ['user_name','user_email','content']).map(m => (
                  <tr key={m.id}>
                    <td style={{ ...td, color: t.textMuted, whiteSpace: 'nowrap' }}>{new Date(m.created_at).toLocaleString('pt-PT')}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{m.user_name || m.user_email?.split('@')[0]}</td>
                    <td style={{ ...td, maxWidth: '400px' }}>{m.content}</td>
                    <td style={{ ...td, color: m.edited ? '#f59e0b' : t.textFaint }}>{m.edited ? 'Sim' : '—'}</td>
                  </tr>
                ))}
                {!messages.length && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: t.textMuted, padding: '40px' }}>Sem mensagens.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
