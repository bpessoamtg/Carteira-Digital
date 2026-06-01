import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, totalPessoa, valorAtualAtivo } from '../store/useStore'
import { fetchCotacoes } from '../utils/fetchPrecos'
import type { Cotacao } from '../store/useStore'

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

function pct(v: number) {
  return (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%'
}

function formatDate(iso?: string) {
  if (!iso) return '–'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function calcValorAtual(pessoas: ReturnType<typeof useStore.getState>['pessoas'], cotacoes: Record<string, Cotacao>) {
  let total = 0
  for (const p of pessoas) {
    for (const b of p.brokers) {
      for (const a of b.ativos) {
        const vivo = valorAtualAtivo(a, cotacoes)
        total += vivo ?? a.valorExcel
      }
    }
  }
  return total
}

export function Consolidado() {
  const navigate = useNavigate()
  const { pessoas, cotacoes, ultimaImportacao, ultimaAtualizacao, setCotacoes } = useStore()
  const [atualizando, setAtualizando] = useState(false)
  const [erroFetch, setErroFetch]     = useState('')

  const temDados = pessoas.length > 0

  async function atualizar() {
    if (!temDados) return
    setAtualizando(true)
    setErroFetch('')
    const tickers = [...new Set(
      pessoas.flatMap(p => p.brokers.flatMap(b => b.ativos.map(a => a.ticker).filter(Boolean) as string[]))
    )]
    try {
      const raw = await fetchCotacoes(tickers)
      const cots: Record<string, Cotacao> = {}
      for (const [t, c] of Object.entries(raw)) {
        cots[t] = { preco: c.precoAtual, moeda: c.moeda, mudancaPct: c.mudancaHojePct, nome: c.nome }
      }
      setCotacoes(cots, new Date().toISOString())
    } catch {
      setErroFetch('Não foi possível obter cotações. Tenta novamente.')
    }
    setAtualizando(false)
  }

  const temCotacoes = Object.keys(cotacoes).length > 0

  // Global totals
  const totalInvestido = pessoas.reduce((s, p) => {
    const t = totalPessoa(p)
    return s + t.investido
  }, 0)

  const totalAtual = temCotacoes
    ? calcValorAtual(pessoas, cotacoes)
    : pessoas.reduce((s, p) => s + totalPessoa(p).excel, 0)

  const totalRent = totalAtual - totalInvestido

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: C.text, margin: 0 }}>
            Visão Geral
          </h1>
          {ultimaImportacao && (
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
              Excel: {formatDate(ultimaImportacao)}
              {ultimaAtualizacao && <> · Cotações: {formatDate(ultimaAtualizacao)}</>}
            </div>
          )}
        </div>
        <button
          onClick={atualizar}
          disabled={atualizando || !temDados}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', background: atualizando ? 'rgba(79,195,247,0.15)' : 'rgba(79,195,247,0.1)',
            border: '1px solid rgba(79,195,247,0.3)', borderRadius: '10px',
            color: C.blue, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
            cursor: atualizando || !temDados ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ animation: atualizando ? 'spin 0.8s linear infinite' : 'none' }}>
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
          </svg>
          {atualizando ? 'A atualizar...' : 'Atualizar Cotações'}
        </button>
      </div>

      {erroFetch && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: C.red, fontSize: '13px' }}>
          {erroFetch}
        </div>
      )}

      {!temDados ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: '16px' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: C.text, marginBottom: '8px' }}>
            Sem dados
          </div>
          <div style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>
            Importa o ficheiro Excel para começar
          </div>
          <button
            onClick={() => navigate('/importar')}
            style={{ padding: '11px 22px', background: 'linear-gradient(135deg, #4fc3f7, #0288d1)', border: 'none', borderRadius: '10px', color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
          >
            Importar Excel
          </button>
        </div>
      ) : (
        <>
          {/* Global summary card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(79,195,247,0.06), rgba(2,136,209,0.06))',
            border: '1px solid rgba(79,195,247,0.15)', borderRadius: '16px',
            padding: '24px', marginBottom: '24px',
          }}>
            <div style={{ fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 600 }}>
              TOTAL CONSOLIDADO
            </div>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', color: C.muted, marginBottom: '4px' }}>Investido</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: C.text }}>{euro(totalInvestido)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.muted, marginBottom: '4px' }}>
                  Valor Atual {!temCotacoes && <span style={{ color: '#5566aa', fontSize: '11px' }}>(Excel)</span>}
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: C.blue }}>{euro(totalAtual)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.muted, marginBottom: '4px' }}>Rentabilidade</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: totalRent >= 0 ? C.green : C.red }}>
                  {euro(totalRent)}
                </div>
                <div style={{ fontSize: '13px', color: totalRent >= 0 ? C.green : C.red }}>
                  {pct(totalInvestido > 0 ? totalRent / totalInvestido : 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Person cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {pessoas.map(p => {
              const t = totalPessoa(p)
              // Live value if cotacoes available
              let valorAtual = t.excel
              let rentAtual  = t.rent
              if (temCotacoes) {
                valorAtual = p.brokers.reduce((s, b) =>
                  s + b.ativos.reduce((s2, a) => s2 + (valorAtualAtivo(a, cotacoes) ?? a.valorExcel), 0), 0)
                rentAtual = valorAtual - t.investido
              }
              const rentPct = t.investido > 0 ? rentAtual / t.investido : 0

              return (
                <div
                  key={p.id}
                  onClick={() => navigate('/' + p.id)}
                  style={{
                    background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px',
                    padding: '20px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = p.cor + '44' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: p.cor + '22', border: `1px solid ${p.cor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '14px', color: p.cor }}>
                      {p.nome[0]}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: C.text }}>{p.nome}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>{p.brokers.length} broker{p.brokers.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: C.muted, marginBottom: '3px' }}>Investido</div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: C.text }}>{euro(t.investido)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: C.muted, marginBottom: '3px' }}>Valor</div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: p.cor }}>{euro(valorAtual)}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: rentAtual >= 0 ? C.green : C.red }}>
                          {euro(rentAtual)}
                        </div>
                        <div style={{ fontSize: '12px', color: rentAtual >= 0 ? C.green : C.red }}>
                          {pct(rentPct)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Broker breakdown summary */}
          <div style={{ marginTop: '24px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: C.text }}>Resumo por Broker</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Pessoa', 'Broker', 'Investido', 'Valor (Excel)', 'P&L', '%'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pessoas.flatMap(p =>
                    p.brokers.map((b, bi) => {
                      const rentPct = b.totalInvestido > 0 ? b.rentabilidade / b.totalInvestido : 0
                      return (
                        <tr key={p.id + b.nome + bi} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                          {bi === 0
                            ? <td style={{ padding: '10px 16px', color: p.cor, fontWeight: 600 }}>{p.nome}</td>
                            : <td style={{ padding: '10px 16px' }} />}
                          <td style={{ padding: '10px 16px', color: C.text }}>{b.nome}</td>
                          <td style={{ padding: '10px 16px', color: C.muted, whiteSpace: 'nowrap' }}>{euro(b.totalInvestido)}</td>
                          <td style={{ padding: '10px 16px', color: C.blue, whiteSpace: 'nowrap' }}>{euro(b.valorExcel)}</td>
                          <td style={{ padding: '10px 16px', color: b.rentabilidade >= 0 ? C.green : C.red, whiteSpace: 'nowrap' }}>{euro(b.rentabilidade)}</td>
                          <td style={{ padding: '10px 16px', color: rentPct >= 0 ? C.green : C.red, whiteSpace: 'nowrap' }}>{pct(rentPct)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
