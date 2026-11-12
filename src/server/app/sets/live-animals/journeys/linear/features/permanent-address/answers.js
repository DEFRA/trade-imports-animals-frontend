import { UNITED_KINGDOM_CODE } from '../../../../../../services/countries/index.js'
import { partyFrom } from '../addresses/party-edit/address-rules.js'
import {
  NEW_ADDRESS,
  PLACE_OF_DESTINATION,
  addressableUnits,
  fieldNameFor
} from './cards.js'

const newAddressPartyValues = (payload, key) => {
  const value = (id) => String(payload[fieldNameFor(id, key)] ?? '')
  return {
    name: value('nameOrOrganisationName'),
    addressLine1: value('addressLine1'),
    addressLine2: value('addressLine2'),
    townOrCity: value('townOrCity'),
    county: value('county'),
    postcode: value('postcode'),
    countryCode: UNITED_KINGDOM_CODE,
    phone: value('phone'),
    email: value('email')
  }
}

export const optionChosenFor = (payload, key) =>
  String(payload[fieldNameFor('option', key)] ?? '')

const answerFor = (payload, key, placeOfDestination) => {
  const chosen = optionChosenFor(payload, key)
  if (chosen === PLACE_OF_DESTINATION) {
    return {
      permanentAddressOrigin: PLACE_OF_DESTINATION,
      permanentAddress: placeOfDestination ?? null
    }
  }
  if (chosen === NEW_ADDRESS) {
    return {
      permanentAddressOrigin: NEW_ADDRESS,
      permanentAddress: partyFrom(newAddressPartyValues(payload, key))
    }
  }
  return null
}

/**
 * The page's answers from a posted form.
 *
 * @param {object} values - the posted values, with the page's normalisation
 * applied.
 * @param {object} answers - the journey's stored answers.
 * @param {object} evaluation - the request-level evaluator result.
 * @param {object} [placeOfDestination] - the notification's place of
 * destination party, a literal copy of which the first option resolves to.
 * @returns {{lineIndex: number, unitIndex: number, permanentAddressOrigin: string, permanentAddress: object}[]}
 * one entry per animal whose card was answered, in line and record order. An
 * animal left with neither option chosen has no entry.
 */
export const answersFromPayload = (
  values,
  answers,
  evaluation,
  placeOfDestination
) =>
  addressableUnits(answers, evaluation)
    .map(({ lineIndex, unitIndex, key }) => {
      const answer = answerFor(values, key, placeOfDestination)
      return answer && { lineIndex, unitIndex, ...answer }
    })
    .filter(Boolean)
