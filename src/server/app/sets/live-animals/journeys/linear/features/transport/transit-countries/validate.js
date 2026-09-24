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

/** The one error key on this page. The trader adds and removes through the
 * search box, so every message this page can show is a message about that
 * control — which is where the error summary has to send them. */
export const COUNTRY_FIELD = 'transitedCountry'

/** The offered list, not the label lookup: `originLabel` resolves GB to
 * "United Kingdom" for address forms, but GB is not a country this page
 * offers — the copy above the control says so. */
export const offeredCodes = async () =>
  new Set((await countries.originCountries()).map(({ value }) => value))

// An EMPTY list is not a failure — the question is optional (design release 1),
// so continuing without adding a country saves the empty list and moves on.
// A list that is too long, or holds a country the service no longer offers,
// is: on a submitted form because no rendering of the page could have produced
// it, and on a stored answer because the list has moved since it was saved.
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

/** The page carries its own working list in hidden inputs: nothing is saved
 * until the trader continues, so adding and removing costs no write and a
 * trader who leaves without saving leaves the answer as they found it. */
const selectedFrom = (payload) => [
  ...new Set(
    [payload.transitedCountries ?? []].flat().filter((code) => code !== '')
  )
]

export const validation = pageValidation({
  // The answer is a list, which no field schema states; it is measured whole.
  fields: () => compose(),
  checks: (values, { stored }) => listErrors(values.transitedCountries, stored),
  fromPayload: (payload) => ({
    transitedCountries: selectedFrom(payload)
  }),
  fromAnswers: (answers) => ({
    transitedCountries: [answers.transitedCountries ?? []].flat()
  })
})
