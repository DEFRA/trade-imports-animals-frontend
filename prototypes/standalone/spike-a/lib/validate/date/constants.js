/**
 * Shared bounds + key helpers for the date-of-birth schema family. Declared once
 * so the required and optional factories agree on ranges and part-key naming.
 */

export const MAX_AGE = 120
export const MIN_DRIVING_AGE = 17

export const DAY_MIN = 1
export const DAY_MAX = 31
export const MONTH_MIN = 1
export const MONTH_MAX = 12
export const YEAR_MIN = 1000
export const YEAR_MAX = 9999

export const dateKeys = (prefix) => ({
  dayKey: `${prefix}-day`,
  monthKey: `${prefix}-month`,
  yearKey: `${prefix}-year`
})
