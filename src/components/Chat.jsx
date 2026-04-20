import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function Chat({ theme, t, user, profile, lang = 'en' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const F = "'Inter', system-ui, sans-serif"
  const myEmail = (user?.email || '').trim().toLowerCase()

  const s = lang === 'pt'
    ? { placeholder: 'Mensagem...', send: 'Enviar', loading: 'A carregar...', empty: 'Sem mensagens. Começa a conversa!', you: 'Tu', cancel: 'Cancelar', save: 'Guardar', deleteMsg: 'Apagar esta mensagem?', deleteBtn: 'Apagar', edited: 'editado' }
    : { placeholder: 'Message...', send: 'Send', loading: 'Loading...', empty: 'No messages yet. Start the conversation!', you: 'You', cancel: 'Cancel', save: 'Save', deleteMsg: 'Delete this message?', deleteBtn: 'Delete', edited: 'edited' }

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(200)
    setMessages(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text) return
    setSending(true)
    setInput('')
    const name = profile?.name || myEmail.split('@')[0]
    const { error } = await supabase.from('messages').insert({ user_email: myEmail, user_name: name, content: text })
    if (error) { alert('Erro: ' + error.message); setInput(text) }
    else await fetchMessages()
    setSending(false)
    inputRef.current?.focus()
  }


  const saveEdit = async () => {
    const text = editText.trim()
    if (!text) return
    await supabase.from('messages').update({ content: text, edited: true }).eq('id', editingId)
    setEditingId(null); setEditText(''); await fetchMessages()
  }

  const doDelete = async (id) => {
    await supabase.from('messages').delete().eq('id', id)
    setDeleteConfirm(null); await fetchMessages()
  }

  const fmt = (ts) => new Date(ts).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (ts) => {
    const d = new Date(ts)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return lang === 'pt' ? 'Hoje' : 'Today'
    if (d.toDateString() === yesterday.toDateString()) return lang === 'pt' ? 'Ontem' : 'Yesterday'
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }
  let lastDate = null

  return (
    <div style={{ fontFamily: F, color: t.text, display: 'flex', justifyContent: 'center' }}>
      <style>{`
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 2px; }
        .chat-input:focus { outline: none; border-color: ${t.accent} !important; }
      `}</style>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '24px', width: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: t.text }}>{s.deleteMsg}</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted, padding: '8px 18px', cursor: 'pointer', fontSize: '13px', fontFamily: F }}>{s.cancel}</button>
              <button onClick={() => doDelete(deleteConfirm)} style={{ background: '#f87171', border: 'none', borderRadius: '8px', color: '#fff', padding: '8px 18px', cursor: 'pointer', fontSize: '13px', fontFamily: F, fontWeight: 700 }}>{s.deleteBtn}</button>
            </div>
          </div>
        </div>
      )}

      {/* Phone-style chat container */}
      <div style={{ width: '100%', maxWidth: '640px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: '500px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div style={{ padding: '0 0 14px', borderBottom: `1px solid ${t.border}`, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `linear-gradient(135deg, ${t.accent}, #52E8A0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>FS</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: t.text }}>Equipa Francisca</div>
            <div style={{ fontSize: '11px', color: t.textMuted }}>{messages.length > 0 ? `${messages.length} mensagens` : 'Chat da equipa'}</div>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '2px', background: t.bg }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: t.textMuted, padding: '40px', fontSize: '13px' }}>{s.loading}</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: t.textMuted, padding: '60px 20px', fontSize: '13px', fontStyle: 'italic' }}>{s.empty}</div>
          ) : messages.map(msg => {
            const isOwn = (msg.user_email || '').trim().toLowerCase() === myEmail
            const d = fmtDate(msg.created_at)
            const showDate = d !== lastDate; lastDate = d
            const name = msg.user_name || msg.user_email?.split('@')[0] || '?'
            const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            const isEditing = editingId === msg.id

            return (
              <div key={msg.id}>
                {showDate && (
                  <div style={{ textAlign: 'center', margin: '16px 0 10px', fontSize: '11px', color: t.textMuted }}>
                    <span style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '3px 12px' }}>{d}</span>
                  </div>
                )}
                <div
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexDirection: isOwn ? 'row-reverse' : 'row', marginBottom: '6px', padding: '0 4px' }}>

                  {/* Avatar */}
                  {!isOwn && (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `linear-gradient(135deg, #378ADD44, #52E8A044)`, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: t.accent, flexShrink: 0, marginBottom: '2px' }}>
                      {initials}
                    </div>
                  )}

                  <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: '2px' }}>
                    {!isOwn && <div style={{ fontSize: '10px', color: t.textMuted, fontWeight: 600, marginLeft: '4px' }}>{name}</div>}

                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', width: '100%' }}>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() } if (e.key === 'Escape') setEditingId(null) }}
                          style={{ width: '240px', minHeight: '60px', background: t.bg, border: `1px solid ${t.accent}`, borderRadius: '12px', color: t.text, padding: '8px 12px', fontSize: '13px', fontFamily: F, outline: 'none', resize: 'none' }} />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted, padding: '5px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: F }}>{s.cancel}</button>
                          <button onClick={saveEdit} style={{ background: t.accent, border: 'none', borderRadius: '8px', color: '#fff', padding: '5px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: F, fontWeight: 600 }}>{s.save}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: isOwn ? t.accent : t.surface,
                        border: isOwn ? 'none' : `1px solid ${t.border}`,
                        borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        padding: '9px 14px',
                        fontSize: '14px',
                        color: isOwn ? '#fff' : t.text,
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        boxShadow: isOwn ? '0 2px 8px rgba(74,158,255,0.25)' : 'none',
                      }}>
                        {msg.content}
                        {msg.photo_url && (
                          <img src={msg.photo_url} alt="foto" style={{ display: 'block', maxWidth: '220px', maxHeight: '220px', borderRadius: '10px', marginTop: msg.content ? '6px' : '0', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(msg.photo_url, '_blank')} />
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '0 4px' }}>
                      <span style={{ fontSize: '10px', color: t.textFaint }}>{fmt(msg.created_at)}</span>
                      {msg.edited && <span style={{ fontSize: '10px', color: t.textFaint, fontStyle: 'italic' }}>{s.edited}</span>}
                      {isOwn && !isEditing && hoveredId === msg.id && (
                        <>
                          <button onClick={() => { setEditingId(msg.id); setEditText(msg.content) }}
                            style={{ background: 'transparent', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '13px', padding: '0 3px', lineHeight: 1 }}>✏</button>
                          <button onClick={() => setDeleteConfirm(msg.id)}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', padding: '0 3px', lineHeight: 1, fontWeight: 700 }}>✕</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ paddingTop: '10px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: '8px', alignItems: 'flex-end' }}>

          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={s.placeholder}
            disabled={sending}
            style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, borderRadius: '22px', color: t.text, padding: '10px 16px', fontSize: '14px', fontFamily: F, outline: 'none', transition: 'border-color 0.15s' }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            style={{
              width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
              background: sending || !input.trim() ? t.border : `linear-gradient(135deg, ${t.accent}, #52E8A0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'all 0.15s',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
  
