import { copyFor } from '../../../../../../../shared/copy.js'
import * as countries from '../../../../../../../services/countries/index.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { COUNTRY_FIELD } from './transit-countries.controller.js'

const copy = copyFor({ en, cy }).transitCountries

export const validateStoredAnswers = async (answers) => {
  const stored = [answers.transitedCountries ?? []].flat()
  if (stored.length === 0) {
    return {}
  }
  const offered = new Set(
    (await countries.originCountries()).map(({ value }) => value)
  )
  const hasStale = stored.some((code) => !offered.has(code))
  return hasStale ? { [COUNTRY_FIELD]: copy.errors.someNoLongerAvailable } : {}
}
