/** Shared blank/answered test — a value is blank when it is null, an
 * empty/whitespace string, an empty array, or a `{ day, month, year }` date-
 * parts object with every part itself blank. Used by the predicate evaluator
 * and the status roll-up. */
export const isBlank = (value) => {
  if (value === undefined || value === null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    return Object.values(value).every(isBlank)
  }
  return String(value).trim() === ''
}

export const isAnswered = (value) => !isBlank(value)
