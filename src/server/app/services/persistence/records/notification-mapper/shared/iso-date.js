const YEAR_DIGITS = 4
const MONTH_DIGITS = 2
const DAY_DIGITS = 2

export const isoFromDateParts = (parts) => {
  const { day, month, year } = parts ?? {}
  if (day == null || month == null || year == null) {
    return undefined
  }
  return `${String(year).padStart(YEAR_DIGITS, '0')}-${String(month).padStart(MONTH_DIGITS, '0')}-${String(day).padStart(DAY_DIGITS, '0')}`
}
