import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f7f8f6', fontFamily: '"DM Sans", system-ui, sans-serif', padding: 24,
      }}>
        <div style={{
          maxWidth: 440, width: '100%', textAlign: 'center',
          background: '#fff', borderRadius: 16, padding: '40px 32px',
          border: '1px solid #e8e8e4', boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: '#fef2f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <AlertTriangle size={24} color="#dc2626" />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#1a1a18' }}>
            Une erreur est survenue
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#888', lineHeight: 1.5 }}>
            L'application a rencontré un problème inattendu. Vos données sont en sécurité.
          </p>
          <details style={{ marginBottom: 24, textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: '#aaa', marginBottom: 8 }}>
              Détail technique
            </summary>
            <pre style={{
              fontSize: 11, color: '#888', background: '#f7f8f6',
              borderRadius: 8, padding: '10px 14px', overflow: 'auto',
              maxHeight: 120, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {this.state.error.message}
            </pre>
          </details>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#0f6e56', color: '#fff', border: 'none',
              borderRadius: 10, padding: '12px 24px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={15} /> Recharger l'application
          </button>
        </div>
      </div>
    )
  }
}
