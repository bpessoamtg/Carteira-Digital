import { useState, useEffect, type ReactNode } from 'react'

const HASH_KEY    = 'carteira-auth-hash'
const SESSION_KEY = 'carteira-auth-ok'

async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const C = {
  bg:     '#0a0a0f',
  card:   '#0d0d18',
  border: 'rgba(255,255,255,0.08)',
  text:   '#f0f0f8',
  muted:  '#8888aa',
  blue:   '#4fc3f7',
  red:    '#ef4444',
  green:  '#00e676',
}

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: C.text,
  fontSize: '15px',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  letterSpacing: '0.15em',
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [estado,    setEstado]    = useState<'loading' | 'setup' | 'login' | 'ok'>('loading')
  const [senha,     setSenha]     = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro,      setErro]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [mostrar,   setMostrar]   = useState(false)

  useEffect(() => {
    const hash   = localStorage.getItem(HASH_KEY)
    const sessao = sessionStorage.getItem(SESSION_KEY)
    if (!hash)             setEstado('setup')
    else if (sessao === 'true') setEstado('ok')
    else                   setEstado('login')
  }, [])

  async function configurar(e: React.FormEvent) {
    e.preventDefault()
    if (senha.length < 4) { setErro('Mínimo 4 caracteres'); return }
    if (senha !== confirmar) { setErro('As passwords não coincidem'); return }
    setLoading(true)
    const hash = await sha256(senha)
    localStorage.setItem(HASH_KEY, hash)
    sessionStorage.setItem(SESSION_KEY, 'true')
    setLoading(false)
    setEstado('ok')
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const hash   = await sha256(senha)
    const stored = localStorage.getItem(HASH_KEY)
    if (hash === stored) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setEstado('ok')
    } else {
      setErro('Password incorreta')
      setSenha('')
    }
    setLoading(false)
  }

  if (estado === 'loading') {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: `2px solid ${C.blue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (estado === 'ok') return <>{children}</>

  const isSetup = estado === 'setup'

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(79,195,247,0.2), rgba(2,136,209,0.2))', border: '1px solid rgba(79,195,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: C.text }}>Carteira Digital</div>
          <div style={{ color: C.muted, fontSize: '13px', marginTop: '4px' }}>
            {isSetup ? 'Define a tua password de acesso' : 'Introduz a tua password'}
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '28px 24px' }}>
          <form onSubmit={isSetup ? configurar : entrar}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrar ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro('') }}
                  placeholder={isSetup ? 'Cria uma password…' : 'A tua password…'}
                  autoFocus
                  style={{ ...INPUT, paddingRight: '44px' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(79,195,247,0.5)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
                <button
                  type="button"
                  onClick={() => setMostrar((v) => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: '2px', display: 'flex' }}
                >
                  {mostrar
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {isSetup && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Confirmar Password
                </label>
                <input
                  type={mostrar ? 'text' : 'password'}
                  value={confirmar}
                  onChange={(e) => { setConfirmar(e.target.value); setErro('') }}
                  placeholder="Repete a password…"
                  style={INPUT}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(79,195,247,0.5)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
            )}

            {erro && (
              <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: C.red, fontSize: '13px' }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', cursor: loading ? 'wait' : 'pointer', background: loading ? 'rgba(79,195,247,0.3)' : 'linear-gradient(135deg, #4fc3f7, #0288d1)', color: '#fff', fontSize: '15px', fontWeight: 700, fontFamily: 'Syne, sans-serif', transition: 'all 0.2s' }}
            >
              {loading ? 'A verificar…' : isSetup ? 'Criar acesso' : 'Entrar'}
            </button>
          </form>

          {isSetup && (
            <p style={{ marginTop: '16px', color: C.muted, fontSize: '12px', textAlign: 'center', lineHeight: 1.5 }}>
              A password é guardada apenas neste dispositivo.<br />Não é enviada para nenhum servidor.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Call this from Layout to log out
export function fazerLogout() {
  sessionStorage.removeItem(SESSION_KEY)
  window.location.reload()
}
