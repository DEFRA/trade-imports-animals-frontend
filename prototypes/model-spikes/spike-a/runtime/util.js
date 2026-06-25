import { model } from './model.js'

/** Empty = absent, blank string, or empty array. */
export function isEmpty(value) {
  if (value === undefined || value === null) {
    return true
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  if (typeof value === 'object') {
    // A date triple is "present" once its day box is filled.
    return !value.day
  }
  return String(value).trim() === ''
}

/**
 * Whether a field is satisfied for completeness. Multi-selects count as
 * satisfied once *answered* (an empty array is a valid "none"), matching the
 * hand-written `extras !== undefined`; everything else must be non-empty.
 */
export function isSatisfied(field, value) {
  if (field.type === 'multi-select') {
    return Array.isArray(value)
  }
  return !isEmpty(value)
}

/** Turn a field id into a human label for derived error messages. */
export function humanize(id) {
  const spaced = id
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Compiled regex for a named pattern declared in the model. */
export function regexFor(name) {
  const source = model.patterns?.[name]
  return source ? new RegExp(source) : undefined
}

/** Whole years between an ISO date string (or {y,m,d}) and now. */
export function ageInYears(dob, now = new Date()) {
  const birth = toDate(dob)
  if (!birth) {
    return undefined
  }
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

function toDate(dob) {
  if (!dob) {
    return undefined
  }
  if (typeof dob === 'string') {
    const parsed = new Date(dob)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }
  const { day, month, year } = dob
  if (!day || !month || !year) {
    return undefined
  }
  return new Date(Number(year), Number(month) - 1, Number(day))
}
