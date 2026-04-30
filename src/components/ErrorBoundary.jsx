import { Component } from 'react'
import Sentry from '../lib/sentry.js'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', background: '#0a1a0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif", padding: '24px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', width: '100%' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Algo correu mal
          </div>
          <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            Ocorreu um erro inesperado. Tenta recarregar a página — se o problema persistir, contacta o suporte.
          </div>
          {this.state.error?.message && (
            <div style={{
              fontSize: '11px', color: '#555', background: '#111', border: '1px solid #222',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '24px',
              textAlign: 'left', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5,
            }}>
              {this.state.error.message}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#52E8A0', border: 'none', borderRadius: '8px',
                color: '#000', padding: '11px 28px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700,
              }}
            >
              Recarregar página
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              style={{
                background: 'transparent', border: '1px solid #333', borderRadius: '8px',
                color: '#888', padding: '11px 28px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
              }}
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    )
  }
}
