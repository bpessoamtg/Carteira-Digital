import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { TIPOS_ATIVO, REGIOES, MOEDAS, type TipoAtivo, type Moeda, type Regiao, type Posicao } from '../types'
import { Modal } from '../components/Modal'
import { FormField, INPUT_STYLE, focusInput, blurInput } from '../components/FormField'
import { plPosicao, plPercentagem, valorPosicao } from '../utils/calculations'
import { formatarMoeda, formatarPercentagem, formatarNumero } from '../utils/formatters'
import { fetchCotacoes, type Cotacao } from '../utils/fetchPrecos'

const C = {
  card: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.07)',
  text: '#f0f0f8',
  muted: '#8888aa',
  dim: '#555566',
  green: '#00e676',
  red: '#ef4444',
  blue: '#4fc3f7',
}

interface FormData {
  corretoraId: string
  ticker: string
  nome: string
  tipo: TipoAtivo
  quantidade: string
  precoMedioCusto: string
  precoAtual: string
  moeda: Moeda
  regiao: Regiao
}

const FORM_VAZIO: FormData = {
  corretoraId: '', ticker: '', nome: '', tipo: 'etf',
  quantidade: '', precoMedioCusto: '', precoAtual: '', moeda: 'EUR', regiao: 'europa',
}

type Erros = Partial<Record<keyof FormData, string>>

function selectStyle(erro?: string): React.CSSProperties {
  return { ...INPUT_STYLE, ...(erro ? { borderColor: 'rgba(239,68,68,0.5)' } : {}) }
}

export function Posicoes() {
  const { corretoras, posicoes, adicionarPosicao, editarPosicao, removerPosicao, atualizarPrecos } = useStore()

  const [modalAberto, setModalAberto]   = useState(false)
  const [editando, setEditando]         = useState<Posicao | null>(null)
  const [form, setForm]                 = useState<FormData>(FORM_VAZIO)
  const [erros, setErros]               = useState<Erros>({})
  const [filtroCorretora, setFiltroCorretora] = useState('todas')
  const [filtroTipo, setFiltroTipo]     = useState<TipoAtivo | 'todos'>('todos')
  const [ordem, setOrdem]               = useState<'valor' | 'pl' | 'hoje' | 'ticker'>('valor')

  // Live price state (table)
  const [cotacoes,    setCotacoes]    = useState<Record<string, Cotacao>>({})
  const [aFetch,      setAFetch]      = useState(false)
  const [erroFetch,   setErroFetch]   = useState('')
  const [ultimaAtu,   setUltimaAtu]   = useState<Date | null>(null)
  const [semCors,     setSemCors]     = useState<string[]>([])

  // Live price state (modal)
  const [fetchingModal, setFetchingModal] = useState(false)
  const [erroModal,     setErroModal]     = useState('')

  const posicoesFiltradas = useMemo(() => {
    let lista = [...posicoes]
    if (filtroCorretora !== 'todas') lista = lista.filter((p) => p.corretoraId === filtroCorretora)
    if (filtroTipo !== 'todos')       lista = lista.filter((p) => p.tipo === filtroTipo)
    if (ordem === 'valor')  lista.sort((a, b) => valorPosicao(b) - valorPosicao(a))
    if (ordem === 'pl')     lista.sort((a, b) => plPercentagem(b) - plPercentagem(a))
    if (ordem === 'hoje')   lista.sort((a, b) => (cotacoes[b.ticker]?.mudancaHojePct ?? 0) - (cotacoes[a.ticker]?.mudancaHojePct ?? 0))
    if (ordem === 'ticker') lista.sort((a, b) => a.ticker.localeCompare(b.ticker))
    return lista
  }, [posicoes, filtroCorretora, filtroTipo, ordem, cotacoes])

  const atualizarCotacoes = useCallback(async () => {
    if (posicoes.length === 0) return
    setAFetch(true)
    setErroFetch('')
    setSemCors([])
    const tickers = [...new Set(posicoes.map((p) => p.ticker))]
    try {
      const novasCotacoes = await fetchCotacoes(tickers)
      const semResultado = tickers.filter((t) => !novasCotacoes[t])
      if (semResultado.length > 0) setSemCors(semResultado)
      setCotacoes(novasCotacoes)
      // Update store prices
      const precos: Record<string, number> = {}
      for (const [ticker, c] of Object.entries(novasCotacoes)) {
        precos[ticker] = c.precoAtual
      }
      if (Object.keys(precos).length > 0) atualizarPrecos(precos)
      setUltimaAtu(new Date())
    } catch {
      setErroFetch('Erro ao obter cotações. Verifica a ligação à internet.')
    } finally {
      setAFetch(false)
    }
  }, [posicoes, atualizarPrecos])

  async function buscarPrecoModal(ticker: string) {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    setFetchingModal(true)
    setErroModal('')
    try {
      const res = await fetchCotacoes([t])
      if (res[t]) {
        setForm((prev) => ({ ...prev, precoAtual: String(res[t].precoAtual) }))
        setErros((e) => ({ ...e, precoAtual: undefined }))
      } else {
        setErroModal(`Sem cotação para "${t}" no Yahoo Finance`)
      }
    } catch {
      setErroModal('Erro ao obter cotação')
    } finally {
      setFetchingModal(false)
    }
  }

  function abrirNovo() {
    setEditando(null)
    setForm({ ...FORM_VAZIO, corretoraId: corretoras[0]?.id ?? '' })
    setErros({})
    setErroModal('')
    setModalAberto(true)
  }

  function abrirEditar(p: Posicao) {
    setEditando(p)
    setForm({
      corretoraId: p.corretoraId, ticker: p.ticker, nome: p.nome,
      tipo: p.tipo, quantidade: String(p.quantidade),
      precoMedioCusto: String(p.precoMedioCusto), precoAtual: String(p.precoAtual),
      moeda: p.moeda, regiao: p.regiao,
    })
    setErros({})
    setErroModal('')
    setModalAberto(true)
    // Auto-fetch latest price
    buscarPrecoModal(p.ticker)
  }

  function fecharModal() { setModalAberto(false); setEditando(null) }

  function f(key: keyof FormData, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (erros[key]) setErros((e) => ({ ...e, [key]: undefined }))
  }

  function validar(): boolean {
    const e: Erros = {}
    if (!form.corretoraId) e.corretoraId = 'Selecciona uma corretora'
    if (!form.ticker.trim()) e.ticker = 'Obrigatório'
    if (!form.nome.trim()) e.nome = 'Obrigatório'
    const qtd = parseFloat(form.quantidade)
    if (isNaN(qtd) || qtd <= 0) e.quantidade = 'Deve ser maior que 0'
    const pmc = parseFloat(form.precoMedioCusto)
    if (isNaN(pmc) || pmc < 0) e.precoMedioCusto = 'Deve ser >= 0'
    const pa = parseFloat(form.precoAtual)
    if (isNaN(pa) || pa < 0) e.precoAtual = 'Deve ser >= 0'
    setErros(e)
    return Object.keys(e).length === 0
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    const dados = {
      corretoraId: form.corretoraId,
      ticker: form.ticker.trim().toUpperCase(),
      nome: form.nome.trim(),
      tipo: form.tipo,
      quantidade: parseFloat(form.quantidade),
      precoMedioCusto: parseFloat(form.precoMedioCusto),
      precoAtual: parseFloat(form.precoAtual),
      moeda: form.moeda,
      regiao: form.regiao,
    }
    if (editando) editarPosicao(editando.id, dados)
    else adicionarPosicao(dados)
    fecharModal()
  }

  function confirmarRemover(p: Posicao) {
    if (window.confirm(`Remover posição "${p.ticker}"? As transações associadas também serão eliminadas.`))
      removerPosicao(p.id)
  }

  const temCotacoes = Object.keys(cotacoes).length > 0

  return (
    <div style={{ color: C.text, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, color: C.text, marginBottom: '4px' }}>Posições</h1>
          <p style={{ color: C.muted, fontSize: '13px' }}>{posicoesFiltradas.length} de {posicoes.length} posições</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Live price button */}
          {posicoes.length > 0 && (
            <button
              onClick={atualizarCotacoes}
              disabled={aFetch}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 16px', borderRadius: '10px',
                border: `1px solid ${temCotacoes ? 'rgba(0,230,118,0.25)' : 'rgba(255,255,255,0.1)'}`,
                background: temCotacoes ? 'rgba(0,230,118,0.07)' : 'rgba(255,255,255,0.04)',
                color: aFetch ? C.muted : temCotacoes ? C.green : C.text,
                fontSize: '13px', fontWeight: 600, cursor: aFetch ? 'wait' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round"
                style={{ animation: aFetch ? 'spin 1s linear infinite' : 'none' }}
              >
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {aFetch ? 'A atualizar…' : ultimaAtu ? `Cotações (${ultimaAtu.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })})` : 'Atualizar Cotações'}
            </button>
          )}

          <button
            onClick={abrirNovo}
            disabled={corretoras.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', borderRadius: '10px', border: 'none',
              cursor: corretoras.length === 0 ? 'not-allowed' : 'pointer',
              background: corretoras.length === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #4fc3f7, #0288d1)',
              color: corretoras.length === 0 ? C.muted : '#fff',
              fontSize: '13px', fontWeight: 600, fontFamily: 'Syne, sans-serif',
              boxShadow: corretoras.length > 0 ? '0 4px 16px rgba(79,195,247,0.2)' : 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova Posição
          </button>
        </div>
      </div>

      {/* Fetch feedback */}
      {erroFetch && (
        <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: C.red, fontSize: '13px' }}>
          {erroFetch}
        </div>
      )}
      {semCors.length > 0 && (
        <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', color: '#f59e0b', fontSize: '12px' }}>
          Sem cotação para: <strong>{semCors.join(', ')}</strong> — verifica se o ticker existe no Yahoo Finance (ex: SXR8.DE, BTC-EUR).
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <select value={filtroCorretora} onChange={(e) => setFiltroCorretora(e.target.value)}
          style={{ ...INPUT_STYLE, width: 'auto', padding: '8px 12px', fontSize: '13px' }}>
          <option value="todas">Todas as corretoras</option>
          {corretoras.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as TipoAtivo | 'todos')}
          style={{ ...INPUT_STYLE, width: 'auto', padding: '8px 12px', fontSize: '13px' }}>
          <option value="todos">Todos os tipos</option>
          {Object.entries(TIPOS_ATIVO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)}
          style={{ ...INPUT_STYLE, width: 'auto', padding: '8px 12px', fontSize: '13px' }}>
          <option value="valor">Ordenar por valor</option>
          <option value="pl">Ordenar por P&L %</option>
          <option value="hoje">Ordenar por variação hoje</option>
          <option value="ticker">Ordenar por ticker</option>
        </select>
      </div>

      {/* Empty states */}
      {posicoes.length === 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '64px 32px', textAlign: 'center' }}>
          {corretoras.length === 0 ? (
            <>
              <p style={{ color: C.muted, marginBottom: '16px' }}>Adiciona primeiro uma corretora antes de adicionar posições.</p>
              <Link to="/corretoras" style={{ color: C.blue, textDecoration: 'none', fontWeight: 600 }}>Ir para Corretoras →</Link>
            </>
          ) : (
            <>
              <p style={{ color: C.muted, marginBottom: '20px' }}>Nenhuma posição ainda. Adiciona a tua primeira posição.</p>
              <button onClick={abrirNovo} style={{ padding: '10px 22px', borderRadius: '10px', border: '1px solid rgba(79,195,247,0.2)', background: 'rgba(79,195,247,0.1)', color: C.blue, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                Adicionar posição
              </button>
            </>
          )}
        </div>
      )}

      {posicoes.length > 0 && posicoesFiltradas.length === 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
          <p style={{ color: C.muted, fontSize: '13px' }}>Nenhuma posição para os filtros seleccionados.</p>
          <button onClick={() => { setFiltroCorretora('todas'); setFiltroTipo('todos') }}
            style={{ marginTop: '12px', background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            Limpar filtros
          </button>
        </div>
      )}

      {/* Table */}
      {posicoesFiltradas.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: temCotacoes ? '880px' : '760px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Ativo', 'Corretora', 'Qtd', 'P. Médio', 'P. Atual', ...(temCotacoes ? ['Hoje'] : []), 'Valor Total', 'P&L (€)', 'P&L (%)', ''].map((h) => (
                    <th key={h} style={{
                      textAlign: ['Ativo', 'Corretora', ''].includes(h) ? 'left' : 'right',
                      padding: '11px 14px', color: h === 'Hoje' ? C.green : C.dim,
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posicoesFiltradas.map((p, i) => {
                  const corretora = corretoras.find((c) => c.id === p.corretoraId)
                  const pl = plPosicao(p)
                  const pct = plPercentagem(p)
                  const plPos = pl >= 0
                  const cot = cotacoes[p.ticker]
                  const hojePos = (cot?.mudancaHojePct ?? 0) >= 0

                  return (
                    <tr key={p.id}
                      style={{ borderBottom: i < posicoesFiltradas.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Ativo */}
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: `${TIPOS_ATIVO[p.tipo]?.cor}18`, border: `1px solid ${TIPOS_ATIVO[p.tipo]?.cor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: TIPOS_ATIVO[p.tipo]?.cor }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: C.text, fontFamily: 'Syne, sans-serif' }}>{p.ticker}</div>
                            <div style={{ fontSize: '11px', color: C.muted, maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                          </div>
                          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', fontWeight: 600, background: `${TIPOS_ATIVO[p.tipo]?.cor}18`, color: TIPOS_ATIVO[p.tipo]?.cor }}>
                            {TIPOS_ATIVO[p.tipo]?.label}
                          </span>
                        </div>
                      </td>

                      {/* Corretora */}
                      <td style={{ padding: '13px 14px' }}>
                        {corretora && (
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: 500, background: `${corretora.cor}18`, color: corretora.cor }}>
                            {corretora.nome}
                          </span>
                        )}
                      </td>

                      {/* Qtd */}
                      <td style={{ padding: '13px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: C.muted }}>
                        {formatarNumero(p.quantidade, p.quantidade % 1 === 0 ? 0 : 4)}
                      </td>

                      {/* P. Médio */}
                      <td style={{ padding: '13px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: C.muted }}>
                        {formatarMoeda(p.precoMedioCusto, p.moeda)}
                      </td>

                      {/* P. Atual */}
                      <td style={{ padding: '13px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: C.text }}>
                        {formatarMoeda(p.precoAtual, p.moeda)}
                      </td>

                      {/* Hoje (only when cotacoes loaded) */}
                      {temCotacoes && (
                        <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                          {cot ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: hojePos ? C.green : C.red }}>
                                {hojePos ? '▲' : '▼'} {Math.abs(cot.mudancaHojePct).toFixed(2)}%
                              </span>
                              <span style={{ fontSize: '11px', color: hojePos ? C.green : C.red, opacity: 0.7, fontFamily: 'JetBrains Mono, monospace' }}>
                                {hojePos ? '+' : ''}{formatarMoeda(cot.mudancaHoje * p.quantidade, p.moeda)}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: C.dim }}>—</span>
                          )}
                        </td>
                      )}

                      {/* Valor Total */}
                      <td style={{ padding: '13px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: C.text }}>
                        {formatarMoeda(valorPosicao(p), p.moeda)}
                      </td>

                      {/* P&L € */}
                      <td style={{ padding: '13px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: plPos ? C.green : C.red }}>
                        {plPos ? '+' : ''}{formatarMoeda(pl, p.moeda)}
                      </td>

                      {/* P&L % */}
                      <td style={{ padding: '13px 14px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: plPos ? C.green : C.red }}>
                        {formatarPercentagem(pct)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button onClick={() => abrirEditar(p)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: '5px', borderRadius: '6px', transition: 'all 0.15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = C.dim; e.currentTarget.style.background = 'none' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button onClick={() => confirmarRemover(p)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: '5px', borderRadius: '6px', transition: 'all 0.15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = C.red; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = C.dim; e.currentTarget.style.background = 'none' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal titulo={editando ? 'Editar Posição' : 'Nova Posição'} aberto={modalAberto} onFechar={fecharModal}>
        <form onSubmit={submeter}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Corretora" erro={erros.corretoraId}>
                <select value={form.corretoraId} onChange={(e) => f('corretoraId', e.target.value)}
                  style={selectStyle(erros.corretoraId)} onFocus={focusInput} onBlur={(e) => blurInput(e, erros.corretoraId)}>
                  <option value="">Selecciona uma corretora</option>
                  {corretoras.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Ticker / Símbolo" erro={erros.ticker}>
              <input type="text" value={form.ticker} onChange={(e) => f('ticker', e.target.value)}
                placeholder="Ex: IWDA.AS, SXR8.DE, BTC-EUR"
                style={erros.ticker ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE}
                onFocus={focusInput}
                onBlur={(e) => {
                  blurInput(e, erros.ticker)
                  if (form.ticker.trim()) buscarPrecoModal(form.ticker)
                }} />
            </FormField>
            <FormField label="Nome do Ativo" erro={erros.nome}>
              <input type="text" value={form.nome} onChange={(e) => f('nome', e.target.value)}
                placeholder="Ex: iShares Core MSCI World"
                style={erros.nome ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE}
                onFocus={focusInput} onBlur={(e) => blurInput(e, erros.nome)} />
            </FormField>
            <FormField label="Tipo de Ativo">
              <select value={form.tipo} onChange={(e) => f('tipo', e.target.value)} style={INPUT_STYLE} onFocus={focusInput} onBlur={blurInput}>
                {Object.entries(TIPOS_ATIVO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FormField>
            <FormField label="Região Geográfica">
              <select value={form.regiao} onChange={(e) => f('regiao', e.target.value)} style={INPUT_STYLE} onFocus={focusInput} onBlur={blurInput}>
                {Object.entries(REGIOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </FormField>
            <FormField label="Moeda">
              <select value={form.moeda} onChange={(e) => f('moeda', e.target.value)} style={INPUT_STYLE} onFocus={focusInput} onBlur={blurInput}>
                {MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="Quantidade" erro={erros.quantidade}>
              <input type="number" value={form.quantidade} onChange={(e) => f('quantidade', e.target.value)}
                placeholder="0" min="0" step="any"
                style={erros.quantidade ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE}
                onFocus={focusInput} onBlur={(e) => blurInput(e, erros.quantidade)} />
            </FormField>
            <FormField label="Preço Médio de Custo" erro={erros.precoMedioCusto}>
              <input type="number" value={form.precoMedioCusto} onChange={(e) => f('precoMedioCusto', e.target.value)}
                placeholder="0.00" min="0" step="any"
                style={erros.precoMedioCusto ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE}
                onFocus={focusInput} onBlur={(e) => blurInput(e, erros.precoMedioCusto)} />
            </FormField>
            <FormField label="Preço Atual" erro={erros.precoAtual}>
              <div style={{ position: 'relative' }}>
                <input
                  type="number" value={form.precoAtual}
                  onChange={(e) => f('precoAtual', e.target.value)}
                  placeholder={fetchingModal ? 'A obter cotação…' : '0.00'}
                  min="0" step="any"
                  disabled={fetchingModal}
                  style={{
                    ...(erros.precoAtual ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE),
                    paddingRight: '38px',
                    opacity: fetchingModal ? 0.5 : 1,
                  }}
                  onFocus={focusInput} onBlur={(e) => blurInput(e, erros.precoAtual)}
                />
                <button
                  type="button"
                  onClick={() => buscarPrecoModal(form.ticker)}
                  disabled={fetchingModal || !form.ticker.trim()}
                  title="Obter cotação atual"
                  style={{
                    position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: fetchingModal || !form.ticker.trim() ? 'default' : 'pointer',
                    color: fetchingModal ? C.muted : C.blue, padding: '4px', borderRadius: '4px',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                    style={{ animation: fetchingModal ? 'spin 0.8s linear infinite' : 'none' }}>
                    <path d="M23 4v6h-6M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
              </div>
              {erroModal && (
                <p style={{ color: '#f59e0b', fontSize: '11px', marginTop: '4px' }}>{erroModal}</p>
              )}
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4fc3f7, #0288d1)', color: '#fff', fontSize: '14px', fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
              {editando ? 'Guardar Alterações' : 'Adicionar Posição'}
            </button>
            <button type="button" onClick={fecharModal} style={{ padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: C.muted, fontSize: '14px' }}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
