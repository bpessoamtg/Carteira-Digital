import { useState, useRef } from 'react'
import { useStore, TICKER_DEFAULTS } from '../store/useStore'
import { parseExcel } from '../utils/parseExcel'
import type { Pessoa } from '../store/useStore'

const C = {
  bg:     '#0a0a0f',
  card:   '#0d0d18',
  border: 'rgba(255,255,255,0.07)',
  text:   '#f0f0f8',
  muted:  '#8888aa',
  blue:   '#4fc3f7',
  green:  '#00e676',
  red:    '#ef4444',
}

function euro(v: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

export function Importar() {
  const { tickerMap, setDados, setTickerMap } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview]   = useState<Pessoa[] | null>(null)
  const [erro, setErro]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [localMap, setLocalMap] = useState<Record<string, string>>({ ...tickerMap })
  const [activeTab, setActiveTab] = useState<'upload' | 'tickers'>('upload')

  async function processarFicheiro(file: File) {
    setErro('')
    setGuardado(false)
    setLoading(true)
    try {
      const buf = await file.arrayBuffer()
      const pessoas = parseExcel(buf, localMap)
      setPreview(pessoas)
    } catch (e) {
      setErro('Erro ao ler o ficheiro. Certifica-te que é o ficheiro Excel correto.')
      console.error(e)
    }
    setLoading(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processarFicheiro(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processarFicheiro(file)
  }

  function guardar() {
    if (!preview) return
    setDados(preview, new Date().toISOString())
    setTickerMap(localMap)
    setGuardado(true)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function cancelar() {
    setPreview(null)
    setErro('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // Collect all unique asset names from preview for ticker mapping
  const assetsNoPreview = preview
    ? [...new Set(preview.flatMap(p => p.brokers.flatMap(b => b.ativos.map(a => a.nome))))]
    : []

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: C.text, margin: 0 }}>
          Importar Excel
        </h1>
        <p style={{ color: C.muted, fontSize: '13px', marginTop: '6px' }}>
          Carrega o ficheiro mensal de investimentos para atualizar os dados.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {(['upload', 'tickers'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === tab ? C.text : C.muted, transition: 'all 0.15s',
            }}
          >
            {tab === 'upload' ? 'Upload' : 'Tickers'}
          </button>
        ))}
      </div>

      {activeTab === 'tickers' && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' }}>
          <p style={{ color: C.muted, fontSize: '13px', marginBottom: '16px', marginTop: 0 }}>
            Define o ticker do Yahoo Finance para cada ativo. Usado para obter preços em tempo real.
          </p>
          <div style={{ display: 'grid', gap: '10px' }}>
            {Object.entries(TICKER_DEFAULTS).map(([nome, defaultTicker]) => (
              <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '110px', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: C.text, fontWeight: 600 }}>
                  {nome}
                </div>
                <input
                  value={localMap[nome] ?? ''}
                  onChange={e => setLocalMap(m => ({ ...m, [nome]: e.target.value.trim() }))}
                  placeholder={defaultTicker}
                  style={{
                    flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                    color: C.text, fontSize: '13px', fontFamily: 'monospace', outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => { setTickerMap(localMap); setActiveTab('upload') }}
            style={{
              marginTop: '16px', padding: '10px 20px', background: C.blue, border: 'none',
              borderRadius: '8px', color: '#000', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            Guardar Tickers
          </button>
        </div>
      )}

      {activeTab === 'upload' && !preview && (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragging ? C.blue : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '16px', padding: '48px 24px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              background: dragging ? 'rgba(79,195,247,0.04)' : 'transparent',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={dragging ? C.blue : C.muted} strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: '12px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: C.text, marginBottom: '6px' }}>
              {loading ? 'A processar...' : 'Arrasta o ficheiro Excel aqui'}
            </div>
            <div style={{ color: C.muted, fontSize: '13px' }}>
              ou clica para selecionar · .xlsx
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFileChange} style={{ display: 'none' }} />
          </div>

          {erro && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.2)`, borderRadius: '10px', color: C.red, fontSize: '13px' }}>
              {erro}
            </div>
          )}

          {guardado && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(0,230,118,0.08)', border: `1px solid rgba(0,230,118,0.2)`, borderRadius: '10px', color: C.green, fontSize: '13px' }}>
              Dados importados com sucesso!
            </div>
          )}
        </>
      )}

      {activeTab === 'upload' && preview && (
        <div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: C.text }}>
                Pré-visualização
              </span>
              <span style={{ fontSize: '12px', color: C.muted }}>
                {preview.length} pessoas · {preview.reduce((s, p) => s + p.brokers.length, 0)} brokers
              </span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {preview.map(p => {
                const total = p.brokers.reduce((s, b) => s + b.totalInvestido, 0)
                const valor = p.brokers.reduce((s, b) => s + b.valorExcel, 0)
                return (
                  <div key={p.id} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.cor }} />
                      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: C.text }}>
                        {p.nome}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: '13px', color: C.muted }}>
                        {euro(total)} investido → {euro(valor)}
                      </span>
                    </div>
                    {p.brokers.map(b => (
                      <div key={b.nome} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: C.muted, width: '70px', flexShrink: 0 }}>{b.nome}</span>
                        <span style={{ fontSize: '12px', color: C.text, flex: 1 }}>
                          {b.ativos.map(a => a.nome).join(', ')}
                        </span>
                        <span style={{ fontSize: '12px', color: C.muted, whiteSpace: 'nowrap' }}>
                          {euro(b.totalInvestido)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {assetsNoPreview.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px 20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: C.muted, marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Ativos detetados
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {assetsNoPreview.map(nome => {
                  const t = localMap[nome] ?? TICKER_DEFAULTS[nome]
                  return (
                    <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '12px', color: C.text }}>{nome}</span>
                      {t && <span style={{ fontSize: '11px', color: C.blue, fontFamily: 'monospace' }}>→ {t}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={guardar}
              style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #4fc3f7, #0288d1)', border: 'none', borderRadius: '10px', color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
            >
              Guardar Dados
            </button>
            <button
              onClick={cancelar}
              style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.muted, fontFamily: 'Inter, sans-serif', fontSize: '14px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
