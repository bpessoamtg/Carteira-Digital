import { useParams, useNavigate } from 'react-router-dom'
import { useStore, totalPessoa, valorAtualAtivo } from '../store/useStore'
import type { Ativo, Broker, Pessoa, Cotacao } from '../store/useStore'

const C = {
  card:   '#0d0d18',
  border: 'rgba(255,255,255,0.07)',
  text:   '#f0f0f8',
  muted:  '#8888aa',
  blue:   '#4fc3f7',
  green:  '#00e676',
  red:    '#ef4444',
}

function euro(v: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v)
}

function euroK(v: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function pct(v: number) {
  return (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%'
}

function AtivoRow({ ativo, cotacoes }: { ativo: Ativo; cotacoes: Record<string, Cotacao> }) {
  const valorVivo = valorAtualAtivo(ativo, cotacoes)
  const valorMostrar = valorVivo ?? ativo.valorExcel
  const rent = valorMostrar - ativo.custoTotal
  const rentPct = ativo.custoTotal > 0 ? rent / ativo.custoTotal : 0
  const temCot = valorVivo !== undefined

  const cot = ativo.ticker ? cotacoes[ativo.ticker] : undefined

  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <td style={{ padding: '10px 16px' }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: C.text }}>{ativo.nome}</div>
        {ativo.ticker && <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>{ativo.ticker}</div>}
      </td>
      <td style={{ padding: '10px 16px', color: C.muted, fontSize: '13px', whiteSpace: 'nowrap' }}>
        {ativo.unidades != null ? ativo.unidades.toFixed(4) : '–'}
      </td>
      <td style={{ padding: '10px 16px', color: C.muted, fontSize: '13px', whiteSpace: 'nowrap' }}>
        {ativo.precoMedio != null ? euro(ativo.precoMedio) : '–'}
      </td>
      <td style={{ padding: '10px 16px', color: temCot ? C.blue : C.muted, fontSize: '13px', whiteSpace: 'nowrap' }}>
        {cot ? euro(cot.preco) : '–'}
        {cot && (
          <span style={{ fontSize: '11px', marginLeft: '4px', color: cot.mudancaPct >= 0 ? C.green : C.red }}>
            {cot.mudancaPct >= 0 ? '+' : ''}{cot.mudancaPct.toFixed(2)}%
          </span>
        )}
      </td>
      <td style={{ padding: '10px 16px', color: C.muted, fontSize: '13px', whiteSpace: 'nowrap' }}>
        {euroK(ativo.custoTotal)}
      </td>
      <td style={{ padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>
        <span style={{ color: temCot ? C.blue : C.muted }}>{euroK(valorMostrar)}</span>
        {!temCot && <span style={{ fontSize: '10px', color: '#5566aa', marginLeft: '4px' }}>excel</span>}
      </td>
      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: '13px', color: rent >= 0 ? C.green : C.red }}>{euro(rent)}</div>
        <div style={{ fontSize: '11px', color: rent >= 0 ? C.green : C.red }}>{pct(rentPct)}</div>
      </td>
    </tr>
  )
}

function BrokerSection({ broker, pessoa, cotacoes }: { broker: Broker; pessoa: Pessoa; cotacoes: Record<string, Cotacao> }) {
  const valorAtual = broker.ativos.reduce((s, a) => s + (valorAtualAtivo(a, cotacoes) ?? a.valorExcel), 0)
  const rent = valorAtual - broker.totalInvestido
  const rentPct = broker.totalInvestido > 0 ? rent / broker.totalInvestido : 0

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '14px' }}>
      {/* Broker header */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pessoa.cor }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: C.text }}>{broker.nome}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: C.muted }}>Investido</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: 'Syne, sans-serif' }}>{euroK(broker.totalInvestido)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: C.muted }}>Valor</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: pessoa.cor, fontFamily: 'Syne, sans-serif' }}>{euroK(valorAtual)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: C.muted }}>P&L</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: rent >= 0 ? C.green : C.red, fontFamily: 'Syne, sans-serif' }}>
              {euro(rent)} <span style={{ fontSize: '12px' }}>({pct(rentPct)})</span>
            </div>
          </div>
          {broker.caixa > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: C.muted }}>Caixa</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.muted, fontFamily: 'Syne, sans-serif' }}>{euroK(broker.caixa)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Asset table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Ativo', 'Unidades', 'Preço Médio', 'Preço Atual', 'Custo', 'Valor', 'P&L'].map(h => (
                <th key={h} style={{ padding: '9px 16px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {broker.ativos.map((a, i) => (
              <AtivoRow key={i} ativo={a} cotacoes={cotacoes} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PessoaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pessoas, cotacoes } = useStore()

  const pessoa = pessoas.find(p => p.id === id)

  if (!pessoa) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: C.muted }}>
        <div style={{ marginBottom: '12px', fontSize: '18px', fontFamily: 'Syne, sans-serif', color: C.text }}>Pessoa não encontrada</div>
        <button onClick={() => navigate('/')} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: '8px', color: C.muted, cursor: 'pointer' }}>← Voltar</button>
      </div>
    )
  }

  const tot = totalPessoa(pessoa)
  const valorAtual = Object.keys(cotacoes).length > 0
    ? pessoa.brokers.reduce((s, b) => s + b.ativos.reduce((s2, a) => s2 + (valorAtualAtivo(a, cotacoes) ?? a.valorExcel), 0), 0)
    : tot.excel
  const rent = valorAtual - tot.investido
  const rentPct = tot.investido > 0 ? rent / tot.investido : 0

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px', padding: 0, marginBottom: '12px', fontFamily: 'Inter, sans-serif' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          Voltar
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: pessoa.cor + '22', border: `1px solid ${pessoa.cor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: pessoa.cor }}>
            {pessoa.nome[0]}
          </div>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', color: C.text, margin: 0 }}>{pessoa.nome}</h1>
            <div style={{ fontSize: '12px', color: C.muted }}>{pessoa.brokers.length} broker{pessoa.brokers.length !== 1 ? 's' : ''}</div>
          </div>

          {/* Summary chips */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: C.muted }}>Investido</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: C.text }}>{euroK(tot.investido)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: C.muted }}>Valor Atual</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: pessoa.cor }}>{euroK(valorAtual)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: C.muted }}>P&L</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: rent >= 0 ? C.green : C.red }}>
                {euroK(rent)}
              </div>
              <div style={{ fontSize: '12px', color: rent >= 0 ? C.green : C.red }}>{pct(rentPct)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Brokers */}
      {pessoa.brokers.map((b, i) => (
        <BrokerSection key={i} broker={b} pessoa={pessoa} cotacoes={cotacoes} />
      ))}
    </div>
  )
}
