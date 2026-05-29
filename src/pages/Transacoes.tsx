import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { type Transacao } from '../types'
import { Modal } from '../components/Modal'
import { FormField, INPUT_STYLE, focusInput, blurInput } from '../components/FormField'
import { formatarMoeda, formatarData, formatarNumero } from '../utils/formatters'

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
  posicaoId: string
  corretoraId: string
  tipo: 'compra' | 'venda'
  quantidade: string
  preco: string
  comissao: string
  data: string
  notas: string
}

function hoje(): string {
  return new Date().toISOString().substring(0, 10)
}

const FORM_VAZIO: FormData = {
  posicaoId: '',
  corretoraId: '',
  tipo: 'compra',
  quantidade: '',
  preco: '',
  comissao: '0',
  data: hoje(),
  notas: '',
}

type Erros = Partial<Record<keyof FormData, string>>

export function Transacoes() {
  const { corretoras, posicoes, transacoes, adicionarTransacao, editarTransacao, removerTransacao } = useStore()

  const [modalAberto, setModalAberto]  = useState(false)
  const [editando, setEditando]        = useState<Transacao | null>(null)
  const [form, setForm]                = useState<FormData>(FORM_VAZIO)
  const [erros, setErros]              = useState<Erros>({})
  const [filtroCorretora, setFiltroCorretora] = useState('todas')
  const [filtroTipo, setFiltroTipo]    = useState<'todos' | 'compra' | 'venda'>('todos')

  const transacoesFiltradas = useMemo(() => {
    let lista = [...transacoes]
    if (filtroCorretora !== 'todas') lista = lista.filter((t) => t.corretoraId === filtroCorretora)
    if (filtroTipo !== 'todos')      lista = lista.filter((t) => t.tipo === filtroTipo)
    return lista.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [transacoes, filtroCorretora, filtroTipo])

  // When posicao is selected, auto-fill corretoraId
  function onPosicaoChange(posicaoId: string) {
    const p = posicoes.find((x) => x.id === posicaoId)
    setForm((prev) => ({ ...prev, posicaoId, corretoraId: p?.corretoraId ?? '' }))
    if (erros.posicaoId) setErros((e) => ({ ...e, posicaoId: undefined }))
  }

  function f(key: keyof FormData, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (erros[key]) setErros((e) => ({ ...e, [key]: undefined }))
  }

  function abrirNovo() {
    const primeiraPos = posicoes[0]
    setEditando(null)
    setForm({
      ...FORM_VAZIO,
      posicaoId:   primeiraPos?.id ?? '',
      corretoraId: primeiraPos?.corretoraId ?? '',
      data: hoje(),
    })
    setErros({})
    setModalAberto(true)
  }

  function abrirEditar(t: Transacao) {
    setEditando(t)
    setForm({
      posicaoId:   t.posicaoId,
      corretoraId: t.corretoraId,
      tipo:        t.tipo,
      quantidade:  String(t.quantidade),
      preco:       String(t.preco),
      comissao:    String(t.comissao),
      data:        t.data,
      notas:       t.notas ?? '',
    })
    setErros({})
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
  }

  function validar(): boolean {
    const e: Erros = {}
    if (!form.posicaoId)   e.posicaoId  = 'Selecciona um ativo'
    const qtd = parseFloat(form.quantidade)
    if (isNaN(qtd) || qtd <= 0) e.quantidade = 'Deve ser maior que 0'
    const pr = parseFloat(form.preco)
    if (isNaN(pr) || pr <= 0)   e.preco = 'Deve ser maior que 0'
    const com = parseFloat(form.comissao)
    if (isNaN(com) || com < 0)  e.comissao = 'Deve ser maior ou igual a 0'
    if (!form.data) e.data = 'Data obrigatória'
    setErros(e)
    return Object.keys(e).length === 0
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    const dados = {
      posicaoId:   form.posicaoId,
      corretoraId: form.corretoraId,
      tipo:        form.tipo,
      quantidade:  parseFloat(form.quantidade),
      preco:       parseFloat(form.preco),
      comissao:    parseFloat(form.comissao),
      data:        form.data,
      notas:       form.notas.trim() || undefined,
    }
    if (editando) {
      editarTransacao(editando.id, dados)
    } else {
      adicionarTransacao(dados)
    }
    fecharModal()
  }

  function confirmarRemover(t: Transacao) {
    const posicao = posicoes.find((p) => p.id === t.posicaoId)
    if (window.confirm(`Remover transação de ${t.tipo} de ${posicao?.ticker ?? 'ativo'}?`)) {
      removerTransacao(t.id)
    }
  }

  // Totais
  const totalCompras = transacoesFiltradas
    .filter((t) => t.tipo === 'compra')
    .reduce((acc, t) => acc + t.quantidade * t.preco + t.comissao, 0)

  const totalVendas = transacoesFiltradas
    .filter((t) => t.tipo === 'venda')
    .reduce((acc, t) => acc + t.quantidade * t.preco - t.comissao, 0)

  const totalComissoes = transacoesFiltradas.reduce((acc, t) => acc + t.comissao, 0)

  return (
    <div style={{ color: C.text, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, color: C.text, marginBottom: '4px' }}>
            Transações
          </h1>
          <p style={{ color: C.muted, fontSize: '13px' }}>
            {transacoesFiltradas.length} de {transacoes.length} transações
          </p>
        </div>
        <button
          onClick={abrirNovo}
          disabled={posicoes.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            cursor: posicoes.length === 0 ? 'not-allowed' : 'pointer',
            background: posicoes.length === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #4fc3f7, #0288d1)',
            color: posicoes.length === 0 ? C.muted : '#fff',
            fontSize: '13px', fontWeight: 600, fontFamily: 'Syne, sans-serif',
            boxShadow: posicoes.length > 0 ? '0 4px 16px rgba(79,195,247,0.2)' : 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova Transação
        </button>
      </div>

      {/* Resumo */}
      {transacoesFiltradas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total Compras', value: formatarMoeda(totalCompras), cor: C.green },
            { label: 'Total Vendas',  value: formatarMoeda(totalVendas),  cor: C.red },
            { label: 'Comissões',     value: formatarMoeda(totalComissoes), cor: C.muted },
          ].map(({ label, value, cor }) => (
            <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px 18px' }}>
              <div style={{ color: C.dim, fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 700, color: cor }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <select
          value={filtroCorretora}
          onChange={(e) => setFiltroCorretora(e.target.value)}
          style={{ ...INPUT_STYLE, width: 'auto', padding: '8px 12px', fontSize: '13px' }}
        >
          <option value="todas">Todas as corretoras</option>
          {corretoras.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
          style={{ ...INPUT_STYLE, width: 'auto', padding: '8px 12px', fontSize: '13px' }}
        >
          <option value="todos">Compras e vendas</option>
          <option value="compra">Só compras</option>
          <option value="venda">Só vendas</option>
        </select>
      </div>

      {/* Empty */}
      {transacoes.length === 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '64px 32px', textAlign: 'center' }}>
          {posicoes.length === 0 ? (
            <p style={{ color: C.muted }}>Adiciona posições antes de registar transações.</p>
          ) : (
            <>
              <p style={{ color: C.muted, marginBottom: '20px' }}>Nenhuma transação ainda.</p>
              <button onClick={abrirNovo} style={{
                padding: '10px 22px', borderRadius: '10px', border: '1px solid rgba(79,195,247,0.2)',
                background: 'rgba(79,195,247,0.1)', color: C.blue, cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}>
                Registar transação
              </button>
            </>
          )}
        </div>
      )}

      {/* Empty filter state */}
      {transacoes.length > 0 && transacoesFiltradas.length === 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
          <p style={{ color: C.muted, fontSize: '13px' }}>Nenhuma transação para os filtros seleccionados.</p>
          <button
            onClick={() => { setFiltroCorretora('todas'); setFiltroTipo('todos') }}
            style={{ marginTop: '12px', background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Table */}
      {transacoesFiltradas.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Data', 'Tipo', 'Ativo', 'Corretora', 'Qtd', 'Preço', 'Valor', 'Comissão', 'Notas', ''].map((h) => (
                    <th key={h} style={{
                      textAlign: ['Data', 'Tipo', 'Ativo', 'Corretora', 'Notas', ''].includes(h) ? 'left' : 'right',
                      padding: '11px 14px',
                      color: C.dim, fontSize: '11px', fontWeight: 600,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transacoesFiltradas.map((t, i) => {
                  const posicao   = posicoes.find((p) => p.id === t.posicaoId)
                  const corretora = corretoras.find((c) => c.id === t.corretoraId)
                  const isCompra  = t.tipo === 'compra'
                  const valorTotal = t.quantidade * t.preco

                  return (
                    <tr
                      key={t.id}
                      style={{ borderBottom: i < transacoesFiltradas.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: C.muted, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                        {formatarData(t.data)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '11px', padding: '3px 9px', borderRadius: '20px', fontWeight: 600,
                          background: isCompra ? 'rgba(0,230,118,0.12)' : 'rgba(239,68,68,0.12)',
                          color: isCompra ? C.green : C.red,
                        }}>
                          {isCompra ? '↓ Compra' : '↑ Venda'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: C.text }}>{posicao?.ticker ?? '—'}</div>
                        {posicao && <div style={{ fontSize: '11px', color: C.muted }}>{posicao.nome}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {corretora && (
                          <span style={{
                            fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: 500,
                            background: `${corretora.cor}18`, color: corretora.cor,
                          }}>
                            {corretora.nome}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: C.muted }}>
                        {formatarNumero(t.quantidade, t.quantidade % 1 === 0 ? 0 : 4)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: C.text }}>
                        {formatarMoeda(t.preco, posicao?.moeda)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: C.text }}>
                        {formatarMoeda(valorTotal, posicao?.moeda)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: C.muted }}>
                        {formatarMoeda(t.comissao)}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: C.muted, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.notas ?? '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => abrirEditar(t)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: '5px', borderRadius: '6px', transition: 'all 0.15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = C.dim; e.currentTarget.style.background = 'none' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => confirmarRemover(t)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: '5px', borderRadius: '6px', transition: 'all 0.15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = C.red; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = C.dim; e.currentTarget.style.background = 'none' }}
                          >
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
      <Modal titulo={editando ? 'Editar Transação' : 'Nova Transação'} aberto={modalAberto} onFechar={fecharModal}>
        <form onSubmit={submeter}>
          {/* Ativo */}
          <FormField label="Ativo / Posição" erro={erros.posicaoId}>
            <select
              value={form.posicaoId}
              onChange={(e) => onPosicaoChange(e.target.value)}
              style={erros.posicaoId ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE}
              onFocus={focusInput}
              onBlur={(e) => blurInput(e, erros.posicaoId)}
            >
              <option value="">Selecciona um ativo</option>
              {posicoes.map((p) => {
                const c = corretoras.find((x) => x.id === p.corretoraId)
                return <option key={p.id} value={p.id}>{p.ticker} — {p.nome} ({c?.nome ?? '?'})</option>
              })}
            </select>
          </FormField>

          {/* Tipo */}
          <FormField label="Tipo de Operação">
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['compra', 'venda'] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => f('tipo', tipo)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer', border: 'none',
                    background: form.tipo === tipo
                      ? (tipo === 'compra' ? 'rgba(0,230,118,0.15)' : 'rgba(239,68,68,0.15)')
                      : 'rgba(255,255,255,0.04)',
                    color: form.tipo === tipo
                      ? (tipo === 'compra' ? C.green : C.red)
                      : C.muted,
                    fontSize: '13px', fontWeight: 600,
                    outline: form.tipo === tipo
                      ? `1px solid ${tipo === 'compra' ? 'rgba(0,230,118,0.3)' : 'rgba(239,68,68,0.3)'}`
                      : '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.15s',
                  }}
                >
                  {tipo === 'compra' ? '↓ Compra' : '↑ Venda'}
                </button>
              ))}
            </div>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <FormField label="Quantidade" erro={erros.quantidade}>
              <input
                type="number" value={form.quantidade}
                onChange={(e) => f('quantidade', e.target.value)}
                placeholder="0" min="0" step="any"
                style={erros.quantidade ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE}
                onFocus={focusInput} onBlur={(e) => blurInput(e, erros.quantidade)}
              />
            </FormField>

            <FormField label="Preço por Unidade" erro={erros.preco}>
              <input
                type="number" value={form.preco}
                onChange={(e) => f('preco', e.target.value)}
                placeholder="0.00" min="0" step="any"
                style={erros.preco ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE}
                onFocus={focusInput} onBlur={(e) => blurInput(e, erros.preco)}
              />
            </FormField>

            <FormField label="Comissão / Taxas" erro={erros.comissao}>
              <input
                type="number" value={form.comissao}
                onChange={(e) => f('comissao', e.target.value)}
                placeholder="0.00" min="0" step="any"
                style={erros.comissao ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE}
                onFocus={focusInput} onBlur={(e) => blurInput(e, erros.comissao)}
              />
            </FormField>

            <FormField label="Data da Transação" erro={erros.data}>
              <input
                type="date" value={form.data}
                onChange={(e) => f('data', e.target.value)}
                style={erros.data ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE}
                onFocus={focusInput} onBlur={(e) => blurInput(e, erros.data)}
              />
            </FormField>
          </div>

          {/* Valor estimado */}
          {form.quantidade && form.preco && (
            <div style={{
              background: 'rgba(79,195,247,0.06)', border: '1px solid rgba(79,195,247,0.15)',
              borderRadius: '10px', padding: '12px 14px', marginBottom: '16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '12px', color: C.muted }}>Valor estimado</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: C.blue }}>
                {formatarMoeda(
                  form.tipo === 'compra'
                    ? parseFloat(form.quantidade || '0') * parseFloat(form.preco || '0') + parseFloat(form.comissao || '0')
                    : parseFloat(form.quantidade || '0') * parseFloat(form.preco || '0') - parseFloat(form.comissao || '0')
                )}
              </span>
            </div>
          )}

          <FormField label="Notas (opcional)">
            <input
              type="text" value={form.notas}
              onChange={(e) => f('notas', e.target.value)}
              placeholder="Ex: Split 2:1, dividendo reinvestido..."
              style={INPUT_STYLE}
              onFocus={focusInput} onBlur={blurInput}
            />
          </FormField>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="submit"
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
                color: '#fff', fontSize: '14px', fontWeight: 600, fontFamily: 'Syne, sans-serif',
              }}
            >
              {editando ? 'Guardar Alterações' : 'Registar Transação'}
            </button>
            <button
              type="button" onClick={fecharModal}
              style={{
                padding: '12px 20px', borderRadius: '10px', cursor: 'pointer',
                background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                color: C.muted, fontSize: '14px',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
