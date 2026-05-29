import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  erro?: string
  children: ReactNode
  dica?: string
}

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '11px 14px',
  color: '#f0f0f8',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

export const INPUT_STYLE = inputBase
export const INPUT_ERROR_STYLE: React.CSSProperties = { ...inputBase, borderColor: 'rgba(239,68,68,0.5)' }

export function focusInput(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'rgba(79,195,247,0.5)'
}

export function blurInput(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, erro?: string) {
  e.currentTarget.style.borderColor = erro ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'
}

export function FormField({ label, erro, children, dica }: FormFieldProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        color: '#8888aa',
        fontSize: '11px',
        fontWeight: 600,
        marginBottom: '7px',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        fontFamily: 'Inter, sans-serif',
      }}>
        {label}
      </label>
      {children}
      {dica && !erro && (
        <p style={{ color: '#555566', fontSize: '11px', marginTop: '5px' }}>{dica}</p>
      )}
      {erro && (
        <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '5px' }}>{erro}</p>
      )}
    </div>
  )
}
