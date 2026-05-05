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

  const isDark = theme === 'dark'
  const chatShellBg = isDark ? '#0f172a' : '#eef4ff'
  const chatPanelBg = isDark ? '#111827' : '#f8fbff'
  const ownBubble = isDark ? t.accent : '#2563eb'
  const otherBubble = isDark ? '#1f2937' : '#ffffff'

  return (
    <div style={{ fontFamily: F, color: t.text, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        .chat-scroll::-webkit-scrollbar{width:3px}
        .chat-scroll::-webkit-scrollbar-track{background:transparent}
        .chat-scroll::-webkit-scrollbar-thumb{background:${t.border};border-radius:999px}
        .chat-input:focus{outline:none;border-color:${t.accent}!important;box-shadow:0 0 0 3px ${t.accent}18}
        @media (max-width: 620px) {
          .chat-phone-shell{max-width:100%!important;border-radius:0!important;min-height:calc(100vh - 96px)!important;height:calc(100vh - 96px)!important}
          .chat-page-header{display:none!important}
        }
      `}</style>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: t.overlayBg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '24px', width: '280px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: t.text }}>{s.deleteMsg}</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={pillBtn(false)}>{s.cancel}</button>
              <button onClick={() => doDelete(deleteConfirm)} style={{ ...pillBtn(false), background: t.danger, border: 'none', color: t.navTextActive, fontWeight: 700 }}>{s.deleteBtn}</button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="chat-page-header" style={{ width: '100%', maxWidth: '520px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '3px', color: t.accent, marginBottom: '4px', fontWeight: 700 }}>MENSAGENS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: t.text, lineHeight: 1.15 }}>Chat com o Coach</div>
          <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>Fala com o coach, partilha feedback e acompanha as orientações de treino</div>
        </div>
      </div>

      {/* Chat card — full width, integrated */}
      <div className="chat-phone-shell" style={{ background: chatPanelBg, border: `1px solid ${t.border}`, borderRadius: '32px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 210px)', minHeight: '620px', width: '100%', maxWidth: '470px', overflow: 'hidden', boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.45)' : '0 24px 70px rgba(15,23,42,0.14)' }}>

        {/* Chat header */}
        <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${t.border}`, background: t.surface, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${t.accent} 0%, #60a5fa 100%)`, boxShadow: `0 8px 22px ${t.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900, color: '#ffffff', flexShrink: 0 }}>FS</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 850, color: t.text, lineHeight: 1.1 }}>Equipa Francisca</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: t.textMuted, marginTop: '3px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              {messages.length > 0 ? `${messages.length} mensagens` : lang === 'pt' ? 'Chat da equipa' : 'Team chat'}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 14px 12px', display: 'flex', flexDirection: 'column', gap: '2px', background: chatShellBg }}>
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
                  <div style={{ textAlign: 'center', margin: '16px 0 12px', fontSize: '10px', color: t.textMuted }}>
                    <span style={{ background: isDark ? '#1f2937cc' : '#ffffffcc', border: `1px solid ${t.border}`, borderRadius: '999px', padding: '5px 12px', boxShadow: isDark ? 'none' : '0 6px 18px rgba(15,23,42,0.06)' }}>{d}</span>
                  </div>
                )}
                <div
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ display: 'flex', gap: '7px', alignItems: 'flex-end', flexDirection: isOwn ? 'row-reverse' : 'row', marginBottom: '7px' }}>

                  {/* Avatar */}
                  {(() => {
                    const msgEmail = (msg.user_email || '').trim().toLowerCase()
                    const avatarSrc = msg.avatar_url || (msg.user_id && avatarMap[msg.user_id]) || avatarMap[msgEmail] || null
                    return (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: otherBubble, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: t.textMuted, flexShrink: 0, overflow: 'hidden', boxShadow: isDark ? 'none' : '0 5px 14px rgba(15,23,42,0.08)' }}>
                        {isSafeUrl(avatarSrc)
                          ? <img src={avatarSrc} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                          : initials}
                      </div>
                    )
                  })()}

                  <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: '3px' }}>
                    <div style={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 650, marginLeft: '5px', marginRight: '5px' }}>{isOwn ? s.you : name}</div>

                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', width: '100%' }}>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() } if (e.key === 'Escape') setEditingId(null) }}
                          style={{ width: '240px', minHeight: '60px', background: t.surface, border: `1px solid ${t.accent}`, borderRadius: '16px', color: t.text, padding: '10px 12px', fontSize: '14px', fontFamily: F, outline: 'none', resize: 'none' }} />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setEditingId(null)} style={pillBtn(false)}>{s.cancel}</button>
                          <button onClick={saveEdit} style={pillBtn(true)}>{s.save}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: isOwn ? ownBubble : otherBubble,
                        border: isOwn ? 'none' : `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                        borderRadius: isOwn ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                        padding: '10px 14px',
                        fontSize: '14px',
                        color: isOwn ? t.navTextActive : t.text,
                        lineHeight: 1.42,
                        wordBreak: 'break-word',
                        boxShadow: isOwn ? `0 8px 22px ${t.accent}24` : isDark ? 'none' : '0 8px 20px rgba(15,23,42,0.07)',
                      }}>
                        {msg.content}
                        {isSafeUrl(msg.photo_url) && (
                          <img src={msg.photo_url} alt="foto" style={{ display: 'block', maxWidth: '240px', maxHeight: '240px', borderRadius: '14px', marginTop: msg.content ? '8px' : '0', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(msg.photo_url, '_blank', 'noopener,noreferrer')} />
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '0 2px' }}>
                      <span style={{ fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8' }}>{fmt(msg.created_at)}</span>
                      {msg.edited && <span style={{ fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8', fontStyle: 'italic' }}>{s.edited}</span>}
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
        <div style={{ padding: '12px 14px 16px', borderTop: `1px solid ${t.border}`, background: t.surface, flexShrink: 0 }}>
          {sendError && (
            <div style={{ fontSize: '11px', color: '#f87171', marginBottom: '6px', padding: '5px 10px', background: 'rgba(248,113,113,0.1)', borderRadius: '6px', borderLeft: '3px solid #f87171' }}>
              ⚠ {sendError}
            </div>
          )}
          <div style={{ display: 'flex', gap: '9px', alignItems: 'center' }}>
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => { setInput(e.target.value); if (sendError) setSendError('') }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={s.placeholder}
            disabled={sending}
            style={{ flex: 1, background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${t.border}`, borderRadius: '999px', color: t.text, padding: '12px 16px', fontSize: '14px', fontFamily: F, outline: 'none' }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            style={{
              width: '42px', height: '42px', borderRadius: '50%', border: 'none',
              cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
              background: sending || !input.trim() ? t.border : ownBubble,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: sending || !input.trim() ? 'none' : `0 10px 22px ${t.accent}35`,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.navTextActive} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
