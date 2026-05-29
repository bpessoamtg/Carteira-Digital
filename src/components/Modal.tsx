import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  titulo: string
  aberto: boolean
  onFechar: () => void
  children: ReactNode
  largura?: string
}

export function Modal({ titulo, aberto, onFechar, children, largura = '520px' }: ModalProps) {
  useEffect(() => {
    if (!aberto) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [aberto, onFechar])

  if (!aberto) return null

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onFechar}
    >
      <div
        style={{
          width: '100%', maxWidth: largura,
          background: '#0e0e1a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '28px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: '#f0f0f8', margin: 0 }}>
            {titulo}
          </h2>
          <button
            onClick={onFechar}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#8888aa', padding: '4px', borderRadius: '6px',
              display: 'flex', alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f0f0f8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8888aa')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
