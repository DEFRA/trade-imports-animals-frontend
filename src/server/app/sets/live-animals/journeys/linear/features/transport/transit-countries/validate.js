import {
  compose,
  pageValidation
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as countries from '../../../../../../../services/countries/index.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).transitCountries

export const MAX_TRANSITED_COUNTRIES = 12

// The trader adds and removes through the search box, so every error on this
// page anchors to that control.
export const COUNTRY_FIELD = 'transitedCountry'

// The offered list, not the label lookup: GB resolves for address forms but
// is not a country this page offers.
export const offeredCodes = async () =>
  new Set((await countries.originCountries()).map(({ value }) => value))

// Empty is fine — the question is optional (design release 1). Too long or
// holding a country the service no longer offers is not: on submit because
// no rendering could have produced it, on stored because the list has moved.
const listErrors = async (selected, stored) => {
  const offered = await offeredCodes()
  if (selected.some((code) => !offered.has(code))) {
    return {
      [COUNTRY_FIELD]: stored
        ? copy.errors.someNoLongerAvailable
        : copy.errors.fromList
    }
  }
  if (selected.length > MAX_TRANSITED_COUNTRIES) {
    return {
      [COUNTRY_FIELD]: copy.errors.maxCountries(MAX_TRANSITED_COUNTRIES)
    }
  }
  return {}
}

// The page carries its own working list in hidden inputs — nothing is saved
// until Continue, so adding and removing costs no write.
const selectedFrom = (payload) => [
  ...new Set(
    [payload.transitedCountries ?? []].flat().filter((code) => code !== '')
  )
]

export const validation = pageValidation({
  // The answer is a list — measured whole by `checks` rather than field-by-field.
  fields: () => compose(),
  checks: (values, { stored }) => listErrors(values.transitedCountries, stored),
  fromPayload: (payload) => ({
    transitedCountries: selectedFrom(payload)
  }),
  fromAnswers: (answers) => ({
    transitedCountries: [answers.transitedCountries ?? []].flat()
  })
})
