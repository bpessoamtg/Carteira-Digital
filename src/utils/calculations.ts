import type { Posicao } from '../types'

export function valorPosicao(p: Posicao): number {
  return p.quantidade * p.precoAtual
}

export function custoPosicao(p: Posicao): number {
  return p.quantidade * p.precoMedioCusto
}

export function plPosicao(p: Posicao): number {
  return valorPosicao(p) - custoPosicao(p)
}

export function plPercentagem(p: Posicao): number {
  const custo = custoPosicao(p)
  if (custo === 0) return 0
  return (plPosicao(p) / custo) * 100
}

export function valorCarteira(posicoes: Posicao[]): number {
  return posicoes.reduce((acc, p) => acc + valorPosicao(p), 0)
}

export function custoCarteira(posicoes: Posicao[]): number {
  return posicoes.reduce((acc, p) => acc + custoPosicao(p), 0)
}

export function plCarteira(posicoes: Posicao[]): number {
  return valorCarteira(posicoes) - custoCarteira(posicoes)
}

export function plCarteiraPercentagem(posicoes: Posicao[]): number {
  const custo = custoCarteira(posicoes)
  if (custo === 0) return 0
  return (plCarteira(posicoes) / custo) * 100
}

export function allocacaoPorCorretora(posicoes: Posicao[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const p of posicoes) {
    result[p.corretoraId] = (result[p.corretoraId] ?? 0) + valorPosicao(p)
  }
  return result
}

export function allocacaoPorTipo(posicoes: Posicao[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const p of posicoes) {
    result[p.tipo] = (result[p.tipo] ?? 0) + valorPosicao(p)
  }
  return result
}

export function allocacaoPorRegiao(posicoes: Posicao[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const p of posicoes) {
    result[p.regiao] = (result[p.regiao] ?? 0) + valorPosicao(p)
  }
  return result
}

export function plPorCorretora(posicoes: Posicao[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const p of posicoes) {
    result[p.corretoraId] = (result[p.corretoraId] ?? 0) + plPosicao(p)
  }
  return result
}
