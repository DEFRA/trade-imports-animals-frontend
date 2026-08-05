export const isValidIndex = (index, list) =>
  Number.isInteger(index) && index >= 0 && index < list.length

export const hasOwn = (value, key) => Object.hasOwn(value, key)

export const hasKeys = (value) => Object.keys(value).length > 0
