import * as XLSX from 'xlsx'
import type { Ativo, Broker, Pessoa } from '../store/useStore'
import { TICKER_DEFAULTS } from '../store/useStore'

type Row = (string | number | null | undefined)[]
type Sheet = Row[]

function num(v: unknown): number {
  if (v == null || v === '' || v === '-') return 0
  if (typeof v === 'number') return isNaN(v) ? 0 : v
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function str(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function isDataRow(val: unknown): boolean {
  // Data rows have a numeric Excel date serial or an ISO-style date string at the date column
  return typeof val === 'number' || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))
}

function findLastDataRow(sheet: Sheet, dateCol = 0, startRow = 2): number {
  let last = -1
  for (let i = startRow; i < sheet.length; i++) {
    if (isDataRow(sheet[i]?.[dateCol])) last = i
  }
  return last
}

function parseLabel(raw: unknown): { nome: string; isin?: string } {
  const s = str(raw)
  if (!s || s.toLowerCase().includes('resumo')) return { nome: '' }
  const parts = s.split('|')
  const nome = parts[0].trim()
  const isin = parts[1]?.trim().match(/[A-Z]{2}[A-Z0-9]{10}/) ? parts[1].trim() : undefined
  return { nome, isin }
}

// Standard sheet: 2 header cols (Date, Deposits), then 8-col asset groups, then 7-col RESUMO
// Columns per asset: Preço/un, UN, Custo/mês, Comissão, Compra acum, VA final, Rentabilidade, Rent%
function parseStandardSheet(sheet: Sheet, brokerNome: string, tickerMap: Record<string, string>): Broker | null {
  const ASSET_COLS = 8
  const RESUMO_COLS = 7
  const START_COL = 2

  const labelRow = sheet[0] ?? []
  const lastRow  = sheet[findLastDataRow(sheet)]
  if (!lastRow) return null

  // Collect asset sections (cols where row[0] has a non-RESUMO label)
  const ativos: Ativo[] = []
  let resumoCol = -1

  for (let c = START_COL; c < labelRow.length; c += ASSET_COLS) {
    const label = str(labelRow[c])
    if (!label) continue
    if (label.toLowerCase().includes('resumo')) {
      resumoCol = c
      break
    }
    const { nome } = parseLabel(labelRow[c])
    if (!nome) continue

    const unidades    = num(lastRow[c + 1])
    const custoTotal  = num(lastRow[c + 4])
    const valorExcel  = num(lastRow[c + 5])
    const rent        = num(lastRow[c + 6])
    const rentPct     = num(lastRow[c + 7])
    const precoMedio  = unidades > 0 ? custoTotal / unidades : 0

    if (custoTotal === 0 && valorExcel === 0) continue

    const ticker = tickerMap[nome] ?? TICKER_DEFAULTS[nome]

    ativos.push({
      nome,
      ticker,
      unidades: unidades > 0 ? unidades : undefined,
      precoMedio: precoMedio > 0 ? precoMedio : undefined,
      custoTotal,
      valorExcel,
      rentabilidade: rent,
      rentabilidadePct: rentPct,
    })
  }

  // RESUMO
  let totalInvestido = 0
  let valorExcel     = 0
  let rentabilidade  = 0
  let caixa          = 0

  if (resumoCol >= 0 && lastRow[resumoCol] != null) {
    caixa          = num(lastRow[resumoCol])
    totalInvestido = num(lastRow[resumoCol + 3])
    valorExcel     = num(lastRow[resumoCol + 4])
    rentabilidade  = num(lastRow[resumoCol + 5])
  } else {
    // Fallback: sum assets
    totalInvestido = ativos.reduce((s, a) => s + a.custoTotal, 0)
    valorExcel     = ativos.reduce((s, a) => s + a.valorExcel, 0)
    rentabilidade  = ativos.reduce((s, a) => s + a.rentabilidade, 0)
  }

  return { nome: brokerNome, ativos, totalInvestido, valorExcel, rentabilidade, caixa }
}

// eToro: single asset, single data row
// Cols: Date, Depositos, Preço médio, Unidades, Custo, VA final, Rentabilidade, Rent%
function parseEtoroSheet(sheet: Sheet, tickerMap: Record<string, string>): Broker | null {
  // Find the label row: the row that has a non-numeric asset name (e.g. 'Palantir')
  const labelRow = sheet.find(r => r && typeof r[2] === 'string' && r[2] && !/^\d/.test(String(r[2]))) ?? []
  const dataRow  = sheet[findLastDataRow(sheet)]
  if (!dataRow) return null

  const nome = str(labelRow[2]) || 'Palantir'
  const ticker = tickerMap[nome] ?? TICKER_DEFAULTS[nome]

  const unidades    = num(dataRow[3])
  const custoTotal  = num(dataRow[4])
  const valorExcel  = num(dataRow[5])
  const rent        = num(dataRow[6])
  const rentPct     = num(dataRow[7])

  const ativo: Ativo = {
    nome,
    ticker,
    unidades: unidades > 0 ? unidades : undefined,
    precoMedio: num(dataRow[2]) > 0 ? num(dataRow[2]) : undefined,
    custoTotal,
    valorExcel,
    rentabilidade: rent,
    rentabilidadePct: rentPct,
  }

  return {
    nome:          'eToro',
    ativos:        [ativo],
    totalInvestido: custoTotal,
    valorExcel,
    rentabilidade: rent,
    caixa:         0,
  }
}

// PPR sheet: section widths vary (5 or 6 cols per asset)
// Detect widths dynamically from label positions in row 0
function parsePPRSheet(sheet: Sheet, brokerNome: string, tickerMap: Record<string, string>): Broker | null {
  const labelRow = sheet[0] ?? []
  const lastRowIdx = findLastDataRow(sheet)
  const lastRow = sheet[lastRowIdx]
  if (!lastRow) return null

  // Collect all labeled sections (non-None cells in row 0, col >= 1)
  const sections: Array<{ nome: string; col: number; isResumo: boolean }> = []
  for (let c = 1; c < labelRow.length; c++) {
    const label = str(labelRow[c])
    if (!label) continue
    sections.push({ nome: label, col: c, isResumo: label.toLowerCase().includes('resumo') })
  }

  const ativos: Ativo[] = []
  let resumoCol = -1

  for (let i = 0; i < sections.length; i++) {
    const { nome, col, isResumo } = sections[i]
    if (isResumo) { resumoCol = col; break }

    const nextCol = sections[i + 1]?.col ?? labelRow.length
    const width   = nextCol - col
    // 6-col: Compra(+0), Preço/un(+1), Compra acum(+2), VA final(+3), Rent(+4), Rent%(+5)
    // 5-col: Compra(+0), Compra acum(+1), VA final(+2), Rent(+3), Rent%(+4)
    const hasPreco    = width >= 6
    const custoTotal  = num(lastRow[col + (hasPreco ? 2 : 1)])
    const valorExcel  = num(lastRow[col + (hasPreco ? 3 : 2)])
    const rent        = num(lastRow[col + (hasPreco ? 4 : 3)])
    const rentPct     = num(lastRow[col + (hasPreco ? 5 : 4)])

    if (custoTotal === 0 && valorExcel === 0) continue

    const nomeLimpo = nome.split('|')[0].trim()
    ativos.push({
      nome:       nomeLimpo,
      ticker:     tickerMap[nomeLimpo] ?? undefined,
      custoTotal,
      valorExcel,
      rentabilidade:    rent,
      rentabilidadePct: rentPct,
    })
  }

  let totalInvestido = 0
  let valorExcel     = 0
  let rentabilidade  = 0

  if (resumoCol >= 0 && lastRow[resumoCol] != null) {
    totalInvestido = num(lastRow[resumoCol + 1])
    valorExcel     = num(lastRow[resumoCol + 2])
    rentabilidade  = num(lastRow[resumoCol + 3])
  } else {
    totalInvestido = ativos.reduce((s, a) => s + a.custoTotal, 0)
    valorExcel     = ativos.reduce((s, a) => s + a.valorExcel, 0)
    rentabilidade  = ativos.reduce((s, a) => s + a.rentabilidade, 0)
  }

  return { nome: brokerNome, ativos, totalInvestido, valorExcel, rentabilidade, caixa: 0 }
}

// Cripto sheet: custom columns
// Row 0 has totals: col1=total deposited, col2=BTC qty, col4=BTC cost, col6=ETH qty, col7=ETH cost
// Last data row: col5=VF_BTC, col8=VT_ETH, col11=VF_SOL, col13=VF_outros, col14=V_Total, col15=Lucro, col16=Rent%
function parseCriptoSheet(sheet: Sheet, tickerMap: Record<string, string>): Broker | null {
  const totalRow = sheet[0] ?? []
  const lastRow  = sheet[findLastDataRow(sheet, 0)]
  if (!lastRow) return null

  const totalDep   = num(totalRow[1])
  const btcQty     = num(totalRow[2])
  const btcCusto   = num(totalRow[4])
  const ethQty     = num(totalRow[6])
  const ethCusto   = num(totalRow[7])

  const vBTC    = num(lastRow[5])
  const vETH    = num(lastRow[8])
  const vSOL    = num(lastRow[11])
  const vOutros = num(lastRow[13])
  const vTotal  = num(lastRow[14])
  const lucro   = num(lastRow[15])
  const rentPct = num(lastRow[16])

  const ativos: Ativo[] = []

  if (btcCusto > 0 || vBTC > 0) {
    ativos.push({
      nome: 'BTC',
      ticker: tickerMap['BTC'] ?? TICKER_DEFAULTS['BTC'],
      unidades: btcQty > 0 ? btcQty : undefined,
      precoMedio: btcQty > 0 && btcCusto > 0 ? btcCusto / btcQty : undefined,
      custoTotal: btcCusto,
      valorExcel: vBTC,
      rentabilidade: vBTC - btcCusto,
      rentabilidadePct: btcCusto > 0 ? (vBTC - btcCusto) / btcCusto : 0,
    })
  }

  if (ethCusto > 0 || vETH > 0) {
    ativos.push({
      nome: 'ETH',
      ticker: tickerMap['ETH'] ?? TICKER_DEFAULTS['ETH'],
      unidades: ethQty > 0 ? ethQty : undefined,
      precoMedio: ethQty > 0 && ethCusto > 0 ? ethCusto / ethQty : undefined,
      custoTotal: ethCusto,
      valorExcel: vETH,
      rentabilidade: vETH - ethCusto,
      rentabilidadePct: ethCusto > 0 ? (vETH - ethCusto) / ethCusto : 0,
    })
  }

  if (vSOL > 0) {
    ativos.push({
      nome: 'SOL',
      ticker: tickerMap['SOL'] ?? TICKER_DEFAULTS['SOL'],
      custoTotal: 0,
      valorExcel: vSOL,
      rentabilidade: 0,
      rentabilidadePct: 0,
    })
  }

  if (vOutros > 0) {
    ativos.push({
      nome: 'Outros',
      custoTotal: 0,
      valorExcel: vOutros,
      rentabilidade: 0,
      rentabilidadePct: 0,
    })
  }

  return {
    nome:          'Cripto',
    ativos,
    totalInvestido: totalDep,
    valorExcel:    vTotal,
    rentabilidade: lucro,
    caixa:         0,
  }
}

export function parseExcel(buffer: ArrayBuffer, tickerMap: Record<string, string>): Pessoa[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })

  function getSheet(name: string): Sheet | null {
    const ws = wb.Sheets[name]
    if (!ws) return null
    return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: null }) as Sheet
  }

  // ---------- DIOGO ----------
  const diogoXTB = getSheet('Diogo_XTB')
  const diogoBrokers: Broker[] = []
  if (diogoXTB) {
    const b = parseStandardSheet(diogoXTB, 'XTB', tickerMap)
    if (b) diogoBrokers.push(b)
  }

  // ---------- BRUNO ----------
  const brunoBrokers: Broker[] = []
  ;[
    ['Etoro_BP',  null],
    ['Degiro_BP', 'DeGiro'],
    ['XTB_BP',    'XTB'],
    ['IBRK_BP',   'IBRK'],
    ['PPR_BP',    'PPR'],
    ['Cripto',    null],
  ].forEach(([name, label]) => {
    const sh = getSheet(name as string)
    if (!sh) return
    let b: Broker | null = null
    if (name === 'Etoro_BP')  b = parseEtoroSheet(sh, tickerMap)
    else if (name === 'PPR_BP') b = parsePPRSheet(sh, 'PPR', tickerMap)
    else if (name === 'Cripto') b = parseCriptoSheet(sh, tickerMap)
    else                        b = parseStandardSheet(sh, label as string, tickerMap)
    if (b) brunoBrokers.push(b)
  })

  // ---------- CATARINA ----------
  const catarinaBrokers: Broker[] = []
  ;[
    ['Degiro_CFM', 'DeGiro'],
    ['XTB_CFM',   'XTB'],
    ['PPR_CFM',   'PPR'],
  ].forEach(([name, label]) => {
    const sh = getSheet(name as string)
    if (!sh) return
    let b: Broker | null = null
    if (name === 'PPR_CFM') b = parsePPRSheet(sh, 'PPR', tickerMap)
    else                     b = parseStandardSheet(sh, label as string, tickerMap)
    if (b) catarinaBrokers.push(b)
  })

  return [
    { id: 'diogo',    nome: 'Diogo',    cor: '#4fc3f7', brokers: diogoBrokers },
    { id: 'bruno',    nome: 'Bruno',    cor: '#a78bfa', brokers: brunoBrokers },
    { id: 'catarina', nome: 'Catarina', cor: '#34d399', brokers: catarinaBrokers },
  ]
}
