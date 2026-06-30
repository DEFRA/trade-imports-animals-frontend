/**
 * Field-level helpers shared by the spikes — presence, completeness, label
 * humanising and age. No model knowledge; each spike passes plain field specs.
 */

// Date-part objects ({ day, month, year }) count as empty until a day is given;
// the day box is the anchor the partials key their presence UX off.
const isEmptyDateParts = (parts) => !parts.day

export function isEmpty(value) {
  if (value === undefined || value === null) {
    return true
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  if (typeof value === 'object') {
    return isEmptyDateParts(value)
  }
  return String(value).trim() === ''
}

/**
 * Completeness check. Multi-selects count as satisfied once *answered* (an empty
 * array is a valid "none"); everything else must be non-empty.
 */
export function isSatisfied(field, value) {
  if (field.type === 'multi-select') {
    return Array.isArray(value)
  }
  return !isEmpty(value)
}

export function humanize(id) {
  const spaced = id
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

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
