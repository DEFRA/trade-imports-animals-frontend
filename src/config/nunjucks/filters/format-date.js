import { format, isDate, isValid, parseISO } from 'date-fns'

function toDate(value) {
  if (isDate(value)) return value
  if (typeof value === 'string') return parseISO(value)
  return null
}

export function formatDate(value, formattedDateStr = 'EEE do MMMM yyyy') {
  const date = toDate(value)
  return isValid(date) ? format(date, formattedDateStr) : ''
}
