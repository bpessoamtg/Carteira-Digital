import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, startOfDay, endOfDay } from 'date-fns'
import { pt } from 'date-fns/locale'

export default function PunchPage() {
  const [searchParams] = useSearchParams()
  const uid = searchParams.get('uid')

  const [state, setState] = useState('loading') // loading | confirm | processing | success | error
  const [employee, setEmployee] = useState(null)
  const [punchType, setPunchType] = useState(null) // 'entrada' | 'saida'
  const [errorMsg, setErrorMsg] = useState('')
  const [now] = useState(new Date())

  useEffect(() => {
    if (!uid) {
      setErrorMsg('QR Code inválido ou em falta.')
      setState('error')
      return
    }
    loadEmployee()
  }, [uid])

  async function loadEmployee() {
    // Buscar colaborador pelo UID único do QR code
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('uid', uid)
      .single()

    if (empError || !emp) {
      setErrorMsg('Colaborador não encontrado. Verifica o teu QR code.')
      setState('error')
      return
    }

    setEmployee(emp)

    // Contar picagens de hoje
    const { count, error: countError } = await supabase
      .from('punches')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', emp.id)
      .gte('timestamp', startOfDay(new Date()).toISOString())
      .lte('timestamp', endOfDay(new Date()).toISOString())

    if (countError) {
      setErrorMsg('Erro ao verificar picagens. Tenta novamente.')
      setState('error')
      return
    }

    // Picagens pares (0, 2, 4...) → entrada | ímpares (1, 3...) → saída
    setPunchType(count % 2 === 0 ? 'entrada' : 'saida')
    setState('confirm')
  }

  async function registerPunch() {
    setState('processing')

    const { error } = await supabase
      .from('punches')
      .insert({
        employee_id: employee.id,
        type: punchType,
        timestamp: new Date().toISOString(),
      })

    if (error) {
      setErrorMsg('Erro ao registar. Tenta novamente.')
      setState('error')
      return
    }

    setState('success')
  }

  const timeStr = format(now, 'HH:mm')
  const dateStr = format(now, "EEEE, d 'de' MMMM", { locale: pt })
  const isEntrada = punchType === 'entrada'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5"
      style={{ background: 'radial-gradient(ellipse at top, #0e0e1a 0%, #0a0a0f 60%)' }}
    >
      {/* Logo / Brand */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
          <span style={{ color: '#4fc3f7', fontSize: '12px' }}>●</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '13px', color: '#8888aa', letterSpacing: '0.08em' }}>
            PONTO DIGITAL
          </span>
        </div>
      </div>

      {/* Clock */}
      <div className="text-center mb-10 animate-fade-in">
        <div style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 'clamp(56px, 18vw, 88px)',
          fontWeight: 800,
          color: '#f0f0f8',
          lineHeight: 1,
          letterSpacing: '-0.03em'
        }}>
          {timeStr}
        </div>
        <div style={{ color: '#8888aa', fontSize: '14px', marginTop: '6px', textTransform: 'capitalize' }}>
          {dateStr}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-xs animate-scale-in">

        {/* LOADING */}
        {state === 'loading' && (
          <div style={cardStyle} className="text-center py-12">
            <div className="flex items-center justify-center gap-3" style={{ color: '#8888aa' }}>
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeDasharray="32" strokeDashoffset="12" />
              </svg>
              <span style={{ fontSize: '14px' }}>A verificar...</span>
            </div>
          </div>
        )}

        {/* CONFIRM */}
        {state === 'confirm' && employee && (
          <div style={cardStyle}>
            <div className="text-center mb-7">
              {/* Status indicator */}
              <div className="relative inline-flex items-center justify-center mb-5">
                <div
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center ${isEntrada ? 'pulse-ring' : ''}`}
                  style={{
                    background: isEntrada
                      ? 'rgba(0, 230, 118, 0.12)'
                      : 'rgba(255, 107, 53, 0.12)',
                    color: isEntrada ? '#00e676' : '#ff6b35',
                    border: `1.5px solid ${isEntrada ? 'rgba(0,230,118,0.3)' : 'rgba(255,107,53,0.3)'}`,
                  }}
                >
                  {isEntrada ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  )}
                </div>
              </div>

              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: '#f0f0f8' }}>
                {employee.name}
              </div>
              <div style={{
                fontSize: '13px',
                marginTop: '4px',
                color: isEntrada ? '#00e676' : '#ff6b35',
                fontWeight: 500
              }}>
                Registar {isEntrada ? 'Entrada' : 'Saída'}
              </div>
            </div>

            <button
              onClick={registerPunch}
              className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95"
              style={{
                background: isEntrada
                  ? 'linear-gradient(135deg, #00e676, #00c853)'
                  : 'linear-gradient(135deg, #ff6b35, #e53935)',
                color: isEntrada ? '#003300' : '#fff',
                fontFamily: 'Syne, sans-serif',
                fontSize: '16px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: isEntrada
                  ? '0 8px 32px rgba(0,230,118,0.25)'
                  : '0 8px 32px rgba(255,107,53,0.25)',
              }}
            >
              Confirmar {isEntrada ? 'Entrada' : 'Saída'}
            </button>
          </div>
        )}

        {/* PROCESSING */}
        {state === 'processing' && (
          <div style={cardStyle} className="text-center py-12">
            <div className="flex items-center justify-center gap-3" style={{ color: '#8888aa' }}>
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeDasharray="32" strokeDashoffset="12" />
              </svg>
              <span style={{ fontSize: '14px' }}>A registar...</span>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {state === 'success' && (
          <div style={cardStyle} className="text-center py-10">
            <div className="flex items-center justify-center mb-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,230,118,0.12)', color: '#00e676' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: '#f0f0f8', marginBottom: '4px' }}>
              Registado!
            </div>
            <div style={{ color: '#8888aa', fontSize: '14px', marginBottom: '8px' }}>{employee?.name}</div>
            <div style={{
              color: isEntrada ? '#00e676' : '#ff6b35',
              fontSize: '13px',
              fontWeight: 500
            }}>
              {isEntrada ? '✓ Entrada registada' : '✓ Saída registada'} às {format(new Date(), 'HH:mm')}
            </div>
          </div>
        )}

        {/* ERROR */}
        {state === 'error' && (
          <div style={cardStyle} className="text-center py-10">
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            </div>
            <div style={{ color: '#ef4444', fontSize: '14px' }}>{errorMsg}</div>
          </div>
        )}
      </div>
    </div>
  )
}

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '24px',
  padding: '28px 24px',
  backdropFilter: 'blur(12px)',
}
