import { useState, useRef, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { CORES_CORRETORA } from '../types'
import type { TipoAtivo, Regiao } from '../types'
import { formatarMoeda, formatarNumero } from '../utils/formatters'

const C = {
  card:   'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.07)',
  text:   '#f0f0f8',
  muted:  '#8888aa',
  dim:    '#555566',
  green:  '#00e676',
  red:    '#ef4444',
  blue:   '#4fc3f7',
  yellow: '#f59e0b',
}

// ── CSV parsing ────────────────────────────────────────────────────────────────

function parseCsvLinha(linha: string, delim: string): string[] {
  const campos: string[] = []
  let atual = ''
  let aspas = false
  for (const c of linha) {
    if (c === '"') { aspas = !aspas }
    else if (c === delim && !aspas) { campos.push(atual.trim()); atual = '' }
    else { atual += c }
  }
  campos.push(atual.trim())
  return campos
}

interface LinhaImportada {
  ticker:     string
  data:       string  // YYYY-MM-DD
  quantidade: number
  preco:      number
  comissao:   number
}

function parseXTB(texto: string): LinhaImportada[] {
  const linhas = texto.replace(/\r/g, '').split('\n').filter(Boolean)
  if (linhas.length < 2) return []

  // Detect delimiter
  const delim = linhas.slice(0, 5).some((l) => l.split(';').length > 3) ? ';' : ','

  // Find header row (contains "Type" or "type")
  let headerIdx = linhas.findIndex((l) =>
    l.toLowerCase().split(delim).some((c) => c.replace(/"/g, '').trim() === 'type')
  )
  if (headerIdx === -1) headerIdx = 0

  const headers = parseCsvLinha(linhas[headerIdx], delim).map((h) =>
    h.replace(/"/g, '').toLowerCase().trim()
  )

  const col = (nome: string) =>
    headers.findIndex((h) => h === nome || h.startsWith(nome))

  const iType    = col('type')
  const iTime    = col('time') !== -1 ? col('time') : col('date')
  const iComment = col('comment') !== -1 ? col('comment') : col('description')
  const iSymbol  = col('symbol')
  const iAmount  = col('amount')

  const resultado: LinhaImportada[] = []

  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const campos = parseCsvLinha(linhas[i], delim).map((c) => c.replace(/"/g, '').trim())
    if (campos.length < 4) continue

    const tipo = iType !== -1 ? campos[iType] : ''
    if (tipo !== 'Stock purchase') continue

    const simbolo  = iSymbol  !== -1 ? campos[iSymbol]  : ''
    const comentario = iComment !== -1 ? campos[iComment] : ''
    const dataStr  = iTime    !== -1 ? campos[iTime]    : ''
    const valorStr = iAmount  !== -1 ? campos[iAmount].replace(',', '.') : '0'
    const valor    = Math.abs(parseFloat(valorStr) || 0)

    // "OPEN BUY 0.8214 @ 547.92"
    const m = comentario.match(/OPEN BUY\s+([\d.]+)\s*@\s*([\d.]+)/i)
    if (!m) continue

    const quantidade = parseFloat(m[1])
    const preco      = parseFloat(m[2])
    const comissao   = Math.max(0, Math.round((valor - quantidade * preco) * 100) / 100)

    // "DD-MM-YYYY HH:mm:ss" → "YYYY-MM-DD"
    const dp = dataStr.match(/(\d{2})[/-](\d{2})[/-](\d{4})/)
    const data = dp ? `${dp[3]}-${dp[2]}-${dp[1]}` : dataStr.substring(0, 10)

    resultado.push({ ticker: simbolo || '?', data, quantidade, preco, comissao })
  }

  return resultado
}

// ── Aggregate by ticker ────────────────────────────────────────────────────────

interface GrupoTicker {
  ticker:      string
  linhas:      LinhaImportada[]
  qtdTotal:    number
  precoMedio:  number
  custoTotal:  number
  tipo:        TipoAtivo
  regiao:      Regiao
}

function agrupar(linhas: LinhaImportada[]): GrupoTicker[] {
  const mapa: Record<string, LinhaImportada[]> = {}
  for (const l of linhas) {
    if (!mapa[l.ticker]) mapa[l.ticker] = []
    mapa[l.ticker].push(l)
  }
  return Object.entries(mapa).map(([ticker, ls]) => {
    const qtdTotal   = ls.reduce((a, l) => a + l.quantidade, 0)
    const custoTotal = ls.reduce((a, l) => a + l.quantidade * l.preco + l.comissao, 0)
    const precoMedio = qtdTotal > 0 ? (custoTotal - ls.reduce((a, l) => a + l.comissao, 0)) / qtdTotal : 0
    return { ticker, linhas: ls, qtdTotal, precoMedio, custoTotal, tipo: 'etf' as TipoAtivo, regiao: 'global' as Regiao }
  })
}

// ── Component ──────────────────────────────────────────────────────────────────

const TIPOS: { value: TipoAtivo; label: string }[] = [
  { value: 'acao',      label: 'Ação' },
  { value: 'etf',       label: 'ETF' },
  { value: 'obrigacao', label: 'Obrigação' },
  { value: 'crypto',    label: 'Crypto' },
  { value: 'fundo',     label: 'Fundo' },
  { value: 'deposito',  label: 'Depósito' },
]

const REGIOES: { value: Regiao; label: string }[] = [
  { value: 'global',        label: 'Global' },
  { value: 'europa',        label: 'Europa' },
  { value: 'america_norte', label: 'América do Norte' },
  { value: 'america_sul',   label: 'América do Sul' },
  { value: 'asia',          label: 'Ásia' },
  { value: 'africa',        label: 'África' },
  { value: 'oceania',       label: 'Oceânia' },
]

const SEL: React.CSSProperties = {
  background: '#13131f',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: C.text,
  padding: '5px 8px',
  fontSize: '12px',
  outline: 'none',
  cursor: 'pointer',
}

export function Importar() {
  const { corretoras, posicoes, importarEmMassa } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [grupos,        setGrupos]        = useState<GrupoTicker[]>([])
  const [corretoraId,   setCorretoraId]   = useState('')
  const [erro,          setErro]          = useState('')
  const [importado,     setImportado]     = useState(false)
  const [arrastar,      setArrastar]      = useState(false)

  const corretoraSelec = corretoras.find((c) => c.id === corretoraId)

  // Tickers already in the store for this broker
  const tickersExistentes = useMemo(
    () => new Set(posicoes.filter((p) => p.corretoraId === corretoraId).map((p) => p.ticker)),
    [posicoes, corretoraId]
  )

  const gruposNovos    = grupos.filter((g) => !tickersExistentes.has(g.ticker))
  const gruposDuplicados = grupos.filter((g) => tickersExistentes.has(g.ticker))
  const totalTransacoes  = grupos.reduce((a, g) => a + g.linhas.length, 0)

  function lerFicheiro(file: File) {
    setErro('')
    setImportado(false)
    setGrupos([])
    const reader = new FileReader()
    reader.onload = (e) => {
      const texto = e.target?.result as string
      const linhas = parseXTB(texto)
      if (linhas.length === 0) {
        setErro('Nenhuma compra encontrada. Certifica-te de que o ficheiro é um CSV de histórico do XTB (com coluna "Type" = "Stock purchase").')
        return
      }
      setGrupos(agrupar(linhas))
    }
    reader.readAsText(file, 'utf-8')
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) lerFicheiro(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setArrastar(false)
    const f = e.dataTransfer.files[0]
    if (f) lerFicheiro(f)
  }

  function atualizarTipo(ticker: string, tipo: TipoAtivo) {
    setGrupos((gs) => gs.map((g) => g.ticker === ticker ? { ...g, tipo } : g))
  }

  function atualizarRegiao(ticker: string, regiao: Regiao) {
    setGrupos((gs) => gs.map((g) => g.ticker === ticker ? { ...g, regiao } : g))
  }

  function confirmarImportacao() {
    if (!corretoraId) { setErro('Selecciona a corretora primeiro.'); return }

    // Only import new tickers (skip existing ones)
    const paraimportar = gruposNovos

    // Build ID map for new positions
    const mapaTickerParaId: Record<string, string> = {}
    for (const g of paraimportar) {
      mapaTickerParaId[g.ticker] = Math.random().toString(36).substring(2) + Date.now().toString(36)
    }

    const novasPosicoes = paraimportar.map((g) => ({
      corretoraId,
      ticker:          g.ticker,
      nome:            g.ticker,
      tipo:            g.tipo,
      regiao:          g.regiao,
      moeda:           'EUR' as const,
      quantidade:      Math.round(g.qtdTotal * 1e8) / 1e8,
      precoMedioCusto: Math.round(g.precoMedio * 100) / 100,
      precoAtual:      Math.round(g.precoMedio * 100) / 100,
    }))

    // All transactions for new tickers
    const novasTransacoes = paraimportar.flatMap((g) =>
      g.linhas.map((l) => ({
        posicaoId:   mapaTickerParaId[g.ticker],
        corretoraId,
        tipo:        'compra' as const,
        quantidade:  l.quantidade,
        preco:       l.preco,
        comissao:    l.comissao,
        data:        l.data,
      }))
    )

    importarEmMassa(novasPosicoes, novasTransacoes, mapaTickerParaId)
    setImportado(true)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (corretoras.length === 0) {
    return (
      <div style={{ color: C.text }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Importar CSV</h1>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: C.muted }}>Adiciona pelo menos uma corretora antes de importar.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ color: C.text, fontFamily: 'Inter, sans-serif', maxWidth: '860px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, color: C.text, marginBottom: '4px' }}>
          Importar CSV
        </h1>
        <p style={{ color: C.muted, fontSize: '13px' }}>
          Importa o histórico de transações do XTB (ou outro broker com formato compatível).
        </p>
      </div>

      {/* Step 1 — Broker */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px 22px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
          1 — Selecciona a corretora
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {corretoras.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCorretoraId(c.id); setErro('') }}
              style={{
                padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                border: `1px solid ${corretoraId === c.id ? c.cor : 'rgba(255,255,255,0.08)'}`,
                background: corretoraId === c.id ? `${c.cor}18` : 'transparent',
                color: corretoraId === c.id ? c.cor : C.muted,
                transition: 'all 0.15s',
              }}
            >
              {c.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — File */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px 22px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
          2 — Carrega o ficheiro CSV
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setArrastar(true) }}
          onDragLeave={() => setArrastar(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${arrastar ? C.blue : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: arrastar ? 'rgba(79,195,247,0.04)' : 'transparent',
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
          <p style={{ color: C.text, fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            Arrasta o CSV aqui ou clica para seleccionar
          </p>
          <p style={{ color: C.muted, fontSize: '12px' }}>
            No XTB: <strong style={{ color: C.text }}>Histórico → Exportar → CSV</strong> · No Excel: <strong style={{ color: C.text }}>Guardar como → CSV UTF-8</strong>
          </p>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={onFileChange} style={{ display: 'none' }} />
        </div>

        {erro && (
          <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: C.red, fontSize: '13px' }}>
            {erro}
          </div>
        )}
      </div>

      {/* Step 3 — Preview */}
      {grupos.length > 0 && !importado && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px 22px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                3 — Confirma e importa
              </div>
              <p style={{ color: C.muted, fontSize: '12px' }}>
                {grupos.length} ativo(s) · {totalTransacoes} transação(ões)
                {gruposDuplicados.length > 0 && (
                  <span style={{ color: C.yellow, marginLeft: '8px' }}>
                    · {gruposDuplicados.length} já existente(s) — serão ignorado(s)
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={confirmarImportacao}
              disabled={!corretoraId || gruposNovos.length === 0}
              style={{
                padding: '10px 22px', borderRadius: '10px', border: 'none', cursor: !corretoraId || gruposNovos.length === 0 ? 'not-allowed' : 'pointer',
                background: !corretoraId || gruposNovos.length === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #4fc3f7, #0288d1)',
                color: !corretoraId || gruposNovos.length === 0 ? C.dim : '#fff',
                fontSize: '13px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
              }}
            >
              Importar {gruposNovos.length > 0 ? `${gruposNovos.length} ativo(s)` : ''}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 110px 90px 100px 90px 90px', gap: '0 12px', padding: '8px 12px', borderRadius: '8px' }}>
              {['Ticker', 'Tipo', 'Região', 'Compras', 'Qtd Total', 'Preço Médio', 'Custo Total'].map((h) => (
                <div key={h} style={{ fontSize: '10px', fontWeight: 700, color: C.dim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>

            {grupos.map((g) => {
              const isDup = tickersExistentes.has(g.ticker)
              return (
                <div
                  key={g.ticker}
                  style={{
                    display: 'grid', gridTemplateColumns: '130px 1fr 110px 90px 100px 90px 90px',
                    gap: '0 12px', padding: '10px 12px', borderRadius: '10px',
                    background: isDup ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isDup ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)'}`,
                    alignItems: 'center', opacity: isDup ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isDup && <span style={{ fontSize: '10px', color: C.yellow }} title="Já existe">⚠</span>}
                    <span style={{ fontWeight: 700, fontSize: '13px', color: isDup ? C.yellow : C.text, fontFamily: 'JetBrains Mono, monospace' }}>{g.ticker}</span>
                  </div>
                  <select value={g.tipo} onChange={(e) => atualizarTipo(g.ticker, e.target.value as TipoAtivo)} style={SEL} disabled={isDup}>
                    {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select value={g.regiao} onChange={(e) => atualizarRegiao(g.ticker, e.target.value as Regiao)} style={SEL} disabled={isDup}>
                    {REGIOES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <div style={{ fontSize: '13px', color: C.muted, textAlign: 'right' }}>{g.linhas.length}×</div>
                  <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: C.text, textAlign: 'right' }}>
                    {formatarNumero(g.qtdTotal, 4)}
                  </div>
                  <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: C.text, textAlign: 'right' }}>
                    {formatarMoeda(g.precoMedio)}
                  </div>
                  <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: C.red, textAlign: 'right' }}>
                    {formatarMoeda(g.custoTotal)}
                  </div>
                </div>
              )
            })}
          </div>

          {gruposNovos.length === 0 && (
            <p style={{ color: C.yellow, fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
              Todos os ativos já existem para esta corretora. Nada a importar.
            </p>
          )}
        </div>
      )}

      {/* Success */}
      {importado && (
        <div style={{ background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: C.green, marginBottom: '8px' }}>
            Importação concluída!
          </h3>
          <p style={{ color: C.muted, fontSize: '13px', marginBottom: '20px' }}>
            {gruposNovos.length} posição(ões) e {gruposNovos.reduce((a, g) => a + g.linhas.length, 0)} transação(ões) adicionadas.
            <br />Actualiza o <strong style={{ color: C.text }}>Preço Atual</strong> de cada posição para ver o P&L correcto.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setGrupos([]); setImportado(false); setErro('') }}
              style={{ padding: '10px 22px', borderRadius: '10px', border: '1px solid rgba(0,230,118,0.3)', background: 'rgba(0,230,118,0.1)', color: C.green, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              Importar outro ficheiro
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {grupos.length === 0 && !importado && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px 22px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Como exportar do XTB
          </div>
          {[
            ['1', 'No XTB, vai a', 'Histórico de Cash'],
            ['2', 'Clica em', 'Exportar → Formato CSV'],
            ['3', 'Se abrires no Excel, guarda como', 'CSV UTF-8 (delimitado por vírgulas)'],
            ['4', 'Carrega o ficheiro aqui e confirma a importação', ''],
          ].map(([n, texto, strong]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, color: C.blue }}>{n}</div>
              <p style={{ color: C.muted, fontSize: '13px', lineHeight: 1.5 }}>
                {texto}{' '}
                {strong && <strong style={{ color: C.text }}>{strong}</strong>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
