import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login') // login | forgot
  const [forgotSent, setForgotSent] = useState(false)

  const F = "'Inter', system-ui, sans-serif"
  const savedTheme = typeof window !== 'undefined' ? (localStorage.getItem('fs_theme') || 'light') : 'light'
  const t = savedTheme === 'dark' ? {
    bg: '#080808', surface: '#0d0d0d', border: '#282828',
    accent: '#378ADD', text: '#ffffff', textMuted: '#888888',
  } : {
    bg: '#f0f4ff', surface: '#ffffff', border: '#d0d8f0',
    accent: '#378ADD', text: '#0f1e3d', textMuted: '#4a6ab5',
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    })
    if (error) setError(error.message)
    else setForgotSent(true)
    setLoading(false)
  }

  const inp = {
    width: '100%', background: t.bg, border: `1px solid ${t.border}`,
    borderRadius: '8px', color: t.text, padding: '12px 14px', fontSize: '14px',
    fontFamily: F, outline: 'none', boxSizing: 'border-box'
  }

  return (
    <div style={{ fontFamily: F, background: t.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input:focus { border-color: #3d6bff !important; }
        a { color: #7aabff; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#52E8A0', marginBottom: '8px', fontWeight: 600 }}>PERFORMANCE · GOLF</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: t.text, letterSpacing: '-0.5px' }}>Francisca Salgado</div>
          <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '6px' }}>Athlete Performance Tracker</div>
        </div>

        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '32px' }}>

          {mode === 'login' && (
            <>
              <div style={{ fontSize: '18px', fontWeight: 700, color: t.text, marginBottom: '24px' }}>Sign In</div>
              <form onSubmit={handleLogin}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>EMAIL</div>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={inp} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, fontWeight: 600 }}>PASSWORD</div>
                      <button type="button" onClick={() => { setMode('forgot'); setError(''); setForgotSent(false) }}
                        style={{ background: 'transparent', border: 'none', color: t.accent, fontSize: '12px', cursor: 'pointer', fontFamily: F }}>
                        Forgot password?
                      </button>
                    </div>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inp} />
                  </div>
                  {error && <div style={{ fontSize: '13px', color: '#f87171', background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '10px 12px' }}>{error}</div>}
                  <button type="submit" disabled={loading}
                    style={{ background: loading ? t.border : t.accent, border: 'none', borderRadius: '8px', color: loading ? t.textMuted : '#fff', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: F, marginTop: '4px' }}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
              </form>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <div style={{ fontSize: '18px', fontWeight: 700, color: t.text, marginBottom: '8px' }}>Reset Password</div>
              <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
                Enter your email address and we'll send you a link to reset your password.
              </div>
              {forgotSent ? (
                <div style={{ fontSize: '14px', color: '#4ade80', background: '#0a2010', border: '1px solid #1a5a20', borderRadius: '8px', padding: '16px', lineHeight: 1.6, marginBottom: '16px' }}>
                  ✓ Check your email — a reset link has been sent to <b>{email}</b>
                </div>
              ) : (
                <form onSubmit={handleForgot}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>EMAIL</div>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={inp} />
                    </div>
                    {error && <div style={{ fontSize: '13px', color: '#f87171', background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '10px 12px' }}>{error}</div>}
                    <button type="submit" disabled={loading}
                      style={{ background: loading ? t.border : t.accent, border: 'none', borderRadius: '8px', color: loading ? t.textMuted : '#fff', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: F }}>
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              )}
              <button type="button" onClick={() => { setMode('login'); setError('') }}
                style={{ background: 'transparent', border: 'none', color: t.accent, fontSize: '13px', cursor: 'pointer', fontFamily: F, marginTop: '16px', display: 'block' }}>
                ← Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
