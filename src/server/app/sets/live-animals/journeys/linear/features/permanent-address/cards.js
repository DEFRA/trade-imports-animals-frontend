import { linesOf } from '../commodities/lines.js'
import {
  permanentAddressApplies,
  scopedFields
} from '../commodities/animal-identification/identifier/fields.js'
import { animalLabelOf } from '../commodities/animal-identification/animal-label.js'
import { insetAddressLines } from '../addresses/party-picker/view-model/address-lines.js'
import {
  AUTOCOMPLETE_TOKENS,
  FIELD_CLASSES,
  formValuesOf
} from '../addresses/party-edit/address-rules.js'

export const PLACE_OF_DESTINATION = 'placeOfDestination'
export const NEW_ADDRESS = 'newAddress'

export const ADDRESS_FIELDS = [
  'nameOrOrganisationName',
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode',
  'email',
  'phone'
]

export const cardKeyFor = (lineIndex, unitIndex) => `${lineIndex}-${unitIndex}`

export const fieldNameFor = (id, key) => `${id}-${key}`

export const PARTY_SOURCE_FIELD = { nameOrOrganisationName: 'name' }

export const linesNeedingPermanentAddress = (answers, evaluation) =>
  linesOf(answers, evaluation).filter(({ entry }) =>
    permanentAddressApplies(entry.commodityCode, entry.speciesLatinName)
  )

export const anyLineNeedsPermanentAddress = (answers, evaluation) =>
  linesNeedingPermanentAddress(answers, evaluation).length > 0

export const addressableUnits = (answers, evaluation) =>
  linesOf(answers, evaluation).flatMap(({ index: lineIndex, entry: line }) =>
    permanentAddressApplies(line.commodityCode, line.speciesLatinName)
      ? (line.animalIdentifiers ?? []).map((unit, unitIndex) => ({
          lineIndex,
          unitIndex,
          key: cardKeyFor(lineIndex, unitIndex),
          line,
          unit
        }))
      : []
  )

const identifierLinesOf = (line, unit, copy) =>
  scopedFields(line.commodityCode, line.speciesLatinName)
    .filter((field) => (unit[field.id] ?? '') !== '')
    .map((field) => copy.identifierLine(field.label, unit[field.id]))

const placeOfDestinationHint = (placeOfDestination) =>
  placeOfDestination
    ? [placeOfDestination.name, ...insetAddressLines(placeOfDestination)].join(
        ', '
      )
    : undefined

const addressFormValuesOf = (party) => {
  const partyValues = formValuesOf(party)
  return Object.fromEntries(
    ADDRESS_FIELDS.map((field) => [
      field,
      partyValues[PARTY_SOURCE_FIELD[field] ?? field]
    ])
  )
}

const addressFieldInputsOf = (key, values, copy, fieldErrors) => {
  const INPUT_TYPES = { email: 'email', phone: 'tel' }
  return ADDRESS_FIELDS.map((id) => {
    const partyField = PARTY_SOURCE_FIELD[id] ?? id
    const fieldId = fieldNameFor(id, key)
    return {
      id: fieldId,
      label: copy.address[id],
      hint: id === 'phone' ? copy.addressHints.phone : undefined,
      type: INPUT_TYPES[id],
      value: values[id],
      autocomplete: AUTOCOMPLETE_TOKENS[partyField],
      classes: FIELD_CLASSES[partyField],
      error: fieldErrors[fieldId]
    }
  })
}

export const originOf = (unit) =>
  unit.permanentAddressOrigin === PLACE_OF_DESTINATION ||
  unit.permanentAddressOrigin === NEW_ADDRESS
    ? unit.permanentAddressOrigin
    : null

const buildCard = (
  { lineIndex, unitIndex, key, line, unit },
  placeOfDestination,
  copy,
  fieldErrors
) => {
  const selected = originOf(unit)
  const addressValues = addressFormValuesOf(
    selected === NEW_ADDRESS ? unit.permanentAddress : undefined
  )
  const optionName = fieldNameFor('option', key)
  return {
    key,
    lineIndex,
    unitIndex,
    title: animalLabelOf(line.speciesLatinName, unitIndex + 1),
    identifierLines: identifierLinesOf(line, unit, copy),
    optionName,
    optionError: fieldErrors[optionName],
    options: [
      {
        value: PLACE_OF_DESTINATION,
        text: copy.options.placeOfDestination,
        checked: selected === PLACE_OF_DESTINATION,
        hint: placeOfDestinationHint(placeOfDestination)
      },
      {
        value: NEW_ADDRESS,
        text: copy.options.newAddress,
        checked: selected === NEW_ADDRESS,
        hint: copy.options.newAddressHint,
        revealsAddressFields: true
      }
    ],
    addressFields: addressFieldInputsOf(key, addressValues, copy, fieldErrors)
  }
}

export const buildCards = (
  answers,
  evaluation,
  placeOfDestination,
  copy,
  fieldErrors = {}
) =>
  addressableUnits(answers, evaluation).map((addressableUnit) =>
    buildCard(addressableUnit, placeOfDestination, copy, fieldErrors)
  )
