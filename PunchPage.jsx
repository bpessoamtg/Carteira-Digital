import { differenceInMinutes, parseISO, format } from 'date-fns'

// Horas de trabalho standard por dia (configurável aqui)
export const STANDARD_HOURS_PER_DAY = 8

/**
 * Agrupa picagens por dia (chave: 'yyyy-MM-dd')
 */
export function groupPunchesByDay(punches) {
  const days = {}
  for (const punch of punches) {
    const day = punch.timestamp.substring(0, 10)
    if (!days[day]) days[day] = []
    days[day].push(punch)
  }
  return days
}

/**
 * Calcula horas trabalhadas num dia.
 * Emparelha entradas com saídas: [entrada, saída, entrada, saída...]
 * Devolve horas em decimal (ex: 8.5 = 8h30m)
 */
export function calculateDayHours(dayPunches) {
  const sorted = [...dayPunches].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  )

  let totalMinutes = 0

  for (let i = 0; i < sorted.length - 1; i += 2) {
    const entry = sorted[i]
    const exit = sorted[i + 1]
    if (entry?.type === 'entrada' && exit?.type === 'saida') {
      totalMinutes += differenceInMinutes(
        parseISO(exit.timestamp),
        parseISO(entry.timestamp)
      )
    }
  }

  return totalMinutes / 60
}

/**
 * Formata horas decimais → "8h30m"
 */
export function formatHours(hours) {
  if (!hours || hours <= 0) return '0h00m'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h${m.toString().padStart(2, '0')}m`
}

/**
 * Calcula horas extra (acima do standard por dia)
 */
export function calculateDailyOvertime(hours) {
  return Math.max(0, hours - STANDARD_HOURS_PER_DAY)
}

/**
 * Calcula totais mensais para um colaborador
 */
export function calculateMonthSummary(punches) {
  const byDay = groupPunchesByDay(punches)
  let totalHours = 0
  let workDays = 0
  let totalOvertime = 0
  const dayDetails = []

  for (const [day, dp] of Object.entries(byDay)) {
    const sorted = [...dp].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const hours = calculateDayHours(dp)
    const overtime = calculateDailyOvertime(hours)

    totalHours += hours
    totalOvertime += overtime
    if (hours > 0) workDays++

    const firstEntry = sorted.find(p => p.type === 'entrada')
    const lastExit = [...sorted].reverse().find(p => p.type === 'saida')
    const hasMissingExit = sorted.length % 2 !== 0

    dayDetails.push({
      day,
      hours,
      overtime,
      firstEntry,
      lastExit,
      hasMissingExit,
      punches: dp
    })
  }

  return {
    totalHours,
    workDays,
    totalOvertime,
    dayDetails: dayDetails.sort((a, b) => b.day.localeCompare(a.day))
  }
}
