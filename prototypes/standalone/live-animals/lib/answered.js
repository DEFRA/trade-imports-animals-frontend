export const isBlank = (value) => {
  if (value === undefined || value === null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    // a { day, month, year } date-parts object is blank when every part is blank
    return Object.values(value).every(isBlank)
  }
  return String(value).trim() === ''
}

export const isAnswered = (value) => !isBlank(value)
