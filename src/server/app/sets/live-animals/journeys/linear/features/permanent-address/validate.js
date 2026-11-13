import { compose, validate } from '../../../../../../lib/validate/index.js'
import {
  optionalTextRule,
  requiredTextRule
} from '../addresses/party-edit/address-rules.js'
import {
  ADDRESS_FIELDS,
  NEW_ADDRESS,
  PARTY_SOURCE_FIELD,
  PLACE_OF_DESTINATION,
  fieldNameFor
} from './cards.js'
import { optionChosenFor } from './answers.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

const REQUIRED_ADDRESS_FIELDS = new Set([
  'nameOrOrganisationName',
  'addressLine1',
  'townOrCity',
  'postcode',
  'email',
  'phone'
])

const partyFieldFor = (field) => PARTY_SOURCE_FIELD[field] ?? field

const addressFieldRule = (field, key) => {
  const partyField = partyFieldFor(field)
  const ruleKey = fieldNameFor(field, key)
  return REQUIRED_ADDRESS_FIELDS.has(field)
    ? requiredTextRule(partyField, {
        key: ruleKey,
        required: copy.errors[field]
      })
    : optionalTextRule(partyField, { key: ruleKey })
}

const newAddressRulesFor = (payload, units) =>
  compose(
    ...units
      .filter(({ key }) => optionChosenFor(payload, key) === NEW_ADDRESS)
      .flatMap(({ key }) =>
        ADDRESS_FIELDS.map((field) => addressFieldRule(field, key))
      )
  )

const placeOfDestinationRefusalsFor = (payload, units, hasPlaceOfDestination) =>
  Object.fromEntries(
    units
      .filter(
        ({ key }) =>
          optionChosenFor(payload, key) === PLACE_OF_DESTINATION &&
          !hasPlaceOfDestination
      )
      .map(({ key }) => [
        fieldNameFor('option', key),
        copy.errors.placeOfDestinationUnknown
      ])
  )

/**
 * The page's refusals for a posted form: a new address chosen with a blank
 * or over-long field, and the place-of-destination option chosen before the
 * notification has one.
 *
 * @param {object} payload - the raw posted form values.
 * @param {{key: string}[]} units - the addressable units, as
 * `addressableUnits` gives them.
 * @param {boolean} hasPlaceOfDestination - whether the notification carries
 * a place of destination.
 * @returns {{fieldErrors: object, placeOfDestinationErrors: object, values: object}}
 * `fieldErrors` is every refusal keyed by the control it belongs to, empty
 * when nothing is refused. `placeOfDestinationErrors` is the subset refusing
 * a place-of-destination choice. `values` holds the posted values with each
 * rule's normalisation applied.
 */
export const refusalsFor = (payload, units, hasPlaceOfDestination) => {
  const { value, errors } = validate(
    newAddressRulesFor(payload, units),
    payload
  )
  const placeOfDestinationErrors = placeOfDestinationRefusalsFor(
    payload,
    units,
    hasPlaceOfDestination
  )
  return {
    fieldErrors: { ...(errors ?? {}), ...placeOfDestinationErrors },
    placeOfDestinationErrors,
    values: value
  }
}
