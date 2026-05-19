import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import {
  format, parseISO,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subMonths
} from 'date-fns'
import { pt } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { calculateMonthSummary, formatHours, STANDARD_HOURS_PER_DAY } from '../utils/calculations'
import { exportToExcel } from '../utils/export'

function generateUID() {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16)
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const card = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: '#f0f0f8',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'DM Sans, sans-serif',
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('colaboradores')
  const [employees, setEmployees] = useState([])
  const [punches, setPunches] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [qrModal, setQrModal] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // QR Canvas ref (for download)
  const qrCanvasRef = useRef(null)

  // Filters — Picagens
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [filterStart, setFilterStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [filterEnd, setFilterEnd] = useState(todayStr)
  const [filterEmp, setFilterEmp] = useState('all')

  // Filters — Relatórios
  const [reportPeriod, setReportPeriod] = useState('thisMonth')
  const [reportEmp, setReportEmp] = useState('all')

  // ── Auth check + load data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionStorage.getItem('admin_auth')) {
      navigate('/admin')
      return
    }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: emps }, { data: pnch }] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('punches').select('*').order('timestamp', { ascending: false }),
    ])
    if (emps) setEmployees(emps)
    if (pnch) setPunches(pnch)
    setLoading(false)
  }

  // ── Employee actions ────────────────────────────────────────────────────────
  async function addEmployee() {
    if (!newName.trim()) return
    setAddLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .insert({ name: newName.trim(), uid: generateUID() })
      .select().single()
    if (!error && data) {
      setEmployees(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setAddModal(false)
    }
    setAddLoading(false)
  }

  async function deleteEmployee(id, name) {
    if (!confirm(`Eliminar "${name}"? Todas as picagens serão apagadas.`)) return
    await supabase.from('punches').delete().eq('employee_id', id)
    await supabase.from('employees').delete().eq('id', id)
    setEmployees(prev => prev.filter(e => e.id !== id))
    setPunches(prev => prev.filter(p => p.employee_id !== id))
  }

  async function deletePunch(id) {
    if (!confirm('Eliminar esta picagem?')) return
    await supabase.from('punches').delete().eq('id', id)
    setPunches(prev => prev.filter(p => p.id !== id))
  }

  // ── QR download ─────────────────────────────────────────────────────────────
  function downloadQR(emp) {
    const canvas = document.getElementById(`qr-canvas-${emp.id}`)
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-ponto-${emp.name.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  // ── Report period ───────────────────────────────────────────────────────────
  function getReportDates() {
    const now = new Date()
    switch (reportPeriod) {
      case 'thisWeek': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
      case 'lastMonth': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
      default: return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filteredPunches = punches.filter(p => {
    const d = p.timestamp.substring(0, 10)
    return d >= filterStart && d <= filterEnd && (filterEmp === 'all' || p.employee_id === filterEmp)
  })

  const { start: repStart, end: repEnd } = getReportDates()
  const repPunches = punches.filter(p => {
    const d = new Date(p.timestamp)
    return d >= repStart && d <= repEnd && (reportEmp === 'all' || p.employee_id === reportEmp)
  })

  const repEmployees = employees.filter(e => reportEmp === 'all' || e.id === reportEmp)

  const baseURL = typeof window !== 'undefined' ? window.location.origin : ''

  // ── Punch table grouped by day ───────────────────────────────────────────────
  const punchByDay = {}
  for (const p of filteredPunches) {
    const d = p.timestamp.substring(0, 10)
    if (!punchByDay[d]) punchByDay[d] = []
    punchByDay[d].push(p)
  }
  const sortedDays = Object.keys(punchByDay).sort((a, b) => b.localeCompare(a))

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="12" />
      </svg>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f8' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(79,195,247,0.1)',
            border: '1px solid rgba(79,195,247,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px' }}>
            Ponto Digital
          </span>
          <span style={{ color: '#555566', fontSize: '12px', marginLeft: '4px' }}>Gestão</span>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem('admin_auth'); navigate('/admin') }}
          style={{ color: '#8888aa', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          Sair
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', display: 'flex', gap: '4px' }}>
        {[
          { id: 'colaboradores', icon: '👥', label: 'Colaboradores' },
          { id: 'picagens', icon: '🕐', label: 'Picagens' },
          { id: 'relatorios', icon: '📊', label: 'Relatórios' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '14px 16px',
              fontSize: '13px',
              fontWeight: 500,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? '#4fc3f7' : 'transparent'}`,
              color: activeTab === tab.id ? '#4fc3f7' : '#8888aa',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ═══════════════════════════════════════════
            TAB: COLABORADORES
        ═══════════════════════════════════════════ */}
        {activeTab === 'colaboradores' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700 }}>Colaboradores</h2>
                <p style={{ color: '#8888aa', fontSize: '13px', marginTop: '2px' }}>{employees.length} registados</p>
              </div>
              <button
                onClick={() => setAddModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'Syne, sans-serif',
                  boxShadow: '0 4px 16px rgba(79,195,247,0.2)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Adicionar
              </button>
            </div>

            {employees.length === 0 ? (
              <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                <p style={{ color: '#8888aa', marginBottom: '20px' }}>Nenhum colaborador ainda.</p>
                <button onClick={() => setAddModal(true)} style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7', border: '1px solid rgba(79,195,247,0.2)', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px' }}>
                  Adicionar primeiro colaborador
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {employees.map(emp => {
                  const todayPunches = punches.filter(p => p.employee_id === emp.id && p.timestamp.startsWith(todayStr))
                  const isPresent = todayPunches.length % 2 === 1
                  const todayPunchCount = todayPunches.length

                  return (
                    <div key={emp.id} style={{ ...card, padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'rgba(79,195,247,0.1)',
                            border: '1px solid rgba(79,195,247,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#4fc3f7'
                          }}>
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '15px' }}>{emp.name}</div>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              marginTop: '4px',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 500,
                              background: isPresent ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.04)',
                              color: isPresent ? '#00e676' : '#555566',
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPresent ? '#00e676' : '#555566' }} />
                              {isPresent ? 'Presente' : 'Ausente'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteEmployee(emp.id, emp.name)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555566', padding: '4px', transition: 'color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#555566'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ fontSize: '12px', color: '#8888aa' }}>Picagens hoje</div>
                        <div style={{ fontSize: '12px', color: '#f0f0f8', fontFamily: 'JetBrains Mono, monospace' }}>{todayPunchCount}</div>
                      </div>

                      {/* Hidden canvas for QR download */}
                      <div style={{ display: 'none' }}>
                        <QRCodeCanvas
                          id={`qr-canvas-${emp.id}`}
                          value={`${baseURL}/pico?uid=${emp.uid}`}
                          size={400}
                          level="H"
                          includeMargin
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setQrModal(emp)}
                          style={{
                            flex: 1, padding: '9px', borderRadius: '9px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#f0f0f8', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h1v1h-1zm3 0h1v1h-1zm3 0h-1v1h1zm-3 3h-1v1h1zm3 0h-1v1h1zm-3 3h-1v1h1zm3-3h-1v1h1z"/></svg>
                          Ver QR Code
                        </button>
                        <button
                          onClick={() => downloadQR(emp)}
                          style={{
                            padding: '9px 12px', borderRadius: '9px',
                            background: 'rgba(79,195,247,0.08)',
                            border: '1px solid rgba(79,195,247,0.15)',
                            color: '#4fc3f7', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          PNG
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TAB: PICAGENS
        ═══════════════════════════════════════════ */}
        {activeTab === 'picagens' && (
          <div className="animate-fade-in">
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700 }}>Picagens</h2>
                <p style={{ color: '#8888aa', fontSize: '13px', marginTop: '2px' }}>{filteredPunches.length} registos</p>
              </div>
              <button
                onClick={() => exportToExcel(filteredPunches, employees, 'picagens')}
                style={{
                  background: 'rgba(0,230,118,0.1)',
                  border: '1px solid rgba(0,230,118,0.2)',
                  color: '#00e676',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'Syne, sans-serif',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar Excel
              </button>
            </div>

            {/* Filters */}
            <div style={{ ...card, padding: '16px 20px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
              <div>
                <div style={{ color: '#8888aa', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>De</div>
                <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={{ color: '#8888aa', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Até</div>
                <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={{ color: '#8888aa', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colaborador</div>
                <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} style={{ ...inputStyle, paddingRight: '28px' }}>
                  <option value="all">Todos</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => { setFilterStart(format(startOfMonth(new Date()), 'yyyy-MM-dd')); setFilterEnd(todayStr); setFilterEmp('all') }}
                style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '12px', cursor: 'pointer', padding: '4px', alignSelf: 'flex-end', marginBottom: '2px' }}
              >
                Limpar filtros
              </button>
            </div>

            {/* Punch list */}
            {sortedDays.length === 0 ? (
              <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
                <p style={{ color: '#8888aa' }}>Nenhuma picagem encontrada para o período seleccionado.</p>
              </div>
            ) : sortedDays.map(day => {
              const dayPunches = punchByDay[day].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

              // Group by employee to calculate hours
              const empDayMap = {}
              for (const p of dayPunches) {
                if (!empDayMap[p.employee_id]) empDayMap[p.employee_id] = []
                empDayMap[p.employee_id].push(p)
              }

              // Calculate hours per employee for this day
              const empHours = {}
              for (const [eid, ep] of Object.entries(empDayMap)) {
                const { totalHours } = calculateMonthSummary(ep)
                empHours[eid] = totalHours
              }

              return (
                <div key={day} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ color: '#8888aa', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' }}>
                      {format(new Date(day + 'T12:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
                    </div>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.04)' }} />
                    <div style={{ color: '#555566', fontSize: '11px' }}>{dayPunches.length} picagens</div>
                  </div>

                  <div style={{ ...card, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {['Colaborador', 'Hora', 'Tipo', 'Horas do dia', ''].map((h, i) => (
                            <th key={i} style={{ textAlign: 'left', padding: '10px 16px', color: '#555566', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dayPunches.map((punch, i) => {
                          const emp = employees.find(e => e.id === punch.employee_id)
                          const empPunchesForDay = empDayMap[punch.employee_id] || []
                          const isLastForEmp = empPunchesForDay[empPunchesForDay.length - 1]?.id === punch.id
                          const hours = empHours[punch.employee_id] || 0
                          const isEntrada = punch.type === 'entrada'

                          return (
                            <tr key={punch.id} style={{ borderBottom: i < dayPunches.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                              <td style={{ padding: '12px 16px', fontSize: '14px', color: '#f0f0f8' }}>{emp?.name || '—'}</td>
                              <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#c0c0d0' }}>
                                {format(parseISO(punch.timestamp), 'HH:mm:ss')}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  background: isEntrada ? 'rgba(0,230,118,0.1)' : 'rgba(255,107,53,0.1)',
                                  color: isEntrada ? '#00e676' : '#ff6b35',
                                }}>
                                  {isEntrada ? '↓ Entrada' : '↑ Saída'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                {isLastForEmp && hours > 0 ? (
                                  <span style={{ color: hours > STANDARD_HOURS_PER_DAY ? '#ffd54f' : '#f0f0f8', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {formatHours(hours)}
                                    {hours > STANDARD_HOURS_PER_DAY && (
                                      <span style={{ color: '#ffd54f', fontSize: '11px', marginLeft: '6px' }}>
                                        +{formatHours(hours - STANDARD_HOURS_PER_DAY)} extra
                                      </span>
                                    )}
                                  </span>
                                ) : null}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button
                                  onClick={() => deletePunch(punch.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333344', fontSize: '16px', transition: 'color 0.15s' }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={e => e.currentTarget.style.color = '#333344'}
                                  title="Eliminar picagem"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TAB: RELATÓRIOS
        ═══════════════════════════════════════════ */}
        {activeTab === 'relatorios' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700 }}>Relatórios</h2>
                <p style={{ color: '#8888aa', fontSize: '13px', marginTop: '2px' }}>
                  {format(repStart, "d MMM", { locale: pt })} → {format(repEnd, "d MMM yyyy", { locale: pt })}
                </p>
              </div>
              <button
                onClick={() => exportToExcel(repPunches, repEmployees, 'relatorio')}
                style={{
                  background: 'rgba(0,230,118,0.1)',
                  border: '1px solid rgba(0,230,118,0.2)',
                  color: '#00e676',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'Syne, sans-serif',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar Excel
              </button>
            </div>

            {/* Period + Employee filters */}
            <div style={{ ...card, padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ color: '#8888aa', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Período</div>
                <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value)} style={{ ...inputStyle, paddingRight: '28px' }}>
                  <option value="thisWeek">Esta semana</option>
                  <option value="thisMonth">Este mês</option>
                  <option value="lastMonth">Mês passado</option>
                </select>
              </div>
              <div>
                <div style={{ color: '#8888aa', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colaborador</div>
                <select value={reportEmp} onChange={e => setReportEmp(e.target.value)} style={{ ...inputStyle, paddingRight: '28px' }}>
                  <option value="all">Todos</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>

            {/* Per employee */}
            {repEmployees.map(emp => {
              const empRepPunches = repPunches.filter(p => p.employee_id === emp.id)
              if (empRepPunches.length === 0) return null
              const { totalHours, workDays, totalOvertime, dayDetails } = calculateMonthSummary(empRepPunches)

              return (
                <div key={emp.id} style={{ marginBottom: '32px' }}>
                  {/* Employee header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'rgba(79,195,247,0.1)',
                      border: '1px solid rgba(79,195,247,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#4fc3f7'
                    }}>
                      {emp.name.charAt(0)}
                    </div>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '17px' }}>{emp.name}</span>
                  </div>

                  {/* Summary cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
                    {[
                      { label: 'Total Horas', value: formatHours(totalHours), color: '#4fc3f7' },
                      { label: 'Dias Trabalhados', value: workDays, color: '#00e676' },
                      { label: 'Horas Extra', value: totalOvertime > 0 ? formatHours(totalOvertime) : '—', color: totalOvertime > 0 ? '#ffd54f' : '#555566' },
                    ].map(stat => (
                      <div key={stat.label} style={{ ...card, padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                        <div style={{ color: '#8888aa', fontSize: '11px', marginTop: '4px' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Day details table */}
                  <div style={{ ...card, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {['Data', 'Entrada', 'Saída', 'Horas', 'Extra'].map((h, i) => (
                            <th key={i} style={{ textAlign: 'left', padding: '10px 16px', color: '#555566', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dayDetails.map(({ day, hours, overtime, firstEntry, lastExit, hasMissingExit }, i) => (
                          <tr key={day} style={{ borderBottom: i < dayDetails.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#c0c0d0', textTransform: 'capitalize' }}>
                              {format(new Date(day + 'T12:00:00'), "d MMM, EEE", { locale: pt })}
                            </td>
                            <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#00e676' }}>
                              {firstEntry ? format(parseISO(firstEntry.timestamp), 'HH:mm') : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: hasMissingExit ? '#ef4444' : '#ff6b35' }}>
                              {lastExit ? format(parseISO(lastExit.timestamp), 'HH:mm') : (
                                <span style={{ color: '#ef4444', fontSize: '11px' }}>⚠ Em falta</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#f0f0f8', fontWeight: 500 }}>
                              {formatHours(hours)}
                            </td>
                            <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}>
                              {overtime > 0
                                ? <span style={{ color: '#ffd54f' }}>+{formatHours(overtime)}</span>
                                : <span style={{ color: '#333344' }}>—</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}

            {repEmployees.every(emp => repPunches.filter(p => p.employee_id === emp.id).length === 0) && (
              <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
                <p style={{ color: '#8888aa' }}>Nenhum dado para o período seleccionado.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          MODAL: QR Code
      ═══════════════════════════════════════════ */}
      {qrModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px', backdropFilter: 'blur(4px)' }}
          onClick={() => setQrModal(null)}
        >
          <div
            style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px', maxWidth: '360px', width: '100%' }}
            onClick={e => e.stopPropagation()}
            className="animate-scale-in"
          >
            <div id="qr-print-area" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{qrModal.name}</div>
              <div style={{ color: '#8888aa', fontSize: '13px', marginBottom: '20px' }}>QR Code de Ponto</div>
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', display: 'inline-flex', justifyContent: 'center' }}>
                <QRCodeCanvas
                  value={`${baseURL}/pico?uid=${qrModal.uid}`}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px' }}>
              <div style={{ color: '#8888aa', fontSize: '11px', marginBottom: '4px' }}>URL do QR Code:</div>
              <div style={{ color: '#4fc3f7', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
                {baseURL}/pico?uid={qrModal.uid}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => downloadQR(qrModal)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PNG
              </button>
              <button
                onClick={() => { window.print() }}
                style={{
                  padding: '12px 16px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f0f0f8', cursor: 'pointer',
                  fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir
              </button>
              <button
                onClick={() => setQrModal(null)}
                style={{
                  padding: '12px 14px', borderRadius: '12px',
                  background: 'none', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#8888aa', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MODAL: Adicionar Colaborador
      ═══════════════════════════════════════════ */}
      {addModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px', backdropFilter: 'blur(4px)' }}
          onClick={() => setAddModal(false)}
        >
          <div
            style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px', maxWidth: '360px', width: '100%' }}
            onClick={e => e.stopPropagation()}
            className="animate-scale-in"
          >
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Novo Colaborador</h2>
            <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '24px' }}>Um QR code único será gerado automaticamente.</p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#8888aa', fontSize: '11px', fontWeight: 500, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Nome completo
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEmployee()}
                placeholder="Ex: João Silva"
                autoFocus
                style={{
                  ...inputStyle,
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: '15px',
                  padding: '14px 16px',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(79,195,247,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={addEmployee}
                disabled={addLoading || !newName.trim()}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: addLoading || !newName.trim() ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #4fc3f7, #0288d1)',
                  color: addLoading || !newName.trim() ? '#8888aa' : '#fff',
                  border: 'none',
                  cursor: addLoading || !newName.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700,
                }}
              >
                {addLoading ? 'A adicionar...' : 'Adicionar'}
              </button>
              <button
                onClick={() => { setAddModal(false); setNewName('') }}
                style={{
                  padding: '14px 20px', borderRadius: '12px',
                  background: 'none', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#8888aa', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '14px',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
