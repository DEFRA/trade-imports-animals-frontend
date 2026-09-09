import {
  addUtcDays,
  addUtcMonths,
  formatDateText,
  startOfDayInZone
} from '../../../../../../../lib/validate/index.js'

export const DAYS_BEFORE = 7
export const MONTHS_AHEAD = 6
export const SERVICE_TIME_ZONE = 'Europe/London'

/**
 * The window an arrival date at the port of entry may fall in, inclusive at
 * both ends.
 *
 * `exampleText` is the worked example the hint shows the user so they can see
 * what a date should look like (design release 1). It is the service's civil
 * today rather than a fixed date: a hard-coded example reads as stale within
 * the year, and today is inside the window by construction, so the example is
 * always a date the user could actually enter.
 * @param {Date} [now]
 * @returns {{ min: Date, max: Date, minText: string, maxText: string, exampleText: string }}
 */
export const arrivalWindow = (now = new Date()) => {
  const today = startOfDayInZone(now, SERVICE_TIME_ZONE)
  const min = addUtcDays(today, -DAYS_BEFORE)
  const max = addUtcMonths(today, MONTHS_AHEAD)
  return {
    min,
    max,
    minText: formatDateText(min),
    maxText: formatDateText(max),
    exampleText: formatDateText(today)
  }
}
