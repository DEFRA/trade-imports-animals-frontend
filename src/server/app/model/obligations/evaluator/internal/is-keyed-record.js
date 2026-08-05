export function isKeyedRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
