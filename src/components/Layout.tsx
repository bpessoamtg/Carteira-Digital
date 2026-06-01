import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { fazerLogout } from './AuthGate'
import { useStore } from '../store/useStore'

const NAV_STATIC = [
  {
    to: '/',
    label: 'Consolidado',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/importar',
    label: 'Importar Excel',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
]

const PESSOA_ICONS = {
  diogo:    { cor: '#4fc3f7', icon: 'D' },
  bruno:    { cor: '#a78bfa', icon: 'B' },
  catarina: { cor: '#34d399', icon: 'C' },
}

function NavItem({ to, label, icon, isActive }: { to: string; label: string; icon: React.ReactNode; isActive?: boolean }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      style={({ isActive: ia }) => {
        const active = isActive !== undefined ? isActive : ia
        return {
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 12px', borderRadius: '10px', marginBottom: '2px',
          textDecoration: 'none', fontSize: '13px',
          fontWeight: active ? 600 : 400,
          color: active ? '#f0f0f8' : '#8888aa',
          background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
          transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
        }
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        if (!el.style.background.includes('0.07')) {
          el.style.background = 'rgba(255,255,255,0.04)'
          el.style.color = '#c0c0d8'
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        if (!el.style.background.includes('0.07')) {
          el.style.background = 'transparent'
          el.style.color = '#8888aa'
        }
      }}
    >
      {icon}
      {label}
    </NavLink>
  )
}

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { pessoas } = useStore()

  const tituloMobile = (() => {
    if (location.pathname === '/importar') return 'Importar Excel'
    const p = pessoas.find(p => location.pathname === '/' + p.id)
    if (p) return p.nome
    return 'Consolidado'
  })()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Sidebar (desktop) */}
      <aside
        style={{
          width: '210px', minWidth: '210px', background: '#0d0d18',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh',
        }}
        className="hidden md:flex"
      >
        {/* Logo */}
        <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, rgba(79,195,247,0.2), rgba(2,136,209,0.2))', border: '1px solid rgba(79,195,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '13px', color: '#f0f0f8', lineHeight: 1 }}>Investimentos</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 400, fontSize: '10px', color: '#8888aa', letterSpacing: '0.1em' }}>PORTFOLIO</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {NAV_STATIC.map(item => (
            <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
          ))}

          {pessoas.length > 0 && (
            <>
              <div style={{ fontSize: '10px', color: '#555566', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 12px 6px', fontWeight: 600 }}>
                Pessoas
              </div>
              {pessoas.map(p => {
                const info = PESSOA_ICONS[p.id as keyof typeof PESSOA_ICONS]
                return (
                  <NavLink
                    key={p.id}
                    to={'/' + p.id}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 12px', borderRadius: '10px', marginBottom: '2px',
                      textDecoration: 'none', fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#f0f0f8' : '#8888aa',
                      background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                      transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                    })}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      if (!el.style.background.includes('0.07')) {
                        el.style.background = 'rgba(255,255,255,0.04)'
                        el.style.color = '#c0c0d8'
                      }
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      if (!el.style.background.includes('0.07')) {
                        el.style.background = 'transparent'
                        el.style.color = '#8888aa'
                      }
                    }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: (info?.cor ?? p.cor) + '22', border: `1px solid ${info?.cor ?? p.cor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: info?.cor ?? p.cor, flexShrink: 0 }}>
                      {p.nome[0]}
                    </div>
                    {p.nome}
                  </NavLink>
                )
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={fazerLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#555566', fontSize: '12px', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#555566' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Terminar sessão
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile header */}
        <header
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '54px', background: '#0d0d18', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 20 }}
          className="flex md:hidden"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'rgba(79,195,247,0.15)', border: '1px solid rgba(79,195,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#f0f0f8' }}>
              {tituloMobile}
            </span>
          </div>
          <button onClick={() => setMobileMenuOpen(o => !o)} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>}
            </svg>
          </button>
        </header>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div style={{ position: 'fixed', top: '54px', left: 0, right: 0, zIndex: 19, background: '#0d0d18', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '8px' }} className="md:hidden">
            {NAV_STATIC.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', marginBottom: '2px', textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? 600 : 400, color: isActive ? '#f0f0f8' : '#8888aa', background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent', fontFamily: 'Inter, sans-serif' })}
              >
                {item.icon}{item.label}
              </NavLink>
            ))}
            {pessoas.map(p => (
              <NavLink
                key={p.id}
                to={'/' + p.id}
                onClick={() => setMobileMenuOpen(false)}
                style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', marginBottom: '2px', textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? 600 : 400, color: isActive ? '#f0f0f8' : '#8888aa', background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent', fontFamily: 'Inter, sans-serif' })}
              >
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: p.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: p.cor }}>
                  {p.nome[0]}
                </div>
                {p.nome}
              </NavLink>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '8px', paddingTop: '8px' }}>
              <button onClick={() => { setMobileMenuOpen(false); fazerLogout() }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#555566', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Terminar sessão
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <main style={{ flex: 1, padding: '24px', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
