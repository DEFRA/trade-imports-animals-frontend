export const isBlankValue = (value) => {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.every(isBlankValue)
  if (typeof value === 'object') {
    return Object.values(value).every(isBlankValue)
  }
  return false
}
