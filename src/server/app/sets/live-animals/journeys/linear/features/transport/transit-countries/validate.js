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

export const isUsersOwnInputRefusal = (reason) =>
  reason === TRANSIT_REFUSAL.nothingChosen ||
  reason === TRANSIT_REFUSAL.alreadyAdded

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

const MESSAGES_NEEDING_NO_COUNTRY_LABEL = Object.freeze({
  [TRANSIT_REFUSAL.nothingChosen]: copy.errors.chooseCountry,
  [TRANSIT_REFUSAL.notOnList]: copy.errors.fromList,
  [TRANSIT_REFUSAL.noLongerAvailable]: copy.errors.someNoLongerAvailable,
  [TRANSIT_REFUSAL.maxCountries]: copy.errors.maxCountries(
    MAX_TRANSITED_COUNTRIES
  )
})

export const refusalMessage = async (reason, chosen) =>
  reason === TRANSIT_REFUSAL.alreadyAdded
    ? copy.errors.alreadyAdded(await countries.originLabel(chosen))
    : MESSAGES_NEEDING_NO_COUNTRY_LABEL[reason]

const listChecks = async (refusal) =>
  refusal
    ? {
        errors: { [COUNTRY_FIELD]: await refusalMessage(refusal.reason) },
        refusal
      }
    : { errors: {} }

const selectedFrom = (payload) => [
  ...new Set(
    [payload.transitedCountries ?? []].flat().filter((code) => code !== '')
  )
]

export const validation = pageValidation({
  fields: () => compose(),
  checks: async (values, { stored }) =>
    listChecks(await listRefusal(values.transitedCountries, { stored })),
  fromPayload: (payload) => ({
    transitedCountries: selectedFrom(payload)
  }),
  fromAnswers: (answers) => ({
    transitedCountries: [answers.transitedCountries ?? []].flat()
  }),
  blanks: () => []
})
