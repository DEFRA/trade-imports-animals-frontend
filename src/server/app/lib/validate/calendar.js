import { addDays, addMonths, format, isValid, parse } from 'date-fns'

// Every Date here is midnight UTC, whatever the process timezone: the app runs
// UTC, vitest forces TZ=UTC, but the Playwright drivers run on the developer's
// clock, and a helper that quietly meant something different there would be
// worse than useless. date-fns `addDays`/`addMonths` preserve wall-clock time,
// so they hold that invariant and bring month-end clamping with them.
// `startOfDay` and `format` do NOT — both normalise to local — so day starts
// and formatting are done through the UTC accessors instead. The one exception
// is `formatInServiceZone`, which uses `format` deliberately and says why.
const DATE_TEXT_FORMAT = 'd/M/yyyy'
const DATE_TEXT_SHAPE = /^\d{1,2}\/\d{1,2}\/\d{4}$/
const MONTHS_IN_YEAR = 12
const YEAR_DIGITS = 4
const MONTH_DIGITS = 2
const DAY_DIGITS = 2

/**
 * The zone this service reasons in, and renders *moments* in. A code constant,
 * not config: the displayed date must be a property of the code, not of
 * whichever `TZ` the container happens to carry — that differs between
 * production (`Europe/London`), CI (`TZ=UTC`) and a laptop, and can be dropped.
 *
 * Calendar dates do not go through this — see {@link formatCalendarDate}.
 */
export const SERVICE_TIME_ZONE = 'Europe/London'

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
 * @param {string} raw - A `d/m/yyyy` or `dd/mm/yyyy` value, four-digit year.
 * @returns {Date|null} Midnight UTC, or null when the value is not a real date.
 */
export const parseDateText = (raw) => {
  const text = String(raw ?? '').trim()
  // date-fns reads `yyyy` as one to four digits, so without this guard
  // `27/3/26` parses as a year in the 1900s and slips under a `max` bound.
  if (!DATE_TEXT_SHAPE.test(text)) {
    return null
  }
  const parsed = parse(text, DATE_TEXT_FORMAT, new Date())
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

/**
 * The single place a user-entered calendar date becomes the instant the API
 * takes. The parts are *labelled* as UTC midnight, never converted from a local
 * zone: a calendar day has no time and no zone, so there is nothing to convert
 * from, and inventing one shifts the day. London midnight for a 21 July arrival
 * is `2026-07-20T23:00:00.000Z` during BST, which every UTC reader — PIMS
 * included — reads as 20 July.
 *
 * Build it from UTC parts. The natural thing to write is the broken thing:
 * `new Date(year, month - 1, day).toISOString()` reads the container's zone, so
 * it is correct on a UTC laptop and in this suite (`TZ=UTC`) and wrong only in
 * the `Europe/London` container — that is, only in production. Same hazard
 * `parseDateText` documents above.
 * @param {{day?: number|string, month?: number|string, year?: number|string}} [parts]
 * @returns {string|undefined} `YYYY-MM-DDT00:00:00.000Z`, or undefined when the
 * date is incomplete.
 */
export const instantFromDateParts = (parts) => {
  const { day, month, year } = parts ?? {}
  if (day == null || month == null || year == null) {
    return undefined
  }
  const yyyy = String(year).padStart(YEAR_DIGITS, '0')
  const mm = String(month).padStart(MONTH_DIGITS, '0')
  const dd = String(day).padStart(DAY_DIGITS, '0')
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`
}

const DISPLAY_DATE_FORMAT = 'd MMM yyyy'

/**
 * Formats the calendar day a `Date` names in UTC, with no zone conversion.
 *
 * `format` on its own reads the ambient zone, so the day is taken from the UTC
 * accessors and the components are handed back as plain local ones purely to
 * get date-fns' month names. `Intl.DateTimeFormat` would be shorter but ICU's
 * `en-GB` short month for September is `Sept`, four letters, which would
 * reword every September date in the service.
 * @param {Date} date
 * @returns {string} e.g. `5 Mar 2026`.
 */
const formatUtcComponents = (date) =>
  format(
    new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    DISPLAY_DATE_FORMAT
  )

/**
 * Renders a **calendar date** — a day the user chose, carried on the wire as
 * midnight UTC by {@link instantFromDateParts}.
 *
 * Read straight off the UTC components, because the value already *is* the
 * day: there is nothing to convert, and converting would only be safe while
 * the target zone is at or east of UTC. Rendering it in {@link
 * SERVICE_TIME_ZONE} happens to give the same answer today — the UK is never
 * behind UTC, so BST moves midnight to 01:00 on the same day — but that is an
 * accident of geography, not a property of the value. Depending on it would
 * mean every calendar date in the service silently shifting a day back if the
 * service zone ever moved west.
 * @param {Date} date
 * @returns {string} e.g. `21 Jul 2026` for `2026-07-21T00:00:00.000Z`.
 */
export const formatCalendarDate = (date) => formatUtcComponents(date)

/**
 * Renders a **moment** — something that happened at an instant, such as when a
 * notification was created or submitted — as the day it happened in
 * {@link SERVICE_TIME_ZONE}.
 *
 * Here the conversion is the point, and it does real work: a notification
 * submitted at `2026-09-10T23:35:39.455Z` happened on 11 September in the UK,
 * and showing the user 10 September would be wrong.
 * @param {Date} date
 * @returns {string} e.g. `11 Sep 2026` for `2026-09-10T23:35:39.455Z`.
 */
export const formatMoment = (date) =>
  formatUtcComponents(startOfDayInZone(date, SERVICE_TIME_ZONE))
