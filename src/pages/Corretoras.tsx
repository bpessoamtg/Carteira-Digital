import { useState } from 'react'
import { useStore } from '../store/useStore'
import { CORES_CORRETORA, type Corretora } from '../types'
import { Modal } from '../components/Modal'
import { FormField, INPUT_STYLE, focusInput, blurInput } from '../components/FormField'
import { valorCarteira, plCarteira, plCarteiraPercentagem } from '../utils/calculations'
import { formatarMoeda, formatarPercentagem } from '../utils/formatters'

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

interface FormData { nome: string; cor: string }
const FORM_INICIAL: FormData = { nome: '', cor: CORES_CORRETORA[0] }

export function Corretoras() {
  const { corretoras, posicoes, adicionarCorretora, editarCorretora, removerCorretora } = useStore()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Corretora | null>(null)
  const [form, setForm] = useState<FormData>(FORM_INICIAL)
  const [erros, setErros] = useState<Partial<FormData>>({})

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_INICIAL)
    setErros({})
    setModalAberto(true)
  }

  function abrirEditar(c: Corretora) {
    setEditando(c)
    setForm({ nome: c.nome, cor: c.cor })
    setErros({})
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
  }

  function validar(): boolean {
    const e: Partial<FormData> = {}
    if (!form.nome.trim()) e.nome = 'Nome obrigatório'
    if (form.nome.trim().length > 50) e.nome = 'Máximo 50 caracteres'
    setErros(e)
    return Object.keys(e).length === 0
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    if (editando) {
      editarCorretora(editando.id, { nome: form.nome.trim(), cor: form.cor })
    } else {
      adicionarCorretora({ nome: form.nome.trim(), cor: form.cor })
    }
    fecharModal()
  }

  function confirmarRemover(c: Corretora) {
    const nPosicoes = posicoes.filter((p) => p.corretoraId === c.id).length
    const msg = nPosicoes > 0
      ? `Remover "${c.nome}"? Isso irá apagar também ${nPosicoes} posição(ões) e as suas transações.`
      : `Remover "${c.nome}"?`
    if (window.confirm(msg)) removerCorretora(c.id)
  }

  return (
    <div style={{ color: C.text, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, color: C.text, marginBottom: '4px' }}>
            Corretoras
          </h1>
          <p style={{ color: C.muted, fontSize: '13px' }}>
            {corretoras.length} {corretoras.length === 1 ? 'corretora registada' : 'corretoras registadas'}
          </p>
        </div>
        <button
          onClick={abrirNovo}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
            color: '#fff', fontSize: '13px', fontWeight: 600,
            fontFamily: 'Syne, sans-serif',
            boxShadow: '0 4px 16px rgba(79,195,247,0.2)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova Corretora
        </button>
      </div>

      {/* Empty */}
      {corretoras.length === 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px',
          padding: '64px 32px', textAlign: 'center',
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 20px',
            background: 'rgba(79,195,247,0.08)', border: '1px solid rgba(79,195,247,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          </div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Nenhuma corretora ainda
          </h3>
          <p style={{ color: C.muted, fontSize: '13px', marginBottom: '24px' }}>
            Adiciona as tuas corretoras para começar a gerir a tua carteira.
          </p>
          <button onClick={abrirNovo} style={{
            padding: '10px 22px', borderRadius: '10px', cursor: 'pointer',
            background: 'rgba(79,195,247,0.1)', color: C.blue, fontSize: '13px', fontWeight: 600,
            border: '1px solid rgba(79,195,247,0.2)',
          }}>
            Adicionar primeira corretora
          </button>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {corretoras.map((c) => {
          const posicoesCorretora = posicoes.filter((p) => p.corretoraId === c.id)
          const valor = valorCarteira(posicoesCorretora)
          const pl = plCarteira(posicoesCorretora)
          const plPct = plCarteiraPercentagem(posicoesCorretora)
          const plPositive = pl >= 0

          return (
            <div key={c.id} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px',
              padding: '22px',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
            >
              {/* Top */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: `${c.cor}18`,
                    border: `1px solid ${c.cor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: c.cor }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: C.text }}>
                      {c.nome}
                    </div>
                    <div style={{ color: C.muted, fontSize: '12px', marginTop: '2px' }}>
                      {posicoesCorretora.length} {posicoesCorretora.length === 1 ? 'posição' : 'posições'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => abrirEditar(c)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: '6px', borderRadius: '6px', transition: 'all 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.dim; e.currentTarget.style.background = 'none' }}
                    title="Editar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => confirmarRemover(c)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: '6px', borderRadius: '6px', transition: 'all 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = C.red; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.dim; e.currentTarget.style.background = 'none' }}
                    title="Remover"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ color: C.dim, fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Valor
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: C.text }}>
                    {formatarMoeda(valor)}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ color: C.dim, fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    P&L
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: plPositive ? C.green : C.red }}>
                    {formatarPercentagem(plPct)}
                  </div>
                  <div style={{ fontSize: '11px', color: plPositive ? C.green : C.red, marginTop: '2px', opacity: 0.8 }}>
                    {plPositive ? '+' : ''}{formatarMoeda(pl)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      <Modal
        titulo={editando ? 'Editar Corretora' : 'Nova Corretora'}
        aberto={modalAberto}
        onFechar={fecharModal}
        largura="420px"
      >
        <form onSubmit={submeter}>
          <FormField label="Nome da Corretora" erro={erros.nome}>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: DeGiro, XTB, Interactive Brokers..."
              autoFocus
              style={{ ...(erros.nome ? { ...INPUT_STYLE, borderColor: 'rgba(239,68,68,0.5)' } : INPUT_STYLE) }}
              onFocus={focusInput}
              onBlur={(e) => blurInput(e, erros.nome)}
            />
          </FormField>

          <FormField label="Cor de Identificação">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {CORES_CORRETORA.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, cor }))}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: cor, border: 'none', cursor: 'pointer',
                    outline: form.cor === cor ? `2px solid ${cor}` : 'none',
                    outlineOffset: '3px',
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
              ))}
            </div>
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
              {editando ? 'Guardar' : 'Adicionar'}
            </button>
            <button
              type="button"
              onClick={fecharModal}
              style={{
                padding: '12px 20px', borderRadius: '10px', cursor: 'pointer',
                background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                color: C.muted, fontSize: '14px', fontFamily: 'Inter, sans-serif',
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
