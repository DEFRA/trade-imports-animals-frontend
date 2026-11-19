const COUNTY_LENGTH = 2
const PARISH_LENGTH = 3
const HOLDING_LENGTH = 4

export const PART_LENGTHS = [COUNTY_LENGTH, PARISH_LENGTH, HOLDING_LENGTH]

const WHOLE_NUMBER_LENGTH = PART_LENGTHS.reduce(
  (total, length) => total + length,
  0
)

const digitsOf = (value) => String(value ?? '').replace(/\D/g, '')

export const isWholeCphNumber = (value) =>
  digitsOf(value).length === WHOLE_NUMBER_LENGTH

export const partsOf = (value) => {
  const digits = digitsOf(value)
  let taken = 0
  return PART_LENGTHS.map((length) => {
    const part = digits.slice(taken, taken + length)
    taken += length
    return part
  })
}

export const displayedCphNumber = (value) => {
  if (!value) {
    return undefined
  }
  return isWholeCphNumber(value) ? partsOf(value).join('/') : value
}
