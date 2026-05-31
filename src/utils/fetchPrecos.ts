export interface Cotacao {
  precoAtual:      number
  mudancaHoje:     number    // variação absoluta hoje
  mudancaHojePct:  number    // variação % hoje (ex: 1.23 = 1,23%)
  moeda:           string
  nome:            string
}

async function tentarFetch(url: string): Promise<Response | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (r.ok) return r
  } catch { /* ignore */ }
  return null
}

async function fetchUmTicker(ticker: string): Promise<Cotacao | null> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`

  // Try direct first, then via CORS proxy
  let resp = await tentarFetch(url)
  if (!resp) {
    resp = await tentarFetch(`https://corsproxy.io/?${encodeURIComponent(url)}`)
  }
  if (!resp) return null

  let data: unknown
  try { data = await resp.json() } catch { return null }

  const meta = (data as Record<string, unknown>)
    ?.chart
    ? ((data as { chart: { result?: { meta?: Record<string, unknown> }[] } }).chart?.result?.[0]?.meta)
    : null

  if (!meta || !meta.regularMarketPrice) return null

  return {
    precoAtual:     meta.regularMarketPrice     as number,
    mudancaHoje:    (meta.regularMarketChange   as number) ?? 0,
    mudancaHojePct: (meta.regularMarketChangePercent as number) ?? 0,
    moeda:          (meta.currency              as string) ?? 'EUR',
    nome:           ((meta.longName ?? meta.shortName) as string) ?? ticker,
  }
}

export async function fetchCotacoes(tickers: string[]): Promise<Record<string, Cotacao>> {
  if (tickers.length === 0) return {}

  const pares = await Promise.all(
    tickers.map(async (ticker) => [ticker, await fetchUmTicker(ticker)] as const)
  )

  const resultado: Record<string, Cotacao> = {}
  for (const [ticker, cot] of pares) {
    if (cot) resultado[ticker] = cot
  }
  return resultado
}
