import { format, isDate, isValid, parseISO } from 'date-fns'

export function formatDate(value, formattedDateStr = 'EEE do MMMM yyyy') {
  if (!value || (typeof value !== 'string' && !isDate(value))) {
    return ''
  }

  const date = isDate(value) ? value : parseISO(value)

  if (!isValid(date)) {
    return ''
  }

  return format(date, formattedDateStr)
}
