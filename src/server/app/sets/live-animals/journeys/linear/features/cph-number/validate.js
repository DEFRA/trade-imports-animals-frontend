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

const splitStored = (stored) => {
  const digits = stripNonDigits(stored)
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

const NINE_DIGITS = /^\d{9}$/

// Stored path skips the per-part rules — their copy is written for a trader
// filling in the form, not for one being told a stored value has gone bad.
// `checks` fires one whole-value message instead.
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
  // A trader who submits the page untouched has one problem, not three.
  if (!stored && isBlank(values)) {
    return { [COUNTY_FIELD]: copy.errors.cphRequired }
  }
  // Keyed to county — where the review-page card link lands.
  if (stored && !isBlank(values) && !NINE_DIGITS.test(joinParts(values))) {
    return { [COUNTY_FIELD]: copy.errors.cphNoLongerValid }
  }
  return {}
}

export const validation = pageValidation({
  fields,
  checks,
  fromPayload: (payload) =>
    Object.fromEntries(
      PART_ORDER.map(([part]) => [part, String(payload[part] ?? '').trim()])
    ),
  fromAnswers: (answers) => splitStored(answers.countyParishHoldingCph),
  toAnswers: (values) => ({ countyParishHoldingCph: joinParts(values) }),
  // A rejected stored value is one thing; clear every part or the widget
  // re-renders two stray digits from a value the rules just refused.
  blanks: () => [COUNTY_FIELD, PARISH_FIELD, HOLDING_FIELD]
})
