/**
 * Pure calendar helpers for the date-parts validator. No Joi, no I/O — just
 * arithmetic over the three integers a govuk date input yields, so they unit
 * test on their own.
 */

/** Is (year, month, day) a real calendar date? month is 1-based (1 = January). */
export const isRealDate = (year, month, day) => {
  if (![year, month, day].every(Number.isInteger)) return false
  if (month < 1 || month > 12) return false
  if (day < 1) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}
