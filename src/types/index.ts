export type TipoAtivo = 'acao' | 'etf' | 'obrigacao' | 'crypto' | 'fundo' | 'deposito'
export type Moeda = 'EUR' | 'USD' | 'GBP'
export type Regiao = 'europa' | 'america_norte' | 'america_sul' | 'asia' | 'africa' | 'oceania' | 'global'

export interface Corretora {
  id: string
  nome: string
  cor: string
  criadaEm: string
}

export interface Posicao {
  id: string
  corretoraId: string
  ticker: string
  nome: string
  tipo: TipoAtivo
  quantidade: number
  precoMedioCusto: number
  precoAtual: number
  moeda: Moeda
  regiao: Regiao
  criadaEm: string
  atualizadaEm: string
}

export interface Transacao {
  id: string
  posicaoId: string
  corretoraId: string
  tipo: 'compra' | 'venda'
  quantidade: number
  preco: number
  comissao: number
  data: string
  notas?: string
  criadaEm: string
}

export const TIPOS_ATIVO: Record<TipoAtivo, { label: string; cor: string }> = {
  acao:      { label: 'Ação',      cor: '#3b82f6' },
  etf:       { label: 'ETF',       cor: '#8b5cf6' },
  obrigacao: { label: 'Obrigação', cor: '#f59e0b' },
  crypto:    { label: 'Crypto',    cor: '#f97316' },
  fundo:     { label: 'Fundo',     cor: '#10b981' },
  deposito:  { label: 'Depósito',  cor: '#6b7280' },
}

export const REGIOES: Record<Regiao, string> = {
  europa:        'Europa',
  america_norte: 'América do Norte',
  america_sul:   'América do Sul',
  asia:          'Ásia',
  africa:        'África',
  oceania:       'Oceânia',
  global:        'Global',
}

export const MOEDAS: Moeda[] = ['EUR', 'USD', 'GBP']

export const SIMBOLO_MOEDA: Record<Moeda, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}

export const CORES_CORRETORA = [
  '#4fc3f7', '#7c3aed', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#f97316',
]
