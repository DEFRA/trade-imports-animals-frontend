import {
  compose,
  pageValidation,
  requiredExactDigits
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import {
  COUNTY_DIGITS,
  HOLDING_DIGITS,
  isNineDigits,
  PARISH_DIGITS,
  splitCphNumber
} from './cph-number.js'

const copy = copyFor({ en, cy })

const COUNTY_FIELD = 'cphCounty'
const PARISH_FIELD = 'cphParish'
const HOLDING_FIELD = 'cphHolding'

const PART_ORDER = [
  [COUNTY_FIELD, COUNTY_DIGITS],
  [PARISH_FIELD, PARISH_DIGITS],
  [HOLDING_FIELD, HOLDING_DIGITS]
]

const splitIntoParts = (number) => {
  const { county, parish, holding } = splitCphNumber(number)
  return {
    [COUNTY_FIELD]: county,
    [PARISH_FIELD]: parish,
    [HOLDING_FIELD]: holding
  }
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
  isNineDigits(values[COUNTY_FIELD].replace(/[\s/]/g, ''))

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
  if (stored && !isBlank(values) && !isNineDigits(joinParts(values))) {
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
