import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'

const NAV = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/corretoras',
    label: 'Corretoras',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    to: '/posicoes',
    label: 'Posições',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    to: '/transacoes',
    label: 'Transações',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    ),
  },
  {
    to: '/importar',
    label: 'Importar CSV',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
]

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const paginaAtual = NAV.find((n) =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
      {/* ── Sidebar (desktop) ── */}
      <aside
        style={{
          width: '220px',
          minWidth: '220px',
          background: '#0d0d18',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
        className="hidden md:flex"
      >
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'linear-gradient(135deg, rgba(79,195,247,0.2), rgba(2,136,209,0.2))',
              border: '1px solid rgba(79,195,247,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '14px', color: '#f0f0f8', lineHeight: 1 }}>
                Carteira
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 400, fontSize: '11px', color: '#8888aa', letterSpacing: '0.1em' }}>
                DIGITAL
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '14px 10px', flex: 1 }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                marginBottom: '2px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#f0f0f8' : '#8888aa',
                background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                transition: 'all 0.15s',
                fontFamily: 'Inter, sans-serif',
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                if (!el.style.background.includes('0.07')) {
                  el.style.background = 'rgba(255,255,255,0.04)'
                  el.style.color = '#c0c0d8'
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                if (!el.style.background.includes('0.07')) {
                  el.style.background = 'transparent'
                  el.style.color = '#8888aa'
                }
              }}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: '#333344', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}>
            Carteira Digital © {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            height: '56px',
            background: '#0d0d18',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
          className="flex md:hidden"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'rgba(79,195,247,0.15)',
              border: '1px solid rgba(79,195,247,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#f0f0f8' }}>
              {paginaAtual?.label ?? 'Carteira Digital'}
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', padding: '4px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>
        </header>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed', top: '56px', left: 0, right: 0, zIndex: 19,
              background: '#0d0d18',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: '8px',
            }}
            className="md:hidden"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '10px', marginBottom: '2px',
                  textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#f0f0f8' : '#8888aa',
                  background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                  fontFamily: 'Inter, sans-serif',
                })}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
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
