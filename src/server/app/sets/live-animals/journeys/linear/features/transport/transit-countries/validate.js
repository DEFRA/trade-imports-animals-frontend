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

export const COUNTRY_FIELD = 'transitedCountry'

export const TRANSIT_REFUSAL = Object.freeze({
  nothingChosen: 'nothing-chosen',
  notOnList: 'not-on-the-list',
  noLongerAvailable: 'no-longer-available',
  alreadyAdded: 'already-added',
  maxCountries: 'max-countries'
})

export const offeredCodes = async () =>
  new Set((await countries.originCountries()).map(({ value }) => value))

export const partitionByOffered = async (codes) => {
  const offered = await offeredCodes()
  return {
    offered: codes.filter((code) => offered.has(code)),
    notOffered: codes.filter((code) => !offered.has(code))
  }
}

const listRefusal = async (codes, { stored = false } = {}) => {
  const { notOffered } = await partitionByOffered(codes)
  if (notOffered.length > 0) {
    return {
      reason: stored
        ? TRANSIT_REFUSAL.noLongerAvailable
        : TRANSIT_REFUSAL.notOnList,
      codes: notOffered
    }
  }
  if (codes.length > MAX_TRANSITED_COUNTRIES) {
    return { reason: TRANSIT_REFUSAL.maxCountries, length: codes.length }
  }
  return null
}

export const MESSAGES_NEEDING_NO_COUNTRY_LABEL = Object.freeze({
  [TRANSIT_REFUSAL.nothingChosen]: copy.errors.chooseCountry,
  [TRANSIT_REFUSAL.notOnList]: copy.errors.fromList,
  [TRANSIT_REFUSAL.noLongerAvailable]: copy.errors.someNoLongerAvailable,
  [TRANSIT_REFUSAL.maxCountries]: copy.errors.maxCountries(
    MAX_TRANSITED_COUNTRIES
  )
})

const listErrors = (refusal) =>
  refusal
    ? { [COUNTRY_FIELD]: MESSAGES_NEEDING_NO_COUNTRY_LABEL[refusal.reason] }
    : {}

const withRefusal = (result, refusal) => ({
  ...result,
  refusal,
  errors: listErrors(refusal)
})

const selectedFrom = (payload) => [
  ...new Set(
    [payload.transitedCountries ?? []].flat().filter((code) => code !== '')
  )
]

const pageRules = pageValidation({
  fields: () => compose(),
  fromPayload: (payload) => ({
    transitedCountries: selectedFrom(payload)
  }),
  fromAnswers: (answers) => ({
    transitedCountries: [answers.transitedCountries ?? []].flat()
  })
})

export const validation = {
  ...pageRules,

  onSubmit: async (payload) => {
    const submitted = await pageRules.onSubmit(payload)
    const refusal = await listRefusal(submitted.values.transitedCountries)
    return withRefusal(submitted, refusal)
  },

  onStored: async (answers) => {
    const stored = await pageRules.onStored(answers)
    const refusal = await listRefusal(stored.values.transitedCountries, {
      stored: true
    })
    return withRefusal(stored, refusal)
  }
}
