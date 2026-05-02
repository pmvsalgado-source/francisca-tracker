import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getMessages,
  sendMessage as sendMessageSvc,
  updateMessage,
  deleteMessage,
  getAvatarMap,
} from '../services/chatService'
import EmptyState from './EmptyState'

export default function Chat({ theme, t, user, profile, lang = 'en' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [avatarMap, setAvatarMap] = useState({})
  const [sendError, setSendError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const isMountedRef = useRef(true)
  const isFetchingRef = useRef(false)
  const fetchIdRef = useRef(0)
  const F = "'Inter', system-ui, sans-serif"
  const myEmail = (user?.email || '').trim().toLowerCase()

  const s = lang === 'pt'
    ? { placeholder: 'Mensagem...', send: 'Enviar', loading: 'A carregar...', empty: 'Sem mensagens. Começa a conversa!', you: 'Tu', cancel: 'Cancelar', save: 'Guardar', deleteMsg: 'Apagar esta mensagem?', deleteBtn: 'Apagar', edited: 'editado' }
    : { placeholder: 'Message...', send: 'Send', loading: 'Loading...', empty: 'No messages yet. Start the conversation!', you: 'You', cancel: 'Cancel', save: 'Save', deleteMsg: 'Delete this message?', deleteBtn: 'Delete', edited: 'edited' }

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const data = await getMessages()
      if (!isMountedRef.current) return
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      if (!isMountedRef.current) return
    } finally {
      isFetchingRef.current = false
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    getAvatarMap().then(setAvatarMap).catch(() => {})
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text) return
    setSending(true)
    setSendError('')
    setInput('')
    const name = profile?.name || myEmail.split('@')[0]
    const uid = user?.id || user?.sub || null
    const avatarUrl = (uid && avatarMap[uid]) || null
    try {
      await sendMessageSvc({ user_email: myEmail, user_name: name, content: text, avatar_url: avatarUrl, user_id: uid })
      await fetchMessages()
    } catch (err) { setSendError(err.message); setInput(text) }
    setSending(false)
    inputRef.current?.focus()
  }

  const saveEdit = async () => {
    const text = editText.trim()
    if (!text) return
    try {
      await updateMessage(editingId, text)
    } catch (err) { console.error('saveEdit:', err); return }
    setEditingId(null); setEditText(''); await fetchMessages()
  }

  const doDelete = async (id) => {
    try {
      await deleteMessage(id)
    } catch (err) { console.error('doDelete:', err); return }
    setDeleteConfirm(null); await fetchMessages()
  }

  const SAFE_DOMAINS = [
    'wccpgfgzdealwnuliesx.supabase.co',
    'supabase.co',
    'francisca-salgado.vercel.app',
  ]
  const isSafeUrl = (url) => {
    if (typeof url !== 'string') return false
    try {
      const { protocol, hostname } = new URL(url)
      return protocol === 'https:' && SAFE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
    } catch {
      return false
    }
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

  const pillBtn = (active) => ({
    background: active ? t.accent + '18' : 'transparent',
    border: `1px solid ${active ? t.accent : t.border}`,
    borderRadius: '20px', color: active ? t.accent : t.textMuted,
    padding: '5px 14px', cursor: 'pointer', fontSize: '11px',
    fontWeight: active ? 700 : 500, fontFamily: F,
  })

  return (
    <div style={{ fontFamily: F, color: t.text }}>
      <style>{`
        .chat-scroll::-webkit-scrollbar{width:4px}
        .chat-scroll::-webkit-scrollbar-track{background:transparent}
        .chat-scroll::-webkit-scrollbar-thumb{background:${t.border};border-radius:2px}
        .chat-input:focus{outline:none;border-color:${t.accent}!important}
      `}</style>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '24px', width: '280px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: t.text }}>{s.deleteMsg}</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={pillBtn(false)}>{s.cancel}</button>
              <button onClick={() => doDelete(deleteConfirm)} style={{ ...pillBtn(false), background: t.danger, border: 'none', color: '#fff', fontWeight: 700 }}>{s.deleteBtn}</button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.accent, fontWeight: 700, marginBottom: '3px' }}>CHAT / TEAM</div>
        <div style={{ fontSize: '11px', color: t.textMuted }}>{lang === 'pt' ? 'Comunicação com a equipa' : 'Team communication'}</div>
      </div>

      {/* Chat card — full width, integrated */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 260px)', minHeight: '480px' }}>

        {/* Chat header */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: t.accent + '20', border: `1px solid ${t.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: t.accent, flexShrink: 0 }}>FS</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: t.text }}>Equipa Francisca</div>
            <div style={{ fontSize: '10px', color: t.textMuted }}>{messages.length > 0 ? `${messages.length} mensagens` : lang === 'pt' ? 'Chat da equipa' : 'Team chat'}</div>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '2px', background: t.bg }}>
          {loading && messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: t.textMuted, padding: '40px', fontSize: '13px' }}>{s.loading}</div>
          ) : messages.length === 0 ? (
            <EmptyState icon="💬" message={s.empty} t={t} />
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
                  <div style={{ textAlign: 'center', margin: '16px 0 10px', fontSize: '10px', color: t.textMuted }}>
                    <span style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '3px 12px' }}>{d}</span>
                  </div>
                )}
                <div
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexDirection: isOwn ? 'row-reverse' : 'row', marginBottom: '6px' }}>

                  {/* Avatar */}
                  {(() => {
                    const msgEmail = (msg.user_email || '').trim().toLowerCase()
                    const avatarSrc = msg.avatar_url || (msg.user_id && avatarMap[msg.user_id]) || avatarMap[msgEmail] || null
                    return (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: t.border, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: t.textMuted, flexShrink: 0, overflow: 'hidden' }}>
                        {isSafeUrl(avatarSrc)
                          ? <img src={avatarSrc} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                          : initials}
                      </div>
                    )
                  })()}

                  <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: '2px' }}>
                    <div style={{ fontSize: '10px', color: t.textMuted, fontWeight: 600, marginLeft: '2px', marginRight: '2px' }}>{isOwn ? s.you : name}</div>

                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', width: '100%' }}>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() } if (e.key === 'Escape') setEditingId(null) }}
                          style={{ width: '240px', minHeight: '60px', background: t.bg, border: `1px solid ${t.accent}`, borderRadius: '10px', color: t.text, padding: '8px 12px', fontSize: '13px', fontFamily: F, outline: 'none', resize: 'none' }} />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setEditingId(null)} style={pillBtn(false)}>{s.cancel}</button>
                          <button onClick={saveEdit} style={pillBtn(true)}>{s.save}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: isOwn ? t.accent : t.surface,
                        border: isOwn ? 'none' : `1px solid ${t.border}`,
                        borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        color: isOwn ? '#fff' : t.text,
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                      }}>
                        {msg.content}
                        {isSafeUrl(msg.photo_url) && (
                          <img src={msg.photo_url} alt="foto" style={{ display: 'block', maxWidth: '220px', maxHeight: '220px', borderRadius: '8px', marginTop: msg.content ? '6px' : '0', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(msg.photo_url, '_blank', 'noopener,noreferrer')} />
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '0 2px' }}>
                      <span style={{ fontSize: '10px', color: t.textFaint }}>{fmt(msg.created_at)}</span>
                      {msg.edited && <span style={{ fontSize: '10px', color: t.textFaint, fontStyle: 'italic' }}>{s.edited}</span>}
                      {isOwn && !isEditing && hoveredId === msg.id && (
                        <>
                          <button onClick={() => { setEditingId(msg.id); setEditText(msg.content) }}
                            style={{ background: 'transparent', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '12px', padding: '0 3px', lineHeight: 1 }}>✏</button>
                          <button onClick={() => setDeleteConfirm(msg.id)}
                            style={{ background: 'transparent', border: 'none', color: t.danger, cursor: 'pointer', fontSize: '12px', padding: '0 3px', lineHeight: 1, fontWeight: 700 }}>✕</button>
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
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
          {sendError && (
            <div style={{ fontSize: '11px', color: '#f87171', marginBottom: '6px', padding: '5px 10px', background: 'rgba(248,113,113,0.1)', borderRadius: '6px', borderLeft: '3px solid #f87171' }}>
              ⚠ {sendError}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => { setInput(e.target.value); if (sendError) setSendError('') }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={s.placeholder}
            disabled={sending}
            style={{ flex: 1, background: t.bg, border: `1px solid ${t.border}`, borderRadius: '20px', color: t.text, padding: '9px 16px', fontSize: '13px', fontFamily: F, outline: 'none' }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            style={{
              width: '36px', height: '36px', borderRadius: '50%', border: 'none',
              cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
              background: sending || !input.trim() ? t.border : t.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
