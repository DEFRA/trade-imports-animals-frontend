/**
 * Per-type, per-constraint format validators — only-when-filled (spike-a
 * parity: a blank optional field never format-fails). Checkers return
 * locale-agnostic finding records `{ code, values?, focusSuffix? }`, never
 * copy. The `format.<obligationName>.<detail>` code tables below are kept
 * in lockstep with model/messages.en.json by test (via formatCodesFor).
 */

/**
 * Save-time blankness — unlike the engine's hasValue, an empty array is
 * BLANK here even though an answered-empty selection satisfies the engine.
 */
export function isBlank(value) {
  if (value === undefined || value === null) {
    return true
  }
  if (typeof value === 'string') {
    return value.trim() === ''
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  return typeof value === 'object' && Object.values(value).every(isBlank)
}

/**
 * THE date-parts decode (one place only): `{prefix}-day/-month/-year` keys
 * -> `{ day, month, year }`, or undefined when no part key was posted.
 */
export function decodeDateParts(prefix, payload = {}) {
  const parts = ['day', 'month', 'year'].map((part) => [
    part,
    payload[`${prefix}-${part}`]
  ])
  return parts.every(([, value]) => value === undefined)
    ? undefined
    : Object.fromEntries(parts)
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Names whose every failure collapses onto one catalogue code. */
const SINGLE_CODE = {
  ncdYears: 'format.ncdYears.wholeNumberRange',
  claimAmount: 'format.claimAmount.invalid',
  modValue: 'format.modValue.invalid'
}

const numberCodes = (name) => ({
  notNumber: SINGLE_CODE[name] ?? `format.${name}.notNumber`,
  notWholeNumber: SINGLE_CODE[name] ?? `format.${name}.notWholeNumber`,
  outOfRange: SINGLE_CODE[name] ?? `format.${name}.outOfRange`
})

const currencyCodes = (name) => ({
  malformed: SINGLE_CODE[name] ?? `format.${name}.notAmount`,
  notPositive: SINGLE_CODE[name] ?? `format.${name}.notPositive`
})

/** email uses the built-in pattern; formatted uses the catalogue's. */
const checkPattern = (record, value) => {
  const pattern =
    record.type === 'email'
      ? EMAIL_PATTERN
      : new RegExp(record.constraints.pattern)
  return pattern.test(String(value).trim())
    ? []
    : [{ code: `format.${record.name}.invalid` }]
}

const checkNumber = (record, value) => {
  const codes = numberCodes(record.name)
  const parsed = Number(String(value).trim())
  if (Number.isNaN(parsed)) {
    return [{ code: codes.notNumber }]
  }
  if (!Number.isInteger(parsed)) {
    return [{ code: codes.notWholeNumber }]
  }
  const { min, max } = record.constraints ?? {}
  return (min !== undefined && parsed < min) ||
    (max !== undefined && parsed > max)
    ? [{ code: codes.outOfRange }]
    : []
}

const checkCurrency = (record, value) => {
  const codes = currencyCodes(record.name)
  // Lenient parse (parity): strip a leading £, commas and whitespace.
  const cleaned = String(value ?? '')
    .trim()
    .replace(/[£,\s]/g, '')
  if (!/^\d+$/.test(cleaned)) {
    return [{ code: codes.malformed }]
  }
  return Number(cleaned) <= 0 ? [{ code: codes.notPositive }] : []
}

const isRealCalendarDate = ({ day, month, year }) => {
  const [d, m, y] = [day, month, year].map((part) =>
    Number(String(part).trim())
  )
  if (![d, m, y].every(Number.isInteger) || y < 1000) {
    return false
  }
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

/** Parity: 1-2 parts, non-numeric parts or an impossible date all block. */
const checkDate = (record, value) => {
  const parts = ['day', 'month', 'year'].map((part) => value?.[part])
  return parts.some(isBlank) || !isRealCalendarDate(value)
    ? [{ code: `format.${record.name}.notRealDate`, focusSuffix: '-day' }]
    : []
}

const checkersByType = {
  email: checkPattern,
  formatted: checkPattern,
  number: checkNumber,
  currency: checkCurrency,
  date: checkDate
}

/** Format findings for one filled value; blank values never fail. */
export function checkFormat(record, value) {
  const checker = checkersByType[record.type]
  return isBlank(value) || !checker ? [] : checker(record, value)
}

/** Every code checkFormat can emit for a record — the lockstep-test hook. */
export function formatCodesFor(record) {
  const codesByType = {
    email: [`format.${record.name}.invalid`],
    formatted: [`format.${record.name}.invalid`],
    date: [`format.${record.name}.notRealDate`],
    number: [...new Set(Object.values(numberCodes(record.name)))],
    currency: [...new Set(Object.values(currencyCodes(record.name)))]
  }
  return codesByType[record.type] ?? []
}
