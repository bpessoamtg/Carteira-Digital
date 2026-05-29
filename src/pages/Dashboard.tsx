import { useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { useStore } from '../store/useStore'
import { TIPOS_ATIVO, REGIOES } from '../types'
import {
  valorCarteira, custoCarteira, plCarteira, plCarteiraPercentagem,
  plPosicao, plPercentagem, valorPosicao,
  allocacaoPorCorretora, allocacaoPorTipo, allocacaoPorRegiao, plPorCorretora,
} from '../utils/calculations'
import { formatarMoeda, formatarPercentagem, formatarNumero } from '../utils/formatters'

const C = {
  bg: '#0a0a0f',
  card: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.07)',
  text: '#f0f0f8',
  muted: '#8888aa',
  dim: '#555566',
  green: '#00e676',
  red: '#ef4444',
  blue: '#4fc3f7',
}

function StatCard({
  label, value, sub, cor, seta,
}: { label: string; value: string; sub?: string; cor?: string; seta?: 'up' | 'down' }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px',
      padding: '20px 22px',
    }}>
      <div style={{ color: C.muted, fontSize: '12px', fontWeight: 500, marginBottom: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: 700,
        color: cor ?? C.text, lineHeight: 1,
      }}>
        {seta && (
          <span style={{ marginRight: '6px', fontSize: '18px' }}>
            {seta === 'up' ? '↑' : '↓'}
          </span>
        )}
        {value}
      </div>
      {sub && (
        <div style={{ color: C.muted, fontSize: '12px', marginTop: '6px' }}>{sub}</div>
      )}
    </div>
  )
}

const TOOLTIP_STYLE: CSSProperties = {
  background: '#13131f',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: C.text,
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{payload[0].name}</div>
        <div style={{ color: C.blue }}>{formatarMoeda(payload[0].value)}</div>
      </div>
    </div>
  )
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>
        <div style={{ color: v >= 0 ? C.green : C.red }}>{formatarMoeda(v)}</div>
      </div>
    </div>
  )
}

function EmptyDash() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '20px',
        background: 'rgba(79,195,247,0.08)', border: '1px solid rgba(79,195,247,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: C.text, marginBottom: '10px' }}>
        Bem-vindo à Carteira Digital
      </h2>
      <p style={{ color: C.muted, fontSize: '14px', maxWidth: '380px', lineHeight: 1.6, marginBottom: '28px' }}>
        Começa por adicionar as tuas corretoras e posições para acompanhar a tua carteira de investimentos.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/corretoras" style={{
          padding: '12px 24px', borderRadius: '12px', textDecoration: 'none',
          background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
          color: '#fff', fontSize: '14px', fontWeight: 600, fontFamily: 'Syne, sans-serif',
          boxShadow: '0 4px 16px rgba(79,195,247,0.2)',
        }}>
          Adicionar corretora
        </Link>
        <Link to="/posicoes" style={{
          padding: '12px 24px', borderRadius: '12px', textDecoration: 'none',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          color: C.text, fontSize: '14px', fontWeight: 600, fontFamily: 'Syne, sans-serif',
        }}>
          Adicionar posição
        </Link>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { corretoras, posicoes } = useStore()

  const totalValor   = useMemo(() => valorCarteira(posicoes), [posicoes])
  const totalCusto   = useMemo(() => custoCarteira(posicoes), [posicoes])
  const totalPL      = useMemo(() => plCarteira(posicoes),    [posicoes])
  const totalPLPct   = useMemo(() => plCarteiraPercentagem(posicoes), [posicoes])

  const porCorretora = useMemo(() => allocacaoPorCorretora(posicoes), [posicoes])
  const porTipo      = useMemo(() => allocacaoPorTipo(posicoes),      [posicoes])
  const porRegiao    = useMemo(() => allocacaoPorRegiao(posicoes),    [posicoes])
  const plCorretora  = useMemo(() => plPorCorretora(posicoes),        [posicoes])

  const topPosicoes = useMemo(() =>
    [...posicoes].sort((a, b) => valorPosicao(b) - valorPosicao(a)).slice(0, 8),
  [posicoes])

  const topGanhadores = useMemo(() =>
    [...posicoes]
      .filter((p) => plPercentagem(p) > 0)
      .sort((a, b) => plPercentagem(b) - plPercentagem(a))
      .slice(0, 3),
  [posicoes])

  const topPerdedores = useMemo(() => {
    const ganhadoresIds = new Set(topGanhadores.map((p) => p.id))
    return [...posicoes]
      .filter((p) => plPercentagem(p) < 0 && !ganhadoresIds.has(p.id))
      .sort((a, b) => plPercentagem(a) - plPercentagem(b))
      .slice(0, 3)
  }, [posicoes, topGanhadores])

  // Chart data
  const dadosCorretora = corretoras
    .filter((c) => porCorretora[c.id])
    .map((c) => ({ name: c.nome, value: porCorretora[c.id], fill: c.cor }))

  const dadosTipo = Object.entries(porTipo).map(([tipo, value]) => ({
    name: TIPOS_ATIVO[tipo as keyof typeof TIPOS_ATIVO]?.label ?? tipo,
    value,
    fill: TIPOS_ATIVO[tipo as keyof typeof TIPOS_ATIVO]?.cor ?? '#888',
  }))

  const dadosRegiao = Object.entries(porRegiao)
    .sort(([, a], [, b]) => b - a)
    .map(([regiao, value]) => ({
      name: REGIOES[regiao as keyof typeof REGIOES] ?? regiao,
      value,
    }))

  const dadosPLCorretora = corretoras
    .filter((c) => plCorretora[c.id] !== undefined)
    .map((c) => ({ name: c.nome, pl: plCorretora[c.id], fill: c.cor }))

  const plIsPositive = totalPL >= 0

  if (posicoes.length === 0) return <EmptyDash />

  return (
    <div style={{ color: C.text, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, color: C.text, marginBottom: '4px' }}>
          Dashboard
        </h1>
        <p style={{ color: C.muted, fontSize: '13px' }}>
          {posicoes.length} posições em {corretoras.length} {corretoras.length === 1 ? 'corretora' : 'corretoras'}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard
          label="Valor Total"
          value={formatarMoeda(totalValor)}
          sub={`Custo: ${formatarMoeda(totalCusto)}`}
        />
        <StatCard
          label="P&L Total (€)"
          value={formatarMoeda(totalPL)}
          cor={plIsPositive ? C.green : C.red}
          seta={plIsPositive ? 'up' : 'down'}
        />
        <StatCard
          label="P&L Total (%)"
          value={formatarPercentagem(totalPLPct)}
          cor={plIsPositive ? C.green : C.red}
          sub={`Sobre custo de ${formatarMoeda(totalCusto)}`}
        />
        <StatCard
          label="Posições"
          value={String(posicoes.length)}
          sub={`${corretoras.length} ${corretoras.length === 1 ? 'corretora' : 'corretoras'}`}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>

        {/* Alocação por corretora */}
        {dadosCorretora.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>
              Alocação por Corretora
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={dadosCorretora} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {dadosCorretora.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, minWidth: 0 }}>
                {dadosCorretora.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.fill, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.name}
                      </div>
                      <div style={{ fontSize: '11px', color: C.muted }}>
                        {formatarPercentagem((d.value / totalValor) * 100, false)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alocação por tipo */}
        {dadosTipo.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>
              Alocação por Tipo de Ativo
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={dadosTipo} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {dadosTipo.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, minWidth: 0 }}>
                {dadosTipo.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.fill, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.name}
                      </div>
                      <div style={{ fontSize: '11px', color: C.muted }}>
                        {formatarPercentagem((d.value / totalValor) * 100, false)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* P&L por corretora (bar chart) */}
        {dadosPLCorretora.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>
              P&L por Corretora
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dadosPLCorretora} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="pl" radius={[4, 4, 0, 0]}>
                  {dadosPLCorretora.map((entry, i) => (
                    <Cell key={i} fill={entry.pl >= 0 ? C.green : C.red} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top positions table + gainers/losers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', marginBottom: '24px', alignItems: 'start' }}>
        {/* Top positions */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}` }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700, color: C.text }}>
              Principais Posições
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '460px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  {['Ativo', 'Corretora', 'Valor', 'P&L', 'P&L %'].map((h) => (
                    <th key={h} style={{
                      textAlign: h === 'Ativo' || h === 'Corretora' ? 'left' : 'right',
                      padding: '10px 16px',
                      color: C.dim, fontSize: '11px', fontWeight: 600,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPosicoes.map((p, i) => {
                  const corretora = corretoras.find((c) => c.id === p.corretoraId)
                  const pl = plPosicao(p)
                  const pct = plPercentagem(p)
                  const plPositive = pl >= 0
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: i < topPosicoes.length - 1 ? `1px solid rgba(255,255,255,0.03)` : 'none' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '2px', flexShrink: 0,
                            background: TIPOS_ATIVO[p.tipo]?.cor ?? '#888',
                          }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: C.text }}>{p.ticker}</div>
                            <div style={{ fontSize: '11px', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{p.nome}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {corretora && (
                          <span style={{
                            fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: 500,
                            background: `${corretora.cor}18`, color: corretora.cor,
                            border: `1px solid ${corretora.cor}33`,
                          }}>
                            {corretora.nome}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: C.text }}>
                        {formatarMoeda(valorPosicao(p), p.moeda)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: plPositive ? C.green : C.red }}>
                        {formatarMoeda(pl, p.moeda)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: plPositive ? C.green : C.red }}>
                        {formatarPercentagem(pct)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {topPosicoes.length < posicoes.length && (
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
              <Link to="/posicoes" style={{ color: C.blue, fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                Ver todas as {posicoes.length} posições →
              </Link>
            </div>
          )}
        </div>

        {/* Gainers / Losers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '220px' }}>
          {topGanhadores.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px 18px' }}>
              <h4 style={{ fontFamily: 'Syne, sans-serif', fontSize: '12px', fontWeight: 700, color: C.green, marginBottom: '12px', letterSpacing: '0.06em' }}>
                ↑ TOP GANHOS
              </h4>
              {topGanhadores.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: C.text }}>{p.ticker}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.green }}>{formatarPercentagem(plPercentagem(p))}</div>
                </div>
              ))}
            </div>
          )}
          {topPerdedores.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px 18px' }}>
              <h4 style={{ fontFamily: 'Syne, sans-serif', fontSize: '12px', fontWeight: 700, color: C.red, marginBottom: '12px', letterSpacing: '0.06em' }}>
                ↓ TOP PERDAS
              </h4>
              {topPerdedores.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: C.text }}>{p.ticker}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.red }}>{formatarPercentagem(plPercentagem(p))}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Distribuição por região */}
      {dadosRegiao.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>
            Distribuição Geográfica
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dadosRegiao.map(({ name, value }) => {
              const pct = (value / totalValor) * 100
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', color: C.text }}>{name}</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ fontSize: '13px', color: C.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatarMoeda(value)}
                      </span>
                      <span style={{ fontSize: '13px', color: C.blue, fontWeight: 600, minWidth: '42px', textAlign: 'right' }}>
                        {formatarNumero(pct)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: C.blue, borderRadius: '2px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
