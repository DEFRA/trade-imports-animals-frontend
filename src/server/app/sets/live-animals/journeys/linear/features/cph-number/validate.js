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

// A stored answer is nine bare digits, but a seeded or legacy one can carry
// the slashes a trader used to type, so the split reads digits only.
const splitStored = (stored) => {
  const digits = String(stored ?? '').replace(/\D/g, '')
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

// On submit, per-part rules name what is wrong; on stored, a lightweight
// check names the whole thing at once — the per-part copy talks in terms of
// what the trader is being asked to fill in, and does not read right when
// what actually happened is that a stored value came in mis-shaped.
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
  // A stored answer that was ever saved should be nine digits. Anything else
  // is a value the rules no longer accept — one message on the county field,
  // which is where the review-page card link lands anyway.
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
  toAnswers: (values) => ({ countyParishHoldingCph: joinParts(values) })
})
