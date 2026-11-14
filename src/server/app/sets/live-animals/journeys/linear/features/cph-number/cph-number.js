export const COUNTY_DIGITS = 2
export const PARISH_DIGITS = 3
export const HOLDING_DIGITS = 4

const NINE_DIGITS = /^\d{9}$/

const stripNonDigits = (value) => String(value ?? '').replace(/\D/g, '')

export const isNineDigits = (value) => NINE_DIGITS.test(value)

/**
 * Splits a stored county parish holding number into its three parts.
 * @param {string} [number] - a stored number, with or without separators.
 * @returns {{county: string, parish: string, holding: string}} the parts; each is as short as the digits allow.
 */
export const splitCphNumber = (number) => {
  const digits = stripNonDigits(number)
  const parishStart = COUNTY_DIGITS
  const holdingStart = parishStart + PARISH_DIGITS
  return {
    county: digits.slice(0, parishStart),
    parish: digits.slice(parishStart, holdingStart),
    holding: digits.slice(holdingStart, holdingStart + HOLDING_DIGITS)
  }
}

/**
 * How a stored county parish holding number reads: its three parts separated by slashes.
 * @param {string} [number] - a stored number, with or without separators.
 * @returns {string|undefined} the slashed number, or the stored value as it is when it is not nine digits.
 */
export const cphNumberWithSlashes = (number) => {
  if (!isNineDigits(stripNonDigits(number))) {
    return number
  }
  const { county, parish, holding } = splitCphNumber(number)
  return `${county}/${parish}/${holding}`
}
