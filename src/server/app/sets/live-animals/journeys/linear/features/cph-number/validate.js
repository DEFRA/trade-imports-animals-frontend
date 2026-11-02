import {
  compose,
  pageValidation,
  requiredExactDigits
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

const COUNTY_FIELD = 'cphCounty'
const PARISH_FIELD = 'cphParish'
const HOLDING_FIELD = 'cphHolding'

const COUNTY_DIGITS = 2
const PARISH_DIGITS = 3
const HOLDING_DIGITS = 4

const PART_ORDER = [
  [COUNTY_FIELD, COUNTY_DIGITS],
  [PARISH_FIELD, PARISH_DIGITS],
  [HOLDING_FIELD, HOLDING_DIGITS]
]

const stripNonDigits = (value) => String(value ?? '').replace(/\D/g, '')

const NINE_DIGITS = /^\d{9}$/

const splitIntoParts = (number) => {
  const digits = stripNonDigits(number)
  let taken = 0
  return Object.fromEntries(
    PART_ORDER.map(([part, count]) => {
      const slice = digits.slice(taken, taken + count)
      taken += count
      return [part, slice]
    })
  )
}

const joinParts = (values) => PART_ORDER.map(([part]) => values[part]).join('')

const isBlank = (values) => PART_ORDER.every(([part]) => values[part] === '')

const readTrimmedParts = (payload) =>
  Object.fromEntries(
    PART_ORDER.map(([part]) => [part, String(payload[part] ?? '').trim()])
  )

const isWholeNumberInCounty = (values) =>
  values[PARISH_FIELD] === '' &&
  values[HOLDING_FIELD] === '' &&
  NINE_DIGITS.test(values[COUNTY_FIELD].replace(/[\s/]/g, ''))

const readSubmittedParts = (payload) => {
  const values = readTrimmedParts(payload)
  return isWholeNumberInCounty(values)
    ? splitIntoParts(values[COUNTY_FIELD])
    : values
}

const fields = (values, { stored } = {}) => {
  if (stored || isBlank(values)) {
    return compose()
  }
  return compose(
    requiredExactDigits(COUNTY_FIELD, COUNTY_DIGITS, {
      required: copy.errors.countyRequired,
      length: copy.errors.countyLength,
      digitsOnly: copy.errors.countyDigitsOnly
    }),
    requiredExactDigits(PARISH_FIELD, PARISH_DIGITS, {
      required: copy.errors.parishRequired,
      length: copy.errors.parishLength,
      digitsOnly: copy.errors.parishDigitsOnly
    }),
    requiredExactDigits(HOLDING_FIELD, HOLDING_DIGITS, {
      required: copy.errors.holdingRequired,
      length: copy.errors.holdingLength,
      digitsOnly: copy.errors.holdingDigitsOnly
    })
  )
}

const checks = (values, { stored } = {}) => {
  if (!stored && isBlank(values)) {
    return { [COUNTY_FIELD]: copy.errors.cphRequired }
  }
  if (stored && !isBlank(values) && !NINE_DIGITS.test(joinParts(values))) {
    return { [COUNTY_FIELD]: copy.errors.cphNoLongerValid }
  }
  return {}
}

export const validation = pageValidation({
  fields,
  checks,
  fromPayload: readSubmittedParts,
  fromAnswers: (answers) => splitIntoParts(answers.countyParishHoldingCph),
  toAnswers: (values) => ({ countyParishHoldingCph: joinParts(values) }),
  blanks: () => [COUNTY_FIELD, PARISH_FIELD, HOLDING_FIELD]
})
