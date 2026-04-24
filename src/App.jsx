import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

// Read URL hash synchronously — Supabase appends #access_token=...&type=recovery
function isRecoveryUrl() {
  try {
    const params = new URLSearchParams(window.location.hash.slice(1))
    return params.get('type') === 'recovery'
  } catch { return false }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Initialise synchronously from URL so first render is already correct
  const [needsPasswordReset, setNeedsPasswordReset] = useState(isRecoveryUrl)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setUser(session?.user ?? null)
        setNeedsPasswordReset(true)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setNeedsPasswordReset(false)
      } else {
        // SIGNED_IN can fire right after PASSWORD_RECOVERY — do NOT clear the flag here
        setUser(session?.user ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0a1a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Mono', monospace", color: '#5cb86a', fontSize: '12px', letterSpacing: '3px',
    }}>
      A CARREGAR...
    </div>
  )

  if (needsPasswordReset) return <Login initialMode="reset" onPasswordReset={() => setNeedsPasswordReset(false)} />
  return user ? <Dashboard user={user} /> : <Login />
}
