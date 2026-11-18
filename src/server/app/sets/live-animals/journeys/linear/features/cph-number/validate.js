import {
  compose,
  pageValidation,
  requiredExactDigits
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { isWholeCphNumber, PART_LENGTHS, partsOf } from './shape.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

const COUNTY_FIELD = 'cphCounty'
const PARISH_FIELD = 'cphParish'
const HOLDING_FIELD = 'cphHolding'

const [COUNTY_LENGTH, PARISH_LENGTH, HOLDING_LENGTH] = PART_LENGTHS

const PART_ORDER = [
  [COUNTY_FIELD, COUNTY_LENGTH],
  [PARISH_FIELD, PARISH_LENGTH],
  [HOLDING_FIELD, HOLDING_LENGTH]
]

const splitIntoParts = (number) => {
  const parts = partsOf(number)
  return Object.fromEntries(
    PART_ORDER.map(([field], index) => [field, parts[index]])
  )
}

const joinParts = (values) => PART_ORDER.map(([part]) => values[part]).join('')

const isBlank = (values) => PART_ORDER.every(([part]) => values[part] === '')

const readTrimmedParts = (payload) =>
  Object.fromEntries(
    PART_ORDER.map(([part]) => [part, String(payload[part] ?? '').trim()])
  )

const DIGITS_ONLY = /^\d+$/

const separatorsStripped = (value) => value.replace(/[\s/]/g, '')

const isWholeNumberInCounty = (values) => {
  const typed = separatorsStripped(values[COUNTY_FIELD])
  return (
    values[PARISH_FIELD] === '' &&
    values[HOLDING_FIELD] === '' &&
    DIGITS_ONLY.test(typed) &&
    isWholeCphNumber(typed)
  )
}

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
    requiredExactDigits(COUNTY_FIELD, COUNTY_LENGTH, {
      required: copy.errors.countyRequired,
      length: copy.errors.countyLength,
      digitsOnly: copy.errors.countyDigitsOnly
    }),
    requiredExactDigits(PARISH_FIELD, PARISH_LENGTH, {
      required: copy.errors.parishRequired,
      length: copy.errors.parishLength,
      digitsOnly: copy.errors.parishDigitsOnly
    }),
    requiredExactDigits(HOLDING_FIELD, HOLDING_LENGTH, {
      required: copy.errors.holdingRequired,
      length: copy.errors.holdingLength,
      digitsOnly: copy.errors.holdingDigitsOnly
    })
  )
}

const checks = (values, { stored } = {}) => {
  if (stored && !isBlank(values) && !isWholeCphNumber(joinParts(values))) {
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
