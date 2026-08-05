export const hasOwn = (value, key) => Object.hasOwn(value, key)

export const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const hasExactlyKeys = (value, expected) => {
  const keys = Object.keys(value)
  return (
    keys.length === expected.length &&
    expected.every((key) => hasOwn(value, key))
  )
}
