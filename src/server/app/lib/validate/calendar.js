const MONTHS_IN_YEAR = 12
const MS_PER_DAY = 86400000
const DATE_TEXT = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

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
export const addUtcDays = (date, days) =>
  new Date(startOfUtcDay(date).getTime() + days * MS_PER_DAY)

/**
 * Clamps to the last day of the target month, so 31 August plus six months is
 * 28 February, not the 3 March that plain month rollover would produce.
 * @param {Date} date
 * @param {number} months - May be negative.
 * @returns {Date} Midnight UTC in the target month.
 */
export const addUtcMonths = (date, months) => {
  const start = startOfUtcDay(date)
  const year = start.getUTCFullYear()
  const targetMonth = start.getUTCMonth() + months
  const lastDayOfTargetMonth = new Date(
    Date.UTC(year, targetMonth + 1, 0)
  ).getUTCDate()
  return new Date(
    Date.UTC(
      year,
      targetMonth,
      Math.min(start.getUTCDate(), lastDayOfTargetMonth)
    )
  )
}

/**
 * @param {string} raw - A `d/m/yyyy` or `dd/mm/yyyy` value.
 * @returns {Date|null} Midnight UTC, or null when the value is not a real date.
 */
export const parseDateText = (raw) => {
  const match = DATE_TEXT.exec(String(raw ?? '').trim())
  if (!match) {
    return null
  }
  const [day, month, year] = match.slice(1).map(Number)
  return isRealDate(year, month, day)
    ? new Date(Date.UTC(year, month - 1, day))
    : null
}

/**
 * The shape the MoJ date picker itself writes back when `leadingZeros` is unset.
 * @param {Date} date
 * @returns {string} `d/m/yyyy`, no leading zeros.
 */
export const formatDateText = (date) =>
  `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`
