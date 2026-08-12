import { addDays, addMonths, isValid, parse } from 'date-fns'

// Every Date here is midnight UTC, whatever the process timezone: the app runs
// UTC, vitest forces TZ=UTC, but the Playwright drivers run on the developer's
// clock, and a helper that quietly meant something different there would be
// worse than useless. date-fns `addDays`/`addMonths` preserve wall-clock time,
// so they hold that invariant and bring month-end clamping with them.
// `startOfDay` and `format` do NOT — both normalise to local — so day starts
// and formatting are done through the UTC accessors instead.
const DATE_TEXT_FORMAT = 'd/M/yyyy'
const MONTHS_IN_YEAR = 12

/**
 * @param {number} year
 * @param {number} month - 1-based (1 = January).
 * @param {number} day
 */
export const isRealDate = (year, month, day) => {
  if (![year, month, day].every(Number.isInteger)) {
    return false
  }
  if (month < 1 || month > MONTHS_IN_YEAR) {
    return false
  }
  if (day < 1) {
    return false
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * @param {Date} date
 * @returns {Date} Midnight UTC on the same calendar day.
 */
export const startOfUtcDay = (date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )

/**
 * @param {Date} date
 * @param {string} timeZone - An IANA zone name.
 * @returns {Date} Midnight UTC standing for the calendar day the instant falls
 * on in `timeZone`.
 */
export const startOfDayInZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const partValue = (type) =>
    Number(parts.find((part) => part.type === type).value)
  return new Date(
    Date.UTC(partValue('year'), partValue('month') - 1, partValue('day'))
  )
}

/**
 * @param {Date} date
 * @param {number} days - May be negative.
 * @returns {Date} Midnight UTC, `days` whole days away.
 */
export const addUtcDays = (date, days) => addDays(startOfUtcDay(date), days)

/**
 * `addMonths` clamps to the last day of the target month, so 31 August plus six
 * months is 28 February rather than the 3 March plain rollover would give.
 * @param {Date} date
 * @param {number} months - May be negative.
 * @returns {Date} Midnight UTC in the target month.
 */
export const addUtcMonths = (date, months) =>
  addMonths(startOfUtcDay(date), months)

/**
 * @param {string} raw - A `d/m/yyyy` or `dd/mm/yyyy` value.
 * @returns {Date|null} Midnight UTC, or null when the value is not a real date.
 */
export const parseDateText = (raw) => {
  const parsed = parse(String(raw ?? '').trim(), DATE_TEXT_FORMAT, new Date())
  // `parse` returns a local-time Date; the calendar day it names is what
  // matters, so it is re-anchored at midnight UTC.
  return isValid(parsed)
    ? new Date(
        Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
      )
    : null
}

/**
 * The shape the MoJ date picker itself writes back when `leadingZeros` is unset.
 * @param {Date} date
 * @returns {string} `d/m/yyyy`, no leading zeros.
 */
export const formatDateText = (date) =>
  `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`
