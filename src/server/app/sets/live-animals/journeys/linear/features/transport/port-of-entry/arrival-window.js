import {
  addUtcDays,
  addUtcMonths,
  formatDateText,
  startOfDayInZone
} from '../../../../../../../lib/validate/calendar.js'

export const DAYS_BEFORE = 7
export const MONTHS_AHEAD = 6
export const SERVICE_TIME_ZONE = 'Europe/London'

/**
 * The window an arrival date at the port of entry may fall in, inclusive at
 * both ends.
 * @param {Date} [now]
 * @returns {{ min: Date, max: Date, minText: string, maxText: string }}
 */
export const arrivalWindow = (now = new Date()) => {
  const today = startOfDayInZone(now, SERVICE_TIME_ZONE)
  const min = addUtcDays(today, -DAYS_BEFORE)
  const max = addUtcMonths(today, MONTHS_AHEAD)
  return {
    min,
    max,
    minText: formatDateText(min),
    maxText: formatDateText(max)
  }
}
