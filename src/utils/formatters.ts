export function formatarMoeda(valor: number, moeda: string = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: moeda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

export function formatarNumero(valor: number, casas = 2): string {
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor)
}

export function formatarPercentagem(valor: number, comSinal = true): string {
  const sinal = comSinal && valor > 0 ? '+' : ''
  return `${sinal}${formatarNumero(valor)}%`
}

export function formatarData(data: string): string {
  return new Date(data).toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatarCompacto(valor: number): string {
  if (Math.abs(valor) >= 1_000_000) {
    return `${formatarNumero(valor / 1_000_000)}M`
  }
  if (Math.abs(valor) >= 1_000) {
    return `${formatarNumero(valor / 1_000)}k`
  }
  return formatarNumero(valor)
}
