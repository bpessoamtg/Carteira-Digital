import React, { Component, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    const { error } = this.state
    if (error) {
      return (
        <div style={{ background: '#0a0a0f', color: '#ef4444', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', padding: '32px', gap: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>Erro na aplicação</div>
          <div style={{ fontSize: '13px', color: '#ff8888', maxWidth: '600px', textAlign: 'center', whiteSpace: 'pre-wrap' }}>{(error as Error).message}</div>
          <div style={{ fontSize: '11px', color: '#666', maxWidth: '600px', textAlign: 'center', whiteSpace: 'pre-wrap' }}>{(error as Error).stack}</div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
