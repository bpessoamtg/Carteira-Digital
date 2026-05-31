export interface Cotacao {
  precoAtual:      number
  mudancaHoje:     number    // variação absoluta hoje
  mudancaHojePct:  number    // variação % hoje
  moeda:           string
  nome:            string
}

async function tentarFetch(url: string): Promise<Response | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (r.ok) return r
  } catch { /* ignore */ }
  return null
}

export async function fetchCotacoes(tickers: string[]): Promise<Record<string, Cotacao>> {
  if (tickers.length === 0) return {}

  const simbolos = tickers.join(',')
  const yahoUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(simbolos)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,currency,longName,shortName`

  // Try direct first, then CORS proxy fallback
  let resp = await tentarFetch(yahoUrl)
  if (!resp) {
    resp = await tentarFetch(`https://corsproxy.io/?${encodeURIComponent(yahoUrl)}`)
  }
  if (!resp) return {}

  let data: unknown
  try { data = await resp.json() } catch { return {} }

  const quotes: unknown[] = (data as Record<string, unknown>)?.quoteResponse
    ? ((data as Record<string, { result?: unknown[] }>).quoteResponse?.result ?? [])
    : []

  const resultado: Record<string, Cotacao> = {}

  for (const q of quotes) {
    const quote = q as Record<string, unknown>
    const ticker = quote.symbol as string
    if (!ticker) continue
    resultado[ticker] = {
      precoAtual:     (quote.regularMarketPrice     as number) ?? 0,
      mudancaHoje:    (quote.regularMarketChange    as number) ?? 0,
      mudancaHojePct: (quote.regularMarketChangePercent as number) ?? 0,
      moeda:          (quote.currency               as string) ?? 'EUR',
      nome:           ((quote.longName ?? quote.shortName) as string) ?? ticker,
    }
  }

  return resultado
}
