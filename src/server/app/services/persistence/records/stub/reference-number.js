import { randomInt } from 'node:crypto'

export const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const REFERENCE_BODY_LENGTH = 6

const YEAR_DIGITS = 2
const TWO_DIGIT_YEAR_MODULUS = 100

export const mintReferenceNumber = () => {
  const year = String(
    new Date().getFullYear() % TWO_DIGIT_YEAR_MODULUS
  ).padStart(YEAR_DIGITS, '0')
  const body = Array.from(
    { length: REFERENCE_BODY_LENGTH },
    () => CROCKFORD_BASE32[randomInt(CROCKFORD_BASE32.length)]
  ).join('')
  return `GBN-AG-${year}-${body}`
}
