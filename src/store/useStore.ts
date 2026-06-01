import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Ativo {
  nome: string
  ticker?: string
  unidades?: number
  precoMedio?: number
  custoTotal: number
  valorExcel: number
  rentabilidade: number
  rentabilidadePct: number
}

export interface Broker {
  nome: string
  ativos: Ativo[]
  totalInvestido: number
  valorExcel: number
  rentabilidade: number
  caixa: number
}

export interface Pessoa {
  id: string
  nome: string
  cor: string
  brokers: Broker[]
}

export interface Cotacao {
  preco: number
  moeda: string
  mudancaPct: number
  nome?: string
}

interface Store {
  pessoas: Pessoa[]
  cotacoes: Record<string, Cotacao>
  ultimaImportacao?: string
  ultimaAtualizacao?: string
  tickerMap: Record<string, string>

  setDados: (pessoas: Pessoa[], data: string) => void
  setCotacoes: (cotacoes: Record<string, Cotacao>, data: string) => void
  setTickerMap: (map: Record<string, string>) => void
}

export const TICKER_DEFAULTS: Record<string, string> = {
  SXR8:     'SXR8.DE',
  VUAA:     'VUAA.DE',
  IWDA:     'IWDA.L',
  EMIM:     'EMIM.L',
  EUNA:     'EUNA.L',
  VWCE:     'VWCE.DE',
  NASDAQ:   'EQQQ.DE',
  MSCI:     'EUNL.DE',
  GOLD:     'IGLN.L',
  SXRM:     'SXRM.DE',
  DTLA:     'DTLA.L',
  Palantir: 'PLTR',
  BTC:      'BTC-EUR',
  ETH:      'ETH-EUR',
  SOL:      'SOL-EUR',
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      pessoas: [],
      cotacoes: {},
      ultimaImportacao: undefined,
      ultimaAtualizacao: undefined,
      tickerMap: { ...TICKER_DEFAULTS },

      setDados: (pessoas, data) =>
        set({ pessoas, ultimaImportacao: data }),

      setCotacoes: (cotacoes, data) =>
        set({ cotacoes, ultimaAtualizacao: data }),

      setTickerMap: (map) =>
        set({ tickerMap: map }),
    }),
    { name: 'investimentos-v1' }
  )
)

export function totalPessoa(p: Pessoa) {
  const investido = p.brokers.reduce((s, b) => s + b.totalInvestido, 0)
  const excel     = p.brokers.reduce((s, b) => s + b.valorExcel, 0)
  const rent      = p.brokers.reduce((s, b) => s + b.rentabilidade, 0)
  return { investido, excel, rent, pct: investido > 0 ? rent / investido : 0 }
}

export function valorAtualAtivo(
  ativo: Ativo,
  cotacoes: Record<string, Cotacao>
): number | undefined {
  if (!ativo.ticker || !ativo.unidades) return undefined
  const cot = cotacoes[ativo.ticker]
  if (!cot) return undefined
  return ativo.unidades * cot.preco
}
